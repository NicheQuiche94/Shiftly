import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { notifyUser } from '@/lib/createNotification'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Check for stale open requests and send escalation alerts
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get manager's teams
    const { data: teams, error: teamsError } = await supabase
      .from('Teams')
      .select('id, team_name')
      .eq('user_id', userId)

    if (teamsError || !teams?.length) {
      return NextResponse.json({ escalations: [] })
    }

    const teamIds = teams.map(t => t.id)

    // Find open requests older than 24 hours that haven't been picked up
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleRequests, error: staleError } = await supabase
      .from('requests')
      .select('*, staff:staff_id (id, name)')
      .in('team_id', teamIds)
      .eq('status', 'pending')
      .is('swap_with_staff_id', null)
      .in('type', ['swap', 'cover', 'sick'])
      .lt('created_at', cutoff)
      .order('created_at', { ascending: true })

    if (staleError) throw staleError

    if (!staleRequests?.length) {
      return NextResponse.json({ escalations: [] })
    }

    // Check which ones we've already sent escalation alerts for
    const requestIds = staleRequests.map(r => r.id)

    const { data: existingAlerts } = await supabase
      .from('notifications')
      .select('related_id')
      .eq('recipient_user_id', userId)
      .eq('type', 'escalation')
      .in('related_id', requestIds)

    const alreadyAlerted = new Set((existingAlerts || []).map(a => a.related_id))

    // Send new escalation alerts
    const newEscalations = staleRequests.filter(r => !alreadyAlerted.has(r.id))

    for (const req of newEscalations) {
      const staffName = req.staff?.name || 'A team member'
      const hoursAgo = Math.round((Date.now() - new Date(req.created_at).getTime()) / (1000 * 60 * 60))

      await notifyUser({
        recipient_user_id: userId,
        team_id: req.team_id,
        type: 'escalation',
        title: `Unclaimed shift — ${staffName}`,
        message: `${req.type} request open for ${hoursAgo}h+ with no pickup. May need manual resolution.`,
        related_id: req.id,
        related_type: 'request',
      })
    }

    return NextResponse.json({
      escalations: staleRequests.map(r => ({
        id: r.id,
        type: r.type,
        staff_name: r.staff?.name,
        created_at: r.created_at,
        start_date: r.start_date,
      })),
      new_alerts_sent: newEscalations.length,
    })
  } catch (error) {
    console.error('Error checking escalations:', error)
    return NextResponse.json({ error: 'Failed to check escalations' }, { status: 500 })
  }
}