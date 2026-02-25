import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export async function GET(request, { params }) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data, error } = await supabase
    .from('Staff')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  if (!data) {
    return Response.json({ error: 'Staff member not found' }, { status: 404 })
  }

  return Response.json(data)
}

export async function PUT(request, { params }) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await request.json()

  // Only update fields that are explicitly provided
  const updateData = {}
  if (body.name !== undefined) updateData.name = body.name
  if (body.email !== undefined) updateData.email = body.email
  if (body.role !== undefined) updateData.role = body.role
  if (body.contracted_hours !== undefined) updateData.contracted_hours = body.contracted_hours
  if (body.max_hours !== undefined) updateData.max_hours = body.max_hours
  if (body.availability !== undefined) updateData.availability = body.availability
  if (body.hourly_rate !== undefined) updateData.hourly_rate = body.hourly_rate
  if (body.keyholder !== undefined) updateData.keyholder = body.keyholder
  if (body.preferred_shift_length !== undefined) updateData.preferred_shift_length = body.preferred_shift_length
  if (body.availability_grid !== undefined) updateData.availability_grid = body.availability_grid

  const { data, error } = await supabase
    .from('Staff')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating staff:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json(data)
}

export async function DELETE(request, { params }) {
  const { userId } = await auth()
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { error } = await supabase
    .from('Staff')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }

  return Response.json({ success: true })
}