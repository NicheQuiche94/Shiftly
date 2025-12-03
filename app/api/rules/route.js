import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET() {
  if (!supabase) {
    return Response.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('Rules')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching rules:', error)
      throw error
    }

    console.log('Fetched rules for user:', userId, data)
    return Response.json(data || [])
  } catch (error) {
    console.error('Error in GET /api/rules:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request) {
  if (!supabase) {
    return Response.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, name, enabled, value } = body

    console.log('Saving rule:', { userId, type, name, enabled, value })

    // Check if rule exists - use maybeSingle() to handle zero results gracefully
    const { data: existing, error: selectError } = await supabase
      .from('Rules')
      .select('id')
      .eq('user_id', userId)
      .eq('type', type)
      .maybeSingle()

    if (selectError) {
      console.error('Error checking existing rule:', selectError)
      throw selectError
    }

    if (existing) {
      console.log('Updating existing rule:', existing.id)
      // Update existing rule
      const { data, error } = await supabase
        .from('Rules')
        .update({
          name,
          enabled,
          value
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating rule:', error)
        throw error
      }
      
      console.log('Rule updated successfully:', data)
      return Response.json(data)
    } else {
      console.log('Creating new rule')
      // Create new rule
      const { data, error } = await supabase
        .from('Rules')
        .insert({
          user_id: userId,
          type,
          name,
          enabled,
          value
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating rule:', error)
        throw error
      }
      
      console.log('Rule created successfully:', data)
      return Response.json(data)
    }
  } catch (error) {
    console.error('Error in POST /api/rules:', error)
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 })
  }
}