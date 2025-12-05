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
    console.error('Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate rota',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}