'use client'

import { useState, useEffect, useRef } from 'react'

export default function TeamSelector({ selectedTeamId, onTeamChange, showAddButton = true, showAllTeams = false, onAllTeamsChange }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef(null)

  // Multi-step modal state
  const [showCreateFlow, setShowCreateFlow] = useState(false)
  const [createStep, setCreateStep] = useState(1)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')

  // Import state
  const [importFile, setImportFile] = useState(null)
  const [parsing, setParsing] = useState(false)
  const [parsedData, setParsedData] = useState(null)
  const [parseError, setParseError] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => { if (mounted) loadTeams() }, [mounted])

  // Close picker on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) setPickerOpen(false)
    }
    if (pickerOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [pickerOpen])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to load teams')
      const data = await response.json()
      setTeams(data)
      if (data.length > 0 && !selectedTeamId) onTeamChange(data[0].id)
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetCreateFlow = () => {
    setShowCreateFlow(false)
    setCreateStep(1)
    setNewTeamName('')
    setNewTeamDescription('')
    setImportFile(null)
    setParsedData(null)
    setParseError(null)
  }

  const handleCreateTeam = async (withImport = false) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_name: newTeamName, description: newTeamDescription })
      })
      if (!response.ok) throw new Error('Failed to create team')
      const newTeam = await response.json()
      if (withImport && parsedData) await importDataToTeam(newTeam.id)
      resetCreateFlow()
      await loadTeams()
      onTeamChange(newTeam.id)
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    }
  }

  const importDataToTeam = async (teamId) => {
    for (const staff of parsedData.staff) {
      try { await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...staff, team_id: teamId }) }) } catch (err) { console.error('Error importing staff:', err) }
    }
    for (const shift of parsedData.shifts) {
      try { await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...shift, team_id: teamId }) }) } catch (err) { console.error('Error importing shift:', err) }
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImportFile(file)
    setParsing(true)
    setParseError(null)
    setParsedData(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/import/parse', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to parse file')
      setParsedData(data)
    } catch (error) {
      setParseError(error.message)
    } finally {
      setParsing(false)
    }
  }

  const handleDeleteTeam = async () => {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) return
    if (!confirm(`Are you sure you want to delete "${team.team_name}"? This will also delete all staff, shifts, and rules for this team.`)) return
    try {
      const response = await fetch(`/api/teams?id=${selectedTeamId}`, { method: 'DELETE' })
      if (!response.ok) { const data = await response.json(); throw new Error(data.error || 'Failed to delete team') }
      await loadTeams()
    } catch (error) {
      alert(error.message || 'Failed to delete team. Please try again.')
    }
  }

  const updateParsedStaff = (index, field, value) => {
    setParsedData(prev => ({ ...prev, staff: prev.staff.map((s, i) => i === index ? { ...s, [field]: value } : s) }))
  }
  const removeParsedStaff = (index) => {
    setParsedData(prev => ({ ...prev, staff: prev.staff.filter((_, i) => i !== index) }))
  }
  const updateParsedShift = (index, field, value) => {
    setParsedData(prev => ({ ...prev, shifts: prev.shifts.map((s, i) => i === index ? { ...s, [field]: value } : s) }))
  }
  const removeParsedShift = (index) => {
    setParsedData(prev => ({ ...prev, shifts: prev.shifts.filter((_, i) => i !== index) }))
  }

  if (!mounted || loading) {
    return <div className="flex items-center space-x-3"><div className="w-48 h-10 bg-gray-200 rounded-lg animate-pulse" /></div>
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Team Picker Button */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-all min-w-[200px]"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 truncate">
              {showAllTeams ? 'All Teams' : selectedTeam?.team_name || 'Select team'}
            </span>
            <svg className={`w-4 h-4 text-gray-400 ml-auto transition-transform ${pickerOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown */}
          {pickerOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden">
              <div className="p-2">
                {/* All Teams option */}
                {onAllTeamsChange && (
                  <button
                    onClick={() => { onAllTeamsChange(true); setPickerOpen(false) }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                      showAllTeams ? 'bg-pink-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${showAllTeams ? '' : 'border-2 border-gray-300'}`} style={showAllTeams ? { backgroundColor: '#FF1F7D' } : {}} />
                    <div className="text-left">
                      <p className={`text-sm font-medium ${showAllTeams ? 'text-gray-900' : 'text-gray-700'}`}>All Teams</p>
                      <p className="text-xs text-gray-400">View across all teams</p>
                    </div>
                  </button>
                )}

                {onAllTeamsChange && teams.length > 0 && (
                  <div className="border-t border-gray-100 my-1" />
                )}

                {/* Team list */}
                {teams.map((team) => {
                  const isSelected = !showAllTeams && team.id === selectedTeamId
                  return (
                    <button
                      key={team.id}
                      onClick={() => {
                        onTeamChange(team.id)
                        if (onAllTeamsChange) onAllTeamsChange(false)
                        setPickerOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isSelected ? 'bg-pink-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isSelected ? '' : 'border-2 border-gray-300'}`} style={isSelected ? { backgroundColor: '#FF1F7D' } : {}} />
                      <div className="text-left flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>{team.team_name}</p>
                        {team.description && <p className="text-xs text-gray-400 truncate">{team.description}</p>}
                      </div>
                      {team.is_default && <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">Default</span>}
                    </button>
                  )
                })}
              </div>

              {/* Delete team */}
              {selectedTeamId && teams.find(t => t.id === selectedTeamId && !t.is_default) && (
                <div className="border-t border-gray-100 p-2">
                  <button
                    onClick={() => { handleDeleteTeam(); setPickerOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-all text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete team
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Add Team Button */}
        {showAddButton && (
          <button
            onClick={() => setShowCreateFlow(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center space-x-2 text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Team</span>
          </button>
        )}
      </div>

      {/* Multi-Step Create Team Modal - keeping same as before */}
      {showCreateFlow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${createStep >= step ? 'bg-pink-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                    {createStep > step ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : step}
                  </div>
                  {step < 3 && <div className={`w-12 h-1 mx-1 rounded ${createStep > step ? 'bg-pink-500' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            {createStep === 1 && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-cal">Name Your Team</h2>
                  <p className="text-gray-500 text-sm mt-1">Create a team to organize staff and shifts</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Team Name *</label>
                    <input type="text" required value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white" placeholder="e.g., Kitchen Staff, Front of House" autoFocus />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Description (Optional)</label>
                    <input type="text" value={newTeamDescription} onChange={(e) => setNewTeamDescription(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white" placeholder="e.g., Main restaurant kitchen team" />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={resetCreateFlow} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors">Cancel</button>
                  <button onClick={() => setCreateStep(2)} disabled={!newTeamName.trim()} className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${newTeamName.trim() ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white hover:shadow-lg hover:shadow-pink-500/25' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>Continue</button>
                </div>
              </>
            )}

            {createStep === 2 && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-cal">Import Existing Rota?</h2>
                  <p className="text-gray-500 text-sm mt-1">We can extract staff and shifts from your existing schedule</p>
                </div>
                <div className="space-y-3">
                  <button onClick={() => setCreateStep(3)} className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-pink-300 hover:bg-pink-50 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-pink-100 rounded-xl flex items-center justify-center group-hover:bg-pink-200 transition-colors">
                        <svg className="w-6 h-6 text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      </div>
                      <div><p className="font-semibold text-gray-900">Upload Photo or Excel</p><p className="text-sm text-gray-500">Import from existing rota file</p></div>
                    </div>
                  </button>
                  <button onClick={() => handleCreateTeam(false)} className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all text-left group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                        <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      </div>
                      <div><p className="font-semibold text-gray-900">Start Fresh</p><p className="text-sm text-gray-500">Add staff and shifts manually</p></div>
                    </div>
                  </button>
                </div>
                <button onClick={() => setCreateStep(1)} className="w-full mt-4 px-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors">← Back</button>
              </>
            )}

            {createStep === 3 && (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 font-cal">{parsedData ? 'Review Import' : 'Upload File'}</h2>
                  <p className="text-gray-500 text-sm mt-1">{parsedData ? 'Check the data looks correct before importing' : 'Upload a photo or Excel/CSV file'}</p>
                </div>
                {!parsedData && !parsing && (
                  <div className="space-y-4">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg" className="hidden" />
                    <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all">
                      <div className="text-center">
                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        <p className="font-medium text-gray-700">Click to upload</p>
                        <p className="text-sm text-gray-500 mt-1">Excel, CSV, or Photo</p>
                      </div>
                    </button>
                    {parseError && <div className="p-4 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-700 text-sm">{parseError}</p></div>}
                  </div>
                )}
                {parsing && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Analyzing your file...</p>
                  </div>
                )}
                {parsedData && (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto">
                    <div>
                      <h3 className="font-semibold text-gray-900 font-cal mb-2">Staff ({parsedData.staff.length})</h3>
                      <div className="space-y-2">
                        {parsedData.staff.map((staff, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <input type="text" value={staff.name} onChange={(e) => updateParsedStaff(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Name" />
                            <input type="number" value={staff.contracted_hours || ''} onChange={(e) => updateParsedStaff(idx, 'contracted_hours', parseInt(e.target.value) || 0)} className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Hours" />
                            <button onClick={() => removeParsedStaff(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 font-cal mb-2">Shifts ({parsedData.shifts.length})</h3>
                      <div className="space-y-2">
                        {parsedData.shifts.map((shift, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <input type="text" value={shift.name} onChange={(e) => updateParsedShift(idx, 'name', e.target.value)} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Shift name" />
                            <input type="time" value={shift.start_time || ''} onChange={(e) => updateParsedShift(idx, 'start_time', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <span className="text-gray-400">-</span>
                            <input type="time" value={shift.end_time || ''} onChange={(e) => updateParsedShift(idx, 'end_time', e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                            <button onClick={() => removeParsedShift(idx)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setParsedData(null); setImportFile(null); setParseError(null); setCreateStep(2) }} className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors">← Back</button>
                  {parsedData && <button onClick={() => handleCreateTeam(true)} className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all">Import & Create Team</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}