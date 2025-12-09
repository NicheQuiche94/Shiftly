import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

// GET - Fetch all payroll info for the user's staff
export async function GET(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('team_id')

    // First get all staff for this user (optionally filtered by team)
    let staffQuery = supabase
      .from('Staff')
      .select('id, name, contracted_hours, team_id')
      .eq('user_id', userId)
    
    if (teamId) {
      staffQuery = staffQuery.eq('team_id', teamId)
    }

    const { data: staff, error: staffError } = await staffQuery.order('name')

    if (staffError) {
      throw staffError
    }

    // Get payroll info for these staff members
    const staffIds = staff.map(s => s.id)
    
    const { data: payrollData, error: payrollError } = await supabase
      .from('payroll_info')
      .select('*')
      .eq('user_id', userId)
      .in('staff_id', staffIds)

    if (payrollError) {
      throw payrollError
    }

    // Merge staff with their payroll info
    const result = staff.map(staffMember => {
      const payroll = payrollData?.find(p => p.staff_id === staffMember.id)
      return {
        ...staffMember,
        pay_type: payroll?.pay_type || null,
        hourly_rate: payroll?.hourly_rate || null,
        annual_salary: payroll?.annual_salary || null,
        payroll_id: payroll?.id || null,
        pay_set: !!payroll
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching payroll:', error)
    return NextResponse.json({ error: 'Failed to fetch payroll data' }, { status: 500 })
  }
}

// POST - Create or update payroll info for a staff member
export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { staff_id, pay_type, hourly_rate, annual_salary } = body

    if (!staff_id) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    if (!pay_type || !['hourly', 'salary'].includes(pay_type)) {
      return NextResponse.json({ error: 'pay_type must be "hourly" or "salary"' }, { status: 400 })
    }

    // Verify the staff member belongs to this user
    const { data: staffCheck, error: staffCheckError } = await supabase
      .from('Staff')
      .select('id')
      .eq('id', staff_id)
      .eq('user_id', userId)
      .single()

    if (staffCheckError || !staffCheck) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    // Check if payroll info already exists for this staff member
    const { data: existing } = await supabase
      .from('payroll_info')
      .select('id')
      .eq('staff_id', staff_id)
      .single()

    const payrollData = {
      user_id: userId,
      staff_id,
      pay_type,
      hourly_rate: pay_type === 'hourly' ? hourly_rate : null,
      annual_salary: pay_type === 'salary' ? annual_salary : null,
      updated_at: new Date().toISOString()
    }

    let result
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('payroll_info')
        .update(payrollData)
        .eq('id', existing.id)
        .select()
        .single()
      
      if (error) throw error
      result = data
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('payroll_info')
        .insert(payrollData)
        .select()
        .single()
      
      if (error) throw error
      result = data
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error saving payroll:', error)
    return NextResponse.json({ error: 'Failed to save payroll data' }, { status: 500 })
  }
}

// DELETE - Remove payroll info for a staff member
export async function DELETE(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const staffId = searchParams.get('staff_id')

    if (!staffId) {
      return NextResponse.json({ error: 'staff_id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('payroll_info')
      .delete()
      .eq('staff_id', staffId)
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payroll:', error)
    return NextResponse.json({ error: 'Failed to delete payroll data' }, { status: 500 })
  }
}