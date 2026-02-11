import { createClient } from '@supabase/supabase-js'
import { auth } from '@clerk/nextjs/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Fetch all available locales
    const { data: locales, error } = await supabase
      .from('locales')
      .select('*')
      .order('country_name', { ascending: true })

    if (error) throw error

    return new Response(JSON.stringify(locales), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error fetching locales:', error)
    return new Response(JSON.stringify({ error: 'Failed to fetch locales' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}