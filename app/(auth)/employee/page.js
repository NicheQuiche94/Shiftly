'use client'

import { useState } from 'react'
import { useUser, useClerk, SignIn } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'

import EmployeeHeader from '@/app/components/employee/EmployeeHeader'
import EmployeeRotaView from '@/app/components/employee/EmployeeRotaView'
import QuickActions from '@/app/components/employee/QuickActions'
import RequestsList from '@/app/components/employee/RequestsList'
import RequestModal from '@/app/components/employee/RequestModal'
import AvailabilityModal from '@/app/components/employee/AvailabilityModal'
import ShiftDetailModal from '@/app/components/employee/ShiftDetailModal'
import SwapFlowModal from '@/app/components/employee/SwapFlowModal'
import OpenShiftsCard from '@/app/components/employee/OpenShiftsCard'
import PWAInstallPrompt from '@/app/components/PWAInstallPrompt'

export default function EmployeeDashboard() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const queryClient = useQueryClient()

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

  const { data: requests = [] } = useQuery({
    queryKey: ['employee-requests', profile?.id],
    queryFn: async () => { const res = await fetch('/api/employee/requests'); if (!res.ok) throw new Error(); return res.json() },
    enabled: !!profile?.id
  })

  const { data: openShifts = [] } = useQuery({
    queryKey: ['open-shifts', profile?.team_id],
    queryFn: async () => { const res = await fetch('/api/employee/open-shifts'); if (!res.ok) throw new Error(); return res.json() },
    enabled: !!profile?.id,
    refetchInterval: 30000 // Poll every 30s for new open shifts
  })

  // ── Mutations ──
  const submitRequest = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/employee/requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error(); return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-requests'] })
      queryClient.invalidateQueries({ queryKey: ['open-shifts'] })
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

  // ── Cover handler (posts open cover request) ──
  const handleCoverRequest = (shift) => {
    submitRequest.mutate({
      type: 'cover',
      start_date: shift.date,
      end_date: shift.date,
      shift_id: shift.rota_id || null,
      swap_with_staff_id: null, // Open to anyone
      reason: `Cover needed: ${shift.shift_name} (${shift.start_time}–${shift.end_time})`
    })
  }

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

  // ── Main dashboard ──
  const firstName = user?.firstName || profile?.name?.split(' ')[0] || 'there'

  return (
    <main className="min-h-screen bg-gray-100">
      <EmployeeHeader onSignOut={handleSignOut} />

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h1 className="text-2xl font-bold text-gray-900 font-cal">Hi, {firstName}! 👋</h1>
          <p className="text-gray-500 mt-0.5">{profile.role} · {profile.contracted_hours}h/week</p>
        </div>

        {/* Open shifts from teammates — high visibility */}
        <OpenShiftsCard
          openShifts={openShifts}
          onAccept={acceptShift}
        />

        <QuickActions
          onRequestTimeOff={() => setShowRequestModal(true)}
          onUpdateAvailability={() => setShowAvailabilityModal(true)}
        />

        {/* Rota View (SA-01 to SA-06) */}
        <EmployeeRotaView
          shifts={shifts}
          isLoading={shiftsLoading}
          onShiftTap={(shift) => setSelectedShift(shift)}
        />

        <RequestsList requests={requests} />
      </div>

      {/* Shift Detail Modal (SA-03) */}
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

      {/* Swap Flow Modal (SS-01 to SS-03) */}
      {swapShift && (
        <SwapFlowModal
          shift={swapShift}
          onSubmit={(data) => submitRequest.mutate(data)}
          onClose={() => setSwapShift(null)}
          isPending={submitRequest.isPending}
        />
      )}

      {/* Request Modal with Calendar Picker (TO-01 to TO-06) */}
      {showRequestModal && (
        <RequestModal
          shifts={shifts}
          requests={requests}
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