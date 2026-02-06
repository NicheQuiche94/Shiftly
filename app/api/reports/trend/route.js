import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Weekly cost trend for last N weeks
// Query: ?team_id=1&weeks=8
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')
    const weeks = parseInt(searchParams.get('weeks') || '8')

    if (!teamId) {
      return NextResponse.json({ error: 'team_id required' }, { status: 400 })
    }

    // Get staff rates
    const { data: staff, error: staffError } = await supabase
      .from('Staff')
      .select('name, contracted_hours, hourly_rate')
      .eq('user_id', userId)
      .eq('team_id', teamId)

    if (staffError) throw staffError

    const rateMap = {}
    const contractMap = {}
    staff.forEach(s => {
      rateMap[s.name] = parseFloat(s.hourly_rate) || 0
      contractMap[s.name] = s.contracted_hours || 0
    })

    // Calculate week starts going back N weeks
    const today = new Date()
    const currentMonday = getMonday(today)
    const weekStarts = []
    for (let i = weeks - 1; i >= 0; i--) {
      const monday = new Date(currentMonday)
      monday.setDate(monday.getDate() - i * 7)
      weekStarts.push(monday.toISOString().split('T')[0])
    }

    const earliestDate = weekStarts[0]
    const latestEnd = new Date(weekStarts[weekStarts.length - 1])
    latestEnd.setDate(latestEnd.getDate() + 6)

    // Get all approved rotas in range
    const { data: rotas, error: rotasError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('approved', true)
      .lte('start_date', latestEnd.toISOString().split('T')[0])
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
            if (!shift.assigned_staff) continue

            const weeksOffset = (shift.week - 1) * 7
            const dayOffset = dayNames.indexOf(shift.day)
            if (dayOffset === -1) continue

            const shiftDate = new Date(rotaStart)
            shiftDate.setDate(shiftDate.getDate() + weeksOffset + dayOffset)
            const shiftDateStr = shiftDate.toISOString().split('T')[0]

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