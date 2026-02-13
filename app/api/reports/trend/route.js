import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Weekly cost trend for a date range
// Query: ?team_id=1&start_date=2026-01-06&end_date=2026-03-02
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    if (!teamId || !startDate || !endDate) {
      return NextResponse.json({ error: 'team_id, start_date, and end_date required' }, { status: 400 })
    }

    // Get staff with payroll data
    const { data: staff, error: staffError } = await supabase
      .from('Staff')
      .select(`
        name, 
        contracted_hours,
        payroll_info (
          pay_type,
          hourly_rate,
          annual_salary
        )
      `)
      .eq('user_id', userId)
      .eq('team_id', teamId)

    if (staffError) throw staffError

    // Build rate and contract maps
    const rateMap = {}
    const contractMap = {}
    
    staff.forEach(s => {
      const payrollData = Array.isArray(s.payroll_info) ? s.payroll_info[0] : s.payroll_info
      let hourlyRate = 0
      
      if (payrollData) {
        if (payrollData.pay_type === 'hourly' && payrollData.hourly_rate) {
          hourlyRate = parseFloat(payrollData.hourly_rate)
        } else if (payrollData.pay_type === 'salary' && payrollData.annual_salary) {
          const annualHours = (s.contracted_hours || 40) * 52
          hourlyRate = parseFloat(payrollData.annual_salary) / annualHours
        }
      }
      
      rateMap[s.name] = hourlyRate
      contractMap[s.name] = s.contracted_hours || 0
    })

    // Generate all Mondays between start and end dates
    const weekStarts = []
    const start = new Date(startDate)
    const end = new Date(endDate)
    
    // Find the Monday on or before start date
    let currentDate = getMonday(start)
    
    // Generate all Mondays in range
    while (currentDate <= end) {
      weekStarts.push(currentDate.toISOString().split('T')[0])
      currentDate.setDate(currentDate.getDate() + 7)
    }

    if (weekStarts.length === 0) {
      return NextResponse.json([])
    }

    const earliestDate = weekStarts[0]
    const latestMonday = weekStarts[weekStarts.length - 1]
    const latestEnd = new Date(latestMonday)
    latestEnd.setDate(latestEnd.getDate() + 6)
    const latestDate = latestEnd.toISOString().split('T')[0]

    // Get all approved rotas in range
    const { data: rotas, error: rotasError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('approved', true)
      .lte('start_date', latestDate)
      .gte('end_date', earliestDate)

    if (rotasError) throw rotasError

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    // Build trend data
    const trend = weekStarts.map(weekStart => {
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      let totalHours = 0
      let totalCost = 0
      let overtimeHours = 0
      const staffHoursThisWeek = {}

      for (const rota of rotas) {
        if (!rota.schedule_data) continue

        try {
          const scheduleData = typeof rota.schedule_data === 'string'
            ? JSON.parse(rota.schedule_data)
            : rota.schedule_data

          const scheduleArray = scheduleData.schedule || []
          const rotaStart = new Date(rota.start_date)

          for (const shift of scheduleArray) {
            if (!shift.assigned_staff || shift.assigned_staff.length === 0) continue

            const weeksOffset = (shift.week - 1) * 7
            const dayOffset = dayNames.indexOf(shift.day)
            if (dayOffset === -1) continue

            const shiftDate = new Date(rotaStart)
            shiftDate.setDate(shiftDate.getDate() + weeksOffset + dayOffset)
            const shiftDateStr = shiftDate.toISOString().split('T')[0]

            // Check if shift falls within this week
            if (shiftDateStr < weekStart || shiftDateStr > weekEndStr) continue

            const [startTime, endTime] = shift.time.split('-')
            const hours = calculateHours(startTime, endTime)

            for (const staffName of shift.assigned_staff) {
              totalHours += hours
              totalCost += hours * (rateMap[staffName] || 0)

              if (!staffHoursThisWeek[staffName]) staffHoursThisWeek[staffName] = 0
              staffHoursThisWeek[staffName] += hours
            }
          }
        } catch (e) {
          console.error('Error parsing schedule:', e)
        }
      }

      // Calculate overtime
      Object.entries(staffHoursThisWeek).forEach(([name, hours]) => {
        const contracted = contractMap[name] || 0
        if (hours > contracted && contracted > 0) {
          overtimeHours += hours - contracted
        }
      })

      const weekLabel = new Date(weekStart).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

      return {
        week_start: weekStart,
        label: weekLabel,
        total_hours: Math.round(totalHours * 10) / 10,
        total_cost: Math.round(totalCost * 100) / 100,
        overtime_hours: Math.round(overtimeHours * 10) / 10
      }
    })

    return NextResponse.json(trend)
  } catch (error) {
    console.error('Error generating trend:', error)
    return NextResponse.json({ error: 'Failed to generate trend' }, { status: 500 })
  }
}

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  if (minutes < 0) minutes += 24 * 60
  return Math.round(minutes / 60 * 10) / 10
}