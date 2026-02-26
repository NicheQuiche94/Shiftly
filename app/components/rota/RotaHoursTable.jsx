import Badge from '@/app/components/Badge'

export default function RotaHoursTable({ 
  rota, 
  weekCount, 
  startDate,
  getTeamColor,
  allStaff
}) {
  const teamsInRota = rota.teams && rota.teams.length > 0 ? rota.teams : [{ id: null, name: null }]
  const hasMultipleTeams = teamsInRota.length > 1

  // Calculate hours per staff per week LIVE from schedule data
  const calculateLiveHours = () => {
    if (!rota?.schedule) return {}

    const staffHours = {} // { staffName: { 1: hours, 2: hours, ... } }

    rota.schedule.forEach(shift => {
      if (!shift.assigned_staff || !shift.time) return
      const week = shift.week || 1

      // Parse time string like "09:00-17:00"
      const [start, end] = shift.time.split('-')
      if (!start || !end) return
      const [sh, sm] = start.split(':').map(Number)
      const [eh, em] = end.split(':').map(Number)
      let mins = (eh * 60 + em) - (sh * 60 + sm)
      if (mins < 0) mins += 24 * 60 // overnight shift

      const hours = mins / 60

      shift.assigned_staff.forEach(name => {
        if (!staffHours[name]) staffHours[name] = {}
        if (!staffHours[name][week]) staffHours[name][week] = 0
        staffHours[name][week] += hours
      })
    })

    return staffHours
  }

  const liveHours = calculateLiveHours()

  // Build the hours report from live data + live staff metadata
  const buildLiveReport = () => {
    const staticReport = rota.hours_report || []
    const allStaffNames = new Set()

    // Collect all staff from both sources
    staticReport.forEach(r => allStaffNames.add(r.staff_name))
    Object.keys(liveHours).forEach(name => allStaffNames.add(name))

    return Array.from(allStaffNames).map(staffName => {
      // Get static data for team info fallback
      const staticEntry = staticReport.find(r => r.staff_name === staffName) || {}
      
      // Prefer live staff data for contracted/max (always current)
      const liveStaffEntry = allStaff?.find(s => s.name === staffName)
      const contracted = liveStaffEntry?.contracted_hours ?? staticEntry.contracted ?? 0
      const maxHours = liveStaffEntry?.max_hours ?? liveStaffEntry?.contracted_hours ?? staticEntry.max_hours ?? staticEntry.contracted ?? 0

      // Build weekly hours from live calculation
      const weeklyHours = []
      for (let w = 1; w <= weekCount; w++) {
        weeklyHours.push(Math.round((liveHours[staffName]?.[w] || 0) * 10) / 10)
      }

      return {
        staff_name: staffName,
        contracted,
        max_hours: maxHours,
        team_name: staticEntry.team_name || null,
        weekly_hours: weeklyHours
      }
    }).sort((a, b) => a.staff_name.localeCompare(b.staff_name))
  }

  const liveReport = buildLiveReport()

  if (liveReport.length === 0) return null

  return (
    <div>
      <h3 className="heading-section mb-4">Staff Hours Summary</h3>
      
      <div className="space-y-6">
        {teamsInRota.map((team, teamIndex) => {
          const teamHoursReport = liveReport.filter(report => {
            if (!hasMultipleTeams) return true
            return report.team_name === team.name
          })

          if (teamHoursReport.length === 0) return null

          const teamColor = getTeamColor(teamIndex)

          return (
            <div key={team.id || 'single'}>
              {hasMultipleTeams && team.name && (
                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                  <Badge variant="info" className={`${teamColor.bg} ${teamColor.text}`}>
                    {team.name}
                  </Badge>
                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                </div>
              )}

              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="min-w-[400px] px-4 sm:px-0">
                  <table className="w-full border-collapse border border-gray-200 rounded-xl overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-200/60">
                        <th className="px-3 sm:px-6 py-3 text-left body-text font-semibold text-gray-700 sticky left-0 bg-gray-50">Staff</th>
                        <th className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">Contract</th>
                        <th className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">
                          <div>Max Hours</div>
                          <div className="caption font-normal text-gray-500 mt-0.5">Available</div>
                        </th>
                        {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => {
                          const weekStart = new Date(startDate)
                          weekStart.setDate(startDate.getDate() + ((weekNum - 1) * 7))
                          const weekLabel = weekStart.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                          
                          return (
                            <th key={weekNum} className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">
                              <div>{weekLabel}</div>
                              <div className="caption font-normal text-gray-500 mt-0.5">Week {weekNum}</div>
                            </th>
                          )
                        })}
                        <th className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/60">
                      {teamHoursReport.map((report, idx) => {
                        const totalScheduled = report.weekly_hours.reduce((sum, h) => sum + h, 0)
                        const totalContracted = report.contracted * weekCount
                        const maxHoursTotal = (report.max_hours || report.contracted) * weekCount
                        
                        let status = 'Under'
                        let statusVariant = 'default'
                        
                        if (Math.abs(totalScheduled - totalContracted) < 0.5) {
                          status = 'Met'
                          statusVariant = 'success'
                        } else if (totalScheduled > totalContracted && totalScheduled <= maxHoursTotal + 0.5) {
                          status = 'In Overtime'
                          statusVariant = 'success'
                        } else if (totalScheduled > maxHoursTotal + 0.5) {
                          status = 'Exceeds Max'
                          statusVariant = 'error'
                        }
                        
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 body-text font-medium text-gray-900 sticky left-0 bg-white">
                              {report.staff_name}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-center body-small">
                              {report.contracted}h
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-center body-small text-gray-600">
                              {report.max_hours}h
                            </td>
                            {report.weekly_hours.map((hours, wIdx) => (
                              <td key={wIdx} className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                <span className={`body-small font-semibold ${
                                  Math.abs(hours - report.contracted) < 0.5
                                    ? 'text-green-700'
                                    : hours > (report.max_hours || report.contracted)
                                    ? 'text-red-700'
                                    : hours > report.contracted
                                    ? 'text-amber-700'
                                    : 'text-gray-700'
                                }`}>
                                  {hours.toFixed(1)}h
                                </span>
                              </td>
                            ))}
                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                              <Badge 
                                variant={statusVariant}
                                size="sm"
                              >
                                {status}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}