'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import AnnouncementComposer from '@/app/components/AnnouncementComposer'

function timeAgo(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const hours = Math.floor((now - date) / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function AnnouncementsTab({ selectedTeamId }) {
  const queryClient = useQueryClient()

  const { data: sentAnnouncements = [], isLoading } = useQuery({
    queryKey: ['announcements', selectedTeamId],
    queryFn: async () => {
      const res = await fetch('/api/notifications?type=announcement&sent=true')
      if (!res.ok) return []
      const data = await res.json()
      // Deduplicate by message + timestamp (notifications fan out to multiple recipients)
      const seen = new Map()
      ;(data.notifications || []).forEach(n => {
        const key = `${n.message}-${n.created_at?.slice(0, 16)}`
        if (!seen.has(key)) seen.set(key, n)
      })
      return Array.from(seen.values())
    },
  })

  return (
    <div className="space-y-4">
      <AnnouncementComposer
        selectedTeamId={selectedTeamId}
        onSent={() => queryClient.invalidateQueries({ queryKey: ['announcements'] })}
      />

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-bold text-gray-900 font-cal">Sent Announcements</h3>
        </div>
        <div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : sentAnnouncements.length === 0 ? (
            <div className="text-center py-10 px-6">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <p className="text-gray-500 text-sm">No announcements sent yet</p>
              <p className="text-gray-400 text-xs mt-1">Use the form above to broadcast to your team</p>
            </div>
          ) : (
            sentAnnouncements.map((a) => (
              <div key={a.id} className="px-5 py-4 border-b border-gray-50 last:border-0">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">{a.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(a.created_at)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}