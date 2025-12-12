import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// POST - Generate invite link for a staff member
export async function POST(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { staff_id } = body

    if (!staff_id) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    // Verify the staff member belongs to the user
    const { data: staffMember, error: staffError } = await supabase
      .from('Staff')
      .select('*, team:team_id(user_id)')
      .eq('id', staff_id)
      .single()

    if (staffError || !staffMember) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if already has an account
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'Staff member already has an account' }, { status: 400 })
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    
    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Update staff record with invite token
    const { data, error } = await supabase
      .from('Staff')
      .update({
        invite_token: inviteToken,
        invite_expires_at: expiresAt.toISOString()
      })
      .eq('id', staff_id)
      .select()
      .single()

    if (error) throw error

    // Build the invite URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const inviteUrl = `${baseUrl}/invite/${inviteToken}`

    return NextResponse.json({ 
      invite_url: inviteUrl,
      expires_at: expiresAt.toISOString(),
      staff_name: staffMember.name
    })
  } catch (error) {
    console.error('Error generating invite:', error)
    return NextResponse.json({ error: 'Failed to generate invite' }, { status: 500 })
  }
}

// GET - Validate an invite token
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find staff member with this token
    const { data: staffMember, error } = await supabase
      .from('Staff')
      .select('id, name, role, team_id, invite_expires_at, clerk_user_id')
      .eq('invite_token', token)
      .single()

    if (error || !staffMember) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    // Check if already claimed
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    }

    // Check if expired
    if (new Date(staffMember.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    return NextResponse.json({
      valid: true,
      staff_id: staffMember.id,
      staff_name: staffMember.name,
      role: staffMember.role
    })
  } catch (error) {
    console.error('Error validating invite:', error)
    return NextResponse.json({ error: 'Failed to validate invite' }, { status: 500 })
  }
}

// PUT - Accept invite (link Clerk user to staff record)
export async function PUT(request) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to accept this invite' }, { status: 401 })
    }

    const body = await request.json()
    const { token } = body

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find staff member with this token
    const { data: staffMember, error: findError } = await supabase
      .from('Staff')
      .select('id, name, invite_expires_at, clerk_user_id')
      .eq('invite_token', token)
      .single()

    if (findError || !staffMember) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 404 })
    }

    // Check if already claimed
    if (staffMember.clerk_user_id) {
      return NextResponse.json({ error: 'This invite has already been used' }, { status: 400 })
    }

    // Check if expired
    if (new Date(staffMember.invite_expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite has expired' }, { status: 400 })
    }

    // Check if this Clerk user is already linked to another staff record
    const { data: existingLink } = await supabase
      .from('Staff')
      .select('id, name')
      .eq('clerk_user_id', userId)
      .single()

    if (existingLink) {
      return NextResponse.json({ 
        error: `This account is already linked to ${existingLink.name}` 
      }, { status: 400 })
    }

    // Link the Clerk user to the staff record
    const { data, error } = await supabase
      .from('Staff')
      .update({
        clerk_user_id: userId,
        invite_token: null, // Clear the token
        invite_expires_at: null
      })
      .eq('id', staffMember.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ 
      success: true,
      message: `Welcome, ${staffMember.name}! Your account is now set up.`,
      staff_id: staffMember.id
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 })
  }
}