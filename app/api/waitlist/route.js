import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST(request) {
  try {
    const { email, name } = await request.json()

    if (!email || !name) {
      return NextResponse.json({ error: 'Email and name are required' }, { status: 400 })
    }

    // Insert into waitlist
    const { data, error } = await supabase
      .from('waitlist')
      .insert([{ email: email.toLowerCase().trim(), name: name.trim() }])
      .select()
      .single()

    if (error) {
      // Handle duplicate email
      if (error.code === '23505') {
        return NextResponse.json({ error: 'This email is already on the waitlist' }, { status: 400 })
      }
      throw error
    }

    // TODO: Send confirmation email (optional for now)
    // await sendWaitlistConfirmation(email, name)

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Waitlist error:', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}