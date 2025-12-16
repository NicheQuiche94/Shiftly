'use client'

import { useState } from 'react'
import TeamSelector from '@/app/components/TeamSelector'
import StaffSection from '@/app/components/workspace/StaffSection'
import ShiftsSection from '@/app/components/workspace/ShiftsSection'
import RulesSection from '@/app/components/workspace/RulesSection'
import Link from 'next/link'

export default function WorkspacePage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [activeTab, setActiveTab] = useState('staff') // 'staff', 'shifts', 'rules'

  const tabs = [
    { id: 'staff', name: 'Staff', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )},
    { id: 'shifts', name: 'Shifts', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )},
    { id: 'rules', name: 'Rules', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )}
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Back to Dashboard */}
      <Link 
        href="/dashboard" 
        className="inline-flex items-center text-pink-600 hover:text-pink-700 transition-colors mb-4 sm:mb-6 font-medium text-sm sm:text-base"
      >
        <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 font-cal">
          My Workspace
        </h1>
        <p className="text-gray-600 text-sm sm:text-base">
          Manage your team members, shifts, and scheduling rules
        </p>
      </div>

      {/* Team Selector */}
      <div className="mb-6 sm:mb-8">
        <TeamSelector 
          selectedTeamId={selectedTeamId}
          onTeamChange={setSelectedTeamId}
        />
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200/60 overflow-hidden shadow-sm">
        {/* Tab Headers - Scrollable on mobile */}
        <div className="border-b border-gray-200/60 overflow-x-auto">
          <div className="flex min-w-max sm:min-w-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center space-x-2 px-4 sm:px-6 py-3 sm:py-4 font-medium transition-all flex-1 sm:flex-none ${
                  activeTab === tab.id
                    ? 'text-pink-600 border-b-2 border-pink-600 bg-pink-50/50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.icon}
                <span className="text-sm sm:text-base">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-6">
          {!selectedTeamId ? (
            <div className="py-8 sm:py-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-1 text-sm sm:text-base">Select a team to get started</p>
              <p className="text-xs sm:text-sm text-gray-500">Choose a team from the dropdown above</p>
            </div>
          ) : (
            <>
              {activeTab === 'staff' && <StaffSection selectedTeamId={selectedTeamId} />}
              {activeTab === 'shifts' && <ShiftsSection selectedTeamId={selectedTeamId} />}
              {activeTab === 'rules' && <RulesSection selectedTeamId={selectedTeamId} />}
            </>
          )}
        </div>
      </div>
    </main>
  )
}