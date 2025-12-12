import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null

  if (!supabase) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    return NextResponse.json(
      { 
        error: 'Server configuration error',
        details: `Missing environment variables: ${missingVars.join(', ')}.`
      },
      { status: 500 }
    )
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, weekCount, team_id, showAllTeams } = body

    console.log('Fetching data for user:', userId)
    console.log('Team ID filter:', team_id)
    console.log('Show all teams:', showAllTeams)

    // Build queries - filter by team_id unless showAllTeams is true
    let staffQuery = supabase.from('Staff').select('*').eq('user_id', userId)
    let shiftsQuery = supabase.from('Shifts').select('*').eq('user_id', userId)
    let rulesQuery = supabase.from('Rules').select('*').eq('user_id', userId)

    // Only filter by team if team_id is provided and showAllTeams is not true
    if (team_id && !showAllTeams) {
      staffQuery = staffQuery.eq('team_id', team_id)
      shiftsQuery = shiftsQuery.eq('team_id', team_id)
      rulesQuery = rulesQuery.eq('team_id', team_id)
    }

    // Also fetch all teams for the user (for team name lookup)
    const teamsQuery = supabase.from('Teams').select('*').eq('user_id', userId)

    const [staffResult, shiftsResult, rulesResult, teamsResult] = await Promise.all([
      staffQuery,
      shiftsQuery,
      rulesQuery,
      teamsQuery
    ])

    if (staffResult.error) throw staffResult.error
    if (shiftsResult.error) throw shiftsResult.error
    if (rulesResult.error) throw rulesResult.error
    if (teamsResult.error) throw teamsResult.error

    const staffData = staffResult.data || []
    const shiftsData = shiftsResult.data || []
    const rulesData = rulesResult.data || []
    const teamsData = teamsResult.data || []

    // Create a team ID to name lookup map
    const teamNameMap = {}
    teamsData.forEach(team => {
      teamNameMap[team.id] = team.name
    })

    console.log('Staff count:', staffData.length)
    console.log('Shifts count:', shiftsData.length)
    console.log('Teams count:', teamsData.length)

    if (staffData.length === 0 || shiftsData.length === 0) {
      return NextResponse.json(
        { 
          error: 'Missing data', 
          details: staffData.length === 0 
            ? 'No staff members found for this team. Please add staff first.' 
            : 'No shifts found for this team. Please add shifts first.'
        },
        { status: 400 }
      )
    }

    const startDateObj = new Date(startDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const shiftPatterns = []
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDateObj)
      currentDate.setDate(currentDate.getDate() + day)
      const dayName = dayNames[currentDate.getDay()]

      const dayShifts = shiftsData.filter(shift => {
        const shiftDays = shift.day_of_week
        if (Array.isArray(shiftDays)) {
          return shiftDays.includes(dayName)
        } else if (typeof shiftDays === 'string') {
          return shiftDays === dayName
        }
        return false
      })
      
      dayShifts.forEach(shift => {
        shiftPatterns.push({
          id: shift.id,
          name: shift.shift_name,
          day: dayName,
          start_time: shift.start_time,
          end_time: shift.end_time,
          staff_required: shift.staff_required || 1
        })
      })
    }
    
    console.log('Shift patterns for one week:', shiftPatterns.length)
    console.log('Weeks to generate:', weekCount)

    const formattedStaff = staffData.map(s => {
      let availability = s.availability || {}
      
      if (typeof availability === 'string') {
        try {
          availability = JSON.parse(availability)
        } catch (e) {
          console.warn(`Failed to parse availability for ${s.name}:`, e)
          availability = {}
        }
      }
      
      if (Array.isArray(availability)) {
        const availabilityObj = {}
        availability.forEach(day => {
          if (typeof day === 'string') {
            availabilityObj[day.toLowerCase()] = true
          }
        })
        availability = availabilityObj
      }
      
      if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
        const normalizedAvailability = {}
        Object.keys(availability).forEach(key => {
          normalizedAvailability[key.toLowerCase()] = availability[key]
        })
        availability = normalizedAvailability
      }
      
      if (typeof availability !== 'object' || availability === null || Array.isArray(availability)) {
        availability = {
          monday: true,
          tuesday: true,
          wednesday: true,
          thursday: true,
          friday: true,
          saturday: true,
          sunday: true
        }
      }
      
      // Look up team name from the teams map
      const teamName = s.team_id ? teamNameMap[s.team_id] : null
      
      return {
        id: s.id,
        name: s.name,
        contracted_hours: s.contracted_hours || 0,
        max_hours: s.max_hours_per_week || 48,
        availability: availability,
        team_name: teamName,
        team_id: s.team_id
      }
    })

    const formattedRules = rulesData.map(r => ({
      type: r.type,
      name: r.name,
      enabled: r.enabled,
      value: r.value
    }))

    const schedulerInput = {
      staff: formattedStaff,
      shifts: shiftPatterns,
      rules: formattedRules,
      weeks: weekCount
    }

    console.log('Calling Python scheduler API...')
    
    const pythonUrl = process.env.PYTHON_SCHEDULER_URL || 'https://shiftly-scheduler-e470.onrender.com'
    const response = await fetch(`${pythonUrl}/schedule`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(schedulerInput)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Scheduler API error:', errorText)
      throw new Error(`Scheduler failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()
    console.log('Scheduler result:', result.success)
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          diagnostics: result.diagnostics || null
        },
        { status: 400 }
      )
    }

    // Create a map of staff name to team name for the response
    const staffTeamMap = {}
    formattedStaff.forEach(s => {
      staffTeamMap[s.name] = s.team_name
    })

    const formattedSchedule = []
    result.schedule.forEach(weekData => {
      weekData.shifts.forEach(shift => {
        const existingShift = formattedSchedule.find(s => 
          s.week === weekData.week &&
          s.day === shift.day &&
          s.shift_name === shift.shift_name &&
          s.time === `${shift.start_time}-${shift.end_time}`
        )

        if (existingShift) {
          if (!existingShift.assigned_staff.includes(shift.staff_name)) {
            existingShift.assigned_staff.push(shift.staff_name)
          }
        } else {
          formattedSchedule.push({
            week: weekData.week,
            day: shift.day,
            shift_name: shift.shift_name,
            time: `${shift.start_time}-${shift.end_time}`,
            assigned_staff: [shift.staff_name]
          })
        }
      })
    })

    const hoursReport = formattedStaff.map(staff => {
      const weeklyHours = []
      
      for (let week = 1; week <= weekCount; week++) {
        let totalHours = 0
        
        result.schedule.forEach(weekData => {
          if (weekData.week === week) {
            weekData.shifts.forEach(shift => {
              if (shift.staff_name === staff.name) {
                const [startH, startM] = shift.start_time.split(':').map(Number)
                const [endH, endM] = shift.end_time.split(':').map(Number)
                let hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60
                // Handle overnight shifts
                if (hours < 0) hours += 24
                totalHours += hours
              }
            })
          }
        })
        
        weeklyHours.push(totalHours)
      }

      const totalAssigned = weeklyHours.reduce((sum, h) => sum + h, 0)
      const avgWeekly = totalAssigned / weekCount

      return {
        staff_name: staff.name,
        team_name: staff.team_name,
        contracted: staff.contracted_hours,
        assigned: avgWeekly,
        weekly_hours: weeklyHours,
        status: Math.abs(avgWeekly - staff.contracted_hours) <= 0.5 ? 'Met' : 'Unmet'
      }
    })

    return NextResponse.json({
      schedule: formattedSchedule,
      hours_report: hoursReport,
      rule_compliance: result.rule_compliance || [],
      staff_team_map: staffTeamMap,  // Include team mapping for display
      summary: 'Rota generated successfully',
      generation_method: 'or_tools',
      stats: result.stats || {},
      contract_issues: result.contract_issues || []
    })

  } catch (error) {
    console.error('[ERROR] Error generating rota:', error)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate rota',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}