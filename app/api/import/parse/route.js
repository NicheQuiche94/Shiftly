import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    const fileBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(fileBuffer)

    let parsedData = { staff: [], shifts: [] }

    // Handle CSV files
    if (fileName.endsWith('.csv')) {
      parsedData = parseCSV(buffer.toString('utf-8'))
    }
    // Handle Excel files
    else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      parsedData = await parseExcel(buffer)
    }
    // Handle image files (photo of rota)
    else if (fileName.match(/\.(png|jpg|jpeg)$/)) {
      return NextResponse.json({ 
        error: 'Photo parsing coming soon! Please use Excel or CSV for now.',
        staff: [],
        shifts: []
      }, { status: 400 })
    }
    else {
      return NextResponse.json({ 
        error: 'Unsupported file type. Please use Excel (.xlsx, .xls) or CSV (.csv)' 
      }, { status: 400 })
    }

    return NextResponse.json(parsedData)
  } catch (error) {
    console.error('Error parsing file:', error)
    return NextResponse.json({ 
      error: 'Failed to parse file. Please check the format and try again.' 
    }, { status: 500 })
  }
}

// Smart fuzzy column matching
function fuzzyMatch(header, patterns) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  return patterns.some(pattern => {
    const p = pattern.toLowerCase().replace(/[^a-z0-9]/g, '')
    return h.includes(p) || p.includes(h)
  })
}

