import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function PATCH(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { locale_id } = await request.json()

    if (!locale_id) {
      return new Response(JSON.stringify({ error: 'locale_id is required' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Verify locale exists
    const { data: locale, error: localeError } = await supabase
      .from('locales')
      .select('id')
      .eq('id', locale_id)
      .single()

    if (localeError || !locale) {
      return new Response(JSON.stringify({ error: 'Invalid locale_id' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get user's default team
    const { data: teams, error: teamsError } = await supabase
      .from('Teams')
      .select('id, is_default')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .limit(1)

    if (teamsError) throw teamsError

    if (!teams || teams.length === 0) {
      return new Response(JSON.stringify({ error: 'No team found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const teamId = teams[0].id

    // Update team's locale
    const { error: updateError } = await supabase
      .from('Teams')
      .update({ locale_id, updated_at: new Date().toISOString() })
      .eq('id', teamId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, locale_id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error updating locale:', error)
    return new Response(JSON.stringify({ error: 'Failed to update locale' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}