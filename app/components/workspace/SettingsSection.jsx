'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import BusinessHoursStep from '@/app/components/template/BusinessHoursStep'
import { getColorForLength } from '@/app/components/template/shift-constants'

const ALL_LENGTHS = [4, 6, 8, 10, 12]

export default function SettingsSection({ selectedTeamId, teamData }) {
  const queryClient = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState(null)

  // Local state initialised from teamData
  const [teamName, setTeamName] = useState('')
  const [selectedLengths, setSelectedLengths] = useState([])
  const [hours, setHours] = useState({ openTime: 9, closeTime: 17, openBuffer: 0, closeBuffer: 0 })

  // Sync local state when teamData loads/changes
  useEffect(() => {
    if (!teamData) return
    setTeamName(teamData.team_name || '')
    setSelectedLengths(teamData.shift_lengths || [4, 6, 8, 10, 12])
    setHours({
      openTime: Number(teamData.open_time) || 9,
      closeTime: Number(teamData.close_time) || 17,
      openBuffer: Number(teamData.open_buffer) || 0,
      closeBuffer: Number(teamData.close_buffer) || 0,
    })
  }, [teamData])

  const toggleLength = useCallback((len) => {
    setSelectedLengths(prev => {
      if (prev.includes(len)) {
        if (prev.length <= 1) return prev // minimum 1
        return prev.filter(l => l !== len)
      }
      return [...prev, len].sort((a, b) => a - b)
    })
  }, [])

  const handleSave = async () => {
    if (!selectedTeamId) return
    setSaving(true)
    setSaveStatus(null)

    try {
      // 1. Update workspace name
      const nameRes = await fetch('/api/teams', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedTeamId, team_name: teamName.trim() || 'My Team' }),
      })
      if (!nameRes.ok) {
        const body = await nameRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save workspace name')
      }

      // 2. Update shift lengths + business hours
      const configRes = await fetch(`/api/teams/${selectedTeamId}/template`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_lengths: selectedLengths,
          open_time: hours.openTime,
          close_time: hours.closeTime,
          open_buffer: hours.openBuffer,
          close_buffer: hours.closeBuffer,
        }),
      })
      if (!configRes.ok) {
        const body = await configRes.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to save configuration')
      }

      // 3. Propagate to all workspace sections
      queryClient.invalidateQueries({ queryKey: ['team-detail', selectedTeamId] })

      setSaveStatus('saved')
      setTimeout(() => setSaveStatus(null), 2500)
    } catch (err) {
      console.error('Settings save failed:', err)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus(null), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (!teamData) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 font-cal">Settings</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configure your workspace, shift lengths, and business hours</p>
      </div>

      {/* Workspace Name */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Workspace Name</h3>
        <input
          type="text"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="e.g. Main Team"
          className="w-full max-w-md px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
        />
      </div>

      {/* Shift Lengths */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Shift Lengths</h3>
        <p className="text-xs text-gray-500 mb-4">Select which shift durations your team uses. These appear in templates, staff preferences, and the rota builder.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_LENGTHS.map((len) => {
            const active = selectedLengths.includes(len)
            const c = getColorForLength(len, ALL_LENGTHS)
            return (
              <button
                key={len}
                onClick={() => toggleLength(len)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  active
                    ? 'text-white shadow-sm'
                    : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                }`}
                style={active ? { background: '#FF1F7D', borderColor: '#FF1F7D' } : {}}
              >
                {len}h
              </button>
            )
          })}
        </div>
        {selectedLengths.length <= 1 && (
          <p className="text-[11px] text-amber-600 mt-2">At least one shift length must be selected</p>
        )}
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-1">Business Hours</h3>
        <p className="text-xs text-gray-500 mb-4">Default opening hours used when creating new templates. Each template can override these individually.</p>
        <BusinessHoursStep
          openTime={hours.openTime}
          closeTime={hours.closeTime}
          openBuffer={hours.openBuffer}
          closeBuffer={hours.closeBuffer}
          onChange={(patch) => setHours(prev => ({ ...prev, ...patch }))}
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-pink-500/25 disabled:opacity-50"
          style={{ background: '#FF1F7D' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {saveStatus === 'saved' && (
          <span className="flex items-center gap-1.5 text-sm font-medium text-green-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
            Saved
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="text-sm font-medium text-red-600">Save failed — check console for details</span>
        )}
      </div>
    </div>
  )
}