function detectColumnType(header) {
  const h = header.toLowerCase()
  
  if (fuzzyMatch(h, ['name', 'staff', 'employee', 'worker', 'person'])) return 'name'
  if (fuzzyMatch(h, ['email', 'mail', 'contact'])) return 'email'
  if (fuzzyMatch(h, ['role', 'position', 'job', 'title'])) return 'role'
  if (fuzzyMatch(h, ['contract', 'weekly', 'hours', 'contracted'])) return 'contracted_hours'
  if (fuzzyMatch(h, ['max', 'maximum', 'available'])) return 'max_hours'
  if (fuzzyMatch(h, ['hourly', 'rate', 'wage', 'pay', 'salary per hour'])) return 'hourly_rate'
  if (fuzzyMatch(h, ['annual', 'salary', 'yearly'])) return 'annual_salary'
  
  // Day detection
  if (fuzzyMatch(h, ['mon', 'monday'])) return 'day_mon'
  if (fuzzyMatch(h, ['tue', 'tuesday'])) return 'day_tue'
  if (fuzzyMatch(h, ['wed', 'wednesday'])) return 'day_wed'
  if (fuzzyMatch(h, ['thu', 'thursday'])) return 'day_thu'
  if (fuzzyMatch(h, ['fri', 'friday'])) return 'day_fri'
  if (fuzzyMatch(h, ['sat', 'saturday'])) return 'day_sat'
  if (fuzzyMatch(h, ['sun', 'sunday'])) return 'day_sun'
  
  // Shift detection
  if (fuzzyMatch(h, ['shift', 'time'])) return 'shift_name'
  if (fuzzyMatch(h, ['start', 'begin', 'from'])) return 'start_time'
  if (fuzzyMatch(h, ['end', 'finish', 'to', 'until'])) return 'end_time'
  if (fuzzyMatch(h, ['required', 'needed', 'count'])) return 'staff_required'
  
  return null
}

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line)
  
  if (lines.length < 2) {
    return { staff: [], shifts: [] }
  }

  const headers = parseCSVLine(lines[0])
  const columnTypes = headers.map(h => detectColumnType(h))
  
  console.log('Detected columns:', columnTypes)
  
  const staff = []
  const shifts = []
  
  // Check if this is a rota-style CSV (has day columns)
  const hasDayColumns = columnTypes.some(type => type?.startsWith('day_'))
  
  if (hasDayColumns) {
    // ROTA-STYLE PARSING (staff in rows, days in columns)
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      const nameIdx = columnTypes.indexOf('name')
      const emailIdx = columnTypes.indexOf('email')
      const roleIdx = columnTypes.indexOf('role')
      
      if (nameIdx >= 0 && values[nameIdx]?.trim()) {
        const staffMember = {
          name: values[nameIdx].trim(),
          email: emailIdx >= 0 ? values[emailIdx]?.trim() || '' : '',
          role: roleIdx >= 0 ? values[roleIdx]?.trim() || '' : '',
          contracted_hours: 0, // Will calculate from shifts
          max_hours: 0,
          availability: {}
        }
        
        // Extract shifts from day columns
        const dayShifts = []
        columnTypes.forEach((type, idx) => {
          if (type?.startsWith('day_')) {
            const dayName = type.replace('day_', '')
            const cellValue = values[idx]?.trim()
            
            if (cellValue && cellValue !== 'OFF' && cellValue !== '-') {
              // Parse shift time (e.g., "9-1", "9-5", "2-10")
              const match = cellValue.match(/(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?/)
              if (match) {
                const startH = match[1]
                const startM = match[2] || '00'
                const endH = match[3]
                const endM = match[4] || '00'
                
                dayShifts.push({
                  day: dayName,
                  start: `${startH.padStart(2, '0')}:${startM}`,
                  end: `${endH.padStart(2, '0')}:${endM}`,
                  original: cellValue
                })
              }
            }
          }
        })
        
        staffMember.shifts = dayShifts
        staff.push(staffMember)
        
        // Extract unique shift patterns
        dayShifts.forEach(shift => {
          const shiftName = `${shift.start}-${shift.end}`
          if (!shifts.find(s => s.name === shiftName)) {
            shifts.push({
              name: shiftName,
              start_time: shift.start,
              end_time: shift.end,
              staff_required: 1,
              days_of_week: [shift.day]
            })
          }
        })
      }
    }
  } else {
    // STAFF LIST PARSING (simple rows of staff data)
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      
      const nameIdx = columnTypes.indexOf('name')
      const emailIdx = columnTypes.indexOf('email')
      const roleIdx = columnTypes.indexOf('role')
      const contractedIdx = columnTypes.indexOf('contracted_hours')
      const maxIdx = columnTypes.indexOf('max_hours')
      const hourlyIdx = columnTypes.indexOf('hourly_rate')
      const annualIdx = columnTypes.indexOf('annual_salary')
      
      if (nameIdx >= 0 && values[nameIdx]?.trim()) {
        staff.push({
          name: values[nameIdx].trim(),
          email: emailIdx >= 0 ? values[emailIdx]?.trim() || '' : '',
          role: roleIdx >= 0 ? values[roleIdx]?.trim() || '' : '',
          contracted_hours: contractedIdx >= 0 ? parseFloat(values[contractedIdx]) || 0 : 0,
          max_hours: maxIdx >= 0 ? parseFloat(values[maxIdx]) || 0 : 0,
          hourly_rate: hourlyIdx >= 0 ? parseFloat(values[hourlyIdx]) || 0 : 0,
          annual_salary: annualIdx >= 0 ? parseFloat(values[annualIdx]) || 0 : 0
        })
      }
    }
    
    // Check for shift columns
    const shiftIdx = columnTypes.indexOf('shift_name')
    const startIdx = columnTypes.indexOf('start_time')
    const endIdx = columnTypes.indexOf('end_time')
    const reqIdx = columnTypes.indexOf('staff_required')
    
    if (shiftIdx >= 0 || startIdx >= 0) {
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i])
        
        const shiftName = shiftIdx >= 0 ? values[shiftIdx]?.trim() : `Shift ${i}`
        const startTime = startIdx >= 0 ? formatTime(values[startIdx]) : '09:00'
        const endTime = endIdx >= 0 ? formatTime(values[endIdx]) : '17:00'
        const required = reqIdx >= 0 ? parseInt(values[reqIdx]) || 1 : 1
        
        if (shiftName) {
          shifts.push({
            name: shiftName,
            start_time: startTime,
            end_time: endTime,
            staff_required: required,
            days_of_week: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
          })
        }
      }
    }
  }

  return { staff, shifts }
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

