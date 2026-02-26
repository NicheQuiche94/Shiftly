'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import TeamSelector from '@/app/components/TeamSelector'
import StaffShiftsSection from '@/app/components/workspace/StaffShiftsSection'
import TemplatesSection from '@/app/components/workspace/TemplatesSection'
import RulesSection from '@/app/components/workspace/RulesSection'
import SettingsSection from '@/app/components/workspace/SettingsSection'
import PageHeader from '@/app/components/PageHeader'
import { getColorForLength } from '@/app/components/template/shift-constants'

export default function WorkspacePage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [activeTab, setActiveTab] = useState('staff-shifts')
  const [triggerStaffModal, setTriggerStaffModal] = useState(false)

  const { data: teamData } = useQuery({
    queryKey: ['team-detail', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load team')
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  const shiftLengths = teamData?.shift_lengths || [4, 6, 8, 10, 12]

  useEffect(() => {
    const handleOpenStaffModal = () => {
      setActiveTab('staff-shifts')
      setTriggerStaffModal(true)
    }
    window.addEventListener('openStaffModal', handleOpenStaffModal)
    return () => window.removeEventListener('openStaffModal', handleOpenStaffModal)
  }, [])

  useEffect(() => {
    if (triggerStaffModal) {
      const timer = setTimeout(() => setTriggerStaffModal(false), 100)
      return () => clearTimeout(timer)
    }
  }, [triggerStaffModal])

  const tabs = [
    { id: 'staff-shifts', label: 'Staff & Shifts', description: 'Manage coverage balance',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
    { id: 'templates', label: 'Templates', description: 'Day & week patterns',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
    { id: 'rules', label: 'Rules', description: 'Scheduling constraints',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
    { id: 'settings', label: 'Settings', description: 'Workspace configuration',
      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
  ]

  return (
    <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
      <PageHeader
        title="My Workspace"
        subtitle="Manage your team, shift patterns, and scheduling rules"
        backLink={{ href: '/dashboard', label: 'Back to Dashboard' }}
      />

      {!selectedTeamId ? (
        <div className="mt-6">
          <TeamSelector selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
          <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-gray-700 font-semibold font-cal mb-1">Select a team to get started</p>
            <p className="text-sm text-gray-500">Choose a team from the dropdown above</p>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 mb-6">
            <TeamSelector selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />
          </div>

          <div className="flex gap-6">
            {/* Left sidebar */}
            <div className="w-56 flex-shrink-0">
              <div className="sticky top-6">
                <nav className="flex flex-col gap-1">
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                          isActive
                            ? 'text-white shadow-md'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                        style={isActive ? { background: '#FF1F7D' } : {}}
                      >
                        <span className={isActive ? 'text-white' : 'text-gray-400'}>{tab.icon}</span>
                        <div>
                          <span className={`text-sm font-semibold block ${isActive ? 'text-white' : ''}`}>{tab.label}</span>
                          <span className={`text-[11px] block mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>{tab.description}</span>
                        </div>
                      </button>
                    )
                  })}
                </nav>

                {shiftLengths.length > 0 && (
                  <div className="mt-5 p-3 rounded-xl bg-gray-50 border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Shift lengths</p>
                    <div className="flex flex-wrap gap-1.5">
                      {[...shiftLengths].sort((a, b) => a - b).map((len) => {
                        const c = getColorForLength(len, shiftLengths)
                        return (
                          <span key={len} className="px-2 py-1 rounded-md text-[11px] font-bold border" style={{ background: c.bg, borderColor: `${c.border}40`, color: c.text }}>
                            {len}h
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {activeTab === 'staff-shifts' && (
                <StaffShiftsSection
                  selectedTeamId={selectedTeamId}
                  shiftLengths={shiftLengths}
                  triggerAddStaff={triggerStaffModal}
                  teamData={teamData}
                />
              )}
              {activeTab === 'templates' && (
                <TemplatesSection
                  selectedTeamId={selectedTeamId}
                  shiftLengths={shiftLengths}
                  teamData={teamData}
                />
              )}
              {activeTab === 'rules' && (
                <RulesSection selectedTeamId={selectedTeamId} />
              )}
              {activeTab === 'settings' && (
                <SettingsSection selectedTeamId={selectedTeamId} teamData={teamData} />
              )}
            </div>
          </div>
        </>
      )}
    </main>
  )
}