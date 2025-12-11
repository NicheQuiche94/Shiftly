import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

// GET - Export payroll data as CSV
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
    const staffIds = staff?.map(s => s.id) || []
    let payrollData = []
    
    if (staffIds.length > 0) {
      const { data: payroll, error: payrollError } = await supabase
        .from('payroll_info')
        .select('*')
        .eq('user_id', userId)
        .in('staff_id', staffIds)

      if (!payrollError) {
        payrollData = payroll || []
      }
    }

    // Create a map of staff name to payroll info
    const staffPayrollMap = {}
    staff?.forEach(s => {
      const payroll = payrollData.find(p => p.staff_id === s.id)
      staffPayrollMap[s.name] = {
        id: s.id,
        pay_type: payroll?.pay_type || null,
        hourly_rate: payroll?.hourly_rate ? parseFloat(payroll.hourly_rate) : null,
        annual_salary: payroll?.annual_salary ? parseFloat(payroll.annual_salary) : null
      }
    })

    // Parse schedule data
    let scheduleData = rota.schedule_data
    if (typeof scheduleData === 'string') {
      scheduleData = JSON.parse(scheduleData)
    }

    let schedule = scheduleData?.schedule || scheduleData
    if (!Array.isArray(schedule)) {
      return NextResponse.json({ error: 'Invalid schedule data' }, { status: 400 })
    }

    const weekCount = rota.week_count || 1

    // Calculate hours per staff
    const staffCosts = {}
    schedule.forEach(shift => {
      if (!shift.time || !shift.assigned_staff) return
      
      const timeParts = shift.time.split('-')
      if (timeParts.length !== 2) return
      
      const [startTime, endTime] = timeParts
      const hours = calculateHours(startTime, endTime)
      
      shift.assigned_staff.forEach(staffName => {
        if (!staffName) return
        
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
          for (let w = 1; w <= weekCount; w++) {
            staffCosts[staffName].weeklyHours[w] = 0
          }
        }
        
        const week = shift.week || 1
        staffCosts[staffName].totalHours += hours
        if (staffCosts[staffName].weeklyHours[week] !== undefined) {
          staffCosts[staffName].weeklyHours[week] += hours
        }
      })
    })

    // Calculate costs
    let totalCost = 0
    Object.values(staffCosts).forEach(s => {
      if (s.payType === 'hourly' && s.hourlyRate) {
        s.cost = s.totalHours * s.hourlyRate
      } else if (s.payType === 'salary' && s.annualSalary) {
        const weeklySalary = s.annualSalary / 52
        s.cost = weeklySalary * weekCount
      }
      totalCost += s.cost || 0
    })

    // Generate CSV
    const rotaName = rota.rota_name || rota.name || 'Rota'
    const startDate = rota.start_date ? new Date(rota.start_date).toLocaleDateString('en-GB') : ''
    const endDate = rota.end_date ? new Date(rota.end_date).toLocaleDateString('en-GB') : ''

    // Build CSV header row with weekly columns
    let weeklyHeaders = ''
    for (let w = 1; w <= weekCount; w++) {
      weeklyHeaders += `,Week ${w} Hours`
    }

    let csv = `Payroll Export - ${rotaName}\n`
    csv += `Period: ${startDate} to ${endDate}\n`
    csv += `Weeks: ${weekCount}\n`
    csv += `\n`
    csv += `Staff Name,Pay Type,Hourly Rate,Annual Salary${weeklyHeaders},Total Hours,Total Cost\n`

    Object.values(staffCosts)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach(s => {
        let weeklyHoursStr = ''
        for (let w = 1; w <= weekCount; w++) {
          weeklyHoursStr += `,${(s.weeklyHours[w] || 0).toFixed(1)}`
        }
        
        const hourlyRate = s.hourlyRate ? `£${s.hourlyRate.toFixed(2)}` : ''
        const annualSalary = s.annualSalary ? `£${s.annualSalary.toFixed(2)}` : ''
        const cost = s.cost ? `£${s.cost.toFixed(2)}` : '£0.00'
        
        csv += `"${s.name}",${s.payType || 'Not Set'},${hourlyRate},${annualSalary}${weeklyHoursStr},${s.totalHours.toFixed(1)},${cost}\n`
      })

    csv += `\n`
    csv += `,,,,Total Cost:,,,£${totalCost.toFixed(2)}\n`

    // Return CSV file
    const filename = `payroll-${rotaName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${startDate.replace(/\//g, '-')}.csv`
    
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error exporting payroll:', error)
    return NextResponse.json({ error: 'Failed to export payroll' }, { status: 500 })
  }
}

function calculateHours(startTime, endTime) {
  const [startH, startM] = startTime.split(':').map(Number)
  const [endH, endM] = endTime.split(':').map(Number)
  const startMins = startH * 60 + startM
  let endMins = endH * 60 + endM
  
  if (endMins < startMins) {
    endMins += 24 * 60
  }
  
  return (endMins - startMins) / 60
}