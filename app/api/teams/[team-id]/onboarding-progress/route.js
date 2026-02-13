import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, context) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const params = await context.params
    // Support both [team-id] and [teamId] folder naming
    const teamId = params['team-id'] || params.teamId

    // Verify team belongs to user
    const { data: team, error: teamError } = await supabase
      .from('Teams')
      .select('id')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single()

    if (teamError || !team) {
      return new Response(JSON.stringify({ error: 'Team not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Parallel fetch all counts
    const [staffResult, shiftResult, rulesResult] = await Promise.all([
      supabase
        .from('Staff')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId),
      supabase
        .from('Shifts')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId),
      supabase
        .from('Rules')
        .select('id')
        .eq('team_id', teamId)
        .eq('enabled', true)
        .limit(1)
    ])

    const staffCount = staffResult.count || 0
    const shiftCount = shiftResult.count || 0
    const rulesConfigured = (rulesResult.data?.length || 0) > 0

    return new Response(JSON.stringify({
      staffAdded: staffCount > 0,
      shiftsAdded: shiftCount > 0,
      rulesConfigured,
      staffCount,
      shiftCount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Onboarding progress error:', error)
    return new Response(JSON.stringify({ 
      error: 'Internal server error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}