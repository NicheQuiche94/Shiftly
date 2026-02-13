import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { notifyTeam } from '@/lib/createNotification'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { team_id, all_teams, message } = body

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    if (!team_id && !all_teams) {
      return NextResponse.json({ error: 'team_id or all_teams required' }, { status: 400 })
    }

    let totalSent = 0

    if (all_teams) {
      // Get all teams owned by this manager
      const { data: teams, error: teamsError } = await supabase
        .from('Teams')
        .select('id')
        .eq('user_id', userId)

      if (teamsError) throw teamsError

      for (const team of (teams || [])) {
        const { data } = await notifyTeam({
          team_id: team.id,
          type: 'announcement',
          title: 'Team announcement',
          message: message.trim(),
          sender_user_id: userId,
        })
        totalSent += data?.length || 0
      }
    } else {
      const { data, error } = await notifyTeam({
        team_id,
        type: 'announcement',
        title: 'Team announcement',
        message: message.trim(),
        sender_user_id: userId,
      })

      if (error) throw error
      totalSent = data?.length || 0
    }

    return NextResponse.json({ success: true, sent: totalSent })
  } catch (error) {
    console.error('Error sending announcement:', error)
    return NextResponse.json({ error: 'Failed to send announcement' }, { status: 500 })
  }
}