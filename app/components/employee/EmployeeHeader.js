'use client'

import Link from 'next/link'

export default function EmployeeHeader({ onSignOut, showBackLink = false }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 font-cal">Shiftly</span>
        </div>
        {showBackLink ? (
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
            ← Back
          </Link>
        ) : (
          <button
            onClick={onSignOut}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  )
}