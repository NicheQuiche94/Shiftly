import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { notifyUser } from '@/lib/createNotification'

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

    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, team_id')
      .eq('clerk_user_id', userId)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

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

    const { data: openRequest, error: fetchError } = await supabase
      .from('requests')
      .select('*, staff:staff_id (id, name, clerk_user_id)')
      .eq('id', request_id)
      .eq('team_id', staffMember.team_id)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .single()

    if (fetchError || !openRequest) {
      return NextResponse.json({ error: 'Request not found or already taken' }, { status: 404 })
    }

    if (openRequest.staff_id === staffMember.id) {
      return NextResponse.json({ error: 'Cannot accept your own request' }, { status: 400 })
    }

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

    // ── MSG-04: Notify original requester that their shift was picked up ──
    try {
      const requesterName = openRequest.staff?.name || 'Someone'
      const requestType = openRequest.type === 'swap' ? 'swap' : 'cover'

      // Notify the original requester
      if (openRequest.staff?.clerk_user_id) {
        await notifyUser({
          recipient_user_id: openRequest.staff.clerk_user_id,
          recipient_staff_id: openRequest.staff.id,
          team_id: staffMember.team_id,
          type: requestType === 'swap' ? 'swap_picked_up' : 'cover_picked_up',
          title: `${staffMember.name} picked up your ${requestType}`,
          message: `For ${openRequest.start_date || 'your shift'} — sorted!`,
          related_id: request_id,
          related_type: 'request',
        })
      }

      // Notify the manager too
      const { data: team } = await supabase
        .from('Teams')
        .select('user_id')
        .eq('id', staffMember.team_id)
        .single()

      if (team?.user_id && team.user_id !== userId) {
        await notifyUser({
          recipient_user_id: team.user_id,
          team_id: staffMember.team_id,
          type: requestType === 'swap' ? 'swap_picked_up' : 'cover_picked_up',
          title: `${staffMember.name} covered ${requesterName}'s shift`,
          message: `${openRequest.start_date || 'Shift'} — resolved peer-to-peer`,
          related_id: request_id,
          related_type: 'request',
        })
      }
    } catch (notifError) {
      console.error('Failed to send notification:', notifError)
    }

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error accepting open shift:', error)
    return NextResponse.json({ error: 'Failed to accept shift' }, { status: 500 })
  }
}