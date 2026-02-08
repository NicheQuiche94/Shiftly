'use client'

import { useState, useEffect, Suspense } from 'react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/PageHeader'
import Badge from '@/app/components/Badge'
import RotaConfigPanel from '@/app/components/rota/RotaConfigPanel'
import RotaActions from '@/app/components/rota/RotaActions'
import SavedRotasList from '@/app/components/rota/SavedRotasList'
import SaveApproveModal from '@/app/components/rota/SaveApproveModal'
import ShiftEditModal from '@/app/components/ShiftEditModal'

// Rules Compliance Section - FIXED: Now collapsible
function RulesComplianceSection({ rules }) {
  const [isExpanded, setIsExpanded] = useState(false)
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
    <div className="border-b border-gray-200/60 bg-gray-50/30 no-print">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="heading-section">Rules Compliance</h3>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2">
          {rules.map((rule, idx) => {
            const isRuleExpanded = expandedRules[idx]
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
                      <p className="body-text font-semibold">{rule.rule}</p>
                      <p className="body-small">{rule.details}</p>
                    </div>
                  </div>
                  {hasViolations && (
                    <svg 
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isRuleExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {hasViolations && isRuleExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {rule.violations.map((violation, vIdx) => (
                        <div key={vIdx} className="bg-white rounded border border-gray-200 p-2 sm:p-3">
                          <div className="body-text font-medium mb-1">
                            {violation.staff} - {violation.day} - {violation.week}
                          </div>
                          <div className="body-small mb-2">
                            <span className="font-medium">Issue:</span> {violation.issue || (violation.count ? `${violation.count} weekend shifts` : 'See details')}
                          </div>
                          <div className="body-small">
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
      )}
    </div>
  )
}

function GenerateRotaContent() {
  const searchParams = useSearchParams()
  const rotaIdFromUrl = searchParams.get('rota')
  
  // State management
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
  const [timeSaved, setTimeSaved] = useState(null)
  
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [showAllTeams, setShowAllTeams] = useState(false)
  const [allStaff, setAllStaff] = useState([])
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
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

  // Helper functions
  const getDateForDay = (weekIndex, dayName) => {
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const dayIndex = dayNames.indexOf(dayName)
    const date = new Date(startDate)
    date.setDate(date.getDate() + (weekIndex * 7) + dayIndex)
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  const getShortDay = (dayName) => {
    return dayName.slice(0, 3)
  }

  const handlePrint = () => {
    window.print()
  }

  const formatDate = (date) => {
    return date.toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // FIXED: Only load saved rotas and rota from URL - don't auto-generate
  useEffect(() => {
    loadSavedRotas()
  }, [])

  useEffect(() => {
    if (rotaIdFromUrl && !rota) {
      handleLoadRota(rotaIdFromUrl)
    }
  }, [rotaIdFromUrl])

  useEffect(() => {
    if (selectedTeamId) {
      loadStaff()
    }
  }, [selectedTeamId, showAllTeams])

  const loadStaff = async () => {
    try {
      let url = `/api/staff?team_id=${selectedTeamId}`
      if (showAllTeams) {
        url = `/api/staff`
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
    setViewingRotaId(null)
  
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
      let response
      let savedRotaId = viewingRotaId

      if (viewingRotaId) {
        response = await fetch(`/api/rotas/${viewingRotaId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: rotaName,
            rota_data: rota,
            start_date: startDate.toISOString(),
            end_date: new Date(startDate.getTime() + (weekCount * 7 - 1) * 24 * 60 * 60 * 1000).toISOString(),
            week_count: weekCount,
            team_id: selectedTeamId,
            approved: approved
          })
        })
      } else {
        response = await fetch('/api/rotas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: rotaName,
            rota_data: rota,
            start_date: startDate.toISOString(),
            end_date: new Date(startDate.getTime() + (weekCount * 7 - 1) * 24 * 60 * 60 * 1000).toISOString(),
            week_count: weekCount,
            team_id: selectedTeamId,
            approved: approved
          })
        })

        if (response.ok) {
          const data = await response.json()
          savedRotaId = data.id
          setViewingRotaId(data.id)
        }
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save rota')
      }

      if (approved) {
        const settingsResponse = await fetch('/api/user-settings')
        if (settingsResponse.ok) {
          const settings = await settingsResponse.json()
          
          await fetch('/api/user-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              total_rotas_generated: (settings?.total_rotas_generated || 0) + 1
            })
          })

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
      console.error('Save error:', err)
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
        setRotaName(data.name || data.rota_name || '')
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
          setRotaName('')
        }
      }
    } catch (err) {
      alert('Error deleting rota: ' + err.message)
    }
  }

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

  const getUniqueStaff = () => {
    if (!rota || !rota.schedule) return []
    const staffSet = new Set()
    rota.schedule.forEach(shift => {
      shift.assigned_staff?.forEach(name => staffSet.add(name))
    })
    return Array.from(staffSet).sort()
  }

  const uniqueStaff = getUniqueStaff()

  const getStaffTeam = (staffName) => {
    if (rota && rota.staff_team_map) {
      return rota.staff_team_map[staffName] || null
    }
    return null
  }

  const teamColors = [
    { bg: 'bg-pink-100', text: 'text-pink-700', line: 'bg-pink-200' },
    { bg: 'bg-blue-100', text: 'text-blue-700', line: 'bg-blue-200' },
    { bg: 'bg-green-100', text: 'text-green-700', line: 'bg-green-200' },
    { bg: 'bg-purple-100', text: 'text-purple-700', line: 'bg-purple-200' },
    { bg: 'bg-orange-100', text: 'text-orange-700', line: 'bg-orange-200' },
    { bg: 'bg-teal-100', text: 'text-teal-700', line: 'bg-teal-200' },
  ]

  const getTeamColor = (teamIndex) => {
    return teamColors[teamIndex % teamColors.length]
  }

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
          <p className="body-text">Loading rota...</p>
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
        <PageHeader 
          title="Rota Builder"
          subtitle="Create schedules that meet contracted hours and respect availability"
        />

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

        {hasUnsavedChanges && (
          <div className="mb-4 sm:mb-6 bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-amber-800 font-medium body-text">
                You have unsaved changes. Save or approve the rota to keep your edits.
              </span>
            </div>
          </div>
        )}

        <RotaConfigPanel
          selectedTeamId={selectedTeamId}
          setSelectedTeamId={setSelectedTeamId}
          showAllTeams={showAllTeams}
          setShowAllTeams={setShowAllTeams}
          startDate={startDate}
          setStartDate={setStartDate}
          weekCount={weekCount}
          setWeekCount={setWeekCount}
        />

        <RotaActions
          loading={loading}
          selectedTeamId={selectedTeamId}
          showAllTeams={showAllTeams}
          onGenerate={handleGenerate}
          showSavedRotas={showSavedRotas}
          setShowSavedRotas={setShowSavedRotas}
          rota={rota}
          onSave={() => setShowSaveModal(true)}
          onApprove={() => setShowApproveModal(true)}
          onPrint={handlePrint}
        />

        {rota && rota.schedule && (
          <div className="mb-4 sm:mb-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 no-print">
            <div className="flex items-center gap-2 sm:gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span className="text-blue-800 body-text">
                <strong>Tap any shift</strong> to reassign, swap, or remove staff
              </span>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600"></div>
              <p className="text-pink-900 font-medium body-text">
                Generating rota{showAllTeams ? 's for all teams' : ''}...
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 sm:p-6 mb-4 sm:mb-6 no-print">
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-900 font-bold heading-subsection mb-2">Unable to Generate Rota</p>
                <p className="text-red-800 body-text whitespace-pre-wrap">{typeof error === 'string' ? error : error.message}</p>
              </div>
            </div>

            {rota?.diagnostics && rota.diagnostics.suggestions && rota.diagnostics.suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-red-200">
                <p className="body-text font-semibold text-red-900 mb-2">How to fix:</p>
                <ul className="space-y-2">
                  {rota.diagnostics.suggestions.map((suggestion, idx) => (
                    <li key={idx} className="body-small text-red-800 flex items-start gap-2">
                      <span className="text-red-600 mt-0.5">-</span>
                      <span>{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {showSavedRotas && (
          <SavedRotasList 
            savedRotas={savedRotas}
            onLoad={handleLoadRota}
            onDelete={handleDeleteRota}
          />
        )}

        {/* SCHEDULE GRID - Keep inline due to complexity */}
        {rota && rota.schedule && rota.schedule.length > 0 && (
          <div id="printable-rota" className="bg-white rounded-xl border border-gray-200/60 overflow-hidden">
            <div className="hidden print:block p-6 border-b border-gray-200">
              <h1 className="heading-page mb-2">Staff Rota</h1>
              <p className="body-text">{formatDate(startDate)} - {formatDate(new Date(startDate.getTime() + (weekCount * 7 - 1) * 24 * 60 * 60 * 1000))}</p>
            </div>

            {rota && rota.rule_compliance && rota.rule_compliance.length > 0 && (
              <RulesComplianceSection rules={rota.rule_compliance} />
            )}

            <div className="border-b border-gray-200/60 bg-gray-50/50 no-print">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('schedule')}
                  className={`px-4 sm:px-6 py-3 body-text font-medium transition-colors ${
                    activeTab === 'schedule'
                      ? 'text-pink-600 border-b-2 border-pink-600 bg-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Schedule
                </button>
                <button
                  onClick={() => setActiveTab('hours')}
                  className={`px-4 sm:px-6 py-3 body-text font-medium transition-colors ${
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
              {activeTab === 'schedule' && (
                <div className="space-y-6 sm:space-y-8">
                  {Array.from({ length: weekCount }, (_, weekIndex) => weekIndex + 1).map((weekNum) => {
                    const teamsInRota = rota.teams && rota.teams.length > 0 ? rota.teams : [{ id: null, name: null }]
                    const hasMultipleTeams = teamsInRota.length > 1 || (rota.teams && rota.teams.length > 1)

                    return (
                      <div key={weekNum} className="print:break-after-page">
                        <h3 className="heading-section mb-3 sm:mb-4">
                          Week {weekNum}
                          <span className="body-small font-normal text-gray-500 ml-2">
                            {getDateForDay(weekNum - 1, 'Monday')} - {getDateForDay(weekNum - 1, 'Sunday')}
                          </span>
                        </h3>
                        
                        {teamsInRota.map((team, teamIndex) => {
                          const teamStaff = uniqueStaff.filter(staffName => {
                            if (!hasMultipleTeams) return true
                            return getStaffTeam(staffName) === team.name
                          })

                          if (teamStaff.length === 0) return null

                          const teamColor = getTeamColor(teamIndex)

                          return (
                            <div key={team.id || 'single'} className={teamIndex > 0 ? 'mt-6 sm:mt-8' : ''}>
                              {hasMultipleTeams && team.name && (
                                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                                  <Badge variant="info" className={`${teamColor.bg} ${teamColor.text}`}>
                                    {team.name}
                                  </Badge>
                                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                                </div>
                              )}

                              <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <div className="min-w-[640px] px-4 sm:px-0">
                                  <table className="w-full border-collapse print:text-sm">
                                    <thead>
                                      <tr className="bg-gray-50/50">
                                        <th className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 text-left body-text font-semibold text-gray-700 w-32 sm:w-44 sticky left-0 bg-gray-50 z-10">
                                          Staff
                                        </th>
                                        {dayNames.map((day) => (
                                          <th key={day} className="border border-gray-200/60 px-2 sm:px-3 py-2 sm:py-3 text-center body-text font-semibold text-gray-700 min-w-[80px] sm:min-w-[100px]">
                                            <div className="sm:hidden">{getShortDay(day)}</div>
                                            <div className="hidden sm:block">{day}</div>
                                            <div className="caption font-normal text-gray-500 mt-0.5">
                                              {getDateForDay(weekNum - 1, day)}
                                            </div>
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {teamStaff.map((staffName) => {
                                        const colorClass = getStaffColor(staffName)
                                        
                                        return (
                                          <tr key={staffName} className="hover:bg-gray-50/50">
                                            <td className="border border-gray-200/60 px-3 sm:px-4 py-2 sm:py-3 font-medium text-gray-900 bg-gray-50/30 sticky left-0 z-10">
                                              <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${colorClass} flex-shrink-0`}></div>
                                                <span className="body-small truncate">{staffName}</span>
                                              </div>
                                            </td>
                                            
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
                                                      <span className="caption text-center block py-3">-</span>
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
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )}

              {activeTab === 'hours' && rota.hours_report && (
                <div>
                  <h3 className="heading-section mb-4">Staff Hours Summary</h3>
                  
                  {(() => {
                    const teamsInRota = rota.teams && rota.teams.length > 0 ? rota.teams : [{ id: null, name: null }]
                    const hasMultipleTeams = teamsInRota.length > 1

                    return (
                      <div className="space-y-6">
                        {teamsInRota.map((team, teamIndex) => {
                          const teamHoursReport = rota.hours_report.filter(report => {
                            if (!hasMultipleTeams) return true
                            return report.team_name === team.name
                          })

                          if (teamHoursReport.length === 0) return null

                          const teamColor = getTeamColor(teamIndex)

                          return (
                            <div key={team.id || 'single'}>
                              {hasMultipleTeams && team.name && (
                                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                                  <Badge variant="info" className={`${teamColor.bg} ${teamColor.text}`}>
                                    {team.name}
                                  </Badge>
                                  <div className={`h-1 flex-1 rounded ${teamColor.line}`}></div>
                                </div>
                              )}

                              <div className="overflow-x-auto -mx-4 sm:mx-0">
                                <div className="min-w-[400px] px-4 sm:px-0">
                                  <table className="w-full border-collapse">
                                    <thead>
                                      <tr className="bg-gray-50/50 border-b border-gray-200/60">
                                        <th className="px-3 sm:px-6 py-3 text-left body-text font-semibold text-gray-700 sticky left-0 bg-gray-50">Staff</th>
                                        <th className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">Contract</th>
                                        {Array.from({ length: weekCount }, (_, i) => i + 1).map(weekNum => (
                                          <th key={weekNum} className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">
                                            Wk {weekNum}
                                          </th>
                                        ))}
                                        <th className="px-3 sm:px-6 py-3 text-center body-text font-semibold text-gray-700">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200/60">
                                      {teamHoursReport.map((report, idx) => {
                                        return (
                                          <tr key={idx} className="hover:bg-gray-50/50">
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 body-text font-medium text-gray-900 sticky left-0 bg-white">
                                              {report.staff_name}
                                            </td>
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-center body-small">
                                              {report.contracted}h
                                            </td>
                                            {report.weekly_hours.map((hours, wIdx) => (
                                              <td key={wIdx} className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                                <span className={`body-small font-semibold ${
                                                  report.contracted > 0 && Math.abs(hours - report.contracted) > 0.5
                                                    ? 'text-red-700'
                                                    : 'text-green-700'
                                                }`}>
                                                  {hours.toFixed(1)}h
                                                </span>
                                              </td>
                                            ))}
                                            <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                                              <Badge 
                                                variant={report.status === 'Met' ? 'success' : 'error'}
                                                size="sm"
                                              >
                                                {report.status}
                                              </Badge>
                                            </td>
                                          </tr>
                                        )
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          )
                        })}
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
            <p className="body-small text-blue-900">
              <strong>Summary:</strong> {rota.summary}
            </p>
          </div>
        )}
      </main>

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

      <SaveApproveModal
        isOpen={showSaveModal}
        onClose={() => {
          setShowSaveModal(false)
          if (!viewingRotaId) setRotaName('')
        }}
        mode="save"
        rotaName={rotaName}
        setRotaName={setRotaName}
        onSubmit={() => handleSaveRota(false)}
        viewingRotaId={viewingRotaId}
      />

      <SaveApproveModal
        isOpen={showApproveModal}
        onClose={() => {
          setShowApproveModal(false)
          if (!viewingRotaId) setRotaName('')
        }}
        mode="approve"
        rotaName={rotaName}
        setRotaName={setRotaName}
        onSubmit={() => handleSaveRota(true)}
        viewingRotaId={viewingRotaId}
      />

      <div id="date-picker-portal"></div>
    </>
  )
}

export default function GenerateRotaPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="body-text">Loading...</p>
        </div>
      </div>
    }>
      <GenerateRotaContent />
    </Suspense>
  )
}