'use client'

export default function QuickActions({ onRequestTimeOff, onUpdateAvailability, onRequestSwap }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <h2 className="font-semibold text-gray-900 mb-3 font-cal text-sm sm:text-base">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={onRequestTimeOff}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 group-hover:bg-blue-200 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">Book Time Off</p>
            <p className="text-xs text-gray-500">Holiday or sick leave</p>
          </div>
        </button>

        <button
          onClick={onRequestSwap}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-pink-100 group-hover:bg-pink-200 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">Request Swap</p>
            <p className="text-xs text-gray-500">Trade shifts with team</p>
          </div>
        </button>

        <button
          onClick={onUpdateAvailability}
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-pink-300 hover:bg-pink-50 transition-all text-left group"
        >
          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-green-100 group-hover:bg-green-200 transition-colors flex-shrink-0">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">Update Availability</p>
            <p className="text-xs text-gray-500">Set your schedule</p>
          </div>
        </button>
      </div>
    </div>
  )
}