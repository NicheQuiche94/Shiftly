'use client'

export default function QuickActions({ onRequestTimeOff, onUpdateAvailability }) {
  return (
    <div className="grid grid-cols-2 gap-3 mb-6">
      <button
        onClick={onRequestTimeOff}
        className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-pink-200 transition-all"
      >
        <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center mb-2">
          <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <p className="font-medium text-gray-900">Request Time Off</p>
        <p className="text-xs text-gray-500">Holiday, sick, swap</p>
      </button>

      <button
        onClick={onUpdateAvailability}
        className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md hover:border-pink-200 transition-all"
      >
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="font-medium text-gray-900">My Availability</p>
        <p className="text-xs text-gray-500">Update your schedule</p>
      </button>
    </div>
  )
}