'use client'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

function getAvailabilityDisplay(availabilityString) {
  // No availability set = available all days (default)
  if (!availabilityString) return 'All days'

  try {
    const parsed = JSON.parse(availabilityString)
    let fullDays = 0
    let partialDays = 0
    let offDays = 0

    daysOfWeek.forEach(day => {
      const d = parsed[day]
      if (!d) { fullDays++; return } // Missing day = available all day

      // New time-window format: { available: true/false, start?, end? }
      if (typeof d === 'object' && 'available' in d) {
        if (!d.available) offDays++
        else if (d.start || d.end) partialDays++
        else fullDays++
        return
      }

      // Legacy boolean format
      if (typeof d === 'boolean') {
        if (d) fullDays++
        else offDays++
        return
      }

      // Legacy AM/PM format
      const am = d.AM ?? false
      const pm = d.PM ?? false
      if (am && pm) fullDays++
      else if (am || pm) partialDays++
      else offDays++
    })

    if (fullDays === 7) return 'All days'
    if (offDays === 7) return 'Unavailable'
    if (fullDays === 0 && partialDays === 0) return 'Unavailable'

    const parts = []
    if (fullDays > 0) parts.push(`${fullDays} days`)
    if (partialDays > 0) parts.push(`${partialDays} partial`)
    return parts.join(', ')
  } catch {
    return 'All days'
  }
}

export default function StaffTable({ staff, isLoading, onEdit, onDelete, onInvite, isDeleting, isInviting }) {
  return (
    <div className="bg-white rounded-xl border border-pink-200 overflow-hidden">
      {/* Desktop header */}
      <div className="hidden md:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200/60">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide sticky left-0 bg-gray-50">Name</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Role</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Availability</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Hours/Week</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wide">Status</th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/60">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto" />
                </td>
              </tr>
            ) : staff.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
                    <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No staff members yet</p>
                  <p className="text-sm text-gray-500">Add your first team member to get started</p>
                </td>
              </tr>
            ) : (
              staff.map((member, idx) => (
                <tr key={member.id} className={`hover:bg-gray-50/50 transition-colors ${idx % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                  {/* Name - white bg */}
                  <td className="px-6 py-4 sticky left-0 bg-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900">{member.name}</span>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                      {member.role}
                    </span>
                  </td>
                  {/* Availability */}
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{getAvailabilityDisplay(member.availability)}</span>
                  </td>
                  {/* Hours */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                      {member.contracted_hours}h
                      {member.max_hours && member.max_hours > member.contracted_hours && (
                        <span className="text-pink-500 ml-1">(max {member.max_hours})</span>
                      )}
                    </span>
                  </td>
                  {/* Status */}
                  <td className="px-6 py-4">
                    {member.clerk_user_id ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">✓ Connected</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">-</span>
                    )}
                  </td>
                  {/* Actions */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {!member.clerk_user_id && (
                        <button onClick={() => onInvite(member)} disabled={isInviting} className="px-2.5 py-1 text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-md transition-colors disabled:opacity-50">
                          Invite
                        </button>
                      )}
                      <button onClick={() => onEdit(member)} className="text-gray-600 hover:text-pink-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => onDelete(member.id)} disabled={isDeleting} className="text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view - unchanged */}
      <div className="md:hidden divide-y divide-gray-200/60">
        {isLoading ? (
          <div className="px-6 py-12 text-center">
            <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
              <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-gray-600 font-medium mb-1">No staff members yet</p>
            <p className="text-sm text-gray-500">Add your first team member to get started</p>
          </div>
        ) : (
          staff.map((member) => (
            <div key={member.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{member.name}</p>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 mt-1">
                      {member.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  {!member.clerk_user_id && (
                    <button onClick={() => onInvite(member)} disabled={isInviting} className="p-2 text-pink-600 hover:text-pink-700 transition-colors disabled:opacity-50">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                  <button onClick={() => onEdit(member)} className="p-2 text-gray-600 hover:text-pink-600 transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button onClick={() => onDelete(member.id)} disabled={isDeleting} className="p-2 text-gray-600 hover:text-red-600 transition-colors disabled:opacity-50">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {getAvailabilityDisplay(member.availability)}
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-pink-50 text-pink-700">
                  {member.contracted_hours}h
                  {member.max_hours && member.max_hours > member.contracted_hours && (
                    <span className="text-pink-500 ml-1">(max {member.max_hours}h)</span>
                  )}
                </span>
                {member.clerk_user_id ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">✓ Connected</span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">Not invited</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}