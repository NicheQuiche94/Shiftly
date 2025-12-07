import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get team_id from query params
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('team_id')

  let query = supabase
    .from('Staff')
    .select('*')
    .eq('user_id', userId)

  // Filter by team if team_id is provided
  if (teamId) {
    query = query.eq('team_id', teamId)
  }

  const { data, error } = await query.order('name')

  if (error) {
    console.error('Error fetching staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function POST(request) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // team_id is now required
  if (!body.team_id) {
    return Response.json({ error: 'team_id is required' }, { status: 400 })
  }

  const insertData = {
    user_id: userId,
    team_id: body.team_id,
    name: body.name,
    email: body.email,
    role: body.role,
    contracted_hours: body.contracted_hours || 0,
    availability: body.availability
  }

  const { data, error } = await supabase
    .from('Staff')
    .insert(insertData)
    .select()
    .single()

  if (error) {
    console.error('Error creating staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function PUT(request) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const { data, error } = await supabase
    .from('Staff')
    .update({
      name: body.name,
      email: body.email,
      role: body.role,
      contracted_hours: body.contracted_hours,
      availability: body.availability
    })
    .eq('id', body.id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function DELETE(request) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const { error } = await supabase
    .from('Staff')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}