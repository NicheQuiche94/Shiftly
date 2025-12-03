'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import Navigation from '@/app/components/Navigation'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

function RulesComplianceSection({ rules }) {
  const [expandedRules, setExpandedRules] = useState(() => {
    return rules.reduce((acc, rule, idx) => {
      acc[idx] = false
      return acc
    }, {})
  })

  const toggleRule = (idx) => {
    setExpandedRules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  return (
    <div className="p-6 border-b border-gray-200/60 bg-gray-50/30 no-print">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Rules Compliance</h3>
      <div className="space-y-2">
        {rules.map((rule, idx) => {
          const isExpanded = expandedRules[idx]
          const hasViolations = rule.violations && rule.violations.length > 0
          
          return (
            <div
              key={idx}
              className={`rounded-lg border transition-all ${
                rule.status === 'followed'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}
            >
              <button
                onClick={() => toggleRule(idx)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    rule.status === 'followed' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {rule.status === 'followed' ? (
                      <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">{rule.rule}</p>
                    <p className="text-sm text-gray-700">{rule.details}</p>
                  </div>
                </div>
                {hasViolations && (
                  <svg 
                    className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {hasViolations && isExpanded && (
                <div className="px-4 pb-4">
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {rule.violations.map((violation, vIdx) => (
                      <div key={vIdx} className="bg-white rounded border border-gray-200 p-3 text-sm">
                        <div className="font-medium text-gray-900 mb-1">
                          {violation.staff} - {violation.day} - {violation.week}
                        </div>
                        <div className="text-gray-700 mb-2">
                          <span className="font-medium">Issue:</span> {violation.issue || (violation.count ? `${violation.count} weekend shifts` : 'See details')}
                        </div>
                        <div className="text-gray-600">
                          <span className="font-medium">Solution:</span> {violation.solution}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function GenerateRotaPage() {
  const [loading, setLoading] = useState(false)
  const [rota, setRota] = useState(null)
  const [error, setError] = useState(null)
  const [savedRotas, setSavedRotas] = useState([])
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [showSavedRotas, setShowSavedRotas] = useState(false)
  const [rotaName, setRotaName] = useState('')
  const [viewingRotaId, setViewingRotaId] = useState(null)
  const [activeTab, setActiveTab] = useState('schedule')
  const [hoveredCell, setHoveredCell] = useState(null)
  const [timeSaved, setTimeSaved] = useState(null)
  
  // Week selection state
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek) % 7
    const nextMonday = new Date(today)
    nextMonday.setDate(today.getDate() + daysUntilMonday)
    nextMonday.setHours(0, 0, 0, 0)
    return nextMonday
  })
  
  const [weekCount, setWeekCount] = useState(1)

  // Filter to only allow Mondays
  const filterMondays = (date) => {
    return date.getDay() === 1
  }

  // Calculate end date
  const getEndDate = () => {
    const end = new Date(startDate)
    end.setDate(end.getDate() + (weekCount * 7) - 1)
    return end
  }

  // Format date for display
  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Get date for a specific day in the rota
  const getDateForDay = (weekIndex, dayName) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const dayIndex = dayNames.indexOf(dayName)
    const date = new Date(startDate)
    date.setDate(date.getDate() + (weekIndex * 7) + dayIndex)
    return formatDate(date)
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Load saved rotas on mount
  useEffect(() => {
    loadSavedRotas()
  }, [])

  const loadSavedRotas = async () => {
    try {
      const response = await fetch('/api/rotas')
      if (response.ok) {
        const data = await response.json()
        setSavedRotas(data)
      }
    } catch (err) {
      console.error('Error loading rotas:', err)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    setError(null)
    setRota(null)
    setTimeSaved(null)
  
    let data = null
  
    try {
      const response = await fetch('/api/generate-rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          weekCount
        })
      })
  
      data = await response.json()
  
      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate rota')
      }
  
      setRota(data)
    } catch (err) {
      setError(err.message)
      if (data && data.diagnostics) {
        setRota({ diagnostics: data.diagnostics })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSaveRota = async (approved = false) => {
    if (!rotaName.trim()) {
      alert('Please enter a name for this rota')
      return
    }

    try {
      const response = await fetch('/api/rotas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rotaName,
          rota_data: rota,
          start_date: startDate.toISOString(),
          end_date: getEndDate().toISOString(),
          week_count: weekCount,
          approved: approved
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save rota')
      }

      // If approved, increment counter and get time saved
      if (approved) {
        const settingsResponse = await fetch('/api/user-settings')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          
          // Increment counter
          await fetch('/api/user-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              total_rotas_generated: (settings?.total_rotas_generated || 0) + 1
            })
          })

          // Show time saved message
          if (settings?.manual_rota_time) {
            setTimeSaved(settings.manual_rota_time)
            setTimeout(() => setTimeSaved(null), 5000) // Clear after 5 seconds
          }
        }
      }

      setShowSaveModal(false)
      setShowApproveModal(false)
      setRotaName('')
      await loadSavedRotas()
      
      if (approved) {
        alert('Rota approved and saved successfully!')
      } else {
        alert('Rota saved as draft!')
      }
    } catch (err) {
      alert('Error saving rota: ' + err.message)
    }
  }

  const handleLoadRota = async (rotaId) => {
    try {
      const response = await fetch(`/api/rotas/${rotaId}`)
      if (response.ok) {
        const data = await response.json()
        setRota(data.rota_data)
        setViewingRotaId(rotaId)
        setShowSavedRotas(false)
        
        if (data.start_date) {
          setStartDate(new Date(data.start_date))
        }
        if (data.week_count) {
          setWeekCount(data.week_count)
        }
      }
    } catch (err) {
      alert('Error loading rota: ' + err.message)
    }
  }

  const handleDeleteRota = async (rotaId) => {
    if (!confirm('Are you sure you want to delete this rota?')) return

    try {
      const response = await fetch(`/api/rotas/${rotaId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadSavedRotas()
        if (viewingRotaId === rotaId) {
          setRota(null)
          setViewingRotaId(null)
        }
      }
    } catch (err) {
      alert('Error deleting rota: ' + err.message)
    }
  }

  // Get shift details for a specific shift
  const getShiftDetails = (shiftName) => {
    if (!rota || !rota.schedule) return null
    const shift = rota.schedule.find(s => s.shift_name === shiftName)
    if (!shift) return null
    
    const [startTime, endTime] = shift.time.split('-')
    const hours = calculateShiftHours(startTime, endTime)
    return { startTime, endTime, hours }
  }

  const calculateShiftHours = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startMins = startH * 60 + startM
    const endMins = endH * 60 + endM
    return ((endMins - startMins) / 60).toFixed(1)
  }

  // Transform schedule data for calendar view
  const getWeeklySchedule = () => {
    if (!rota || !rota.schedule) return []
    
    const weeks = []
    const weekNumbers = [...new Set(rota.schedule.map(s => s.week || 1))]
    
    weekNumbers.forEach(weekNum => {
      const weekSchedule = rota.schedule.filter(s => (s.week || 1) === weekNum)
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      
      const weekData = {
        week: weekNum,
        days: days.map(day => {
          const dayShifts = weekSchedule.filter(s => s.day === day)
          const shifts = {}
          dayShifts.forEach(shift => {
            shifts[shift.shift_name] = {
              staff: shift.assigned_staff || [],
              time: shift.time
            }
          })
          return { day, shifts }
        })
      }
      
      weeks.push(weekData)
    })
    
    return weeks
  }

  const weeklyData = getWeeklySchedule()

  // Get all unique shift names and sort chronologically
  const getAllShiftNames = () => {
    if (!rota || !rota.schedule) return []
    const shiftMap = {}
    
    rota.schedule.forEach(shift => {
      if (!shiftMap[shift.shift_name]) {
        const [startTime] = shift.time.split('-')
        const [hours, mins] = startTime.split(':').map(Number)
        const timeValue = hours * 60 + mins
        shiftMap[shift.shift_name] = { name: shift.shift_name, time: shift.time, timeValue }
      }
    })
    
    return Object.values(shiftMap).sort((a, b) => a.timeValue - b.timeValue)
  }

  const sortedShifts = getAllShiftNames()

  // Color palette for shifts - cycling through colors
  const shiftColors = [
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
  ]

  const getShiftColor = (shiftName) => {
    const index = sortedShifts.findIndex(s => s.name === shiftName)
    return shiftColors[index % shiftColors.length]
  }

  if (loading && !rota) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <Navigation />
        <div className="flex items-center justify-center py-32">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Print-specific styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-rota, #printable-rota * {
            visibility: visible;
          }
          #printable-rota {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      <div className="no-print">
        <Navigation />
      </div>

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 no-print">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Generate Rota
          </h1>
          <p className="text-gray-600">
            Create schedules that meet contracted hours and respect availability
          </p>
        </div>

        {/* Time Saved Banner */}
        {timeSaved && (
          <div className="mb-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg animate-fade-in no-print">
            <div className="flex items-center justify-center gap-3">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-2xl font-bold">
                {timeSaved} minutes saved! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Week Selection Card */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-6 mb-6 no-print">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Week
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Week Starting (Monday)
              </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                filterDate={filterMondays}
                dateFormat="MMMM d, yyyy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                minDate={new Date()}
                withPortal
                portalId="date-picker-portal"
              />
              <p className="text-xs text-gray-500 mt-1">Rotas must start on a Monday</p>
            </div>

            {/* Week Count Selector */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Number of Weeks
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((weeks) => (
                  <button
                    key={weeks}
                    onClick={() => setWeekCount(weeks)}
                    className={`px-4 py-2.5 rounded-lg font-medium transition-all ${
                      weekCount === weeks
                        ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {weeks}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {weekCount} week{weekCount > 1 ? 's' : ''} • {formatDate(startDate)} - {formatDate(getEndDate())}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6 no-print">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className={`flex-1 min-w-[200px] px-6 py-3 rounded-lg font-semibold text-white transition-all ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:shadow-lg hover:shadow-pink-500/25'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Generating...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate Rota
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSavedRotas(!showSavedRotas)}
            className="px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            Saved Rotas
          </button>

          {rota && rota.schedule && (
            <>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                Save
              </button>

              <button
                onClick={() => setShowApproveModal(true)}
                className="px-6 py-3 border-2 border-pink-500 text-pink-600 rounded-lg font-semibold hover:bg-pink-50 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Save & Approve
              </button>
              
              <button
                onClick={handlePrint}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-6 mb-6 no-print">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <p className="text-pink-900 font-medium">
                Generating rota for {formatDate(startDate)} - {formatDate(getEndDate())}...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6 no-print">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-900 font-bold text-lg mb-2">Unable to Generate Rota</p>
                <p className="text-red-800">{typeof error === 'string' ? error : error.message}</p>
              </div>
            </div>

        {rota?.diagnostics && rota.diagnostics.suggestions && rota.diagnostics.suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm font-semibold text-red-900 mb-2">💡 How to fix:</p>
            <ul className="space-y-2">
              {rota.diagnostics.suggestions.map((suggestion, idx) => (
                <li key={idx} className="text-sm text-red-800 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rota?.diagnostics && rota.diagnostics.problems && rota.diagnostics.problems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-red-200">
            <p className="text-sm font-semibold text-red-900 mb-2">📊 Details:</p>
            <div className="space-y-2">
              {rota.diagnostics.problems.map((problem, idx) => (
                <div key={idx} className="text-sm text-red-800 bg-red-100 rounded p-2">
                  {problem.type === 'insufficient_hours' && (
                    <p><strong>{problem.staff}:</strong> Contracted for {problem.contracted}h but can only work {problem.maxPossible.toFixed(1)}h (short by {problem.shortfall.toFixed(1)}h)</p>
                  )}
                  {problem.type === 'understaffed' && (
                    <p><strong>Team-wide:</strong> Need {problem.hoursNeeded.toFixed(1)}h coverage but only {problem.hoursAvailable}h available (short by {problem.shortfall.toFixed(1)}h)</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )}

        {/* Saved Rotas List */}
        {showSavedRotas && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-6 mb-6 no-print">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Rotas</h3>
            {savedRotas.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-600 font-medium">No saved rotas yet</p>
                <p className="text-sm text-gray-500 mt-1">Generate and save your first rota</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedRotas.map((savedRota) => (
                  <div
                    key={savedRota.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200/60"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{savedRota.rota_name || savedRota.name || 'Untitled Rota'}</p>
                        {savedRota.approved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approved
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {savedRota.start_date && savedRota.end_date ? (
                          <>
                            {formatDate(new Date(savedRota.start_date))} - {formatDate(new Date(savedRota.end_date))}
                            {savedRota.week_count && ` • ${savedRota.week_count} week${savedRota.week_count > 1 ? 's' : ''}`}
                          </>
                        ) : (
                          'No date information'
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        Created {new Date(savedRota.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLoadRota(savedRota.id)}
                        className="px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all font-medium text-sm"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteRota(savedRota.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Generated Rota Display */}
        {rota && rota.schedule && rota.schedule.length > 0 && (
          <div id="printable-rota" className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            {/* Print Header - Only visible when printing */}
            <div className="hidden print:block p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Rota</h1>
              <p className="text-gray-600">{formatDate(startDate)} - {formatDate(getEndDate())}</p>
            </div>

            {/* Rules Compliance - Above Rota */}
            {rota && rota.rule_compliance && rota.rule_compliance.length > 0 && (
              <RulesComplianceSection rules={rota.rule_compliance} />
            )}

            {/* Content Tabs */}
            <div className="border-b border-gray-200/60 bg-gray-50/50 no-print">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'schedule'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Schedule
                </button>
                <button
                  onClick={() => setActiveTab('hours')}
                  className={`px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'hours'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hours Summary
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Schedule Tab - Redesigned with block colors */}
              {activeTab === 'schedule' && weeklyData.length > 0 && sortedShifts.length > 0 && (
                <div className="space-y-8">
                  {weeklyData.map((week, weekIndex) => (
                    <div key={weekIndex} className="print:break-after-page">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Week {week.week}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse print:text-sm">
                          <thead>
                            <tr className="bg-gray-50/50">
                              <th className="border border-gray-200/60 px-4 py-3 text-left text-sm font-semibold text-gray-700 w-32">
                                Day
                              </th>
                              {sortedShifts.map((shift, idx) => (
                                <th key={idx} className="border border-gray-200/60 px-4 py-3 text-center text-sm font-semibold text-gray-700 min-w-[140px]">
                                  <div>{shift.name}</div>
                                  <div className="text-xs font-normal text-gray-500 mt-1">
                                    ({shift.time})
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {week.days.map((day, dayIndex) => (
                              <tr key={dayIndex} className="hover:bg-gray-50/50">
                                <td className="border border-gray-200/60 px-4 py-3 font-medium text-gray-900 bg-gray-50/30">
                                  <div>{day.day}</div>
                                  <div className="text-xs text-gray-500 font-normal mt-0.5">
                                    {getDateForDay(weekIndex, day.day)}
                                  </div>
                                </td>
                                {sortedShifts.map((shift, idx) => {
                                  const cellData = day.shifts[shift.name]
                                  const staff = cellData?.staff || []
                                  const colorClass = getShiftColor(shift.name)
                                  
                                  return (
                                    <td 
                                      key={idx} 
                                      className="border border-gray-200/60 px-3 py-3 bg-gray-50/20"
                                    >
                                      <div className="min-h-[60px] flex flex-col gap-2">
                                        {staff.length > 0 ? (
                                          staff.map((person, personIdx) => {
                                            const shiftDetails = getShiftDetails(shift.name)
                                            return (
                                              <div
                                                key={personIdx}
                                                className={`px-3 py-2 ${colorClass} rounded-lg text-center shadow-sm hover:shadow-md transition-all cursor-pointer print:shadow-none`}
                                              >
                                                <span className="text-white font-semibold text-sm block">{person}</span>
                                                <span className="text-white/90 text-xs block mt-0.5">{shiftDetails?.hours}h</span>
                                              </div>
                                            )
                                          })
                                        ) : (
                                          <span className="text-gray-400 text-center block text-sm py-4">-</span>
                                        )}
                                      </div>
                                    </td>
                                  )
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hours Summary Tab */}
              {activeTab === 'hours' && rota.hours_report && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Staff Hours Summary</h3>
                  
                  {(() => {
                    const staffWeeklyHours = {}
                    const allStaff = new Set()
                    rota.schedule.forEach(shift => {
                      shift.assigned_staff?.forEach(name => allStaff.add(name))
                    })
                    
                    allStaff.forEach(staffName => {
                      staffWeeklyHours[staffName] = {}
                      for (let w = 1; w <= weekCount; w++) {
                        staffWeeklyHours[staffName][w] = 0
                      }
                    })
                    
                    rota.schedule.forEach(shift => {
                      const week = shift.week || 1
                      const [startTime, endTime] = shift.time.split('-')
                      const hours = parseFloat(calculateShiftHours(startTime, endTime))
                      
                      shift.assigned_staff?.forEach(staffName => {
                        staffWeeklyHours[staffName][week] += hours
                      })
                    })
                    
                    const contractedHours = {}
                    if (rota.hours_report) {
                      rota.hours_report.forEach(person => {
                        contractedHours[person.staff_name] = person.contracted || 0
                      })
                    }
                    
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200/60">
                              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Staff Member</th>
                              {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => (
                                <th key={weekNum} className="px-6 py-3 text-center text-sm font-semibold text-gray-700">
                                  Week {weekNum}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200/60">
                            {Array.from(allStaff).sort().map((staffName, idx) => {
                              const contracted = contractedHours[staffName] || 0
                              
                              return (
                                <tr key={idx} className="hover:bg-gray-50/50">
                                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{staffName}</td>
                                  {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => {
                                    const actual = staffWeeklyHours[staffName][weekNum] || 0
                                    const meetsMinimum = contracted === 0 || Math.abs(actual - contracted) < 0.5
                                    
                                    return (
                                      <td key={weekNum} className="px-6 py-4 text-center">
                                        <div className="text-sm">
                                          {contracted > 0 && (
                                            <div className="text-gray-500 text-xs mb-1">
                                              Contracted: {contracted}h
                                            </div>
                                          )}
                                          <div className={`font-semibold ${
                                            !meetsMinimum ? 'text-red-700' : 'text-green-700'
                                          }`}>
                                            Actual: {actual.toFixed(1)}h
                                          </div>
                                          {contracted > 0 && meetsMinimum && (
                                            <div className="text-xs text-green-600 mt-1">
                                              ✓ Within limits
                                            </div>
                                          )}
                                          {contracted > 0 && !meetsMinimum && (
                                            <div className="text-xs text-red-600 mt-1">
                                              ⚠️ {actual < contracted ? 'Under' : 'Over'} by {Math.abs(contracted - actual).toFixed(1)}h
                                            </div>
                                          )}
                                        </div>
                                      </td>
                                    )
                                  })}
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {rota && rota.summary && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4 no-print">
            <p className="text-sm text-blue-900">
              <strong>Summary:</strong> {rota.summary}
            </p>
          </div>
        )}
      </main>

      {/* Save Modal (Draft) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Rota as Draft</h3>
            <p className="text-sm text-gray-600 mb-4">Save this rota to revisit later. It won't count toward your time saved.</p>
            <input
              type="text"
              value={rotaName}
              onChange={(e) => setRotaName(e.target.value)}
              placeholder="Enter rota name (e.g., Week of Nov 18)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setRotaName('')
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRota(false)}
                className="flex-1 px-4 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve & Save Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save & Approve Rota</h3>
            <p className="text-sm text-gray-600 mb-4">Approve this rota to finalize it. This will count toward your time saved!</p>
            <input
              type="text"
              value={rotaName}
              onChange={(e) => setRotaName(e.target.value)}
              placeholder="Enter rota name (e.g., Week of Nov 18)"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setRotaName('')
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRota(true)}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
              >
                Approve & Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal container for DatePicker */}
      <div id="date-picker-portal"></div>
    </div>
  )
}