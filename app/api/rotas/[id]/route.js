import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET - Fetch a specific rota
export async function GET(request, context) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { data, error } = await supabase
      .from('Rotas')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', userId)
      .single()

    if (error) throw error

    return NextResponse.json({
      ...data,
      name: data.rota_name,
      rota_data: data.schedule_data
    })
  } catch (error) {
    console.error('Error fetching rota:', error)
    return NextResponse.json({ error: 'Failed to fetch rota' }, { status: 500 })
  }
}

// DELETE - Delete a specific rota
export async function DELETE(request, context) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = await context.params
    const { error } = await supabase
      .from('Rotas')
      .delete()
      .eq('id', params.id)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rota:', error)
    return NextResponse.json({ error: 'Failed to delete rota' }, { status: 500 })
  }
}