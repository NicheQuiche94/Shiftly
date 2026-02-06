import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Get eligible swap partners for a given date
// Query: ?date=2026-02-10&shift_name=Close
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json({ error: 'date parameter required' }, { status: 400 })
    }

    // Find the requesting employee
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get all team members except the requester
    const { data: teammates, error: teamError } = await supabase
      .from('Staff')
      .select('id, name, role')
      .eq('team_id', staffMember.team_id)
      .neq('id', staffMember.id)
      .order('name')

    if (teamError) throw teamError

    // Get approved rotas covering this date
    const { data: rotas, error: rotasError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('team_id', staffMember.team_id)
      .eq('approved', true)
      .lte('start_date', date)
      .gte('end_date', date)

    if (rotasError) throw rotasError

    // Build a map of who is working what on this date
    const colleagueShifts = []

    for (const rota of rotas) {
      if (!rota.schedule_data) continue

      try {
        const scheduleData = typeof rota.schedule_data === 'string'
          ? JSON.parse(rota.schedule_data)
          : rota.schedule_data

        const scheduleArray = scheduleData.schedule || []

        // Figure out which week/day this date falls on in the rota
        const rotaStart = new Date(rota.start_date)
        const targetDate = new Date(date)
        const diffDays = Math.round((targetDate - rotaStart) / (1000 * 60 * 60 * 24))
        const weekNumber = Math.floor(diffDays / 7) + 1
        const dayIndex = diffDays % 7
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        const targetDay = dayNames[dayIndex]

        // Find all shifts on this day
        const dayShifts = scheduleArray.filter(s =>
          s.week === weekNumber && s.day === targetDay
        )

        // Map each shift to staff members
        for (const shift of dayShifts) {
          if (!shift.assigned_staff) continue

          for (const staffName of shift.assigned_staff) {
            // Skip the requester
            if (staffName === staffMember.name) continue

            const teammate = teammates.find(t => t.name === staffName)
            if (!teammate) continue

            const [startTime, endTime] = shift.time.split('-')

            colleagueShifts.push({
              staff_id: teammate.id,
              staff_name: teammate.name,
              role: teammate.role,
              shift_name: shift.shift_name || 'Shift',
              start_time: startTime,
              end_time: endTime,
              hours: calculateHours(startTime, endTime)
            })
          }
        }
      } catch (parseError) {
        console.error('Error parsing schedule data:', parseError)
      }
    }

    // Also include teammates who are NOT working (available for cover)
    const workingStaffIds = new Set(colleagueShifts.map(s => s.staff_id))
    const availableStaff = teammates
      .filter(t => !workingStaffIds.has(t.id))
      .map(t => ({
        staff_id: t.id,
        staff_name: t.name,
        role: t.role,
        shift_name: null,
        start_time: null,
        end_time: null,
        hours: 0
      }))

    return NextResponse.json({
      working: colleagueShifts,
      available: availableStaff
    })
  } catch (error) {
    console.error('Error fetching swap options:', error)
    return NextResponse.json({ error: 'Failed to fetch swap options' }, { status: 500 })
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