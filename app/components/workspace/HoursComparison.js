'use client'

export default function HoursComparison({ staffHours, maxStaffHours, shiftHours, hoursMatch, canFulfill, hoursDiff }) {
  return (
    <div className={`rounded-lg border px-4 sm:px-5 py-2 sm:py-3 ${
      canFulfill ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="text-center">
          <div className="text-xs text-gray-600 mb-0.5">Contracted</div>
          <div className={`text-lg sm:text-xl font-bold ${canFulfill ? 'text-green-700' : 'text-gray-900'}`}>
            {staffHours}h
          </div>
          {maxStaffHours > staffHours && (
            <div className="text-xs text-gray-500">(max {maxStaffHours}h)</div>
          )}
        </div>

        <div className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full ${
          canFulfill ? 'bg-green-200' : 'bg-red-200'
        }`}>
          {canFulfill ? (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-red-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <div className="text-center">
          <div className="text-xs text-gray-600 mb-0.5">Shifts</div>
          <div className={`text-lg sm:text-xl font-bold ${canFulfill ? 'text-green-700' : 'text-gray-900'}`}>
            {shiftHours.toFixed(0)}h
          </div>
        </div>
      </div>

      {!canFulfill && (
        <div className="text-xs text-red-700 mt-1 text-center font-medium">
          Need {Math.abs(shiftHours - maxStaffHours).toFixed(0)}h more capacity
        </div>
      )}

      {canFulfill && !hoursMatch && (
        <div className="text-xs text-green-700 mt-1 text-center">
          {hoursDiff > 0
            ? `${hoursDiff.toFixed(0)}h under contract (overtime available)`
            : `${Math.abs(hoursDiff).toFixed(0)}h overtime needed`
          }
        </div>
      )}
    </div>
  )
}