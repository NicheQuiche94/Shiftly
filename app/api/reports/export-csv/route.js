import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  if (minutes < 0) minutes += 24 * 60
  return Math.round(minutes / 60 * 10) / 10
}

function formatDateGB(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start_date')
    const teamId = searchParams.get('team_id')

    if (!startDate || !teamId) {
      return NextResponse.json({ error: 'start_date and team_id required' }, { status: 400 })
    }

    const weekStart = new Date(startDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    const weekEndStr = weekEnd.toISOString().split('T')[0]

    const { data: staff } = await supabase
      .from('Staff')
      .select('id, name, role, contracted_hours, max_hours, hourly_rate')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .order('name')

    const { data: team } = await supabase
      .from('Teams')
      .select('name')
      .eq('id', teamId)
      .single()

    const { data: rotas } = await supabase
      .from('Rotas')
      .select('*')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .eq('approved', true)
      .lte('start_date', weekEndStr)
      .gte('end_date', startDate)

    const staffHours = {}
    ;(staff || []).forEach(s => {
      staffHours[s.name] = {
        name: s.name, role: s.role,
        contracted_hours: s.contracted_hours || 0,
        hourly_rate: parseFloat(s.hourly_rate) || 0,
        scheduled_hours: 0, shifts: []
      }
    })

    for (const rota of (rotas || [])) {
      if (!rota.schedule_data) continue
      try {
        const scheduleData = typeof rota.schedule_data === 'string'
          ? JSON.parse(rota.schedule_data) : rota.schedule_data
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
          if (shiftDateStr < startDate || shiftDateStr > weekEndStr) continue
          const [startTime, endTime] = shift.time.split('-')
          const hours = calculateHours(startTime, endTime)

          for (const staffName of shift.assigned_staff) {
            if (staffHours[staffName]) {
              staffHours[staffName].scheduled_hours += hours
              staffHours[staffName].shifts.push({
                date: shiftDateStr, day: shift.day, shift_name: shift.shift_name,
                start_time: startTime, end_time: endTime, hours
              })
            }
          }
        }
      } catch (e) { console.error('Parse error:', e) }
    }

    const teamName = team?.name || 'Team'
    const rows = []

    rows.push(`Payroll Report - ${teamName}`)
    rows.push(`Week: ${formatDateGB(startDate)} to ${formatDateGB(weekEndStr)}`)
    rows.push(`Generated: ${formatDateGB(new Date().toISOString().split('T')[0])}`)
    rows.push('')
    rows.push('Name,Role,Contracted Hrs,Scheduled Hrs,Regular Hrs,Overtime Hrs,Rate (£/h),Total Cost (£)')

    let totalContracted = 0, totalScheduled = 0, totalRegular = 0, totalOvertime = 0, totalCost = 0

    for (const s of Object.values(staffHours)) {
      const regular = Math.min(s.scheduled_hours, s.contracted_hours)
      const overtime = Math.max(0, s.scheduled_hours - s.contracted_hours)
      const cost = Math.round(s.scheduled_hours * s.hourly_rate * 100) / 100

      totalContracted += s.contracted_hours
      totalScheduled += s.scheduled_hours
      totalRegular += regular
      totalOvertime += overtime
      totalCost += cost

      rows.push([
        `"${s.name}"`, `"${s.role}"`,
        s.contracted_hours, s.scheduled_hours,
        Math.round(regular * 10) / 10,
        Math.round(overtime * 10) / 10,
        s.hourly_rate.toFixed(2), cost.toFixed(2)
      ].join(','))
    }

    rows.push('')
    rows.push(`TOTAL,,${totalContracted},${Math.round(totalScheduled * 10) / 10},${Math.round(totalRegular * 10) / 10},${Math.round(totalOvertime * 10) / 10},,${Math.round(totalCost * 100) / 100}`)

    rows.push('')
    rows.push('')
    rows.push('SHIFT DETAIL')
    rows.push('Name,Date,Day,Shift,Start,End,Hours')

    for (const s of Object.values(staffHours)) {
      const sortedShifts = [...s.shifts].sort((a, b) => a.date.localeCompare(b.date))
      for (const shift of sortedShifts) {
        rows.push([
          `"${s.name}"`, shift.date, shift.day, `"${shift.shift_name}"`,
          shift.start_time, shift.end_time, shift.hours
        ].join(','))
      }
    }

    const csv = rows.join('\n')
    const filename = `payroll-${teamName.toLowerCase().replace(/\s+/g, '-')}-${startDate}.csv`

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error generating CSV:', error)
    return NextResponse.json({ error: 'Failed to generate CSV' }, { status: 500 })
  }
}