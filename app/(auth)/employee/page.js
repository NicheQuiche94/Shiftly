'use client'

import { useState, useMemo } from 'react'
import { useUser, useClerk, SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

import EmployeeHeader from '@/app/components/employee/EmployeeHeader'
import QuickActions from '@/app/components/employee/QuickActions'
import RequestModal from '@/app/components/employee/RequestModal'
import AvailabilityModal from '@/app/components/employee/AvailabilityModal'
import ShiftDetailModal from '@/app/components/employee/ShiftDetailModal'
import SwapFlowModal from '@/app/components/employee/SwapFlowModal'
import OpenShiftsCard from '@/app/components/employee/OpenShiftsCard'
import PWAInstallPrompt from '@/app/components/PWAInstallPrompt'

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, days) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatWeekRange(monday) {
  const sunday = addDays(monday, 6)
  const startMonth = monday.toLocaleDateString('en-GB', { month: 'short' })
  const endMonth = sunday.toLocaleDateString('en-GB', { month: 'short' })
  if (startMonth === endMonth) {
    return `${monday.getDate()} – ${sunday.getDate()} ${startMonth}`
  }
  return `${monday.getDate()} ${startMonth} – ${sunday.getDate()} ${endMonth}`
}

export default function EmployeeDashboard() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState('schedule')
  const [weekOffset, setWeekOffset] = useState(0)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false)
  const [selectedShift, setSelectedShift] = useState(null)
  const [swapShift, setSwapShift] = useState(null)

  const handleSignOut = () => {
    if (user) localStorage.removeItem(`shiftly_user_type_${user.id}`)
    signOut(() => router.push('/'))
  }

  // ── Data fetching ──
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['employee-profile'],
    queryFn: async () => {
      const res = await fetch('/api/employee/profile')
      if (!res.ok) { if (res.status === 404) return null; throw new Error('Failed') }
      return res.json()
    },
    enabled: isLoaded && isSignedIn
  })

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['employee-shifts', profile?.id],
    queryFn: async () => { const res = await fetch('/api/employee/shifts'); if (!res.ok) throw new Error(); return res.json() },
    enabled: !!profile?.id
  })

  const { data: openShifts = [] } = useQuery({
    queryKey: ['open-shifts', profile?.team_id],
    queryFn: async () => { const res = await fetch('/api/employee/open-shifts'); if (!res.ok) throw new Error(); return res.json() },
    enabled: !!profile?.id,
    refetchInterval: 30000
  })

  const { data: announcementsData } = useQuery({
    queryKey: ['announcements', profile?.team_id],
    queryFn: async () => {
      const res = await fetch(`/api/notifications?type=announcement&team_id=${profile?.team_id}`)
      if (!res.ok) return { notifications: [] }
      return res.json()
    },
    enabled: !!profile?.team_id,
    refetchInterval: 60000
  })

  const announcements = announcementsData?.notifications || []

  // ── Mutations ──
  const submitRequest = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/employee/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(); return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] })
      setShowRequestModal(false)
      setSwapShift(null)
    }
  })

  const acceptShift = async (requestId) => {
    const res = await fetch('/api/employee/open-shifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ request_id: requestId })
    })
    if (!res.ok) throw new Error('Failed to accept shift')
    queryClient.invalidateQueries({ queryKey: ['open-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['employee-shifts'] })
    queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
    return res.json()
  }

  const updateAvailability = useMutation({
    mutationFn: async (availability) => {
      const res = await fetch('/api/employee/availability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ availability }) })
      if (!res.ok) throw new Error(); return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-profile'] }); setShowAvailabilityModal(false) }
  })

  const handleCoverRequest = (shift) => {
    submitRequest.mutate({
      type: 'cover',
      start_date: shift.date,
      end_date: shift.date,
      shift_id: shift.rota_id || null,
      swap_with_staff_id: null,
      reason: `Cover needed: ${shift.shift_name} (${shift.start_time}–${shift.end_time})`
    })
  }

  // ── Week navigation logic ──
  const currentMonday = useMemo(() => {
    const monday = getMonday(new Date())
    return addDays(monday, weekOffset * 7)
  }, [weekOffset])

  const weekShifts = useMemo(() => {
    const weekDates = DAY_NAMES.map((_, i) => {
      const d = addDays(currentMonday, i)
      return d.toISOString().split('T')[0]
    })

    return DAY_NAMES.map((day, i) => ({
      day,
      dayShort: DAY_SHORT[i],
      date: weekDates[i],
      dateObj: addDays(currentMonday, i),
      shifts: shifts.filter(s => s.date === weekDates[i])
    }))
  }, [shifts, currentMonday])

  const weekTotalHours = useMemo(() => {
    return weekShifts.reduce((sum, day) => {
      return sum + day.shifts.reduce((daySum, s) => daySum + (s.hours || 0), 0)
    }, 0)
  }, [weekShifts])

  const today = new Date().toISOString().split('T')[0]
  const hasShiftsThisWeek = weekShifts.some(d => d.shifts.length > 0)

  // ── Loading / Auth states ──
  if (!isLoaded) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" /></main>
  }

  if (!isSignedIn) {
    return (
      <main className="min-h-screen bg-gray-50">
        <EmployeeHeader showBackLink />
        <div className="max-w-md mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2 font-cal">Employee Sign In</h1>
            <p className="text-gray-600">Sign in to view your schedule and submit requests</p>
          </div>
          <div className="flex justify-center">
            <SignIn
              routing="hash"
              afterSignInUrl="/employee"
              appearance={{ elements: { rootBox: "mx-auto", card: "shadow-none border border-gray-200", headerTitle: "hidden", headerSubtitle: "hidden", socialButtonsBlockButton: "border-gray-300", formButtonPrimary: "bg-gradient-to-r from-pink-500 to-pink-600 hover:shadow-lg hover:shadow-pink-500/25" } }}
            />
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">Don't have an account? Ask your manager for an invite link.</p>
        </div>
      </main>
    )
  }

  if (profileLoading) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" /></main>
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2 font-cal">Account Not Linked</h1>
          <p className="text-gray-600 mb-6">Your account isn't linked to a staff profile yet. Please ask your manager for an invite link.</p>
          <button onClick={handleSignOut} className="px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors">Sign Out</button>
          <Link href="/" className="block text-sm text-pink-600 hover:text-pink-700 mt-3">← Back to homepage</Link>
        </div>
      </main>
    )
  }

  const firstName = user?.firstName || profile?.name?.split(' ')[0] || 'there'

  const tabs = [
    {
      id: 'schedule',
      label: 'Schedule',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'team',
      label: 'Team',
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      badge: openShifts.length
    }
  ]

  return (
    <main className="min-h-screen bg-gray-100">
      <EmployeeHeader onSignOut={handleSignOut} />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 font-cal">Hi, {firstName}! 👋</h1>
          <p className="text-gray-500 mt-0.5">{profile.role} · {profile.contracted_hours}h/week</p>
        </div>

        {/* Pill Tabs */}
        <div className="flex gap-2 mb-4">
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
              {tab.badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: '#FF1F7D' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'schedule' && (
          <div className="max-w-4xl mx-auto">
            <QuickActions
              onRequestTimeOff={() => setShowRequestModal(true)}
              onUpdateAvailability={() => setShowAvailabilityModal(true)}
              onRequestSwap={() => setSwapShift({ shifts })}
            />

            {/* Manager-style Rota Grid */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Week navigation */}
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => setWeekOffset(prev => prev - 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                <div className="text-center">
                  <p className="font-semibold text-gray-900">{formatWeekRange(currentMonday)}</p>
                  <p className="text-xs text-gray-500">{weekTotalHours.toFixed(1)}h this week</p>
                </div>

                <button
                  onClick={() => setWeekOffset(prev => prev + 1)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Grid */}
              {shiftsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-10 h-10 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
                </div>
              ) : !hasShiftsThisWeek ? (
                <div className="text-center py-12 px-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No shifts this week</p>
                  <p className="text-sm text-gray-500">Your schedule will appear here once published</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {weekShifts.map(({ dayShort, date, dateObj }) => {
                          const isToday = date === today
                          return (
                            <th key={date} className={`px-3 py-2 text-center text-xs font-medium ${isToday ? 'bg-pink-50' : ''}`}>
                              <div className={isToday ? 'text-pink-600 font-bold' : 'text-gray-600'}>
                                {dayShort}
                              </div>
                              <div className={`text-xs ${isToday ? 'text-pink-500' : 'text-gray-400'}`}>
                                {dateObj.getDate()}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        {weekShifts.map(({ date, shifts: dayShifts }) => {
                          const isToday = date === today
                          return (
                            <td key={date} className={`px-2 py-2 align-top border-l border-gray-100 ${isToday ? 'bg-pink-50/30' : ''}`}>
                              {dayShifts.length > 0 ? (
                                <div className="space-y-1">
                                  {dayShifts.map((shift, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => setSelectedShift(shift)}
                                      className="w-full text-left px-2 py-1.5 rounded-lg text-white text-xs font-medium hover:shadow-md transition-all"
                                      style={{ background: '#FF1F7D' }}
                                    >
                                      <div className="font-semibold">{shift.shift_name}</div>
                                      <div className="opacity-90">{shift.start_time}–{shift.end_time}</div>
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-gray-300">-</div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column: Announcements Only */}
            <div>
              {announcements.length > 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <h2 className="font-semibold text-gray-900 font-cal text-sm sm:text-base">Announcements</h2>
                  </div>
                  <div className="max-h-[500px] overflow-y-auto">
                    {announcements.map((announcement, index) => (
                      <div 
                        key={announcement.id} 
                        className={`px-4 py-4 hover:bg-gray-50/50 transition-colors ${
                          index !== announcements.length - 1 ? 'border-b border-gray-100' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Icon Circle */}
                          <div className="flex-shrink-0 mt-0.5">
                            <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center">
                              <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                              </svg>
                            </div>
                          </div>
                          
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <span className="text-sm font-semibold text-gray-900">Team Announcement</span>
                              <span className="text-xs text-gray-500 flex-shrink-0">
                                {(() => {
                                  const date = new Date(announcement.created_at)
                                  const now = new Date()
                                  const diffMs = now - date
                                  const diffMins = Math.floor(diffMs / 60000)
                                  const diffHours = Math.floor(diffMs / 3600000)
                                  const diffDays = Math.floor(diffMs / 86400000)

                                  if (diffMins < 1) return 'Just now'
                                  if (diffMins < 60) return `${diffMins}m ago`
                                  if (diffHours < 24) return `${diffHours}h ago`
                                  if (diffDays < 7) return `${diffDays}d ago`
                                  
                                  return date.toLocaleDateString('en-GB', { 
                                    day: 'numeric', 
                                    month: 'short'
                                  })
                                })()}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                              {announcement.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {new Date(announcement.created_at).toLocaleDateString('en-GB', { 
                                weekday: 'short',
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No announcements</p>
                  <p className="text-sm text-gray-500">Team announcements will appear here</p>
                </div>
              )}
            </div>

            {/* Right Column: Open Shifts Board */}
            <div>
              <OpenShiftsCard
                openShifts={openShifts}
                onAccept={acceptShift}
              />
              
              {openShifts.length === 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-600 font-medium mb-1">No open shifts</p>
                  <p className="text-sm text-gray-500">Available shifts from teammates will appear here</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onRequestSwap={(shift) => {
            setSelectedShift(null)
            setSwapShift(shift)
          }}
          onRequestCover={(shift) => {
            setSelectedShift(null)
            handleCoverRequest(shift)
          }}
          onRequestTimeOff={(shift) => {
            setSelectedShift(null)
            setShowRequestModal(true)
          }}
        />
      )}

      {swapShift && (
        <SwapFlowModal
          shift={swapShift.shift_name ? swapShift : null}
          shifts={shifts}
          onSubmit={(data) => submitRequest.mutate(data)}
          onClose={() => setSwapShift(null)}
          isPending={submitRequest.isPending}
        />
      )}

      {showRequestModal && (
        <RequestModal
          shifts={shifts}
          onSubmit={(data) => submitRequest.mutate(data)}
          onClose={() => setShowRequestModal(false)}
          isPending={submitRequest.isPending}
        />
      )}

      {showAvailabilityModal && (
        <AvailabilityModal
          availability={profile?.availability}
          onSave={(data) => updateAvailability.mutate(data)}
          onClose={() => setShowAvailabilityModal(false)}
          isPending={updateAvailability.isPending}
        />
      )}

      <PWAInstallPrompt />
    </main>
  )
}