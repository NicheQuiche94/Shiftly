import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Fetch notifications for current user
export async function GET(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data, error } = await query
    if (error) throw error

    // Also get unread count
    const { count, error: countError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_user_id', userId)
      .eq('read', false)

    if (countError) throw countError

    return NextResponse.json({ notifications: data || [], unreadCount: count || 0 })
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}

// PUT - Mark notifications as read
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationIds, markAllRead } = body

    if (markAllRead) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_user_id', userId)
        .eq('read', false)

      if (error) throw error
    } else if (notificationIds?.length > 0) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_user_id', userId)
        .in('id', notificationIds)

      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating notifications:', error)
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}

// POST - Create notification(s) — used internally by other API routes
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notifications } = body

    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      return NextResponse.json({ error: 'notifications array required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('notifications')
      .insert(notifications)
      .select()

    if (error) throw error

    return NextResponse.json({ created: data })
  } catch (error) {
    console.error('Error creating notifications:', error)
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 })
  }
}