import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import TeamSelector from '@/app/components/TeamSelector'
import SectionHeader from '@/app/components/SectionHeader'

export default function RotaConfigPanel({
  selectedTeamId,
  setSelectedTeamId,
  showAllTeams,
  setShowAllTeams,
  startDate,
  setStartDate,
  weekCount,
  setWeekCount
}) {
  const filterMondays = (date) => {
    return date.getDay() === 1
  }

  const getEndDate = () => {
    const end = new Date(startDate)
    end.setDate(end.getDate() + (weekCount * 7) - 1)
    return end
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  return (
    <>
      {/* Team Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
        <SectionHeader 
          title="Select Team"
          subtitle={showAllTeams 
            ? 'Generating separate rotas for each team, displayed together' 
            : 'Choose which team to generate a rota for'
          }
        />
        
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end mt-4">
          <div className="flex-1">
            <TeamSelector 
              selectedTeamId={selectedTeamId}
              onTeamChange={(teamId) => {
                setSelectedTeamId(teamId)
                if (showAllTeams) setShowAllTeams(false)
              }}
              showAddButton={false}
              disabled={showAllTeams}
            />
          </div>
          
          <button
            onClick={() => setShowAllTeams(!showAllTeams)}
            className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
              showAllTeams
                ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
                : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            All Teams
          </button>
        </div>
      </div>

      {/* Date & Week Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
        <SectionHeader title="Select Week" />
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mt-4">
          <div>
            <label className="block body-text font-semibold mb-2">
              Week Starting (Monday)
            </label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              filterDate={filterMondays}
              dateFormat="MMMM d, yyyy"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
              minDate={new Date()}
              withPortal
              portalId="date-picker-portal"
            />
            <p className="caption mt-1">Rotas must start on a Monday</p>
          </div>

          <div>
            <label className="block body-text font-semibold mb-2">
              Number of Weeks
            </label>
            <select
              value={weekCount}
              onChange={(e) => setWeekCount(parseInt(e.target.value))}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map((weeks) => (
                <option key={weeks} value={weeks}>
                  {weeks} week{weeks > 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <p className="caption mt-1">
              {weekCount} week{weekCount > 1 ? 's' : ''} - {formatDate(startDate)} - {formatDate(getEndDate())}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}