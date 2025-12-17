import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request) {
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

    if (staffData.length === 0 || shiftsData.length === 0) {
      return NextResponse.json(
        { 
          error: 'Missing data', 
          details: staffData.length === 0 
            ? 'No staff members found' 
            : 'No shifts found'
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
      
      const contractedHours = s.contracted_hours || 0
      
      return {
        id: s.id,
        name: s.name,
        contracted_hours: contractedHours,
        max_hours: s.max_hours || contractedHours || 48,
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
      shifts: shiftPatterns,
      rules: formattedRules,
      weeks: weekCount
    }

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
      throw new Error(`Scheduler failed: ${response.status} ${errorText}`)
    }

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error,
          diagnostics: result.diagnostics || null
        },
        { status: 400 }
      )
    }

    return NextResponse.json(result)

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