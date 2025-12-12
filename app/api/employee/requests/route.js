import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Get employee's own requests
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find staff record linked to this Clerk user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    // Get requests for this staff member
    const { data: requests, error } = await supabase
      .from('requests')
      .select('*')
      .eq('staff_id', staffMember.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json(requests)
  } catch (error) {
    console.error('Error fetching employee requests:', error)
    return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 })
  }
}

// POST - Submit a new request
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find staff record linked to this Clerk user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, team_id, user_id:team_id(user_id)')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    const body = await request.json()
    const { type, start_date, end_date, reason, shift_id, swap_with_staff_id } = body

    // Validate type
    const validTypes = ['holiday', 'sick', 'swap', 'cover']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid request type' }, { status: 400 })
    }

    if (!start_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }

    // Get the team's owner user_id for the request record
    const { data: team, error: teamError } = await supabase
      .from('Teams')
      .select('user_id')
      .eq('id', staffMember.team_id)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 })
    }

    // Create the request
    const { data, error } = await supabase
      .from('requests')
      .insert({
        user_id: team.user_id, // The manager's user_id
        team_id: staffMember.team_id,
        staff_id: staffMember.id,
        type,
        direction: 'incoming', // Employee-submitted requests are incoming
        status: 'pending',
        start_date,
        end_date: end_date || start_date,
        reason: reason || null,
        shift_id: shift_id || null,
        swap_with_staff_id: swap_with_staff_id || null
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating employee request:', error)
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}