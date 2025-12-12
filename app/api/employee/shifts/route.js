import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Get employee's upcoming shifts from approved rotas
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find staff record linked to this Clerk user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get approved rotas for this team
    const today = new Date().toISOString().split('T')[0]
    
    const { data: rotas, error: rotasError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('team_id', staffMember.team_id)
      .eq('approved', true)
      .gte('end_date', today)
      .order('start_date', { ascending: true })

    if (rotasError) throw rotasError

    // Extract shifts for this employee from the rota schedule data
    const shifts = []
    
    for (const rota of rotas) {
      if (!rota.schedule_data) continue
      
      try {
        const scheduleData = typeof rota.schedule_data === 'string' 
          ? JSON.parse(rota.schedule_data) 
          : rota.schedule_data

        // scheduleData structure: { staffId: { date: [shifts] } }
        const staffSchedule = scheduleData[staffMember.id.toString()]
        
        if (staffSchedule) {
          for (const [date, dayShifts] of Object.entries(staffSchedule)) {
            // Only include future dates
            if (date >= today) {
              for (const shift of dayShifts) {
                shifts.push({
                  date,
                  shift_name: shift.shift_name || shift.name || 'Shift',
                  start_time: shift.start_time,
                  end_time: shift.end_time,
                  hours: calculateHours(shift.start_time, shift.end_time),
                  rota_id: rota.id,
                  rota_name: rota.rota_name || rota.name
                })
              }
            }
          }
        }
      } catch (parseError) {
        console.error('Error parsing schedule data:', parseError)
      }
    }

    // Sort by date
    shifts.sort((a, b) => new Date(a.date) - new Date(b.date))

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching employee shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch shifts' }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  if (minutes < 0) minutes += 24 * 60 // Handle overnight shifts
  
  return Math.round(minutes / 60 * 10) / 10 // Round to 1 decimal
}