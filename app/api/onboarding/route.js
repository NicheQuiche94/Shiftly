import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const { locale_id, business_name, employee_count_range, industry } = await request.json()

    // Validate required fields
    if (!locale_id || !business_name || !employee_count_range || !industry) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { 
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

    // Update team with onboarding data
    const { error: updateError } = await supabase
      .from('Teams')
      .update({
        locale_id,
        business_name,
        employee_count_range,
        industry,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)
      .eq('user_id', userId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true }), {
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