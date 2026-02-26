import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// PUT - Update employee's availability
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find staff record linked to this Clerk user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { availability, availability_grid } = body

    if (!availability && !availability_grid) {
      return NextResponse.json({ error: 'Availability data is required' }, { status: 400 })
    }

    // Update the staff record — prefer availability_grid (shift-based matrix)
    const updateData = {}
    if (availability_grid) updateData.availability_grid = availability_grid
    if (availability) updateData.availability = availability

    const { data, error } = await supabase
      .from('Staff')
      .update(updateData)
      .eq('id', staffMember.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating availability:', error)
    return NextResponse.json({ error: 'Failed to update availability' }, { status: 500 })
  }
}