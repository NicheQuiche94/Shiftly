'use client'

import { useState, useEffect, Suspense } from 'react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import TeamSelector from '@/app/components/TeamSelector'
import ShiftEditModal from '@/app/components/ShiftEditModal'

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
    <div className="p-4 sm:p-6 border-b border-gray-200/60 bg-gray-50/30 no-print">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Rules Compliance</h3>
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
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between hover:bg-black/5 transition-colors rounded-lg"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    rule.status === 'followed' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    {rule.status === 'followed' ? (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900 text-sm sm:text-base">{rule.rule}</p>
                    <p className="text-xs sm:text-sm text-gray-700">{rule.details}</p>
                  </div>
                </div>
                {hasViolations && (
                  <svg 
                    className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </button>
              
              {hasViolations && isExpanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {rule.violations.map((violation, vIdx) => (
                      <div key={vIdx} className="bg-white rounded border border-gray-200 p-2 sm:p-3 text-xs sm:text-sm">
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

// Inner component that uses useSearchParams
function GenerateRotaContent() {
  const searchParams = useSearchParams()
  const rotaIdFromUrl = searchParams.get('rota')
  
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(!!rotaIdFromUrl)
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
  
  // Team selection state
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [showAllTeams, setShowAllTeams] = useState(false)
  
  // Staff list for editing
  const [allStaff, setAllStaff] = useState([])
  
  // Shift edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
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
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Get short day name
  const getShortDay = (dayName) => {
    return dayName.slice(0, 3)
  }

  // Print function
  const handlePrint = () => {
    window.print()
  }

  // Load saved rotas on mount and check for URL param
  useEffect(() => {
    loadSavedRotas()
  }, [])

  // Load rota from URL param after saved rotas are loaded
  useEffect(() => {
    if (rotaIdFromUrl && !rota) {
      handleLoadRota(rotaIdFromUrl)
    }
  }, [rotaIdFromUrl])

  // Load staff when team changes
  useEffect(() => {
    if (selectedTeamId) {
      loadStaff()
    }
  }, [selectedTeamId, showAllTeams])

  const loadStaff = async () => {
    try {
      let url = `/api/staff?team_id=${selectedTeamId}`
      if (showAllTeams) {
        url = `/api/staff` // Load all staff when showing all teams
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setAllStaff(data)
      }
    } catch (err) {
      console.error('Error loading staff:', err)
    }
  }

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
    if (!selectedTeamId && !showAllTeams) {
      alert('Please select a team first')
      return
    }
    
    setLoading(true)
    setError(null)
    setRota(null)
    setTimeSaved(null)
    setHasUnsavedChanges(false)
  
    let data = null
  
    try {
      const response = await fetch('/api/generate-rota', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          weekCount,
          team_id: selectedTeamId,
          showAllTeams: showAllTeams
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
          team_id: selectedTeamId,
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
            setTimeout(() => setTimeSaved(null), 5000)
          }
        }
      }

      setShowSaveModal(false)
      setShowApproveModal(false)
      setRotaName('')
      setHasUnsavedChanges(false)
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
      setInitialLoading(true)
      const response = await fetch(`/api/rotas/${rotaId}`)
      if (response.ok) {
        const data = await response.json()
        setRota(data.rota_data)
        setViewingRotaId(rotaId)
        setShowSavedRotas(false)
        setHasUnsavedChanges(false)
        
        if (data.start_date) {
          setStartDate(new Date(data.start_date))
        }
        if (data.week_count) {
          setWeekCount(data.week_count)
        }
        if (data.team_id) {
          setSelectedTeamId(data.team_id)
        }
      }
    } catch (err) {
      alert('Error loading rota: ' + err.message)
    } finally {
      setInitialLoading(false)
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

  // Handle shift card click - open edit modal
  const handleShiftClick = (staffName, day, shiftName, time, week) => {
    setEditingShift({
      staffName,
      day,
      shiftName,
      time,
      week
    })
    setShowEditModal(true)
  }

  // Handle reassigning a shift to a different staff member
  const handleReassign = (shiftData, newStaffName) => {
    if (!rota || !rota.schedule) return

    const updatedSchedule = rota.schedule.map(shift => {
      if (shift.day === shiftData.day && 
          shift.shift_name === shiftData.shiftName && 
          (shift.week || 1) === shiftData.week) {
        const updatedStaff = shift.assigned_staff.map(name => 
          name === shiftData.staffName ? newStaffName : name
        )
        return { ...shift, assigned_staff: updatedStaff }
      }
      return shift
    })

    setRota({ ...rota, schedule: updatedSchedule })
    setHasUnsavedChanges(true)
  }

  // Handle removing a staff member from a shift
  const handleRemove = (shiftData) => {
    if (!rota || !rota.schedule) return

    const updatedSchedule = rota.schedule.map(shift => {
      if (shift.day === shiftData.day && 
          shift.shift_name === shiftData.shiftName && 
          (shift.week || 1) === shiftData.week) {
        const updatedStaff = shift.assigned_staff.filter(name => 
          name !== shiftData.staffName
        )
        return { ...shift, assigned_staff: updatedStaff }
      }
      return shift
    })

    setRota({ ...rota, schedule: updatedSchedule })
    setHasUnsavedChanges(true)
  }

  // Handle swapping two shifts
  const handleSwap = (shiftData, targetShift) => {
    if (!rota || !rota.schedule) return

    const updatedSchedule = rota.schedule.map(shift => {
      const week = shift.week || 1
      
      if (shift.day === shiftData.day && 
          shift.shift_name === shiftData.shiftName && 
          week === shiftData.week) {
        const updatedStaff = shift.assigned_staff.map(name => 
          name === shiftData.staffName ? targetShift.staffName : name
        )
        return { ...shift, assigned_staff: updatedStaff }
      }
      
      if (shift.day === targetShift.day && 
          shift.shift_name === targetShift.shiftName && 
          week === targetShift.week) {
        const updatedStaff = shift.assigned_staff.map(name => 
          name === targetShift.staffName ? shiftData.staffName : name
        )
        return { ...shift, assigned_staff: updatedStaff }
      }
      
      return shift
    })

    setRota({ ...rota, schedule: updatedSchedule })
    setHasUnsavedChanges(true)
  }

  const calculateShiftHours = (startTime, endTime) => {
    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    const startMins = startH * 60 + startM
    let endMins = endH * 60 + endM
    if (endMins < startMins) endMins += 24 * 60 // Handle overnight shifts
    return ((endMins - startMins) / 60).toFixed(1)
  }

  // Get unique staff members for the grid
  const getUniqueStaff = () => {
    if (!rota || !rota.schedule) return []
    const staffSet = new Set()
    rota.schedule.forEach(shift => {
      shift.assigned_staff?.forEach(name => staffSet.add(name))
    })
    return Array.from(staffSet).sort()
  }

  const uniqueStaff = getUniqueStaff()

  // Get team name for a staff member
  const getStaffTeam = (staffName) => {
    if (rota && rota.staff_team_map) {
      return rota.staff_team_map[staffName] || null
    }
    return null
  }

  // Team color mapping for badges
  const teamColors = {
    'Main Team': 'bg-blue-100 text-blue-700',
    'Kitchen': 'bg-orange-100 text-orange-700',
    'Front of House': 'bg-green-100 text-green-700',
    'Bar': 'bg-purple-100 text-purple-700',
  }

  const getTeamBadgeColor = (teamName) => {
    return teamColors[teamName] || 'bg-gray-100 text-gray-700'
  }

  // Color palette for staff
  const staffColors = [
    'bg-gradient-to-br from-pink-500 to-pink-600',
    'bg-gradient-to-br from-purple-500 to-purple-600',
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-green-500 to-green-600',
    'bg-gradient-to-br from-orange-500 to-orange-600',
    'bg-gradient-to-br from-teal-500 to-teal-600',
    'bg-gradient-to-br from-red-500 to-red-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-yellow-500 to-yellow-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
  ]

  const getStaffColor = (staffName) => {
    const index = uniqueStaff.indexOf(staffName)
    return staffColors[index % staffColors.length]
  }

  // Get shifts for a specific staff member on a specific day/week
  const getStaffShiftsForDay = (staffName, dayName, weekNum) => {
    if (!rota || !rota.schedule) return []
    
    return rota.schedule.filter(shift => 
      shift.day === dayName && 
      (shift.week || 1) === weekNum &&
      shift.assigned_staff?.includes(staffName)
    )
  }

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rota...</p>
        </div>
      </div>
    )
  }

  if (loading && !rota) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <div className="mb-6 sm:mb-8 no-print">
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
            Rota Builder
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Create schedules that meet contracted hours and respect availability
          </p>
        </div>

        {/* Time Saved Banner */}
        {timeSaved && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl p-4 sm:p-6 shadow-lg animate-fade-in no-print">
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xl sm:text-2xl font-bold">
                {timeSaved} minutes saved! 🎉
              </span>
            </div>
          </div>
        )}

        {/* Unsaved Changes Banner */}
        {hasUnsavedChanges && (
          <div className="mb-4 sm:mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-800 font-medium text-sm sm:text-base">
                You have unsaved changes. Save or approve the rota to keep your edits.
              </span>
            </div>
          </div>
        )}

        {/* Team Selection Card */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Select Team
          </h2>
          
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-end">
            <div className="flex-1">
              <TeamSelector 
                selectedTeamId={selectedTeamId}
                onTeamChange={(teamId) => {
                  setSelectedTeamId(teamId)
                  if (showAllTeams) setShowAllTeams(false)
                }}
                showAddButton={false}
                disabled={showAllTeams}
              />
            </div>
            
            {/* Show All Teams Toggle */}
            <button
              onClick={() => setShowAllTeams(!showAllTeams)}
              className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
                showAllTeams
                  ? 'bg-pink-100 text-pink-700 border-2 border-pink-300'
                  : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              All Teams
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2 sm:mt-3">
            {showAllTeams 
              ? 'Generating rota for all teams combined' 
              : 'Choose which team to generate a rota for'
            }
          </p>
        </div>

        {/* Week Selection Card */}
        <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Select Week
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
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
              <select
                value={weekCount}
                onChange={(e) => setWeekCount(parseInt(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all text-base"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map((weeks) => (
                  <option key={weeks} value={weeks}>
                    {weeks} week{weeks > 1 ? 's' : ''}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {weekCount} week{weekCount > 1 ? 's' : ''} • {formatDate(startDate)} - {formatDate(getEndDate())}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-4 sm:mb-6 no-print">
          <button
            onClick={handleGenerate}
            disabled={loading || (!selectedTeamId && !showAllTeams)}
            className={`flex-1 min-w-[140px] sm:min-w-[200px] px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold text-white transition-all text-sm sm:text-base ${
              loading || (!selectedTeamId && !showAllTeams)
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-pink-600 hover:shadow-lg hover:shadow-pink-500/25'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Generating...</span>
                <span className="sm:hidden">...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generate
              </span>
            )}
          </button>

          <button
            onClick={() => setShowSavedRotas(!showSavedRotas)}
            className="px-3 sm:px-6 py-2.5 sm:py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 text-sm sm:text-base"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
            </svg>
            <span className="hidden sm:inline">Saved Rotas</span>
            <span className="sm:hidden">Saved</span>
          </button>

          {rota && rota.schedule && (
            <>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 sm:px-6 py-2.5 sm:py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all flex items-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                <span className="hidden sm:inline">Save</span>
              </button>

              <button
                onClick={() => setShowApproveModal(true)}
                className="px-3 sm:px-6 py-2.5 sm:py-3 border-2 border-pink-500 text-pink-600 rounded-lg font-semibold hover:bg-pink-50 transition-all flex items-center gap-2 text-sm sm:text-base"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Approve</span>
              </button>
              
              <button
                onClick={handlePrint}
                className="hidden sm:flex px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-all items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </>
          )}
        </div>

        {/* Edit Mode Indicator */}
        {rota && rota.schedule && (
          <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-blue-800 text-sm sm:text-base">
                <strong>Tap any shift</strong> to reassign, swap, or remove staff
              </span>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <p className="text-pink-900 font-medium text-sm sm:text-base">
                Generating rota...
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-900 font-bold text-base sm:text-lg mb-2">Unable to Generate Rota</p>
                <p className="text-red-800 text-sm sm:text-base">{typeof error === 'string' ? error : error.message}</p>
              </div>
            </div>

            {rota?.diagnostics && rota.diagnostics.suggestions && rota.diagnostics.suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="text-sm font-semibold text-red-900 mb-2">💡 How to fix:</p>
                <ul className="space-y-2">
                  {rota.diagnostics.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="text-xs sm:text-sm text-red-800 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">•</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Saved Rotas List */}
        {showSavedRotas && (
          <div className="bg-white rounded-xl border border-gray-200/60 p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Saved Rotas</h3>
            {savedRotas.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200/60"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{savedRota.rota_name || savedRota.name || 'Untitled Rota'}</p>
                        {savedRota.approved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Approved
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {savedRota.start_date && savedRota.end_date ? (
                          <>
                            {formatDate(new Date(savedRota.start_date))} - {formatDate(new Date(savedRota.end_date))}
                          </>
                        ) : (
                          'No date information'
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleLoadRota(savedRota.id)}
                        className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 transition-all font-medium text-sm"
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

        {/* Generated Rota Display - WITH TEAM BADGES */}
        {rota && rota.schedule && rota.schedule.length > 0 && (
          <div id="printable-rota" className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            {/* Print Header */}
            <div className="hidden print:block p-6 border-b border-gray-200">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Staff Rota</h1>
              <p className="text-gray-600">{formatDate(startDate)} - {formatDate(getEndDate())}</p>
            </div>

            {/* Rules Compliance */}
            {rota && rota.rule_compliance && rota.rule_compliance.length > 0 && (
              <RulesComplianceSection rules={rota.rule_compliance} />
            )}

            {/* Content Tabs */}
            <div className="border-b border-gray-200/60 bg-gray-50/50 no-print">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'schedule'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Schedule
                </button>
                <button
                  onClick={() => setActiveTab('hours')}
                  className={`px-4 sm:px-6 py-3 text-sm font-medium transition-colors ${
                    activeTab === 'hours'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Hours
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {/* Schedule Tab - Staff as rows, Days as columns */}
              {activeTab === 'schedule' && (
                <div className="space-y-6 sm:space-y-8">
                  {Array.from({ length: weekCount }, (_, weekIndex) => weekIndex + 1).map((weekNum) => (
                    <div key={weekNum} className="print:break-after-page">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                        Week {weekNum}
                        <span className="text-sm font-normal text-gray-500 ml-2">
                          {getDateForDay(weekNum - 1, 'Monday')} - {getDateForDay(weekNum - 1, 'Sunday')}
                        </span>
                      </h3>
                      
                      {/* Scrollable container for mobile */}
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[640px] px-4 sm:px-0">
                          <table className="w-full border-collapse print:text-sm">
                            <thead>
                              <tr className="bg-gray-50/50">
                                <th className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 w-32 sm:w-44 sticky left-0 bg-gray-50 z-10">
                                  Staff
                                </th>
                                {dayNames.map((day) => (
                                  <th key={day} className="border border-gray-200/60 px-2 sm:px-3 py-2 sm:py-3 text-center text-xs sm:text-sm font-semibold text-gray-700 min-w-[80px] sm:min-w-[100px]">
                                    <div className="sm:hidden">{getShortDay(day)}</div>
                                    <div className="hidden sm:block">{day}</div>
                                    <div className="text-xs font-normal text-gray-500 mt-0.5">
                                      {getDateForDay(weekNum - 1, day)}
                                    </div>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {uniqueStaff.map((staffName) => {
                                const colorClass = getStaffColor(staffName)
                                const teamName = getStaffTeam(staffName)
                                
                                return (
                                  <tr key={staffName} className="hover:bg-gray-50/50">
                                    {/* Staff name with team badge - sticky on mobile */}
                                    <td className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 bg-gray-50/30 sticky left-0 z-10">
                                      <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${colorClass} flex-shrink-0`}></div>
                                          <span className="text-xs sm:text-sm truncate">{staffName}</span>
                                        </div>
                                        {teamName && (showAllTeams || rota.staff_team_map) && (
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getTeamBadgeColor(teamName)} w-fit`}>
                                            {teamName}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    
                                    {/* Days */}
                                    {dayNames.map((day) => {
                                      const shifts = getStaffShiftsForDay(staffName, day, weekNum)
                                      
                                      return (
                                        <td 
                                          key={day} 
                                          className="border border-gray-200/60 px-1 sm:px-2 py-1 sm:py-2 bg-gray-50/20"
                                        >
                                          <div className="min-h-[40px] sm:min-h-[50px] flex flex-col gap-1">
                                            {shifts.length > 0 ? (
                                              shifts.map((shift, idx) => {
                                                const [startTime, endTime] = shift.time.split('-')
                                                const hours = calculateShiftHours(startTime, endTime)
                                                
                                                return (
                                                  <button
                                                    key={idx}
                                                    onClick={() => handleShiftClick(
                                                      staffName, 
                                                      day, 
                                                      shift.shift_name, 
                                                      shift.time,
                                                      weekNum
                                                    )}
                                                    className={`w-full px-1.5 sm:px-2 py-1 sm:py-1.5 ${colorClass} rounded text-center shadow-sm hover:shadow-md hover:scale-105 transition-all cursor-pointer print:shadow-none print:hover:scale-100`}
                                                  >
                                                    <span className="text-white font-medium text-[10px] sm:text-xs block truncate">
                                                      {shift.shift_name}
                                                    </span>
                                                    <span className="text-white/80 text-[9px] sm:text-[10px] block">
                                                      {shift.time}
                                                    </span>
                                                  </button>
                                                )
                                              })
                                            ) : (
                                              <span className="text-gray-300 text-center block text-xs py-3">—</span>
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
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Hours Summary Tab */}
              {activeTab === 'hours' && rota.hours_report && (
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Staff Hours Summary</h3>
                  
                  {(() => {
                    const staffWeeklyHours = {}
                    const allStaffNames = new Set()
                    rota.schedule.forEach(shift => {
                      shift.assigned_staff?.forEach(name => allStaffNames.add(name))
                    })
                    
                    allStaffNames.forEach(staffName => {
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
                      <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[400px] px-4 sm:px-0">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50/50 border-b border-gray-200/60">
                                <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700 sticky left-0 bg-gray-50">Staff</th>
                                {showAllTeams && (
                                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-semibold text-gray-700">Team</th>
                                )}
                                {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => (
                                  <th key={weekNum} className="px-3 sm:px-6 py-3 text-center text-xs sm:text-sm font-semibold text-gray-700">
                                    Wk {weekNum}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/60">
                              {Array.from(allStaffNames).sort().map((staffName, idx) => {
                                const contracted = contractedHours[staffName] || 0
                                const teamName = getStaffTeam(staffName)
                                
                                return (
                                  <tr key={idx} className="hover:bg-gray-50/50">
                                    <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium text-gray-900 sticky left-0 bg-white">{staffName}</td>
                                    {showAllTeams && (
                                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                                        {teamName && (
                                          <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${getTeamBadgeColor(teamName)}`}>
                                            {teamName}
                                          </span>
                                        )}
                                      </td>
                                    )}
                                    {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => {
                                      const actual = staffWeeklyHours[staffName][weekNum] || 0
                                      const meetsMinimum = contracted === 0 || Math.abs(actual - contracted) < 0.5
                                      
                                      return (
                                        <td key={weekNum} className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                          <div className="text-xs sm:text-sm">
                                            {contracted > 0 && (
                                              <div className="text-gray-500 text-[10px] sm:text-xs mb-0.5">
                                                {contracted}h
                                              </div>
                                            )}
                                            <div className={`font-semibold ${
                                              !meetsMinimum ? 'text-red-700' : 'text-green-700'
                                            }`}>
                                              {actual.toFixed(1)}h
                                            </div>
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
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {rota && rota.summary && (
          <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 no-print">
            <p className="text-xs sm:text-sm text-blue-900">
              <strong>Summary:</strong> {rota.summary}
            </p>
          </div>
        )}
      </main>

      {/* Shift Edit Modal */}
      <ShiftEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        shiftData={editingShift}
        allStaff={allStaff}
        onReassign={handleReassign}
        onRemove={handleRemove}
        onSwap={handleSwap}
        rota={rota}
      />

      {/* Save Modal (Draft) */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 no-print">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save Rota as Draft</h3>
            <p className="text-sm text-gray-600 mb-4">Save this rota to revisit later.</p>
            <input
              type="text"
              value={rotaName}
              onChange={(e) => setRotaName(e.target.value)}
              placeholder="Enter rota name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white mb-4 text-base"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSaveModal(false)
                  setRotaName('')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRota(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-semibold transition-all"
              >
                Save Draft
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve & Save Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50 no-print">
          <div className="bg-white rounded-t-2xl sm:rounded-xl p-5 sm:p-6 w-full sm:max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save & Approve Rota</h3>
            <p className="text-sm text-gray-600 mb-4">Approve this rota to finalize it.</p>
            <input
              type="text"
              value={rotaName}
              onChange={(e) => setRotaName(e.target.value)}
              placeholder="Enter rota name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white mb-4 text-base"
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowApproveModal(false)
                  setRotaName('')
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveRota(true)}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Portal container for DatePicker */}
      <div id="date-picker-portal"></div>
    </>
  )
}

// Main export with Suspense wrapper
export default function GenerateRotaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <GenerateRotaContent />
    </Suspense>
  )
}