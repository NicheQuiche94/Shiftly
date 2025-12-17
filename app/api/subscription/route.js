import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: subscription } = await supabase
      .from('Subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (!subscription) {
      return NextResponse.json({
        status: 'inactive',
        hasAccess: false,
        isTrialing: false,
      })
    }

    // Check if user has access
    const activeStatuses = ['active', 'trialing']
    const hasAccess = activeStatuses.includes(subscription.status)
    const isTrialing = subscription.status === 'trialing'

    return NextResponse.json({
      ...subscription,
      hasAccess,
      isTrialing,
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}