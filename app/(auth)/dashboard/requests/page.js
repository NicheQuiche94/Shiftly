'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import TeamSelector from '@/app/components/TeamSelector'
import RequestsTab from './RequestsTab'
import AnnouncementsTab from './AnnouncementsTab'
import EscalationsTab from './EscalationsTab'

export default function InboxPage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [mainTab, setMainTab] = useState('requests')

  // Fetch pending counts for badges
  const { data: requests = [] } = useQuery({
    queryKey: ['requests', selectedTeamId],
    queryFn: async () => {
      const url = selectedTeamId
        ? `/api/requests?team_id=${selectedTeamId}`
        : '/api/requests'
      const res = await fetch(url)
      if (!res.ok) return []
      return res.json()
    },
  })

  const { data: escalationData = { escalations: [] } } = useQuery({
    queryKey: ['escalations'],
    queryFn: async () => {
      const res = await fetch('/api/notifications/escalations')
      if (!res.ok) return { escalations: [] }
      return res.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const pendingRequests = requests.filter(r => r.status === 'pending').length
  const escalationCount = escalationData.escalations?.length || 0

  const tabs = [
    {
      id: 'requests',
      label: 'Requests',
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      badge: pendingRequests,
      badgeStyle: 'pink',
    },
    {
      id: 'announcements',
      label: 'Announcements',
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      badge: 0,
    },
    {
      id: 'escalations',
      label: 'Escalations',
      icon: (
        <svg className="w-5 h-5" style={{ color: '#FF1F7D' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      badge: escalationCount,
      badgeStyle: 'amber',
    },
  ]

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-pink-600 hover:text-pink-700 transition-colors mb-4 sm:mb-6 font-medium text-sm sm:text-base"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 font-cal">Inbox</h1>
        <p className="text-gray-600 text-sm sm:text-base">Requests, announcements, and alerts in one place</p>
      </div>

      <div className="mb-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
      </div>

      {!selectedTeamId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 sm:p-12 text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium mb-1">Select a team to view your inbox</p>
          <p className="text-sm text-gray-500">Choose a team from the dropdown above</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Top-level tabs */}
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMainTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mainTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                      tab.badgeStyle === 'amber'
                        ? 'bg-amber-100 text-amber-700'
                        : 'text-white'
                    }`}
                    style={tab.badgeStyle !== 'amber' ? { backgroundColor: '#FF1F7D' } : {}}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {mainTab === 'requests' && <RequestsTab selectedTeamId={selectedTeamId} />}
          {mainTab === 'announcements' && <AnnouncementsTab selectedTeamId={selectedTeamId} />}
          {mainTab === 'escalations' && <EscalationsTab />}
        </div>
      )}
    </main>
  )
}