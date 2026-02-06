import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Get open swap/cover requests for the team
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the requesting employee
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get open requests (swap_with_staff_id is null = open to anyone)
    // Only pending, from the same team, not from the current user
    const today = new Date().toISOString().split('T')[0]

    const { data: openRequests, error } = await supabase
      .from('requests')
      .select(`
        *,
        staff:staff_id (id, name, role)
      `)
      .eq('team_id', staffMember.team_id)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .in('type', ['swap', 'cover', 'sick'])
      .gte('start_date', today)
      .neq('staff_id', staffMember.id)
      .order('start_date', { ascending: true })

    if (error) throw error

    return NextResponse.json(openRequests || [])
  } catch (error) {
    console.error('Error fetching open shifts:', error)
    return NextResponse.json({ error: 'Failed to fetch open shifts' }, { status: 500 })
  }
}

// PUT - Accept an open shift request
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { request_id } = body

    if (!request_id) {
      return NextResponse.json({ error: 'request_id required' }, { status: 400 })
    }

    // Verify the request exists, is open, and is from the same team
    const { data: openRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*')
      .eq('id', request_id)
      .eq('team_id', staffMember.team_id)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .single()

    if (fetchError || !openRequest) {
      return NextResponse.json({ error: 'Request not found or already taken' }, { status: 404 })
    }

    // Can't accept your own request
    if (openRequest.staff_id === staffMember.id) {
      return NextResponse.json({ error: 'Cannot accept your own request' }, { status: 400 })
    }

    // Update the request: set the accepting staff member and mark as approved
    const { data: updated, error: updateError } = await supabase
      .from('requests')
      .update({
        swap_with_staff_id: staffMember.id,
        status: 'approved',
        reason: `${openRequest.reason || ''} [Accepted by ${staffMember.name}]`.trim()
      })
      .eq('id', request_id)
      .select()
      .single()

    if (updateError) throw updateError

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error accepting open shift:', error)
    return NextResponse.json({ error: 'Failed to accept shift' }, { status: 500 })
  }
}