import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET - Get current user's staff profile
export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find staff record linked to this Clerk user
    const { data: staffMember, error } = await supabase
      .from('Staff')
      .select('*')
      .eq('clerk_user_id', userId)
      .single()

    if (error || !staffMember) {
      return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 })
    }

    return NextResponse.json(staffMember)
  } catch (error) {
    console.error('Error fetching employee profile:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}