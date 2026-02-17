import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function generateShiftPatterns(openingHours) {
  const patterns = []
  const DEFAULT_SHIFT_LENGTH = 8 * 60

  for (const [day, data] of Object.entries(openingHours)) {
    if (!data.open) continue

    const startMins = parseInt(data.start) * 60 + parseInt(data.startMin || '0')
    let endMins = parseInt(data.end) * 60 + parseInt(data.endMin || '0')
    if (endMins <= startMins) endMins += 24 * 60

    const totalWindowMins = endMins - startMins
    const shiftMins = Math.min(DEFAULT_SHIFT_LENGTH, totalWindowMins)

    if (totalWindowMins <= shiftMins) {
      patterns.push({ day, name: 'Full Day', start: formatMins(startMins), end: formatMins(endMins) })
    } else {
      const numShifts = Math.ceil(totalWindowMins / shiftMins)
      const spacing = (totalWindowMins - shiftMins) / (numShifts - 1)
      const namesByCount = {
        2: ['Opening', 'Closing'],
        3: ['Opening', 'Mid', 'Closing'],
        4: ['Opening', 'Morning', 'Afternoon', 'Closing'],
        5: ['Opening', 'Morning', 'Mid', 'Afternoon', 'Closing']
      }
      const names = namesByCount[numShifts] || Array.from({ length: numShifts }, (_, i) => {
        if (i === 0) return 'Opening'
        if (i === numShifts - 1) return 'Closing'
        return `Shift ${i + 1}`
      })

      for (let i = 0; i < numShifts; i++) {
        const shiftStart = Math.round(startMins + (i * spacing))
        const shiftEnd = shiftStart + shiftMins
        patterns.push({ day, name: names[i], start: formatMins(shiftStart), end: formatMins(shiftEnd) })
      }
    }
  }

  return patterns
}

function formatMins(mins) {
  const normMins = ((mins % (24 * 60)) + 24 * 60) % (24 * 60)
  const h = Math.floor(normMins / 60)
  const m = normMins % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { locale_id, business_name, employee_count_range, industry, opening_hours, skip_shift_generation } = await request.json()

    if (!locale_id || !business_name || !employee_count_range || !industry) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user's default team, or create one if it doesn't exist
    let { data: teams, error: teamsError } = await supabase
      .from('Teams')
      .select('id, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .limit(1)

    if (teamsError) throw teamsError

    let teamId

    if (!teams || teams.length === 0) {
      const { data: newTeam, error: createError } = await supabase
        .from('Teams')
        .insert({
          user_id: userId,
          team_name: business_name || 'Main Team',
          is_default: true,
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (createError) throw createError
      teamId = newTeam.id
    } else {
      teamId = teams[0].id
    }

    // Update team with onboarding data
    const { error: updateError } = await supabase
      .from('Teams')
      .update({
        locale_id,
        business_name,
        employee_count_range,
        industry,
        opening_hours: opening_hours || null,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Only auto-generate shifts if the new wizard isn't handling it
    if (opening_hours && !skip_shift_generation) {
      const patterns = generateShiftPatterns(opening_hours)

      if (patterns.length > 0) {
        const { data: existingShifts } = await supabase
          .from('Shifts')
          .select('id')
          .eq('team_id', teamId)
          .limit(1)

        if (!existingShifts || existingShifts.length === 0) {
          const shiftRows = patterns.map(p => ({
            team_id: teamId,
            shift_name: p.name,
            day_of_week: p.day,
            start_time: p.start,
            end_time: p.end,
            staff_required: 1
          }))

          const { error: shiftsError } = await supabase
            .from('Shifts')
            .insert(shiftRows)

          if (shiftsError) {
            console.error('Error generating shifts:', shiftsError)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, team_id: teamId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error saving onboarding:', error)
    return new Response(JSON.stringify({ error: 'Failed to save onboarding data' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}