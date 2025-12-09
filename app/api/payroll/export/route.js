import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

// GET - Export rota costs as CSV
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

    // Calculate hours from the rota data
    const rotaData = rota.rota_data
    if (!rotaData || !rotaData.schedule) {
      return NextResponse.json({ error: 'Invalid rota data' }, { status: 400 })
    }

    const staffHours = {}
    const weekCount = rota.week_count || 1

    rotaData.schedule.forEach(shift => {
      const [startTime, endTime] = shift.time.split('-')
      const hours = calculateHours(startTime, endTime)
      
      shift.assigned_staff?.forEach(staffName => {
        if (!staffHours[staffName]) {
          staffHours[staffName] = {
            name: staffName,
            totalHours: 0,
            weeklyHours: {}
          }
          for (let w = 1; w <= weekCount; w++) {
            staffHours[staffName].weeklyHours[w] = 0
          }
        }
        
        const week = shift.week || 1
        staffHours[staffName].totalHours += hours
        staffHours[staffName].weeklyHours[week] += hours
      })
    })

    // Build CSV
    const rotaName = rota.rota_name || rota.name || 'Untitled'
    const startDate = rota.start_date ? new Date(rota.start_date).toLocaleDateString('en-GB') : 'N/A'
    const endDate = rota.end_date ? new Date(rota.end_date).toLocaleDateString('en-GB') : 'N/A'

    // CSV Header
    let weekHeaders = ''
    for (let w = 1; w <= weekCount; w++) {
      weekHeaders += `,Week ${w} Hours`
    }

    let csv = `Payroll Export - ${rotaName}\n`
    csv += `Period: ${startDate} to ${endDate}\n`
    csv += `Generated: ${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB')}\n\n`
    csv += `Staff Name,Pay Type,Hourly Rate,Annual Salary${weekHeaders},Total Hours,Total Cost\n`

    // CSV Data rows
    let totalCost = 0
    Object.values(staffHours).forEach(staffData => {
      const payroll = staffPayrollMap[staffData.name]
      const payType = payroll?.pay_type || 'Not Set'
      const hourlyRate = payroll?.hourly_rate || ''
      const annualSalary = payroll?.annual_salary || ''
      
      let cost = 0
      if (payroll?.pay_type === 'hourly' && payroll?.hourly_rate) {
        cost = staffData.totalHours * payroll.hourly_rate
      } else if (payroll?.pay_type === 'salary' && payroll?.annual_salary) {
        cost = (payroll.annual_salary / 52) * weekCount
      }
      totalCost += cost

      let weeklyHoursCols = ''
      for (let w = 1; w <= weekCount; w++) {
        weeklyHoursCols += `,${staffData.weeklyHours[w]?.toFixed(1) || 0}`
      }

      csv += `"${staffData.name}",${payType},${hourlyRate},${annualSalary}${weeklyHoursCols},${staffData.totalHours.toFixed(1)},${cost.toFixed(2)}\n`
    })

    csv += `\n,,,,Total Cost:,£${totalCost.toFixed(2)}\n`

    // Return as downloadable CSV
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll-${rotaName.replace(/[^a-z0-9]/gi, '-')}-${startDate.replace(/\//g, '-')}.csv"`
      }
    })
  } catch (error) {
    console.error('Error exporting payroll:', error)
    return NextResponse.json({ error: 'Failed to export payroll data' }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMins = startH * 60 + startM
  const endMins = endH * 60 + endM
  return (endMins - startMins) / 60
}