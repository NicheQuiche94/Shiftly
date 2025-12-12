import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Fetch requests for user's teams
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const team_id = searchParams.get('team_id')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = supabase
      .from('requests')
      .select(`
        *,
        staff:staff_id (id, name, role),
        swap_staff:swap_with_staff_id (id, name, role)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (team_id) {
      query = query.eq('team_id', team_id)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (type) {
      query = query.eq('type', type)
    }

    const { data, error } = await query

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST - Create a new request
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      team_id, 
      staff_id, 
      type,
      direction,
      start_date, 
      end_date, 
      shift_date,
      shift_id,
      swap_with_staff_id,
      reason 
    } = body

    // Validate required fields
    if (!team_id || !staff_id || !type) {
      return NextResponse.json(
        { error: 'team_id, staff_id, and type are required' }, 
        { status: 400 }
      )
    }

    // Validate type
    const validTypes = ['holiday', 'sick', 'swap', 'cover', 'availability']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid request type' }, 
        { status: 400 }
      )
    }

    // Validate direction
    const validDirections = ['incoming', 'outgoing']
    const requestDirection = direction || 'incoming'
    if (!validDirections.includes(requestDirection)) {
      return NextResponse.json(
        { error: 'Invalid direction' }, 
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: userId,
        team_id,
        staff_id,
        type,
        direction: requestDirection,
        status: 'pending',
        start_date: start_date || null,
        end_date: end_date || null,
        shift_date: shift_date || null,
        shift_id: shift_id || null,
        swap_with_staff_id: swap_with_staff_id || null,
        reason: reason || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating request:', error)
    return NextResponse.json({ error: 'Failed to create request' }, { status: 500 })
  }
}

// PUT - Update request status (approve/reject)
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, manager_notes } = body

    if (!id || !status) {
      return NextResponse.json(
        { error: 'id and status are required' }, 
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['pending', 'approved', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' }, 
        { status: 400 }
      )
    }

    const updateData = {
      status,
      updated_at: new Date().toISOString()
    }

    // If resolving the request, add resolution info
    if (status === 'approved' || status === 'rejected') {
      updateData.resolved_at = new Date().toISOString()
      updateData.resolved_by = userId
    }

    if (manager_notes !== undefined) {
      updateData.manager_notes = manager_notes
    }

    const { data, error } = await supabase
      .from('requests')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating request:', error)
    return NextResponse.json({ error: 'Failed to update request' }, { status: 500 })
  }
}

// DELETE - Delete a request
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Request ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('requests')
      .delete()
      .eq('id', id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting request:', error)
    return NextResponse.json({ error: 'Failed to delete request' }, { status: 500 })
  }
}