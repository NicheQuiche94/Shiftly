'use client'

import { useUser } from '@clerk/nextjs'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Navigation from '../components/Navigation'

export default function DashboardPage() {
  const { user } = useUser()
  const firstName = user?.firstName || 'there'
  
  const [shifts, setShifts] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [manualRotaTime, setManualRotaTime] = useState('')
  const [userSettings, setUserSettings] = useState(null)

  useEffect(() => {
    loadData()
    loadUserSettings()
  }, [])

  const loadData = async () => {
    try {
      const [shiftsRes, staffRes] = await Promise.all([
        fetch('/api/shifts'),
        fetch('/api/staff')
      ])
      
      if (shiftsRes.ok) {
        const shiftsData = await shiftsRes.json()
        setShifts(shiftsData)
      }
      
      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaff(staffData)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUserSettings = async () => {
    try {
      const response = await fetch('/api/user-settings')
      if (response.ok) {
        const data = await response.json()
        setUserSettings(data)
        
        // Show onboarding if user hasn't set manual rota time
        if (!data || data.manual_rota_time === null) {
          setShowOnboarding(true)
        }
      } else {
        // First time user - show onboarding
        setShowOnboarding(true)
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }

  const handleOnboardingSubmit = async () => {
    const timeInMinutes = parseInt(manualRotaTime)
    
    if (isNaN(timeInMinutes) || timeInMinutes < 1) {
      alert('Please enter a valid time in minutes (e.g., 60)')
      return
    }

    try {
      const response = await fetch('/api/user-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual_rota_time: timeInMinutes
        })
      })

      if (response.ok) {
        const data = await response.json()
        setUserSettings(data)
        setShowOnboarding(false)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  // Calculate total shift hours per week
  const calculateShiftHours = () => {
    let totalHours = 0
    
    shifts.forEach(shift => {
      const [startHour, startMin] = shift.start_time.split(':').map(Number)
      const [endHour, endMin] = shift.end_time.split(':').map(Number)
      
      let minutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
      
      if (minutes < 0) {
        minutes += 24 * 60
      }
      
      const hours = minutes / 60
      totalHours += hours * shift.staff_required
    })
    
    return totalHours
  }

  // Calculate total contracted hours
  const calculateStaffHours = () => {
    return staff.reduce((total, member) => {
      return total + (member.contracted_hours || 0)
    }, 0)
  }

  const shiftHours = calculateShiftHours()
  const staffHours = calculateStaffHours()
  const hoursMatch = shiftHours > 0 && staffHours > 0 && Math.abs(shiftHours - staffHours) < 0.5
  const hoursDifference = shiftHours - staffHours

  // Calculate total time saved
  const totalTimeSaved = userSettings?.manual_rota_time && userSettings?.total_rotas_generated
    ? userSettings.manual_rota_time * userSettings.total_rotas_generated
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Navigation />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-16">
        {/* Hero Section - Centered */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome back, {firstName}
          </h1>
          <p className="text-lg text-gray-600">
            Set up your team and shifts, then generate your rota instantly
          </p>
          
          {/* Time Saved Badge */}
          {totalTimeSaved > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white px-6 py-3 rounded-full shadow-lg">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">
                Total time saved: {Math.floor(totalTimeSaved / 60)}h {totalTimeSaved % 60}m
              </span>
            </div>
          )}
        </div>

        {/* Setup Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Shift Patterns Card */}
          <Link href="/dashboard/shifts">
            <div className="group relative bg-white rounded-xl p-8 border border-gray-200/60 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(251,61,136,0.15)] transition-all duration-300 cursor-pointer">
              {/* Icon */}
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-5 group-hover:bg-pink-50 transition-colors">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-pink-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Shift Patterns
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Define your recurring shift templates
              </p>

              {/* Arrow */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-pink-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Set up shifts</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Hours - Bottom Right */}
                {!loading && shifts.length > 0 && (
                  <span className="text-sm font-semibold text-pink-600">
                    {shiftHours.toFixed(1)}h total
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Staff Card */}
          <Link href="/dashboard/staff">
            <div className="group relative bg-white rounded-xl p-8 border border-gray-200/60 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(251,61,136,0.15)] transition-all duration-300 cursor-pointer">
              {/* Icon */}
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-5 group-hover:bg-pink-50 transition-colors">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-pink-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Staff
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Add team members and set availability
              </p>

              {/* Arrow */}
              <div className="flex items-center justify-between">
                <div className="flex items-center text-pink-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>Manage team</span>
                  <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Hours - Bottom Right */}
                {!loading && staff.length > 0 && (
                  <span className="text-sm font-semibold text-pink-600">
                    {staffHours}h total
                  </span>
                )}
              </div>
            </div>
          </Link>

          {/* Rules Card */}
          <Link href="/dashboard/rules">
            <div className="group relative bg-white rounded-xl p-8 border border-gray-200/60 hover:border-pink-400 hover:shadow-[0_0_20px_rgba(251,61,136,0.15)] transition-all duration-300 cursor-pointer">
              {/* Icon */}
              <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-5 group-hover:bg-pink-50 transition-colors">
                <svg className="w-6 h-6 text-gray-600 group-hover:text-pink-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Rules
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4">
                Set constraints for fair scheduling
              </p>

              {/* Arrow */}
              <div className="flex items-center text-pink-600 font-medium text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Configure rules</span>
                <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Generate Rota CTA */}
        <Link href="/dashboard/generate">
          <div className="group relative bg-gradient-to-r from-pink-500 to-pink-600 rounded-xl p-8 shadow-md hover:shadow-[0_8px_30px_rgba(251,61,136,0.25)] transition-all duration-300 cursor-pointer overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '24px 24px'
              }}></div>
            </div>

            <div className="relative flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Build/Manage Rotas
                </h2>

                {/* Status Indicator - Prominent */}
                {!loading && shifts.length > 0 && staff.length > 0 ? (
                  hoursMatch ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-white font-semibold text-base">
                        Hours matched - Ready to generate
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <div className="flex-shrink-0 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <span className="text-white font-semibold text-base">
                        Hours mismatch: {hoursDifference > 0 
                          ? `need ${Math.abs(hoursDifference).toFixed(1)}h more staff hours` 
                          : `need ${Math.abs(hoursDifference).toFixed(1)}h more shift hours`}
                      </span>
                    </div>
                  )
                ) : (
                  <p className="text-pink-50">
                    Generate schedules that work for everyone
                  </p>
                )}
              </div>

              <div className="w-11 h-11 bg-white rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>
            </div>
          </div>
        </Link>
      </main>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                One quick question
              </h2>
              <p className="text-gray-600">
                This helps us show you how much time you're saving
              </p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                How long does it take you to manually make a rota?
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min="1"
                  value={manualRotaTime}
                  onChange={(e) => setManualRotaTime(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleOnboardingSubmit()
                    }
                  }}
                  placeholder="60"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white text-lg"
                  autoFocus
                />
                <span className="text-gray-600 font-medium">minutes</span>
              </div>
            </div>

            <button
              onClick={handleOnboardingSubmit}
              disabled={!manualRotaTime || parseInt(manualRotaTime) < 1}
              className={`w-full px-6 py-3 rounded-lg font-semibold transition-all text-lg ${
                !manualRotaTime || parseInt(manualRotaTime) < 1
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/25'
              }`}
            >
              Continue
            </button>

            <button
              onClick={() => setShowOnboarding(false)}
              className="w-full mt-3 px-6 py-2 text-gray-600 hover:text-gray-900 text-sm font-medium transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}