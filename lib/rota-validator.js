export function validateRota(schedule) {
  const issues = []
  const warnings = []
  
  // Group shifts by staff member
  const staffSchedules = {}
  
  schedule.forEach(shift => {
    shift.assigned_staff?.forEach(staffName => {
      if (!staffSchedules[staffName]) {
        staffSchedules[staffName] = []
      }
      staffSchedules[staffName].push({
        day: shift.day,
        week: shift.week || 1,
        shift_name: shift.shift_name,
        time: shift.time
      })
    })
  })
  
  // Check for overlapping shifts on same day
  Object.entries(staffSchedules).forEach(([staffName, shifts]) => {
    // Group by week and day
    const shiftsByWeekAndDay = {}
    shifts.forEach(shift => {
      const key = `${shift.week}-${shift.day}`
      if (!shiftsByWeekAndDay[key]) {
        shiftsByWeekAndDay[key] = []
      }
      shiftsByWeekAndDay[key].push(shift)
    })
    
    // Check each day for overlaps
    Object.entries(shiftsByWeekAndDay).forEach(([weekDay, dayShifts]) => {
      // DEDUPLICATE: Remove duplicate shifts (same shift_name and time)
      const uniqueShifts = []
      const seen = new Set()
      
      dayShifts.forEach(shift => {
        const key = `${shift.shift_name}-${shift.time}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueShifts.push(shift)
        }
      })
      
      // Only check for overlaps if there are 2+ UNIQUE shifts
      if (uniqueShifts.length > 1) {
        // Parse times and check for overlaps
        const timeRanges = uniqueShifts.map(s => {
          const [start, end] = s.time.split('-')
          return {
            shift: s.shift_name,
            start: parseTime(start),
            end: parseTime(end)
          }
        })
        
        // Check each pair
        for (let i = 0; i < timeRanges.length; i++) {
          for (let j = i + 1; j < timeRanges.length; j++) {
            const a = timeRanges[i]
            const b = timeRanges[j]
            
            // Check if they overlap
            if (a.start < b.end && b.start < a.end) {
              const [week, day] = weekDay.split('-')
              issues.push({
                type: 'overlapping_shifts',
                severity: 'critical',
                message: `${staffName} has overlapping shifts on ${day}: ${a.shift} (${formatTime(a.start)}-${formatTime(a.end)}) and ${b.shift} (${formatTime(b.start)}-${formatTime(b.end)})`
              })
            }
          }
        }
      }
    })
  })
  
  return {
    isValid: issues.length === 0,
    issues,
    warnings,
    staffSchedules
  }
}

// Helper: Parse time string to minutes since midnight
function parseTime(timeStr) {
  const [hours, minutes] = timeStr.trim().split(':').map(Number)
  return hours * 60 + minutes
}

// Helper: Format minutes since midnight back to HH:MM
function formatTime(minutes) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

// Calculate total hours for a staff member
export function calculateStaffHours(shifts) {
  let totalMinutes = 0
  
  shifts.forEach(shift => {
    const [start, end] = shift.time.split('-')
    const startMins = parseTime(start)
    const endMins = parseTime(end)
    totalMinutes += (endMins - startMins)
  })
  
  return totalMinutes / 60 // Convert to hours
}