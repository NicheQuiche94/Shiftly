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
    const teamId = params['team-id'] || params.teamId

    const { data: team, error: teamError } = await supabase
      .from('Teams')
      .select('*')
      .eq('id', teamId)
      .eq('user_id', userId)
      .single()

    if (teamError || !team) {
      return new Response(JSON.stringify({ error: 'Team not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // If this team has no opening_hours, fall back to the default team's
    if (!team.opening_hours) {
      const { data: defaultTeam } = await supabase
        .from('Teams')
        .select('opening_hours')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single()

      if (defaultTeam?.opening_hours) {
        team.opening_hours = defaultTeam.opening_hours
      }
    }

    return new Response(JSON.stringify(team), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Team fetch error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}