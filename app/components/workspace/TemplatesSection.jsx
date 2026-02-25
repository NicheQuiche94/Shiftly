'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import TimelineBuilder from '@/app/components/template/TimelineBuilder'
import { formatTime } from '@/app/components/template/shift-constants'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DEFAULT_SHIFT_LENGTHS = [4, 6, 8, 10, 12]

function makeDefaultShift(openTime, closeTime, openBuffer, closeBuffer) {
  const staffStart = openTime - (openBuffer || 0) / 60
  const staffEnd = closeTime + (closeBuffer || 0) / 60
  const len = Math.min(8, staffEnd - staffStart)
  return {
    id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    start: staffStart,
    length: len,
    headcount: 1,
  }
}

export default function TemplatesSection({ selectedTeamId }) {
  const [teamData, setTeamData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)
  const [activeTab, setActiveTab] = useState('day')

  // Template state
  const [dayTemplates, setDayTemplates] = useState({})
  const [weekTemplate, setWeekTemplate] = useState({})
  const [activeTemplate, setActiveTemplate] = useState(null)
  const [editingName, setEditingName] = useState(null)
  const [newName, setNewName] = useState('')

  // From team record (set during onboarding — no hardcoding)
  const openTime = teamData?.open_time ?? 9
  const closeTime = teamData?.close_time ?? 17
  const openBuffer = teamData?.open_buffer ?? 0
  const closeBuffer = teamData?.close_buffer ?? 0
  const shiftLengths = teamData?.shift_lengths ?? DEFAULT_SHIFT_LENGTHS

  // Fetch team data
  useEffect(() => {
    if (!selectedTeamId) return
    setLoading(true)
    fetch(`/api/teams/${selectedTeamId}`)
      .then(r => r.json())
      .then(data => {
        setTeamData(data)

        const savedDT = data.day_templates || {}
        const savedWT = data.week_template || {}

        if (Object.keys(savedDT).length === 0) {
          const ot = data.open_time ?? 9
          const ct = data.close_time ?? 17
          const ob = data.open_buffer ?? 0
          const cb = data.close_buffer ?? 0
          const defShift = makeDefaultShift(ot, ct, ob, cb)

          const defaultDT = { Standard: { shifts: [defShift] } }
          const defaultWT = {}
          DAYS.forEach(d => {
            defaultWT[d] = { on: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].includes(d), tmpl: 'Standard' }
          })

          setDayTemplates(defaultDT)
          setWeekTemplate(defaultWT)
          setActiveTemplate('Standard')
        } else {
          setDayTemplates(savedDT)
          setWeekTemplate(savedWT)
          setActiveTemplate(Object.keys(savedDT)[0] || null)
        }

        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch team data:', err)
        setLoading(false)
      })
  }, [selectedTeamId])

  // Save + sync
  const handleSave = useCallback(async () => {
    if (!selectedTeamId) return
    setSaving(true)
    setSaveStatus(null)
    try {
      const res = await fetch(`/api/teams/${selectedTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_templates: dayTemplates, week_template: weekTemplate }),
      })
      if (!res.ok) throw new Error('Save failed')

      await fetch(`/api/teams/${selectedTeamId}/sync-shifts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_templates: dayTemplates, week_template: weekTemplate }),
      }).catch(() => {})

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2000)
    } catch {
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }, [selectedTeamId, dayTemplates, weekTemplate])

  // Template CRUD
  const updateTemplateShifts = useCallback((name, newShifts) => {
    setDayTemplates(prev => ({ ...prev, [name]: { ...prev[name], shifts: newShifts } }))
  }, [])

  const addTemplate = () => {
    let name = 'New Template'
    let i = 1
    while (dayTemplates[name]) name = `New Template ${i++}`
    const defShift = makeDefaultShift(openTime, closeTime, openBuffer, closeBuffer)
    setDayTemplates(prev => ({ ...prev, [name]: { shifts: [defShift] } }))
    setActiveTemplate(name)
  }

  const deleteTemplate = (name) => {
    if (Object.keys(dayTemplates).length <= 1) return
    const updated = { ...dayTemplates }
    delete updated[name]
    const first = Object.keys(updated)[0] || ''

    const updatedWeek = { ...weekTemplate }
    Object.keys(updatedWeek).forEach(day => {
      if (updatedWeek[day].tmpl === name) updatedWeek[day] = { ...updatedWeek[day], tmpl: first }
    })

    setDayTemplates(updated)
    setWeekTemplate(updatedWeek)
    if (activeTemplate === name) setActiveTemplate(first)
  }

  const startRename = (name) => { setEditingName(name); setNewName(name) }

  const finishRename = () => {
    if (!editingName || !newName.trim() || newName === editingName || dayTemplates[newName.trim()]) {
      setEditingName(null); return
    }
    const updated = {}
    Object.keys(dayTemplates).forEach(k => { updated[k === editingName ? newName.trim() : k] = dayTemplates[k] })
    const updatedWeek = { ...weekTemplate }
    Object.keys(updatedWeek).forEach(d => {
      if (updatedWeek[d].tmpl === editingName) updatedWeek[d] = { ...updatedWeek[d], tmpl: newName.trim() }
    })
    setDayTemplates(updated)
    setWeekTemplate(updatedWeek)
    if (activeTemplate === editingName) setActiveTemplate(newName.trim())
    setEditingName(null)
  }

  // Week planner
  const toggleDay = (day) => {
    const current = weekTemplate[day] || { on: false, tmpl: Object.keys(dayTemplates)[0] || '' }
    setWeekTemplate(prev => ({ ...prev, [day]: { ...current, on: !current.on } }))
  }

  const assignTemplate = (day, tmpl) => {
    setWeekTemplate(prev => ({ ...prev, [day]: { ...(prev[day] || { on: true }), tmpl } }))
  }

  // Weekly stats
  const weeklyStats = useMemo(() => {
    let totalHours = 0, activeDays = 0
    DAYS.forEach(day => {
      const cfg = weekTemplate[day]
      if (!cfg?.on) return
      activeDays++
      const tmpl = dayTemplates[cfg.tmpl]
      if (!tmpl?.shifts) return
      tmpl.shifts.forEach(s => { totalHours += s.length * s.headcount })
    })
    return { totalHours: Math.round(totalHours), activeDays }
  }, [dayTemplates, weekTemplate])

  const templateNames = Object.keys(dayTemplates)

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">Loading shift templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Top bar: hours context + save */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex flex-wrap gap-2">
          <div className="px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-600">
            <span className="font-semibold text-gray-900">Open:</span> {formatTime(openTime)} – {formatTime(closeTime)}
          </div>
          {openBuffer > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <span className="font-semibold">Prep:</span> {openBuffer}min before
            </div>
          )}
          {closeBuffer > 0 && (
            <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <span className="font-semibold">Close-down:</span> {closeBuffer}min after
            </div>
          )}
          <div className="px-3 py-1.5 rounded-lg bg-pink-50 border border-pink-200 text-xs text-pink-700">
            <span className="font-semibold">Weekly:</span> {weeklyStats.totalHours}h · {weeklyStats.activeDays} days
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveStatus === 'saved' && (
            <span className="text-xs font-medium text-green-600 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              Saved
            </span>
          )}
          {saveStatus === 'error' && <span className="text-xs font-medium text-red-600">Save failed</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50"
            style={{ background: '#FF1F7D' }}
          >
            {saving ? 'Saving...' : 'Save & Sync'}
          </button>
        </div>
      </div>

      {/* Nested pill tabs */}
      <div className="flex gap-2">
        {[
          { id: 'day', label: 'Day Templates', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )},
          { id: 'week', label: 'Weekly Schedule', icon: (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )},
        ].map(tab => (
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
          </button>
        ))}
      </div>

      {/* DAY TEMPLATES TAB */}
      {activeTab === 'day' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          {/* Template name tabs */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            {templateNames.map(name => (
              <div key={name} className="flex items-center">
                {editingName === name ? (
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onBlur={finishRename}
                    onKeyDown={e => e.key === 'Enter' && finishRename()}
                    className="px-3 py-1.5 rounded-lg border-2 border-pink-400 text-sm font-medium focus:outline-none"
                    style={{ width: Math.max(80, newName.length * 9) }}
                  />
                ) : (
                  <button
                    onClick={() => setActiveTemplate(name)}
                    onDoubleClick={() => startRename(name)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      activeTemplate === name
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                    style={activeTemplate === name ? { background: '#FF1F7D' } : {}}
                    title="Double-click to rename"
                  >
                    {name}
                  </button>
                )}
                {templateNames.length > 1 && activeTemplate === name && (
                  <button
                    onClick={() => deleteTemplate(name)}
                    className="ml-1 w-5 h-5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center text-xs transition-colors"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={addTemplate}
              className="px-3 py-1.5 rounded-lg border-2 border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all"
            >
              + Template
            </button>
          </div>

          {/* TimelineBuilder — exact same editor as onboarding */}
          {activeTemplate && dayTemplates[activeTemplate] && (
            <TimelineBuilder
              shifts={dayTemplates[activeTemplate].shifts || []}
              shiftLengths={shiftLengths}
              openTime={openTime}
              closeTime={closeTime}
              openBuffer={openBuffer}
              closeBuffer={closeBuffer}
              onChange={(newShifts) => updateTemplateShifts(activeTemplate, newShifts)}
            />
          )}
        </div>
      )}

      {/* WEEKLY SCHEDULE TAB */}
      {activeTab === 'week' && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h4 className="font-semibold text-gray-900 font-cal text-base mb-1">Weekly Schedule</h4>
          <p className="text-sm text-gray-500 mb-4">Assign templates to each day. Toggle days on/off as needed.</p>

          <div className="grid grid-cols-7 gap-2">
            {DAYS.map(day => {
              const config = weekTemplate[day] || { on: false, tmpl: templateNames[0] || '' }
              const isOn = config.on
              const tmpl = dayTemplates[config.tmpl]
              const dayHours = tmpl?.shifts?.reduce((a, s) => a + s.length * s.headcount, 0) || 0

              return (
                <div
                  key={day}
                  className={`rounded-xl border-2 p-3 transition-all ${
                    isOn ? 'border-pink-200 bg-pink-50/30' : 'border-gray-200 bg-gray-50 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-900">{day}</span>
                    <button
                      onClick={() => toggleDay(day)}
                      className={`w-8 h-5 rounded-full transition-colors relative ${isOn ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isOn ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>

                  {isOn ? (
                    <>
                      <select
                        value={config.tmpl}
                        onChange={e => assignTemplate(day, e.target.value)}
                        className="w-full px-2 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 bg-white mb-1.5"
                      >
                        {templateNames.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                      <div className="text-[10px] text-gray-500 font-medium">
                        {tmpl?.shifts?.length || 0} shifts · {Math.round(dayHours)}h
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-gray-400 font-medium">Closed</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}