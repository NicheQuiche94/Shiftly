import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET(request, context) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Await params in Next.js 15
    const params = await context.params
    const localeId = params.id

    // Fetch specific locale
    const { data: locale, error } = await supabase
      .from('locales')
      .select('*')
      .eq('id', localeId)
      .single()

    if (error) throw error

    if (!locale) {
      return new Response(JSON.stringify({ error: 'Locale not found' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify(locale), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching locale:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch locale' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}