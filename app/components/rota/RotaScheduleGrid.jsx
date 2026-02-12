import Badge from '@/app/components/Badge'

export default function RotaScheduleGrid({ 
  rota, 
  weekCount, 
  startDate, 
  uniqueStaff,
  getStaffTeam,
  getTeamColor,
  getStaffColor,
  getStaffShiftsForDay,
  getDateForDay,
  getShortDay,
  handleShiftClick,
  handleEmptyCellClick
}) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="space-y-6 sm:space-y-8">
      {Array.from({ length: weekCount }, (_, weekIndex) => weekIndex + 1).map((weekNum) => {
        const teamsInRota = rota.teams && rota.teams.length > 0 ? rota.teams : [{ id: null, name: null }]
        const hasMultipleTeams = teamsInRota.length > 1 || (rota.teams && rota.teams.length > 1)

        return (
          <div key={weekNum} className="print:break-after-page">
            <h3 className="heading-section mb-3 sm:mb-4">
              Week {weekNum}
              <span className="body-small font-normal text-gray-500 ml-2">
                {getDateForDay(weekNum - 1, 'Monday')} - {getDateForDay(weekNum - 1, 'Sunday')}
              </span>
            </h3>
            
            {teamsInRota.map((team, teamIndex) => {
              const teamStaff = uniqueStaff.filter(staffName => {
                if (!hasMultipleTeams) return true
                return getStaffTeam(staffName) === team.name
              })

              if (teamStaff.length === 0) return null

              const teamColor = getTeamColor(teamIndex)

              return (
                <div key={team.id || 'single'} className={teamIndex > 0 ? 'mt-6 sm:mt-8' : ''}>
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
                    <div className="min-w-[640px] px-4 sm:px-0">
                      <table className="w-full border-collapse print:text-sm">
                        <thead>
                          <tr className="bg-gray-50/50">
                            <th className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 text-left body-text font-semibold text-gray-700 w-32 sm:w-44 sticky left-0 bg-gray-50 z-10">
                              Staff
                            </th>
                            {dayNames.map((day) => (
                              <th key={day} className="border border-gray-200/60 px-2 sm:px-3 py-2 sm:py-3 text-center body-text font-semibold text-gray-700 min-w-[80px] sm:min-w-[100px]">
                                <div className="sm:hidden">{getShortDay(day)}</div>
                                <div className="hidden sm:block">{day}</div>
                                <div className="caption font-normal text-gray-500 mt-0.5">
                                  {getDateForDay(weekNum - 1, day)}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamStaff.map((staffName) => {
                            const colorClass = getStaffColor(staffName)
                            
                            return (
                              <tr key={staffName} className="hover:bg-gray-50/50">
                                <td className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 bg-gray-50/30 sticky left-0 z-10">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${colorClass} flex-shrink-0`}></div>
                                    <span className="body-small truncate">{staffName}</span>
                                  </div>
                                </td>
                                
                                {dayNames.map((day) => {
                                  const shifts = getStaffShiftsForDay(staffName, day, weekNum)
                                  
                                  return (
                                    <td 
                                      key={day} 
                                      className="border border-gray-200/60 px-1 sm:px-2 py-1 sm:py-2 bg-gray-50/20"
                                    >
                                      <div className="min-h-[40px] sm:min-h-[50px] flex flex-col gap-1">
                                        {shifts.length > 0 ? (
                                          shifts.map((shift, idx) => (
                                            <button
                                              key={idx}
                                              onClick={() => handleShiftClick(
                                                staffName, 
                                                day, 
                                                shift.shift_name, 
                                                shift.time,
                                                weekNum
                                              )}
                                              className={`w-full px-1.5 sm:px-2 py-1 sm:py-1.5 ${colorClass} rounded text-center shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer print:shadow-none print:hover:scale-100`}
                                            >
                                              <span className="text-white font-medium text-[10px] sm:text-xs block truncate">
                                                {shift.shift_name}
                                              </span>
                                              <span className="text-white/80 text-[9px] sm:text-[10px] block">
                                                {shift.time}
                                              </span>
                                            </button>
                                          ))
                                        ) : (
                                          <button
                                            onClick={() => handleEmptyCellClick && handleEmptyCellClick(staffName, day, weekNum)}
                                            className="w-full h-full min-h-[40px] sm:min-h-[50px] flex items-center justify-center rounded border-2 border-dashed border-transparent hover:border-pink-300 hover:bg-pink-50/50 transition-all group cursor-pointer print:border-none print:hover:bg-transparent"
                                          >
                                            <svg 
                                              className="w-4 h-4 text-gray-300 group-hover:text-pink-400 transition-colors print:hidden" 
                                              fill="none" 
                                              viewBox="0 0 24 24" 
                                              stroke="currentColor"
                                            >
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
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
        )
      })}
    </div>
  )
}