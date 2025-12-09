'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useUser()
  const [loading, setLoading] = useState(true)
  const [timeSaved, setTimeSaved] = useState(0)
  const [weeksAhead, setWeeksAhead] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [upcomingRotas, setUpcomingRotas] = useState([])

  const firstName = user?.firstName || 'there'

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setLoading(true)
    try {
      const rotasRes = await fetch('/api/rotas')
      if (rotasRes.ok) {
        const rotasData = await rotasRes.json()
        
        const approvedCount = rotasData.filter(r => r.approved).length
        setTimeSaved(approvedCount * 40)
        
        const now = new Date()
        const futureApproved = rotasData.filter(r => 
          r.approved && new Date(r.start_date) >= now
        )
        setWeeksAhead(futureApproved.reduce((sum, r) => sum + (r.week_count || 1), 0))
        setUpcomingRotas(futureApproved.slice(0, 4))
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatTimeSaved = (minutes) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours === 0) return `${mins}m`
    if (mins === 0) return `${hours}h`
    return `${hours}h ${mins}m`
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short'
    })
  }

  return (
    <main className="h-[calc(100vh-1.5rem)] p-8 flex flex-col">
      {/* Content wrapper with max width, centered */}
      <div className="max-w-6xl mx-auto w-full h-full flex flex-col justify-center">
        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>
        
        {/* Grid - 2 columns, 50/50 split */}
        <div className="grid grid-cols-2 grid-rows-2 gap-5" style={{ height: '540px' }}>
          
          {/* Welcome Card - Top Left */}
          <div className="row-span-1 bg-gradient-to-br from-pink-50 to-white border-2 border-pink-200 rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 hover:border-pink-400 hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1 cursor-default">
            <p className="text-pink-500 text-lg font-medium mb-2">Welcome back</p>
            <h2 className="text-4xl font-bold text-gray-900">{firstName}</h2>
          </div>

          {/* Stats Row - Top Right (3 cards in a row) */}
          <div className="row-span-1 grid grid-cols-3 gap-4">
            {/* Time Saved - Purple */}
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 border-2 border-purple-400 rounded-3xl p-5 text-white flex flex-col items-center justify-center text-center transition-all duration-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/25 hover:-translate-y-1 cursor-default">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{loading ? '-' : formatTimeSaved(timeSaved)}</p>
              <p className="text-purple-200 text-sm">Time Saved</p>
            </div>

            {/* Weeks Covered - Blue */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400 rounded-3xl p-5 text-white flex flex-col items-center justify-center text-center transition-all duration-200 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/25 hover:-translate-y-1 cursor-default">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{loading ? '-' : weeksAhead}</p>
              <p className="text-blue-200 text-sm">Weeks Covered</p>
            </div>

            {/* Requests - Green */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 border-2 border-green-400 rounded-3xl p-5 text-white flex flex-col items-center justify-center text-center transition-all duration-200 hover:border-green-300 hover:shadow-lg hover:shadow-green-500/25 hover:-translate-y-1 cursor-default">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-3xl font-bold">{loading ? '-' : pendingRequests}</p>
              <p className="text-green-200 text-sm">Requests</p>
            </div>
          </div>

          {/* Upcoming Rotas - Bottom Left */}
          <div className="row-span-1 bg-white border-2 border-gray-200 rounded-3xl flex flex-col transition-all duration-200 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upcoming Rotas</h3>
              <Link href="/dashboard/generate" className="text-sm text-pink-600 hover:text-pink-700 font-medium">
                View all
              </Link>
            </div>
            
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="w-5 h-5 border-2 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
                </div>
              ) : upcomingRotas.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-400">No upcoming rotas</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {upcomingRotas.map((rota) => (
                    <div key={rota.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">{rota.rota_name || rota.name || 'Untitled'}</p>
                          <p className="text-sm text-gray-400">
                            {rota.start_date && formatDate(rota.start_date)}
                            {rota.week_count && ` · ${rota.week_count}w`}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-medium px-3 py-1 rounded-full bg-green-100 text-green-700">
                        Approved
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Build Rotas Card - Bottom Right */}
          <Link href="/dashboard/generate" className="row-span-1">
            <div className="bg-gradient-to-br from-orange-400 to-orange-500 border-2 border-orange-300 rounded-3xl p-6 text-white h-full flex flex-col items-center justify-center text-center transition-all duration-200 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-1">
              <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold mb-2">Build Rotas</h2>
              <p className="text-orange-100">Click to start building your schedule</p>
            </div>
          </Link>

        </div>
      </div>
    </main>
  )
}