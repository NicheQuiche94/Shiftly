'use client'

import { useState, useEffect, Suspense } from 'react'
import React from 'react'
import { useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/PageHeader'
import RotaConfigPanel from '@/app/components/rota/RotaConfigPanel'
import RotaActions from '@/app/components/rota/RotaActions'
import SavedRotasList from '@/app/components/rota/SavedRotasList'
import SaveApproveModal from '@/app/components/rota/SaveApproveModal'
import ShiftEditModal from '@/app/components/ShiftEditModal'
import AddShiftModal from '@/app/components/AddShiftModal'
import UncoveredShiftsPanel from '@/app/components/rota/UncoveredShiftsPanel'
import RulesComplianceSection from '@/app/components/rota/RulesComplianceSection'
import RotaAlerts from '@/app/components/rota/RotaAlerts'
import RotaScheduleGrid from '@/app/components/rota/RotaScheduleGrid'
import RotaHoursTable from '@/app/components/rota/RotaHoursTable'

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
  const [shiftPatterns, setShiftPatterns] = useState([])
  
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingShift, setEditingShift] = useState(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  // Add Shift Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addShiftDay, setAddShiftDay] = useState(null)
  const [addShiftWeek, setAddShiftWeek] = useState(null)
  
  const [loadingStep, setLoadingStep] = useState('')

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
      loadShiftPatterns()
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

  const loadShiftPatterns = async () => {
    try {
      let url = `/api/shifts?team_id=${selectedTeamId}`
      if (showAllTeams) {
        url = `/api/shifts`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setShiftPatterns(data)
      }
    } catch (err) {
      console.error('Error loading shift patterns:', err)
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
      // Step 1: Sync shifts from templates
      setLoadingStep('Syncing shifts from templates...')
      let teamIds = []
      if (showAllTeams) {
        const teamsRes = await fetch('/api/teams')
        if (teamsRes.ok) {
          const teams = await teamsRes.json()
          teamIds = teams.map(t => t.id)
        }
      } else {
        teamIds = [selectedTeamId]
      }

      const syncResults = await Promise.all(
        teamIds.map(async (id) => {
          try {
            const r = await fetch(`/api/teams/${id}/template/sync-shifts`, { method: 'POST' })
            const body = await r.json()
            if (!r.ok) return { error: body.error || `Sync failed (${r.status})` }
            return body
          } catch {
            return { error: 'Failed to sync shifts' }
          }
        })
      )

      // Pre-flight: check sync produced shifts
      const syncError = syncResults.find(r => r?.error)
      if (syncError) {
        throw new Error(syncError.error)
      }
      const totalShifts = syncResults.reduce((sum, r) => sum + (r?.shifts_generated || 0), 0)
      if (totalShifts === 0) {
        throw new Error('No shifts generated from templates. Configure your day templates and weekly schedule in the Workspace tab first.')
      }

      // Step 2: Generate rota
      setLoadingStep('Generating rota...')
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
      setLoadingStep('')
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
        try {
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
        } catch (statsErr) {
          console.error('Non-critical: failed to update stats', statsErr)
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

  // Generate a default rota name from the date range
  const generateRotaName = () => {
    const endDate = new Date(startDate.getTime() + (weekCount * 7 - 1) * 24 * 60 * 60 * 1000)
    const start = startDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    const end = endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    return `${start} – ${end}`
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

  const handleEmptyCellClick = (staffName, day, weekNum) => {
    setAddShiftDay(day)
    setAddShiftWeek(weekNum)
    setShowAddModal(true)
  }

  const handleAddShift = ({ day, week, shiftName, time, staffName }) => {
    if (!rota || !rota.schedule) return

    // Check if this shift pattern already exists in the schedule for this day/week
    const existingShiftIndex = rota.schedule.findIndex(s =>
      s.day === day &&
      s.shift_name === shiftName &&
      (s.week || 1) === week
    )

    let updatedSchedule

    if (existingShiftIndex >= 0) {
      // Add staff to existing shift entry
      updatedSchedule = rota.schedule.map((shift, idx) => {
        if (idx === existingShiftIndex) {
          const currentStaff = shift.assigned_staff || []
          if (!currentStaff.includes(staffName)) {
            return { ...shift, assigned_staff: [...currentStaff, staffName] }
          }
        }
        return shift
      })
    } else {
      // Create new shift entry
      updatedSchedule = [
        ...rota.schedule,
        {
          day,
          shift_name: shiftName,
          time,
          assigned_staff: [staffName],
          week
        }
      ]
    }

    setRota({ ...rota, schedule: updatedSchedule })
    setHasUnsavedChanges(true)
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

  // Uncovered shifts: open add modal pre-filled for that shift
  const handleAddFromUncovered = (uncoveredShift) => {
    setAddShiftDay(uncoveredShift.day)
    setAddShiftWeek(uncoveredShift.weekNum)
    setShowAddModal(true)
  }

  const handlePostToPickupBoard = async (uncoveredShift) => {
    // TODO: Post to employee pickup board via notifications API
    alert(`Posted ${uncoveredShift.shiftName} on ${uncoveredShift.day} (Week ${uncoveredShift.weekNum}) to the pickup board. Employees will be notified.`)
  }

  // --- Staff helpers ---

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

  // --- Loading states ---

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

        <RotaAlerts
          timeSaved={timeSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          loading={loading}
          loadingStep={loadingStep}
          showAllTeams={showAllTeams}
          error={error}
          rota={rota}
        />

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
          onSave={() => {
            if (!rotaName) setRotaName(generateRotaName())
            setShowSaveModal(true)
          }}
          onApprove={() => {
            if (!rotaName) setRotaName(generateRotaName())
            setShowApproveModal(true)
          }}
          onPrint={handlePrint}
        />

        {showSavedRotas && (
          <SavedRotasList 
            savedRotas={savedRotas}
            onLoad={handleLoadRota}
            onDelete={handleDeleteRota}
          />
        )}

        {rota && rota.schedule && rota.schedule.length > 0 && (
          <>
            <div id="printable-rota" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="hidden print:block p-6 border-b border-gray-200">
                <h1 className="heading-page mb-2">Staff Rota</h1>
                <p className="body-text">{formatDate(startDate)} - {formatDate(new Date(startDate.getTime() + (weekCount * 7 - 1) * 24 * 60 * 60 * 1000))}</p>
              </div>

              {rota && rota.rule_compliance && rota.rule_compliance.length > 0 && (
                <RulesComplianceSection rules={rota.rule_compliance} />
              )}

              <div className="px-4 sm:px-6 pt-4 pb-2 bg-gray-50/50 no-print">
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('schedule')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'schedule'
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => setActiveTab('hours')}
                    className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      activeTab === 'hours'
                        ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
                    }`}
                  >
                    Hours
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {activeTab === 'schedule' && (
                  <RotaScheduleGrid
                    rota={rota}
                    weekCount={weekCount}
                    startDate={startDate}
                    uniqueStaff={uniqueStaff}
                    getStaffTeam={getStaffTeam}
                    getTeamColor={getTeamColor}
                    getStaffColor={getStaffColor}
                    getStaffShiftsForDay={getStaffShiftsForDay}
                    getDateForDay={getDateForDay}
                    getShortDay={getShortDay}
                    handleShiftClick={handleShiftClick}
                    handleEmptyCellClick={handleEmptyCellClick}
                  />
                )}

                {activeTab === 'hours' && rota.hours_report && (
                  <RotaHoursTable
                    rota={rota}
                    weekCount={weekCount}
                    startDate={startDate}
                    getTeamColor={getTeamColor}
                    allStaff={allStaff}
                  />
                )}
              </div>
            </div>

            {/* Uncovered Shifts Panel - below the rota grid */}
            <UncoveredShiftsPanel
              rota={rota}
              shiftPatterns={shiftPatterns}
              weekCount={weekCount}
              onAddShiftToRota={handleAddFromUncovered}
              onPostToPickupBoard={handlePostToPickupBoard}
            />
          </>
        )}

        {rota && rota.summary && (
          <div className="mt-4 sm:mt-6 bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4 no-print">
            <p className="body-small text-blue-900">
              <strong>Summary:</strong> {rota.summary}
            </p>
          </div>
        )}
      </main>

      {/* Edit existing shift modal */}
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

      {/* Add new shift modal */}
      <AddShiftModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        day={addShiftDay}
        weekNum={addShiftWeek}
        shiftPatterns={shiftPatterns}
        allStaff={allStaff}
        rota={rota}
        onAddShift={handleAddShift}
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