import Badge from '@/app/components/Badge'

export default function RotaHoursTable({ 
  rota, 
  weekCount, 
  startDate,
  getTeamColor 
}) {
  const teamsInRota = rota.teams && rota.teams.length > 0 ? rota.teams : [{ id: null, name: null }]
  const hasMultipleTeams = teamsInRota.length > 1

  return (
    <div>
      <h3 className="heading-section mb-4">Staff Hours Summary</h3>
      
      <div className="space-y-6">
        {teamsInRota.map((team, teamIndex) => {
          const teamHoursReport = rota.hours_report.filter(report => {
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
                  <table className="w-full border-collapse">
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
                        const maxHoursPerWeek = report.max_hours || report.contracted
                        
                        let status = 'Under'
                        let statusVariant = 'default'
                        
                        if (Math.abs(totalScheduled - totalContracted) < 0.5) {
                          status = 'Met'
                          statusVariant = 'success'
                        } else if (totalScheduled > totalContracted) {
                          status = 'In Overtime'
                          statusVariant = 'success'
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
                              {maxHoursPerWeek}h
                            </td>
                            {report.weekly_hours.map((hours, wIdx) => (
                              <td key={wIdx} className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                <span className={`body-small font-semibold ${
                                  Math.abs(hours - report.contracted) < 0.5
                                    ? 'text-green-700'
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