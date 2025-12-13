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

        // The schedule is in scheduleData.schedule array
        const scheduleArray = scheduleData.schedule || []
        
        // Filter shifts where this staff member is assigned (by name)
        const myShifts = scheduleArray.filter(shift => 
          shift.assigned_staff && shift.assigned_staff.includes(staffMember.name)
        )

        // Convert day + week to actual date
        const rotaStartDate = new Date(rota.start_date)
        
        for (const shift of myShifts) {
          const actualDate = getActualDate(rotaStartDate, shift.week, shift.day)
          
          // Only include future dates
          if (actualDate >= today) {
            // Parse time "17:00-23:00" into start_time and end_time
            const [startTime, endTime] = shift.time.split('-')
            
            shifts.push({
              date: actualDate,
              shift_name: shift.shift_name || 'Shift',
              start_time: startTime,
              end_time: endTime,
              hours: calculateHours(startTime, endTime),
              rota_id: rota.id,
              rota_name: rota.rota_name || rota.name
            })
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

// Convert week number and day name to actual date
function getActualDate(rotaStartDate, weekNumber, dayName) {
  const dayMap = {
    'Monday': 0,
    'Tuesday': 1,
    'Wednesday': 2,
    'Thursday': 3,
    'Friday': 4,
    'Saturday': 5,
    'Sunday': 6
  }
  
  // Clone the start date
  const date = new Date(rotaStartDate)
  
  // Add days for weeks (week 1 = 0 extra weeks)
  const weeksToAdd = (weekNumber - 1) * 7
  
  // Add days for the specific day of the week
  const dayOffset = dayMap[dayName] || 0
  
  date.setDate(date.getDate() + weeksToAdd + dayOffset)
  
  return date.toISOString().split('T')[0]
}

function calculateHours(startTime, endTime) {
  if (!startTime || !endTime) return 0
  
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)
  
  let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
  if (minutes < 0) minutes += 24 * 60 // Handle overnight shifts
  
  return Math.round(minutes / 60 * 10) / 10 // Round to 1 decimal
}