import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Convert decimal hours to HH:MM string
function decimalToTime(dec) {
  const h = Math.floor(dec)
  const m = Math.round((dec - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Generate a readable shift name from its time
function shiftName(start, length) {
  const h = Math.floor(start)
  if (h < 12) return `Morning ${length}h`
  if (h < 17) return `Afternoon ${length}h`
  return `Evening ${length}h`
}

// Sync day_templates + week_template → Shifts table rows
async function syncShiftsFromTemplates(userId, teamId, dayTemplates, weekTemplate) {
  console.log('[SHIFT-DEBUG] syncShiftsFromTemplates called with teamId:', teamId)
  console.log('[SHIFT-DEBUG] dayTemplates:', JSON.stringify(dayTemplates))
  console.log('[SHIFT-DEBUG] weekTemplate:', JSON.stringify(weekTemplate))

  const FULL_DAYS = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday',
    Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
  }

  // Delete all existing shifts for this team
  const { error: deleteError } = await supabase
    .from('Shifts')
    .delete()
    .eq('team_id', teamId)
  console.log('[SHIFT-DEBUG] Delete existing shifts result:', deleteError ? deleteError : 'OK')

  // Generate new shifts from templates
  const shiftRows = []

  for (const [dayAbbr, dayConfig] of Object.entries(weekTemplate)) {
    console.log('[SHIFT-DEBUG] Processing day:', dayAbbr, 'config:', JSON.stringify(dayConfig))
    if (!dayConfig.on) { console.log('[SHIFT-DEBUG]   Skipped (off)'); continue }

    const templateName = dayConfig.tmpl
    const template = dayTemplates[templateName]
    console.log('[SHIFT-DEBUG]   Template lookup:', templateName, '→', template ? `${template.shifts?.length || 0} shifts` : 'NOT FOUND')
    if (!template || !template.shifts || template.shifts.length === 0) continue

    for (const shift of template.shifts) {
      const startTime = decimalToTime(shift.start)
      const endDec = shift.start + shift.length
      const endTime = decimalToTime(endDec)

      shiftRows.push({
        user_id: userId,
        team_id: teamId,
        shift_name: shiftName(shift.start, shift.length),
        day_of_week: FULL_DAYS[dayAbbr],
        start_time: startTime,
        end_time: endTime,
        staff_required: shift.headcount || 1
      })
    }
  }

  console.log('[SHIFT-DEBUG] Final shiftRows count:', shiftRows.length)
  console.log('[SHIFT-DEBUG] Final shiftRows:', JSON.stringify(shiftRows))
  console.log('[SHIFT-DEBUG] ⚠️  NOTE: user_id is NOT included in shiftRows — shifts GET filters by user_id!')

  if (shiftRows.length > 0) {
    const { data, error } = await supabase
      .from('Shifts')
      .insert(shiftRows)
      .select()

    console.log('[SHIFT-DEBUG] Supabase insert result — error:', error ? JSON.stringify(error) : 'none', '— data:', JSON.stringify(data))

    if (error) {
      console.error('Error syncing shifts from templates:', error)
      throw error
    }
  }

  return shiftRows.length
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

    const body = await request.json()
    console.log('[SHIFT-DEBUG] ONBOARDING BODY:', JSON.stringify(body))
    console.log('[SHIFT-DEBUG] day_templates present:', !!body.day_templates, '— week_template present:', !!body.week_template)
    const {
      locale_id,
      business_name,
      employee_count_range,
      industry,
      // New template-based fields
      open_time,
      close_time,
      open_buffer,
      close_buffer,
      shift_lengths,
      day_templates,
      week_template,
      // Legacy fields
      opening_hours,
      skip_shift_generation
    } = body

    if (!locale_id || !business_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: locale_id and business_name' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get or create default team
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

    // Build update object
    const updateData = {
      locale_id,
      business_name,
      onboarding_completed: true,
      updated_at: new Date().toISOString()
    }

    // Optional fields - only set if provided
    if (employee_count_range) updateData.employee_count_range = employee_count_range
    if (industry) updateData.industry = industry
    if (open_time !== undefined) updateData.open_time = open_time
    if (close_time !== undefined) updateData.close_time = close_time
    if (open_buffer !== undefined) updateData.open_buffer = open_buffer
    if (close_buffer !== undefined) updateData.close_buffer = close_buffer
    if (shift_lengths !== undefined) updateData.shift_lengths = shift_lengths
    if (day_templates !== undefined) updateData.day_templates = day_templates
    if (week_template !== undefined) updateData.week_template = week_template
    // Legacy
    if (opening_hours) updateData.opening_hours = opening_hours

    const { error: updateError } = await supabase
      .from('Teams')
      .update(updateData)
      .eq('id', teamId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Sync shifts from templates if provided
    console.log('[SHIFT-DEBUG] Gate check — day_templates:', !!day_templates, '— week_template:', !!week_template, '— will sync:', !!(day_templates && week_template))
    if (day_templates && week_template) {
      try {
        const count = await syncShiftsFromTemplates(userId, teamId, day_templates, week_template)
        console.log('[SHIFT-DEBUG] syncShiftsFromTemplates returned:', count, 'shifts created')
      } catch (syncError) {
        console.error('[SHIFT-DEBUG] Shift sync error (non-fatal):', syncError)
        // Don't fail the whole onboarding if shift sync fails
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