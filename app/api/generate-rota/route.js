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

    // Fetch all teams first
    const { data: teamsData, error: teamsError } = await supabase
      .from('Teams')
      .select('*')
      .eq('user_id', userId)
    
    if (teamsError) throw teamsError

    // Build team name lookup map (using team_name column)
    const teamNameMap = {}
    teamsData.forEach(team => {
      teamNameMap[team.id] = team.team_name
    })

    const startDateObj = new Date(startDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const pythonUrl = process.env.PYTHON_SCHEDULER_URL || 'https://shiftly-scheduler-e470.onrender.com'

    // Helper function to generate rota for a single team
    async function generateForTeam(teamId, teamName) {
      const [staffResult, shiftsResult, rulesResult] = await Promise.all([
        supabase.from('Staff').select('*').eq('user_id', userId).eq('team_id', teamId),
        supabase.from('Shifts').select('*').eq('user_id', userId).eq('team_id', teamId),
        supabase.from('Rules').select('*').eq('user_id', userId).eq('team_id', teamId)
      ])

      if (staffResult.error) throw staffResult.error
      if (shiftsResult.error) throw shiftsResult.error
      if (rulesResult.error) throw rulesResult.error

      const staffData = staffResult.data || []
      const shiftsData = shiftsResult.data || []
      const rulesData = rulesResult.data || []

      if (staffData.length === 0 || shiftsData.length === 0) {
        return {
          success: true,
          skipped: true,
          teamId,
          teamName,
          reason: staffData.length === 0 ? 'No staff' : 'No shifts'
        }
      }

      // Build shift patterns
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

      const formattedStaff = staffData.map(s => {
        let availability = s.availability || {}
        
        if (typeof availability === 'string') {
          try {
            availability = JSON.parse(availability)
          } catch (e) {
            availability = {}
          }
        }
        
        if (Array.isArray(availability)) {
          const availabilityObj = {}
          availability.forEach(day => {
            if (typeof day === 'string') {
              availabilityObj[day.toLowerCase()] = { AM: true, PM: true }
            }
          })
          availability = availabilityObj
        }
        
        if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
          const normalizedAvailability = {}
          Object.keys(availability).forEach(key => {
            const val = availability[key]
            if (typeof val === 'boolean') {
              normalizedAvailability[key.toLowerCase()] = { AM: val, PM: val }
            } else if (typeof val === 'object' && val !== null) {
              normalizedAvailability[key.toLowerCase()] = val
            } else {
              normalizedAvailability[key.toLowerCase()] = { AM: true, PM: true }
            }
          })
          availability = normalizedAvailability
        }
        
        if (typeof availability !== 'object' || availability === null || Array.isArray(availability)) {
          availability = {
            monday: { AM: true, PM: true },
            tuesday: { AM: true, PM: true },
            wednesday: { AM: true, PM: true },
            thursday: { AM: true, PM: true },
            friday: { AM: true, PM: true },
            saturday: { AM: true, PM: true },
            sunday: { AM: true, PM: true }
          }
        }
        
        const contractedHours = s.contracted_hours || 0
        
        return {
          id: s.id,
          name: s.name,
          contracted_hours: contractedHours,
          max_hours: s.max_hours || contractedHours || 48,
          availability: availability,
          team_name: teamName,
          team_id: teamId
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

      const response = await fetch(`${pythonUrl}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedulerInput)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Scheduler failed for ${teamName}: ${response.status} ${errorText}`)
      }

      const result = await response.json()
      
      return {
        ...result,
        teamId,
        teamName,
        formattedStaff
      }
    }

    // Determine which teams to generate for
    let teamsToGenerate = []
    
    if (showAllTeams) {
      teamsToGenerate = teamsData.map(t => ({ 
        id: t.id, 
        name: t.team_name || `Team ${t.id}` 
      }))
    } else if (team_id) {
      const team = teamsData.find(t => t.id === team_id)
      if (team) {
        teamsToGenerate = [{ 
          id: team.id, 
          name: team.team_name || `Team ${team.id}` 
        }]
      }
    }

    if (teamsToGenerate.length === 0) {
      return NextResponse.json(
        { error: 'No teams found', details: 'Please select a team or create one first.' },
        { status: 400 }
      )
    }

    console.log('Generating rotas for teams:', teamsToGenerate.map(t => t.name).join(', '))

    // Generate rota for each team
    const teamResults = await Promise.all(
      teamsToGenerate.map(team => generateForTeam(team.id, team.name))
    )

    // Check for failures
    const failures = teamResults.filter(r => !r.success && !r.skipped)
    if (failures.length > 0) {
      return NextResponse.json(
        { 
          error: failures[0].error,
          diagnostics: failures[0].diagnostics
        },
        { status: 400 }
      )
    }

    // Merge successful results
    const successfulResults = teamResults.filter(r => r.success && !r.skipped)
    const skippedTeams = teamResults.filter(r => r.skipped)

    if (successfulResults.length === 0) {
      return NextResponse.json(
        { 
          error: 'No rotas generated',
          details: skippedTeams.length > 0 
            ? `Teams skipped: ${skippedTeams.map(t => `${t.teamName} (${t.reason})`).join(', ')}`
            : 'No valid team data found'
        },
        { status: 400 }
      )
    }

    // Combine schedules from all teams
    const combinedSchedule = []
    const staffTeamMap = {}
    const allHoursReport = []
    const allRuleCompliance = []
    const allContractIssues = []

    successfulResults.forEach(teamResult => {
      const teamName = teamResult.teamName
      const teamId = teamResult.teamId

      // Build staff-team mapping from formatted staff
      if (teamResult.formattedStaff) {
        teamResult.formattedStaff.forEach(staff => {
          staffTeamMap[staff.name] = teamName
        })
      }

      // Add team info to each shift in the schedule
      teamResult.schedule.forEach(weekData => {
        weekData.shifts.forEach(shift => {
          const existingShift = combinedSchedule.find(s => 
            s.week === weekData.week &&
            s.day === shift.day &&
            s.shift_name === shift.shift_name &&
            s.time === `${shift.start_time}-${shift.end_time}` &&
            s.team_id === teamId
          )

          if (existingShift) {
            if (!existingShift.assigned_staff.includes(shift.staff_name)) {
              existingShift.assigned_staff.push(shift.staff_name)
            }
          } else {
            combinedSchedule.push({
              week: weekData.week,
              day: shift.day,
              shift_name: shift.shift_name,
              time: `${shift.start_time}-${shift.end_time}`,
              assigned_staff: [shift.staff_name],
              team_id: teamId,
              team_name: teamName
            })
          }
        })
      })

      // Combine hours reports with team info
      if (teamResult.formattedStaff) {
        teamResult.formattedStaff.forEach(staff => {
          const weeklyHours = []
          
          for (let week = 1; week <= weekCount; week++) {
            let totalHours = 0
            
            teamResult.schedule.forEach(weekData => {
              if (weekData.week === week) {
                weekData.shifts.forEach(shift => {
                  if (shift.staff_name === staff.name) {
                    const [startH, startM] = shift.start_time.split(':').map(Number)
                    const [endH, endM] = shift.end_time.split(':').map(Number)
                    let hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60
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

          allHoursReport.push({
            staff_name: staff.name,
            team_name: teamName,
            team_id: teamId,
            contracted: staff.contracted_hours,
            max_hours: staff.max_hours || staff.contracted_hours || 48,
            assigned: avgWeekly,
            weekly_hours: weeklyHours,
            status: Math.abs(avgWeekly - staff.contracted_hours) <= 0.5 ? 'Met' : 'Unmet'
          })
        })
      }

      // Combine rule compliance with team info
      if (teamResult.rule_compliance) {
        teamResult.rule_compliance.forEach(rule => {
          allRuleCompliance.push({
            ...rule,
            team_name: teamName
          })
        })
      }

      // Combine contract issues
      if (teamResult.contract_issues) {
        teamResult.contract_issues.forEach(issue => {
          allContractIssues.push({
            ...issue,
            team_name: teamName
          })
        })
      }
    })

    // Sort schedule by team, then week, then day
    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    combinedSchedule.sort((a, b) => {
      if (a.team_name !== b.team_name) return a.team_name.localeCompare(b.team_name)
      if (a.week !== b.week) return a.week - b.week
      return dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day)
    })

    // Sort hours report by team
    allHoursReport.sort((a, b) => {
      if (a.team_name !== b.team_name) return a.team_name.localeCompare(b.team_name)
      return a.staff_name.localeCompare(b.staff_name)
    })

    // Calculate total stats
    const totalStats = {
      wall_time: successfulResults.reduce((sum, r) => sum + (r.stats?.wall_time || 0), 0),
      branches: successfulResults.reduce((sum, r) => sum + (r.stats?.branches || 0), 0),
      teams_generated: successfulResults.length,
      teams_skipped: skippedTeams.length
    }

    return NextResponse.json({
      schedule: combinedSchedule,
      hours_report: allHoursReport,
      rule_compliance: allRuleCompliance,
      staff_team_map: staffTeamMap,
      teams: teamsToGenerate,
      skipped_teams: skippedTeams,
      summary: `Rota generated for ${successfulResults.length} team${successfulResults.length > 1 ? 's' : ''}${skippedTeams.length > 0 ? ` (${skippedTeams.length} skipped)` : ''}`,
      generation_method: 'or_tools',
      stats: totalStats,
      contract_issues: allContractIssues
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