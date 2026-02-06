import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Labour cost report for a given week
// Query: ?start_date=2026-02-09&team_id=1
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const teamId = searchParams.get('team_id')

    if (!startDate || !teamId) {
      return NextResponse.json({ error: 'start_date and team_id required' }, { status: 400 })
    }

    // Calculate week end (Sunday)
    const weekStart = new Date(startDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    // Get all staff for this team
    const { data: staff, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, role, contracted_hours, max_hours, hourly_rate')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .order('name')

    if (staffError) throw staffError

    // Get approved rotas covering this week
    const { data: rotas, error: rotasError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('approved', true)
      .lte('start_date', weekEndStr)
      .gte('end_date', startDate)

    if (rotasError) throw rotasError

    // Build hours per staff member for this week
    const staffHours = {}
    staff.forEach(s => {
      staffHours[s.name] = {
        staff_id: s.id,
        name: s.name,
        role: s.role,
        contracted_hours: s.contracted_hours || 0,
        max_hours: s.max_hours || 0,
        hourly_rate: parseFloat(s.hourly_rate) || 0,
        scheduled_hours: 0,
        shifts: []
      }
    })

    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

          // Calculate the actual date for this shift
          const weeksOffset = (shift.week - 1) * 7
          const dayOffset = dayNames.indexOf(shift.day)
          if (dayOffset === -1) continue

          const shiftDate = new Date(rotaStart)
          shiftDate.setDate(shiftDate.getDate() + weeksOffset + dayOffset)
          const shiftDateStr = shiftDate.toISOString().split('T')[0]

          // Check if this shift falls within the requested week
          if (shiftDateStr < startDate || shiftDateStr > weekEndStr) continue

          const [startTime, endTime] = shift.time.split('-')
          const hours = calculateHours(startTime, endTime)

          for (const staffName of shift.assigned_staff) {
            if (staffHours[staffName]) {
              staffHours[staffName].scheduled_hours += hours
              staffHours[staffName].shifts.push({
                date: shiftDateStr,
                day: shift.day,
                shift_name: shift.shift_name,
                start_time: startTime,
                end_time: endTime,
                hours
              })
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing schedule data:', parseError)
      }
    }

    // Calculate costs and overtime
    const report = Object.values(staffHours).map(s => {
      const regularHours = Math.min(s.scheduled_hours, s.contracted_hours)
      const overtimeHours = Math.max(0, s.scheduled_hours - s.contracted_hours)
      const regularCost = regularHours * s.hourly_rate
      const overtimeCost = overtimeHours * s.hourly_rate // Same rate for now
      const totalCost = regularCost + overtimeCost

      // Overtime status
      let overtimeStatus = 'under'
      if (s.contracted_hours > 0) {
        const ratio = s.scheduled_hours / s.contracted_hours
        if (ratio > 1) overtimeStatus = 'over'
        else if (ratio === 1) overtimeStatus = 'met'
        else overtimeStatus = 'under'
      }

      // UK 48h working time threshold
      let wtdStatus = 'normal'
      if (s.scheduled_hours >= 48) wtdStatus = 'over'
      else if (s.scheduled_hours >= 44) wtdStatus = 'approaching'

      return {
        ...s,
        regular_hours: Math.round(regularHours * 10) / 10,
        overtime_hours: Math.round(overtimeHours * 10) / 10,
        regular_cost: Math.round(regularCost * 100) / 100,
        overtime_cost: Math.round(overtimeCost * 100) / 100,
        total_cost: Math.round(totalCost * 100) / 100,
        overtime_status: overtimeStatus,
        wtd_status: wtdStatus
      }
    })

    // Summary totals
    const summary = {
      total_hours: Math.round(report.reduce((sum, s) => sum + s.scheduled_hours, 0) * 10) / 10,
      total_regular_hours: Math.round(report.reduce((sum, s) => sum + s.regular_hours, 0) * 10) / 10,
      total_overtime_hours: Math.round(report.reduce((sum, s) => sum + s.overtime_hours, 0) * 10) / 10,
      total_cost: Math.round(report.reduce((sum, s) => sum + s.total_cost, 0) * 100) / 100,
      staff_count: report.filter(s => s.scheduled_hours > 0).length,
      overtime_count: report.filter(s => s.overtime_status === 'over').length
    }

    return NextResponse.json({ report, summary })
  } catch (error) {
    console.error('Error generating labour report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  if (minutes < 0) minutes += 24 * 60
  return Math.round(minutes / 60 * 10) / 10
}