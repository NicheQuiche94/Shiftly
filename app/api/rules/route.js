import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    if (!teamId) {
      return Response.json({ error: 'team_id is required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('Rules')
      .select('*')
      .eq('team_id', teamId)

    if (error) {
      console.error('Error fetching rules:', error)
      throw error
    }

    return Response.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/rules:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { team_id, type, enabled, value } = body

    if (!team_id) {
      return Response.json({ error: 'team_id is required' }, { status: 400 })
    }

    // Check if rule exists
    const { data: existing, error: selectError } = await supabase
      .from('Rules')
      .select('id')
      .eq('team_id', team_id)
      .eq('type', type)
      .maybeSingle()

    if (selectError) {
      console.error('Error checking existing rule:', selectError)
      throw selectError
    }

    if (existing) {
      // Update existing rule
      const { data, error } = await supabase
        .from('Rules')
        .update({ enabled, value })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return Response.json(data)
    } else {
      // Create new rule
      const { data, error } = await supabase
        .from('Rules')
        .insert({
          team_id,
          type,
          enabled,
          value
        })
        .select()
        .single()

      if (error) throw error
      return Response.json(data)
    }
  } catch (error) {
    console.error('Error in POST /api/rules:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}