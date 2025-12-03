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

  const { data, error } = await supabase
    .from('Staff')
    .select('*')
    .eq('user_id', userId)
    .order('name')

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

  const insertData = {
    user_id: userId,
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