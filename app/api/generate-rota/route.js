import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { startDate, weekCount } = body

    console.log('Fetching data for user:', userId)

    const [staffResult, shiftsResult, rulesResult] = await Promise.all([
      supabase.from('Staff').select('*').eq('user_id', userId),
      supabase.from('Shifts').select('*').eq('user_id', userId),
      supabase.from('Rules').select('*').eq('user_id', userId)
    ])

    if (staffResult.error) throw staffResult.error
    if (shiftsResult.error) throw shiftsResult.error
    if (rulesResult.error) throw rulesResult.error

    const staffData = staffResult.data || []
    const shiftsData = shiftsResult.data || []
    const rulesData = rulesResult.data || []

    console.log('Staff count:', staffData.length)
    console.log('Shifts count:', shiftsData.length)

    if (staffData.length === 0 || shiftsData.length === 0) {
      return NextResponse.json(
        { 
          error: 'Missing data', 
          details: staffData.length === 0 
            ? 'No staff members found. Please add staff first.' 
            : 'No shifts found. Please add shifts first.'
        },
        { status: 400 }
      )
    }

    const startDateObj = new Date(startDate)
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

    const allShifts = []
    for (let week = 0; week < weekCount; week++) {
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDateObj)
        currentDate.setDate(currentDate.getDate() + (week * 7) + day)
        const dayName = dayNames[currentDate.getDay()]

        const dayShifts = shiftsData.filter(s => s.day === dayName)
        dayShifts.forEach(shift => {
          allShifts.push({
            id: shift.id,
            name: shift.shift_name,
            day: dayName,
            start_time: shift.start_time,
            end_time: shift.end_time,
            staff_required: shift.staff_required || 1
          })
        })
      }
    }

    const formattedStaff = staffData.map(s => ({
      id: s.id,
      name: s.name,
      contracted_hours: s.contracted_hours || 0,
      max_hours: s.max_hours_per_week || 48,
      availability: s.availability || {}
    }))

    const formattedRules = rulesData.map(r => ({
      type: r.type,
      name: r.name,
      enabled: r.enabled,
      value: r.value
    }))

    const schedulerInput = {
      staff: formattedStaff,
      shifts: allShifts,
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
                const hours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60
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
      summary: 'Rota generated successfully',
      generation_method: 'or_tools',
      stats: result.stats || {},
      contract_issues: result.contract_issues || []
    })

  } catch (error) {
    console.error('Error generating rota:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate rota',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}