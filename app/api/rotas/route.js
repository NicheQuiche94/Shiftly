import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// GET - Fetch all rotas for the user
export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('Rotas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Map database fields to frontend expected format
    const rotas = data.map(rota => ({
      id: rota.id,
      name: rota.rota_name,
      rota_name: rota.rota_name,
      created_at: rota.created_at,
      start_date: rota.start_date,
      end_date: rota.end_date,
      week_count: rota.week_count,
      rota_data: rota.schedule_data,
      approved: rota.approved || false
    }))

    return NextResponse.json(rotas)
  } catch (error) {
    console.error('Error fetching rotas:', error)
    return NextResponse.json({ error: 'Failed to fetch rotas' }, { status: 500 })
  }
}

// POST - Create a new rota
export async function POST(request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500 })
  }

  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, rota_data, start_date, end_date, week_count, approved } = body

    if (!name || !rota_data) {
      return NextResponse.json({ 
        error: 'Missing required fields: name and rota_data' 
      }, { status: 400 })
    }

    // Insert into database with correct field names
    const { data, error } = await supabase
      .from('Rotas')
      .insert([{
        user_id: userId,
        rota_name: name,
        schedule_data: rota_data,
        start_date: start_date || null,
        end_date: end_date || null,
        week_count: week_count || null,
        approved: approved || false
      }])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      throw error
    }

    // Return with mapped field names
    return NextResponse.json({
      id: data.id,
      name: data.rota_name,
      created_at: data.created_at,
      rota_data: data.schedule_data,
      approved: data.approved
    })
  } catch (error) {
    console.error('Error saving rota:', error)
    return NextResponse.json({ 
      error: 'Failed to save rota',
      details: error.message 
    }, { status: 500 })
  }
}