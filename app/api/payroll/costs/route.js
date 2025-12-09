import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

// GET - Calculate costs for a specific rota
export async function GET(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rotaId = searchParams.get('rota_id')

    if (!rotaId) {
      return NextResponse.json({ error: 'rota_id is required' }, { status: 400 })
    }

    // Fetch the rota
    const { data: rota, error: rotaError } = await supabase
      .from('Rotas')
      .select('*')
      .eq('id', rotaId)
      .eq('user_id', userId)
      .single()

    if (rotaError || !rota) {
      return NextResponse.json({ error: 'Rota not found' }, { status: 404 })
    }

    // Get all staff for this user
    const { data: staff, error: staffError } = await supabase
      .from('Staff')
      .select('id, name')
      .eq('user_id', userId)

    if (staffError) throw staffError

    // Get payroll info for all staff
    const staffIds = staff.map(s => s.id)
    const { data: payrollData, error: payrollError } = await supabase
      .from('payroll_info')
      .select('*')
      .eq('user_id', userId)
      .in('staff_id', staffIds)

    if (payrollError) throw payrollError

    // Create a map of staff name to payroll info
    const staffPayrollMap = {}
    staff.forEach(s => {
      const payroll = payrollData?.find(p => p.staff_id === s.id)
      staffPayrollMap[s.name] = {
        id: s.id,
        pay_type: payroll?.pay_type || null,
        hourly_rate: payroll?.hourly_rate ? parseFloat(payroll.hourly_rate) : null,
        annual_salary: payroll?.annual_salary ? parseFloat(payroll.annual_salary) : null
      }
    })

    // Calculate hours and costs from the rota data
    const rotaData = rota.rota_data
    if (!rotaData || !rotaData.schedule) {
      return NextResponse.json({ error: 'Invalid rota data' }, { status: 400 })
    }

    const staffCosts = {}
    const weekCount = rota.week_count || 1

    // Process each shift in the schedule
    rotaData.schedule.forEach(shift => {
      const [startTime, endTime] = shift.time.split('-')
      const hours = calculateHours(startTime, endTime)
      
      shift.assigned_staff?.forEach(staffName => {
        if (!staffCosts[staffName]) {
          staffCosts[staffName] = {
            name: staffName,
            totalHours: 0,
            weeklyHours: {},
            hourlyRate: staffPayrollMap[staffName]?.hourly_rate || null,
            annualSalary: staffPayrollMap[staffName]?.annual_salary || null,
            payType: staffPayrollMap[staffName]?.pay_type || null,
            cost: 0
          }
          // Initialize weekly hours
          for (let w = 1; w <= weekCount; w++) {
            staffCosts[staffName].weeklyHours[w] = 0
          }
        }
        
        const week = shift.week || 1
        staffCosts[staffName].totalHours += hours
        staffCosts[staffName].weeklyHours[week] += hours
      })
    })

    // Calculate costs
    let totalCost = 0
    Object.values(staffCosts).forEach(staff => {
      if (staff.payType === 'hourly' && staff.hourlyRate) {
        staff.cost = staff.totalHours * staff.hourlyRate
      } else if (staff.payType === 'salary' && staff.annualSalary) {
        // Calculate weekly salary based on annual
        const weeklySalary = staff.annualSalary / 52
        staff.cost = weeklySalary * weekCount
      }
      totalCost += staff.cost || 0
    })

    return NextResponse.json({
      rota_id: rotaId,
      rota_name: rota.rota_name || rota.name,
      start_date: rota.start_date,
      end_date: rota.end_date,
      week_count: weekCount,
      staff_costs: Object.values(staffCosts),
      total_cost: totalCost,
      currency: 'GBP' // Could make this configurable later
    })
  } catch (error) {
    console.error('Error calculating rota costs:', error)
    return NextResponse.json({ error: 'Failed to calculate costs' }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMins = startH * 60 + startM
  const endMins = endH * 60 + endM
  return (endMins - startMins) / 60
}