async function parseExcel(buffer) {
  const XLSX = await import('xlsx')
  
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const staff = []
  const shifts = []

  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (data.length < 2) {
    return { staff, shifts }
  }

  const headers = (data[0] || []).map(h => String(h || ''))
  const columnTypes = headers.map(h => detectColumnType(h))
  
  console.log('Excel detected columns:', columnTypes)
  
  const hasDayColumns = columnTypes.some(type => type?.startsWith('day_'))
  
  if (hasDayColumns) {
    // ROTA-STYLE
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue
      
      const nameIdx = columnTypes.indexOf('name')
      const emailIdx = columnTypes.indexOf('email')
      const roleIdx = columnTypes.indexOf('role')
      
      if (nameIdx >= 0 && row[nameIdx]) {
        const staffMember = {
          name: String(row[nameIdx]).trim(),
          email: emailIdx >= 0 ? String(row[emailIdx] || '').trim() : '',
          role: roleIdx >= 0 ? String(row[roleIdx] || '').trim() : '',
          contracted_hours: 0,
          max_hours: 0,
          shifts: []
        }
        
        columnTypes.forEach((type, idx) => {
          if (type?.startsWith('day_')) {
            const dayName = type.replace('day_', '')
            const cellValue = String(row[idx] || '').trim()
            
            if (cellValue && cellValue !== 'OFF' && cellValue !== '-') {
              const match = cellValue.match(/(\d{1,2}):?(\d{2})?-(\d{1,2}):?(\d{2})?/)
              if (match) {
                staffMember.shifts.push({
                  day: dayName,
                  start: `${match[1].padStart(2, '0')}:${match[2] || '00'}`,
                  end: `${match[3].padStart(2, '0')}:${match[4] || '00'}`
                })
              }
            }
          }
        })
        
        staff.push(staffMember)
        
        staffMember.shifts.forEach(shift => {
          const shiftName = `${shift.start}-${shift.end}`
          if (!shifts.find(s => s.name === shiftName)) {
            shifts.push({
              name: shiftName,
              start_time: shift.start,
              end_time: shift.end,
              staff_required: 1,
              days_of_week: [shift.day]
            })
          }
        })
      }
    }
  } else {
    // STAFF LIST
    for (let i = 1; i < data.length; i++) {
      const row = data[i]
      if (!row || row.length === 0) continue
      
      const nameIdx = columnTypes.indexOf('name')
      const emailIdx = columnTypes.indexOf('email')
      const roleIdx = columnTypes.indexOf('role')
      const contractedIdx = columnTypes.indexOf('contracted_hours')
      const maxIdx = columnTypes.indexOf('max_hours')
      const hourlyIdx = columnTypes.indexOf('hourly_rate')
      const annualIdx = columnTypes.indexOf('annual_salary')
      
      if (nameIdx >= 0 && row[nameIdx]) {
        staff.push({
          name: String(row[nameIdx]).trim(),
          email: emailIdx >= 0 ? String(row[emailIdx] || '').trim() : '',
          role: roleIdx >= 0 ? String(row[roleIdx] || '').trim() : '',
          contracted_hours: contractedIdx >= 0 ? parseFloat(row[contractedIdx]) || 0 : 0,
          max_hours: maxIdx >= 0 ? parseFloat(row[maxIdx]) || 0 : 0,
          hourly_rate: hourlyIdx >= 0 ? parseFloat(row[hourlyIdx]) || 0 : 0,
          annual_salary: annualIdx >= 0 ? parseFloat(row[annualIdx]) || 0 : 0
        })
      }
    }
  }

  return { staff, shifts }
}

function formatTime(value) {
  if (!value) return '09:00'
  
  const strValue = String(value)
  if (strValue.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, mins] = strValue.split(':')
    return `${hours.padStart(2, '0')}:${mins}`
  }

  if (typeof value === 'number' && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  const match = strValue.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i)
  if (match) {
    let hours = parseInt(match[1])
    const mins = match[2] ? parseInt(match[2]) : 0
    const period = match[3]?.toLowerCase()
    
    if (period === 'pm' && hours < 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  return '09:00'
}