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
  const [showExportHelp, setShowExportHelp] = useState(false)
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
    setShowExportHelp(false)
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
            className="px-4 py-2.5 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center space-x-2 text-sm"
            style={{ background: '#FF1F7D' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Team</span>
          </button>
        )}
      </div>

      {/* Multi-Step Create Team Modal */}
      {showCreateFlow && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Step Indicator */}
            <div className="flex items-center justify-center mb-6">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-sm transition-all ${createStep >= step ? 'text-white' : 'bg-gray-200 text-gray-500'}`} style={createStep >= step ? { background: '#FF1F7D' } : {}}>
                    {createStep > step ? (
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    ) : step}
                  </div>
                  {step < 3 && <div className={`w-12 h-1 mx-1 rounded ${createStep > step ? '' : 'bg-gray-200'}`} style={createStep > step ? { background: '#FF1F7D' } : {}} />}
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
                  <button onClick={() => setCreateStep(2)} disabled={!newTeamName.trim()} className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all text-white ${newTeamName.trim() ? 'hover:shadow-lg hover:shadow-pink-500/25' : 'opacity-50 cursor-not-allowed'}`} style={newTeamName.trim() ? { background: '#FF1F7D' } : { background: '#E5E7EB' }}>Continue</button>
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
                      <div><p className="font-semibold text-gray-900">Upload Excel File</p><p className="text-sm text-gray-500">Import from existing rota</p></div>
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
                {!parsedData && !parsing && (
                  <>
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold text-gray-900 font-cal">Upload Your Rota</h2>
                      <p className="text-gray-500 text-sm mt-1">We'll extract staff and shift patterns from your file</p>
                    </div>

                    {/* Help Section */}
                    <div className="mb-4 border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setShowExportHelp(!showExportHelp)}
                        className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium text-gray-900">How do I export my rota?</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${showExportHelp ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      
                      {showExportHelp && (
                        <div className="p-4 space-y-4 bg-white">
                          {/* Excel Instructions */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                              </svg>
                              From Excel
                            </h4>
                            <ol className="text-sm text-gray-700 space-y-1 ml-7">
                              <li>1. Open your rota in Excel</li>
                              <li>2. Click <strong>File</strong> → <strong>Save As</strong></li>
                              <li>3. Choose <strong>CSV (Comma delimited)</strong> from the dropdown</li>
                              <li>4. Click <strong>Save</strong></li>
                            </ol>
                          </div>

                          {/* Google Sheets Instructions */}
                          <div>
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                              </svg>
                              From Google Sheets
                            </h4>
                            <ol className="text-sm text-gray-700 space-y-1 ml-7">
                              <li>1. Open your rota in Google Sheets</li>
                              <li>2. Click <strong>File</strong> → <strong>Download</strong></li>
                              <li>3. Select <strong>Comma Separated Values (.csv)</strong></li>
                              <li>4. File will download to your computer</li>
                            </ol>
                          </div>

                          <div className="pt-3 border-t border-gray-200">
                            <p className="text-xs text-gray-500">
                              💡 Your file should have staff names, roles, and hours. Don't worry if it's not perfect - you can edit everything in the next step!
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.xls,.csv,.png,.jpg,.jpeg" className="hidden" />
                      <button onClick={() => fileInputRef.current?.click()} className="w-full p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-pink-400 hover:bg-pink-50 transition-all">
                        <div className="text-center">
                          <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                          <p className="font-medium text-gray-700">Click to upload your rota file</p>
                          <p className="text-sm text-gray-500 mt-1">Excel (.xlsx) or CSV file</p>
                        </div>
                      </button>
                      {parseError && <div className="p-4 bg-red-50 border border-red-200 rounded-xl"><p className="text-red-700 text-sm">{parseError}</p></div>}
                    </div>
                    <button onClick={() => { setParsedData(null); setImportFile(null); setParseError(null); setCreateStep(2) }} className="w-full mt-4 px-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors">← Back</button>
                  </>
                )}
                
                {parsing && (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: '#FF1F7D' }} />
                    <p className="text-gray-600">Analyzing your file...</p>
                  </div>
                )}
                
                {parsedData && (
                  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
                    <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                      {/* Header */}
                      <div className="px-8 py-6 border-b border-gray-200 flex-shrink-0">
                        <h2 className="text-2xl font-bold text-gray-900 font-cal">Review & Complete Import</h2>
                        <p className="text-gray-500 mt-1">Fill in any missing information before creating your team</p>
                      </div>

                      {/* Content - Scrollable */}
                      <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10">
                        {/* Staff Section */}
                        <div>
                          <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 font-cal text-xl mb-1">
                              Staff Members <span className="text-gray-400 font-normal">({parsedData.staff.length})</span>
                            </h3>
                            <p className="text-sm text-gray-500">Add contract hours and pay rates for each person</p>
                          </div>
                          
                          <div className="space-y-4">
                            {parsedData.staff.map((staff, idx) => (
                              <div key={idx} className="p-6 bg-gray-50/50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all">
                                <div className="grid grid-cols-12 gap-4 items-start">
                                  {/* Name */}
                                  <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Name *</label>
                                    <input 
                                      type="text" 
                                      value={staff.name || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'name', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                      placeholder="John Smith" 
                                    />
                                  </div>

                                  {/* Email */}
                                  <div className="col-span-3">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Email</label>
                                    <input 
                                      type="email" 
                                      value={staff.email || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'email', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                      placeholder="john@example.com" 
                                    />
                                  </div>

                                  {/* Role */}
                                  <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Role</label>
                                    <input 
                                      type="text" 
                                      value={staff.role || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'role', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                      placeholder="Server" 
                                    />
                                  </div>

                                  {/* Contract Hours */}
                                  <div className="col-span-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Contract</label>
                                    <input 
                                      type="number" 
                                      value={staff.contracted_hours || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'contracted_hours', parseInt(e.target.value) || 0)} 
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center" 
                                      placeholder="40" 
                                      min="0"
                                    />
                                  </div>

                                  {/* Max Hours */}
                                  <div className="col-span-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Max</label>
                                    <input 
                                      type="number" 
                                      value={staff.max_hours || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'max_hours', parseInt(e.target.value) || 0)} 
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center" 
                                      placeholder="48" 
                                      min="0"
                                    />
                                  </div>

                                  {/* Hourly Rate */}
                                  <div className="col-span-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">£/hr</label>
                                    <input 
                                      type="number" 
                                      step="0.01"
                                      value={staff.hourly_rate || ''} 
                                      onChange={(e) => updateParsedStaff(idx, 'hourly_rate', parseFloat(e.target.value) || 0)} 
                                      className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center" 
                                      placeholder="11.44" 
                                      min="0"
                                    />
                                  </div>

                                  {/* Delete Button */}
                                  <div className="col-span-1 flex items-end">
                                    <button 
                                      onClick={() => removeParsedStaff(idx)} 
                                      className="w-full h-[42px] text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center justify-center"
                                      title="Remove staff member"
                                    >
                                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Shifts Section */}
                        <div>
                          <div className="mb-6">
                            <h3 className="font-semibold text-gray-900 font-cal text-xl mb-1">
                              Shift Patterns <span className="text-gray-400 font-normal">({parsedData.shifts.length})</span>
                            </h3>
                            <p className="text-sm text-gray-500">Name your shifts and set when they run - these become reusable templates</p>
                          </div>

                          {/* Example Shift - More Prominent */}
                          <div className="mb-6 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 border-2 border-blue-200 rounded-2xl">
                            <div className="flex items-start gap-4">
                              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <p className="text-base font-semibold text-blue-900 mb-1">Example Shift</p>
                                <p className="text-sm text-blue-800"><span className="font-medium">Name:</span> Early Weekday</p>
                                <p className="text-sm text-blue-800"><span className="font-medium">Time:</span> 09:00 - 13:00</p>
                                <p className="text-sm text-blue-800"><span className="font-medium">Days:</span> Mon, Tue, Wed, Thu, Fri</p>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-4">
                            {parsedData.shifts.map((shift, idx) => (
                              <div key={idx} className="p-6 bg-gray-50/50 rounded-2xl border border-gray-200 hover:border-gray-300 transition-all">
                                <div className="grid grid-cols-12 gap-4 items-start mb-4">
                                  {/* Shift Name - CLEARED */}
                                  <div className="col-span-4">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Shift Name *</label>
                                    <input 
                                      type="text" 
                                      value={shift.name === `${shift.start_time}-${shift.end_time}` ? '' : shift.name || ''} 
                                      onChange={(e) => updateParsedShift(idx, 'name', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                      placeholder="e.g., Morning Shift, Evening" 
                                    />
                                  </div>

                                  {/* Start Time */}
                                  <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Start Time *</label>
                                    <input 
                                      type="time" 
                                      value={shift.start_time || ''} 
                                      onChange={(e) => updateParsedShift(idx, 'start_time', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                    />
                                  </div>

                                  {/* End Time */}
                                  <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">End Time *</label>
                                    <input 
                                      type="time" 
                                      value={shift.end_time || ''} 
                                      onChange={(e) => updateParsedShift(idx, 'end_time', e.target.value)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent" 
                                    />
                                  </div>

                                  {/* Staff Required */}
                                  <div className="col-span-2">
                                    <label className="block text-xs font-medium text-gray-600 mb-2">Staff Needed</label>
                                    <input 
                                      type="number" 
                                      value={shift.staff_required || 1} 
                                      onChange={(e) => updateParsedShift(idx, 'staff_required', parseInt(e.target.value) || 1)} 
                                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent text-center" 
                                      placeholder="1"
                                      min="1"
                                    />
                                  </div>

                                  {/* Delete Button */}
                                  <div className="col-span-2 flex items-end justify-end">
                                    <button 
                                      onClick={() => removeParsedShift(idx)} 
                                      className="px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-colors text-sm font-medium"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </div>

                                {/* Days of Week */}
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-3">Active Days</label>
                                  <div className="flex gap-2">
                                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                                      const dayShort = day.slice(0, 3)
                                      const isActive = shift.days_of_week?.includes(day) || shift.days_of_week?.includes(day.toLowerCase())
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          onClick={() => {
                                            const currentDays = shift.days_of_week || []
                                            const newDays = isActive 
                                              ? currentDays.filter(d => d.toLowerCase() !== day.toLowerCase())
                                              : [...currentDays, day]
                                            updateParsedShift(idx, 'days_of_week', newDays)
                                          }}
                                          className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                                            isActive 
                                              ? 'text-white shadow-sm' 
                                              : 'bg-white border border-gray-300 text-gray-600 hover:border-gray-400'
                                          }`}
                                          style={isActive ? { background: '#FF1F7D' } : {}}
                                        >
                                          {dayShort}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="px-8 py-6 border-t border-gray-200 flex gap-4 flex-shrink-0 bg-gray-50">
                        <button 
                          onClick={() => { 
                            setParsedData(null); 
                            setImportFile(null); 
                            setParseError(null); 
                          }} 
                          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-white font-semibold transition-colors"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={() => handleCreateTeam(true)} 
                          disabled={parsedData.staff.some(s => !s.name?.trim()) || parsedData.shifts.some(s => !s.name?.trim())}
                          className="flex-1 px-6 py-3 text-white rounded-xl hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed" 
                          style={{ background: '#FF1F7D' }}
                        >
                          Import {parsedData.staff.length} Staff & {parsedData.shifts.length} Shifts →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}