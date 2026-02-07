'use client'

import Link from 'next/link'
import Image from 'next/image'
import NotificationBell from '@/app/components/NotificationBell'

export default function EmployeeHeader({ onSignOut, showBackLink = false }) {
  return (
    <header className="bg-gradient-to-r from-pink-500 to-pink-600 sticky top-0 z-40">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/employee" className="flex items-center gap-2">
          <Image
            src="/logo-white.svg"
            alt="Shiftly"
            width={32}
            height={32}
            className="flex-shrink-0"
          />
          <span className="font-semibold text-white text-lg font-cal">Shiftly</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell variant="employee" />
          {showBackLink ? (
            <Link href="/" className="text-sm text-white/80 hover:text-white transition-colors ml-1">
              ← Back
            </Link>
          ) : (
            <button
              onClick={onSignOut}
              className="text-sm text-white/80 hover:text-white transition-colors ml-1"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </header>
  )
}