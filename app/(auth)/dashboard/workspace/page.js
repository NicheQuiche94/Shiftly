'use client'

import { useState } from 'react'
import TeamSelector from '@/app/components/TeamSelector'
import StaffSection from '@/app/components/workspace/StaffSection'
import ShiftsSection from '@/app/components/workspace/ShiftsSection'
import RulesSection from '@/app/components/workspace/RulesSection'
import Link from 'next/link'

export default function WorkspacePage() {
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [activeTab, setActiveTab] = useState('staff')

  const tabs = [
    { 
      id: 'staff', 
      label: 'Staff',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    { 
      id: 'shifts', 
      label: 'Shifts',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      id: 'rules', 
      label: 'Rules',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      <Link
        href="/dashboard"
        className="inline-flex items-center text-pink-600 hover:text-pink-700 transition-colors mb-4 sm:mb-6 font-medium text-sm"
      >
        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Dashboard
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2 font-cal">My Workspace</h1>
        <p className="text-gray-600 text-sm sm:text-base">Manage your team members, shifts, and scheduling rules</p>
      </div>

      {/* Team selector + pill tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <TeamSelector selectedTeamId={selectedTeamId} onTeamChange={setSelectedTeamId} />

        {/* Pill tabs matching Inbox pattern */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {!selectedTeamId ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-1">Select a team to get started</p>
          <p className="text-sm text-gray-500">Choose a team from the dropdown above</p>
        </div>
      ) : (
        <div>
          {activeTab === 'staff' && <StaffSection selectedTeamId={selectedTeamId} />}
          {activeTab === 'shifts' && <ShiftsSection selectedTeamId={selectedTeamId} />}
          {activeTab === 'rules' && <RulesSection selectedTeamId={selectedTeamId} />}
        </div>
      )}
    </main>
  )
}