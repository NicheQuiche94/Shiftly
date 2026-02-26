import Link from 'next/link'

// Map error code prefixes to actionable links
function parseError(error) {
  const raw = typeof error === 'string' ? error : error?.message || 'Unknown error'
  const sep = raw.indexOf('::')
  if (sep === -1) return { code: null, message: raw, link: null }

  const code = raw.slice(0, sep)
  const message = raw.slice(sep + 2)

  const links = {
    NO_TEAMS: { href: '/dashboard/workspace', label: 'Go to Workspace' },
    NO_TEMPLATES: { href: '/dashboard/workspace?tab=templates', label: 'Go to Templates' },
    NO_SCHEDULE: { href: '/dashboard/workspace?tab=templates', label: 'Go to Templates' },
    NO_STAFF: { href: '/dashboard/workspace?tab=staff-shifts', label: 'Go to Staff & Shifts' },
    LOW_COVERAGE: { href: '/dashboard/workspace?tab=staff-shifts', label: 'Go to Staff & Shifts' },
    KEYHOLDER: { href: '/dashboard/workspace?tab=staff-shifts', label: 'Go to Staff & Shifts' },
    NO_SHIFTS: { href: '/dashboard/workspace?tab=templates', label: 'Go to Templates' },
    SYNC_FAILED: { href: '/dashboard/workspace?tab=templates', label: 'Go to Templates' },
    SCHEDULER: null,
  }

  return { code, message, link: links[code] || null }
}

export default function RotaAlerts({
    timeSaved,
    hasUnsavedChanges,
    loading,
    loadingStep,
    showAllTeams,
    error,
    rota
  }) {
    const parsed = error ? parseError(error) : null

    return (
      <>
        {timeSaved && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 sm:p-6 shadow-lg animate-fade-in no-print">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl sm:text-2xl font-bold">
                {timeSaved} minutes saved!
              </span>
            </div>
          </div>
        )}

        {hasUnsavedChanges && (
          <div className="mb-4 sm:mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-800 font-medium body-text">
                You have unsaved changes. Save or approve the rota to keep your edits.
              </span>
            </div>
          </div>
        )}

        {rota && rota.schedule && (
          <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-blue-800 body-text">
                <strong>Tap any shift</strong> to reassign, swap, or remove staff
              </span>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <p className="text-pink-900 font-medium body-text">
                {loadingStep || `Generating rota${showAllTeams ? 's for all teams' : ''}...`}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-start gap-3 mb-2">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-900 font-bold text-base mb-1">Unable to Generate Rota</p>
                <p className="text-red-800 text-sm whitespace-pre-wrap">{parsed?.message || error}</p>
              </div>
            </div>

            {/* Action link for fixable errors */}
            {parsed?.link && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <Link
                  href={parsed.link.href}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md"
                  style={{ background: '#FF1F7D' }}
                >
                  {parsed.link.label}
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                </Link>
              </div>
            )}

            {/* Scheduler diagnostics */}
            {rota?.diagnostics && rota.diagnostics.suggestions && rota.diagnostics.suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-red-200">
                <p className="text-sm font-semibold text-red-900 mb-2">How to fix:</p>
                <ul className="space-y-1.5">
                  {rota.diagnostics.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">-</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Link
                    href="/dashboard/workspace?tab=staff-shifts"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Go to Staff & Shifts →
                  </Link>
                  <Link
                    href="/dashboard/workspace?tab=templates"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                  >
                    Go to Templates →
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </>
    )
  }
