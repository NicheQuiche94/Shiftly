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
      // For now, return a message that OCR is coming soon
      // In future, integrate with Google Vision or AWS Textract
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

function parseCSV(csvContent) {
  const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line)
  
  if (lines.length < 2) {
    return { staff: [], shifts: [] }
  }

  // Try to detect the CSV structure
  const header = lines[0].toLowerCase()
  const staff = []
  const shifts = []

  // Check if this looks like a staff list
  if (header.includes('name') || header.includes('staff') || header.includes('employee')) {
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('staff') || h.includes('employee'))
    const hoursIdx = headers.findIndex(h => h.includes('hour') || h.includes('contract'))
    const emailIdx = headers.findIndex(h => h.includes('email'))

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length > nameIdx && values[nameIdx]) {
        staff.push({
          name: values[nameIdx].trim(),
          contracted_hours: hoursIdx >= 0 ? parseInt(values[hoursIdx]) || 0 : 0,
          email: emailIdx >= 0 ? values[emailIdx]?.trim() : '',
          availability: [true, true, true, true, true, true, true]
        })
      }
    }
  }

  // Check if this looks like a shift pattern
  if (header.includes('shift') || header.includes('time') || header.includes('start')) {
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const nameIdx = headers.findIndex(h => h.includes('shift') || h.includes('name'))
    const startIdx = headers.findIndex(h => h.includes('start'))
    const endIdx = headers.findIndex(h => h.includes('end'))
    const staffReqIdx = headers.findIndex(h => h.includes('staff') || h.includes('required') || h.includes('count'))

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values.length > 0 && values[nameIdx >= 0 ? nameIdx : 0]) {
        shifts.push({
          name: values[nameIdx >= 0 ? nameIdx : 0]?.trim() || `Shift ${i}`,
          start_time: startIdx >= 0 ? formatTime(values[startIdx]) : '09:00',
          end_time: endIdx >= 0 ? formatTime(values[endIdx]) : '17:00',
          staff_required: staffReqIdx >= 0 ? parseInt(values[staffReqIdx]) || 1 : 1,
          days_of_week: [true, true, true, true, true, false, false]
        })
      }
    }
  }

  // If we couldn't detect structure, try to extract names from first column
  if (staff.length === 0 && shifts.length === 0) {
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i])
      if (values[0] && values[0].trim()) {
        // Assume it's a staff member
        staff.push({
          name: values[0].trim(),
          contracted_hours: values[1] ? parseInt(values[1]) || 0 : 0,
          email: '',
          availability: [true, true, true, true, true, true, true]
        })
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
  // Dynamic import for xlsx library
  const XLSX = await import('xlsx')
  
  const workbook = XLSX.read(buffer, { type: 'buffer' })
  const staff = []
  const shifts = []

  // Process first sheet
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 })

  if (data.length < 2) {
    return { staff, shifts }
  }

  // Get headers from first row
  const headers = (data[0] || []).map(h => String(h || '').toLowerCase())

  // Try to find column indices
  const nameIdx = headers.findIndex(h => 
    h.includes('name') || h.includes('staff') || h.includes('employee')
  )
  const hoursIdx = headers.findIndex(h => 
    h.includes('hour') || h.includes('contract')
  )
  const emailIdx = headers.findIndex(h => h.includes('email'))
  const shiftIdx = headers.findIndex(h => h.includes('shift'))
  const startIdx = headers.findIndex(h => h.includes('start'))
  const endIdx = headers.findIndex(h => h.includes('end'))

  // Extract data rows
  for (let i = 1; i < data.length; i++) {
    const row = data[i]
    if (!row || row.length === 0) continue

    // If we have name column, treat as staff
    if (nameIdx >= 0 && row[nameIdx]) {
      const name = String(row[nameIdx]).trim()
      if (name && !staff.find(s => s.name === name)) {
        staff.push({
          name,
          contracted_hours: hoursIdx >= 0 ? parseInt(row[hoursIdx]) || 0 : 0,
          email: emailIdx >= 0 ? String(row[emailIdx] || '').trim() : '',
          availability: [true, true, true, true, true, true, true]
        })
      }
    }

    // If we have shift column, treat as shifts
    if (shiftIdx >= 0 && row[shiftIdx]) {
      const shiftName = String(row[shiftIdx]).trim()
      if (shiftName && !shifts.find(s => s.name === shiftName)) {
        shifts.push({
          name: shiftName,
          start_time: startIdx >= 0 ? formatTime(row[startIdx]) : '09:00',
          end_time: endIdx >= 0 ? formatTime(row[endIdx]) : '17:00',
          staff_required: 1,
          days_of_week: [true, true, true, true, true, false, false]
        })
      }
    }

    // Fallback: use first column as names if no headers detected
    if (nameIdx < 0 && shiftIdx < 0 && row[0]) {
      const value = String(row[0]).trim()
      if (value && !staff.find(s => s.name === value)) {
        staff.push({
          name: value,
          contracted_hours: row[1] ? parseInt(row[1]) || 0 : 0,
          email: '',
          availability: [true, true, true, true, true, true, true]
        })
      }
    }
  }

  return { staff, shifts }
}

function formatTime(value) {
  if (!value) return '09:00'
  
  // If it's already in HH:MM format
  const strValue = String(value)
  if (strValue.match(/^\d{1,2}:\d{2}$/)) {
    const [hours, mins] = strValue.split(':')
    return `${hours.padStart(2, '0')}:${mins}`
  }

  // If it's a decimal (Excel time format)
  if (typeof value === 'number' && value < 1) {
    const totalMinutes = Math.round(value * 24 * 60)
    const hours = Math.floor(totalMinutes / 60)
    const mins = totalMinutes % 60
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  // Try to extract time from string like "9:00 AM"
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