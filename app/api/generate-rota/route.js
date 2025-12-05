import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  // Debug: Log environment variable status (values are masked for security)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

  console.log('[DEBUG] Environment variables check:')
  console.log('  NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? `Set (${supabaseUrl.substring(0, 20)}...)` : 'MISSING')
  console.log('  SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? `Set (${supabaseKey.substring(0, 20)}...)` : 'MISSING')
  console.log('  All SUPABASE env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '))

  const supabase = supabaseUrl && supabaseKey 
    ? createClient(supabaseUrl, supabaseKey)
    : null

  if (!supabase) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    console.error('[ERROR] Missing environment variables:', missingVars)
    console.error('[ERROR] Available SUPABASE vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')))
    
    return NextResponse.json(
      { 
        error: 'Server configuration error',
        details: `Missing environment variables: ${missingVars.join(', ')}. Please add them to your .env.local file (note: must be .env.local with a dot, not env.local) for local development, or set them in Vercel for production.`
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
    console.log('Sample shift:', shiftsData[0] ? {
      id: shiftsData[0].id,
      shift_name: shiftsData[0].shift_name,
      day_of_week: shiftsData[0].day_of_week,
      day_of_week_type: typeof shiftsData[0].day_of_week,
      is_array: Array.isArray(shiftsData[0].day_of_week)
    } : 'No shifts')
    console.log('Sample staff:', staffData[0] ? {
      name: staffData[0].name,
      availability: staffData[0].availability,
      availability_type: typeof staffData[0].availability,
      is_array: Array.isArray(staffData[0].availability)
    } : 'No staff')

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

    // Generate shift patterns for a single week (the scheduler will apply these to all weeks)
    // We use the first week's dates to determine which day names to use
    const shiftPatterns = []
    for (let day = 0; day < 7; day++) {
      const currentDate = new Date(startDateObj)
      currentDate.setDate(currentDate.getDate() + day)
      const dayName = dayNames[currentDate.getDay()]

      // Handle day_of_week - it can be a string or an array
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
      // Parse availability - it can be:
      // 1. A JSON string that needs parsing
      // 2. An array of day names like ["Monday", "Tuesday"]
      // 3. An object like {monday: true, tuesday: true}
      // 4. null/undefined
      let availability = s.availability || {}
      
      if (typeof availability === 'string') {
        try {
          availability = JSON.parse(availability)
        } catch (e) {
          console.warn(`Failed to parse availability for ${s.name}:`, e)
          availability = {}
        }
      }
      
      // If availability is an array of day names, convert to object format
      if (Array.isArray(availability)) {
        const availabilityObj = {}
        availability.forEach(day => {
          if (typeof day === 'string') {
            availabilityObj[day.toLowerCase()] = true
          }
        })
        availability = availabilityObj
      }
      
      // If it's already an object, ensure all keys are lowercase
      if (typeof availability === 'object' && availability !== null && !Array.isArray(availability)) {
        const normalizedAvailability = {}
        Object.keys(availability).forEach(key => {
          normalizedAvailability[key.toLowerCase()] = availability[key]
        })
        availability = normalizedAvailability
      }
      
      // If still not an object, default to all days available
      if (typeof availability !== 'object' || availability === null || Array.isArray(availability)) {
        console.warn(`Invalid availability format for ${s.name}, defaulting to all days`)
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
      
      console.log(`Staff ${s.name} availability:`, Object.keys(availability).filter(k => availability[k]))
      
      return {
        id: s.id,
        name: s.name,
        contracted_hours: s.contracted_hours || 0,
        max_hours: s.max_hours_per_week || 48,
        availability: availability
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
      shifts: shiftPatterns,  // Only send shift patterns for one week, scheduler will apply to all weeks
      rules: formattedRules,
      weeks: weekCount
    }

    console.log('Calling Python scheduler API...')
    console.log('Scheduler input summary:', {
      staffCount: schedulerInput.staff.length,
      shiftPatternsCount: schedulerInput.shifts.length,  // Patterns for one week
      rulesCount: schedulerInput.rules.length,
      weeks: schedulerInput.weeks,
      expectedTotalShifts: schedulerInput.shifts.length * schedulerInput.weeks,
      sampleStaff: schedulerInput.staff[0] ? {
        name: schedulerInput.staff[0].name,
        availabilityType: typeof schedulerInput.staff[0].availability,
        availabilityIsObject: typeof schedulerInput.staff[0].availability === 'object' && !Array.isArray(schedulerInput.staff[0].availability)
      } : null
    })
    
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
    console.log('Scheduler schedule length:', result.schedule ? result.schedule.length : 0)
    console.log('Scheduler schedule weeks:', result.schedule ? result.schedule.map(w => w.week) : [])
    
    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          diagnostics: result.diagnostics || null
        },
        { status: 400 }
      )
    }

    // Verify we got all weeks
    if (result.schedule && result.schedule.length !== weekCount) {
      console.warn(`Expected ${weekCount} weeks but got ${result.schedule.length} weeks from scheduler`)
    }

    const formattedSchedule = []
    result.schedule.forEach(weekData => {
      console.log(`Processing week ${weekData.week} with ${weekData.shifts.length} shifts`)
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
    console.error('[ERROR] Error generating rota:', error)
    console.error('[ERROR] Error name:', error.name)
    console.error('[ERROR] Error message:', error.message)
    console.error('[ERROR] Error stack:', error.stack)
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate rota',
        details: error.toString(),
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}