import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { spawn } from 'child_process'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function POST(request) {
  if (!supabase) {
    return Response.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, weekCount = 1 } = body

    console.log('Generate Rota Request (OR-Tools):', { userId, startDate, weekCount })

    const [staffResult, shiftsResult, rulesResult] = await Promise.all([
      supabase.from('Staff').select('*').eq('user_id', userId),
      supabase.from('Shifts').select('*').eq('user_id', userId),
      supabase.from('Rules').select('*').eq('user_id', userId)
    ])

    if (staffResult.error) throw new Error('Failed to fetch staff')
    if (shiftsResult.error) throw new Error('Failed to fetch shifts')
    if (rulesResult.error) throw new Error('Failed to fetch rules')

    const staff = staffResult.data
    const shifts = shiftsResult.data
    const rules = rulesResult.data || []

    if (!staff || staff.length === 0) {
      return Response.json({ 
        error: 'No staff found. Please add staff members first.' 
      }, { status: 400 })
    }

    if (!shifts || shifts.length === 0) {
      return Response.json({ 
        error: 'No shifts found. Please add shift patterns first.' 
      }, { status: 400 })
    }

    const schedulerInput = {
      staff: staff.map(s => {
        let availabilityObj = {}
        
        if (s.availability) {
          if (typeof s.availability === 'string') {
            try {
              const availDays = JSON.parse(s.availability)
              availDays.forEach(day => {
                availabilityObj[day.toLowerCase()] = true
              })
            } catch (e) {
              console.error('Failed to parse availability for', s.name, e)
              availabilityObj = {
                monday: true,
                tuesday: true,
                wednesday: true,
                thursday: true,
                friday: true,
                saturday: true,
                sunday: true
              }
            }
          } else if (Array.isArray(s.availability)) {
            s.availability.forEach(day => {
              availabilityObj[day.toLowerCase()] = true
            })
          } else {
            availabilityObj = s.availability
          }
        } else {
          availabilityObj = {
            monday: true,
            tuesday: true,
            wednesday: true,
            thursday: true,
            friday: true,
            saturday: true,
            sunday: true
          }
        }

        return {
          id: s.id,
          name: s.name,
          contracted_hours: s.contracted_hours || 0,
          max_hours: s.max_hours || 48,
          availability: availabilityObj
        }
      }),
      shifts: shifts.map(s => {
        const shiftDays = s.days || [s.day_of_week]
        return shiftDays.map(day => ({
          day: day,
          name: s.shift_name,
          start_time: s.start_time,
          end_time: s.end_time,
          staff_required: s.staff_required || 1
        }))
      }).flat(),
      rules: rules.map(r => ({
        type: r.type,
        name: r.name,
        enabled: r.enabled,
        value: r.value
      })),
      weeks: weekCount
    }

    console.log('Calling OR-Tools scheduler...')
    const result = await runPythonScheduler(schedulerInput)

    if (!result.success) {
      return Response.json({ 
        error: result.error || 'Failed to generate rota',
        details: result.status
      }, { status: 400 })
    }

    const schedule = []
    const staffHours = {}

    staff.forEach(s => {
      staffHours[s.name] = {}
      for (let w = 1; w <= weekCount; w++) {
        staffHours[s.name][w] = 0
      }
    })

    result.schedule.forEach(weekData => {
      weekData.shifts.forEach(shift => {
        const existingShift = schedule.find(s => 
          s.week === shift.week && 
          s.day === shift.day && 
          s.shift_name === shift.shift_name && 
          s.time === `${shift.start_time}-${shift.end_time}`
        )

        if (existingShift) {
          existingShift.assigned_staff.push(shift.staff_name)
        } else {
          schedule.push({
            week: shift.week,
            day: shift.day,
            shift_name: shift.shift_name,
            time: `${shift.start_time}-${shift.end_time}`,
            assigned_staff: [shift.staff_name]
          })
        }

        const hours = calculateHours(shift.start_time, shift.end_time)
        staffHours[shift.staff_name][shift.week] += hours
      })
    })

    const hours_report = staff.map(s => {
      const weeklyHours = []
      for (let w = 1; w <= weekCount; w++) {
        weeklyHours.push(staffHours[s.name][w] || 0)
      }
      const avgHours = weeklyHours.reduce((sum, h) => sum + h, 0) / weekCount

      return {
        staff_name: s.name,
        contracted: s.contracted_hours || 0,
        assigned: avgHours,
        weekly_hours: weeklyHours,
        status: Math.abs(avgHours - (s.contracted_hours || 0)) <= 1 ? 'Met' : 'Not Met'
      }
    })

    let summaryText = 'Rota generated successfully'
    
    if (result.contract_issues && result.contract_issues.length > 0) {
      const issuesByStaff = {}
      result.contract_issues.forEach(issue => {
        if (!issuesByStaff[issue.staff_name]) {
          issuesByStaff[issue.staff_name] = {
            contracted: issue.contracted,
            actual: issue.actual,
            reason: issue.reason
          }
        }
      })

      const uniqueIssues = Object.entries(issuesByStaff).map(([name, data]) => {
        const diff = Math.abs(data.contracted - data.actual)
        if (diff <= 1) return null
        
        return `${name} is scheduled for ${data.actual}h instead of ${data.contracted}h contracted (${data.reason})`
      }).filter(Boolean)

      if (uniqueIssues.length > 0) {
        summaryText += '. Note: ' + uniqueIssues.join('. ')
      }
    }

    return Response.json({
      schedule,
      hours_report,
      summary: summaryText,
      generation_method: 'or_tools',
      stats: result.stats,
      contract_issues: result.contract_issues,
      rule_compliance: result.rule_compliance || []
    })

  } catch (error) {
    console.error('Error generating rota:', error)
    return Response.json({ 
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  
  let startMinutes = startH * 60 + startM
  let endMinutes = endH * 60 + endM
  
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60
  }
  
  return (endMinutes - startMinutes) / 60
}

function runPythonScheduler(input) {
  return new Promise((resolve, reject) => {
    const pythonPath = 'python'
    const scriptPath = path.join(process.cwd(), 'python-scheduler', 'scheduler.py')

    console.log('Launching Python:', pythonPath, scriptPath)

    const pythonProcess = spawn(pythonPath, [scriptPath])

    let outputData = ''
    let errorData = ''

    pythonProcess.stdin.write(JSON.stringify(input))
    pythonProcess.stdin.end()

    pythonProcess.stdout.on('data', (data) => {
      outputData += data.toString()
    })

    pythonProcess.stderr.on('data', (data) => {
      errorData += data.toString()
    })

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error('Python error:', errorData)
        reject(new Error(`Python process failed: ${errorData || 'Unknown error'}`))
        return
      }

      try {
        const result = JSON.parse(outputData)
        resolve(result)
      } catch (e) {
        console.error('Failed to parse:', outputData)
        reject(new Error(`Invalid JSON from Python: ${outputData}`))
      }
    })

    pythonProcess.on('error', (error) => {
      reject(new Error(`Failed to start Python: ${error.message}`))
    })
  })
}