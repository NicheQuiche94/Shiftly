import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// GET /api/auth/user-type
// Returns the user type: 'employee', 'manager', or 'unknown'
export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ type: 'unknown' }, { status: 401 })
    }

    // Check if user is an employee FIRST (has clerk_user_id in Staff table)
    const { data: staffProfile, error: staffError } = await supabase
      .from('Staff')
      .select('id, name, role')
      .eq('clerk_user_id', userId)
      .single()

    if (staffProfile && !staffError) {
      return NextResponse.json({
        type: 'employee',
        profile: {
          id: staffProfile.id,
          name: staffProfile.name,
          role: staffProfile.role
        }
      })
    }

    // Check if user is a manager (has teams)
    const { data: teams } = await supabase
      .from('Teams')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (teams && teams.length > 0) {
      return NextResponse.json({ type: 'manager' })
    }

    // New user - default to manager
    return NextResponse.json({ type: 'new' })

  } catch (error) {
    console.error('Error checking user type:', error)
    return NextResponse.json({ type: 'unknown', error: error.message }, { status: 500 })
  }
}