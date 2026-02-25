'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import CoverageGauge from '@/app/components/template/CoverageGauge'
import WeekOverview from '@/app/components/template/WeekOverview'
import StaffAvailabilityGrid from '@/app/components/template/StaffAvailabilityGrid'
import { PALETTE } from '@/app/components/template/shift-constants'
import InviteModal from './InviteModal'

export default function StaffShiftsSection({ selectedTeamId, shiftLengths, triggerAddStaff, teamData }) {
  const queryClient = useQueryClient()
  const [expandedId, setExpandedId] = useState(null)
  const [localEdits, setLocalEdits] = useState({})
  const [newStaffId, setNewStaffId] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [invitedMember, setInvitedMember] = useState(null)

  // Derived team config from teamData prop
  const templates = teamData?.day_templates || {}
  const weekDays = teamData?.week_template || {}

  // ── Data fetching ──
  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load staff')
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  // Open new card when triggered from parent (e.g. onboarding banner)
  useEffect(() => {
    if (triggerAddStaff) addNewCard()
  }, [triggerAddStaff])

  // ── Mutations ──
  const addStaffMut = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, team_id: selectedTeamId }) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to add staff')
      return body
    },
  })

  const updateStaffMut = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/staff/${data.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Failed to update staff')
      return body
    },
  })

  const deleteStaffMut = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete staff')
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
  })

  const inviteStaffMut = useMutation({
    mutationFn: async (staffId) => {
      const res = await fetch('/api/staff/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: staffId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate invite')
      return data
    },
    onSuccess: (data) => { setInviteData(data); setShowInviteModal(true) },
    onError: (error) => alert(error.message)
  })

  // ── Coverage stats (template-based, matching onboarding) ──
  const weeklyShiftHours = useMemo(() => {
    const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    return DAYS.reduce((sum, d) => {
      if (!weekDays[d]?.on) return sum
      const tmpl = templates[weekDays[d].tmpl]
      if (!tmpl?.shifts) return sum
      return sum + tmpl.shifts.reduce((a, s) => a + s.length * s.headcount, 0)
    }, 0)
  }, [weekDays, templates])

  const totalContractedHours = useMemo(() => staff.reduce((s, m) => s + (m.contracted_hours || 0), 0), [staff])
  const totalMaxHours = useMemo(() => staff.reduce((s, m) => s + (m.max_hours || m.contracted_hours || 0), 0), [staff])

  // ── Helpers ──
  const normalizePreferredLengths = useCallback((val) => {
    if (Array.isArray(val)) return val
    if (val != null) return [val]
    return [...shiftLengths]
  }, [shiftLengths])

  const expandCard = useCallback((member) => {
    if (expandedId === member.id) return
    // Cancel any current edit
    if (expandedId) {
      setLocalEdits(prev => { const { [expandedId]: _, ...rest } = prev; return rest })
      if (expandedId === newStaffId) setNewStaffId(null)
    }
    setLocalEdits(prev => ({
      ...prev,
      [member.id]: {
        name: member.name || '',
        email: member.email || '',
        contracted_hours: member.contracted_hours?.toString() || '',
        max_hours: member.max_hours?.toString() || '',
        hourly_rate: member.hourly_rate ? parseFloat(member.hourly_rate).toString() : '',
        keyholder: member.keyholder || false,
        preferred_lengths: normalizePreferredLengths(member.preferred_shift_length),
        availability_grid: member.availability_grid || {},
      }
    }))
    setExpandedId(member.id)
  }, [expandedId, newStaffId, normalizePreferredLengths])

  const updateLocal = useCallback((id, field, value) => {
    setLocalEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }))
  }, [])

  const togglePrefLength = useCallback((id, len) => {
    setLocalEdits(prev => {
      const edit = prev[id]
      if (!edit) return prev
      const set = new Set(edit.preferred_lengths)
      if (set.has(len)) { if (set.size > 1) set.delete(len) } else set.add(len)
      return { ...prev, [id]: { ...edit, preferred_lengths: [...set].sort((a, b) => a - b) } }
    })
  }, [])

  const saveAndCollapse = async (id) => {
    const edit = localEdits[id]
    if (!edit) { setExpandedId(null); return }
    if (!edit.name?.trim()) { alert('Name is required'); return }

    const payload = {
      name: edit.name.trim(),
      email: edit.email.trim(),
      contracted_hours: parseInt(edit.contracted_hours) || 0,
      max_hours: parseInt(edit.max_hours) || parseInt(edit.contracted_hours) || 0,
      hourly_rate: parseFloat(edit.hourly_rate) || 0,
      keyholder: edit.keyholder,
      preferred_shift_length: edit.preferred_lengths || [shiftLengths[0]],
      availability_grid: edit.availability_grid,
    }

    try {
      if (id === newStaffId) {
        await addStaffMut.mutateAsync(payload)
        setNewStaffId(null)
      } else {
        await updateStaffMut.mutateAsync({ id, ...payload })
      }
      // Wait for fresh data before collapsing so collapsed card shows updated values
      await queryClient.refetchQueries({ queryKey: ['staff', selectedTeamId] })
    } catch (err) {
      console.error('Failed to save:', err)
      alert(`Failed to save: ${err.message}`)
      return
    }
    setExpandedId(null)
    setLocalEdits(prev => { const { [id]: _, ...rest } = prev; return rest })
  }

  const cancelEdit = (id) => {
    setExpandedId(null)
    setLocalEdits(prev => { const { [id]: _, ...rest } = prev; return rest })
    if (id === newStaffId) setNewStaffId(null)
  }

  const addNewCard = () => {
    if (expandedId) {
      setLocalEdits(prev => { const { [expandedId]: _, ...rest } = prev; return rest })
      if (expandedId === newStaffId) setNewStaffId(null)
    }
    const tempId = `new-${Date.now()}`
    setLocalEdits(prev => ({
      ...prev,
      [tempId]: {
        name: '',
        email: '',
        contracted_hours: '',
        max_hours: '40',
        hourly_rate: '',
        keyholder: false,
        preferred_lengths: [...shiftLengths],
        availability_grid: {},
      }
    }))
    setNewStaffId(tempId)
    setExpandedId(tempId)
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    try { await deleteStaffMut.mutateAsync(id) } catch { alert('Failed to delete staff member.') }
    if (expandedId === id) {
      setExpandedId(null)
      setLocalEdits(prev => { const { [id]: _, ...rest } = prev; return rest })
    }
  }

  const handleInvite = (member) => {
    setInvitedMember(member)
    inviteStaffMut.mutate(member.id)
  }

  if (staffLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    )
  }

  // ── Render expanded card (shared between existing staff + new staff) ──
  const renderExpandedCard = (id, isNew) => {
    const edit = localEdits[id]
    if (!edit) return null
    const member = isNew ? null : staff.find(s => s.id === id)

    return (
      <div key={id} className="p-4 rounded-xl border-2 border-pink-300 bg-white shadow-sm">
        {/* Row 1: Inline inputs (matches onboarding layout) */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
            {(edit.name || '?')[0].toUpperCase()}
          </div>
          <input
            type="text"
            value={edit.name}
            onChange={(e) => updateLocal(id, 'name', e.target.value)}
            placeholder="Name"
            autoFocus={isNew}
            className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <input
            type="email"
            value={edit.email}
            onChange={(e) => updateLocal(id, 'email', e.target.value)}
            placeholder="Email"
            className="min-w-[140px] px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          />
          <div className="flex items-center gap-1">
            <input type="number" value={edit.contracted_hours} onChange={(e) => updateLocal(id, 'contracted_hours', e.target.value)} placeholder="Hrs" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
            <span className="text-[10px] text-gray-400">h/wk</span>
          </div>
          <div className="flex items-center gap-1">
            <input type="number" value={edit.max_hours} onChange={(e) => updateLocal(id, 'max_hours', e.target.value)} placeholder="Max" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
            <span className="text-[10px] text-gray-400">max</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400">£</span>
            <input type="number" value={edit.hourly_rate} onChange={(e) => updateLocal(id, 'hourly_rate', e.target.value)} placeholder="Rate" step="0.01" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
            <span className="text-[10px] text-gray-400">/hr</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 font-medium">Keyholder</span>
            <button type="button" onClick={() => updateLocal(id, 'keyholder', !edit.keyholder)} className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${edit.keyholder ? 'bg-orange-400' : 'bg-gray-200'}`}>
              <div className={`absolute w-[18px] h-[18px] bg-white rounded-full top-[2px] shadow-sm transition-all ${edit.keyholder ? 'left-[20px]' : 'left-[2px]'}`} />
            </button>
          </div>
          <button onClick={() => cancelEdit(id)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0" title="Close">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Shift length preferences (multi-select) */}
        {shiftLengths.length > 0 && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-xs text-gray-400 mr-1">Shift lengths:</span>
            {shiftLengths.map((len, li) => {
              const active = edit.preferred_lengths?.includes(len)
              const c = PALETTE[li % PALETTE.length]
              return (
                <button key={len} onClick={() => togglePrefLength(id, len)} className="px-2 py-0.5 rounded text-[10px] font-bold border transition-all" style={{ background: active ? c.bg : '#F9FAFB', borderColor: active ? `${c.border}50` : '#E5E7EB', color: active ? c.text : '#9CA3AF' }}>
                  {len}h
                </button>
              )
            })}
          </div>
        )}

        {/* Availability grid */}
        {Object.keys(templates).length > 0 && (
          <StaffAvailabilityGrid
            weekDays={weekDays}
            templates={templates}
            shiftLengths={shiftLengths}
            preferredLengths={edit.preferred_lengths}
            availabilityGrid={edit.availability_grid}
            onChange={(grid) => updateLocal(id, 'availability_grid', grid)}
          />
        )}

        {/* Footer: invite status + save/cancel/delete */}
        <div className="mt-3 flex items-center justify-between gap-2 flex-wrap pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {!isNew && member && (
              <>
                {member.clerk_user_id ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 border border-green-200">
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    <span className="text-xs font-semibold text-green-700">Connected to Shiftly</span>
                  </div>
                ) : member.email ? (
                  <button onClick={() => handleInvite(member)} disabled={inviteStaffMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md hover:shadow-pink-500/25 disabled:opacity-50" style={{ background: '#FF1F7D' }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {inviteStaffMut.isPending ? 'Sending...' : 'Invite to Shiftly'}
                  </button>
                ) : null}
                <button onClick={() => handleDelete(member.id)} disabled={deleteStaffMut.isPending} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50" title="Delete">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => cancelEdit(id)} className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={() => saveAndCollapse(id)}
              disabled={addStaffMut.isPending || updateStaffMut.isPending}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{ background: '#FF1F7D' }}
            >
              {(addStaffMut.isPending || updateStaffMut.isPending) ? 'Saving...' : isNew ? 'Add Staff' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-900 font-cal">Staff Members</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Your shifts need <span className="font-bold text-pink-600">{Math.round(weeklyShiftHours)}h</span> of cover per week
        </p>
      </div>

      {/* Coverage gauge */}
      <CoverageGauge
        shiftHours={weeklyShiftHours}
        contractedHours={totalContractedHours}
        maxHours={totalMaxHours}
      />

      {/* Split layout: week overview left + staff cards right */}
      <div className="flex gap-6 mt-5">
        {/* LEFT: Vertical week overview */}
        <div className="w-64 flex-shrink-0 self-start sticky top-5">
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Template Week</h3>
            <WeekOverview
              weekDays={weekDays}
              templates={templates}
              shiftLengths={shiftLengths}
              onToggleDay={() => {}}
              onAssignTemplate={() => {}}
              compact
              readOnly
              vertical
            />
            <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>Needed</span>
                <span className="font-bold text-gray-900">{Math.round(weeklyShiftHours)}h</span>
              </div>
              <div className="flex justify-between">
                <span>Contracted</span>
                <span className="font-bold text-gray-700">{Math.round(totalContractedHours)}h</span>
              </div>
              <div className="flex justify-between">
                <span>Available (incl. overtime)</span>
                <span className="font-bold" style={{ color: totalMaxHours >= weeklyShiftHours ? '#10B981' : '#EF4444' }}>
                  {Math.round(totalMaxHours)}h
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Staff cards */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            {staff.map(member => {
              // ── Expanded card ──
              if (expandedId === member.id) {
                return renderExpandedCard(member.id, false)
              }

              // ── Collapsed card ──
              return (
                <div
                  key={member.id}
                  onClick={() => expandCard(member)}
                  className="p-4 rounded-xl border border-gray-200 bg-white hover:border-pink-200 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                      {(member.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-[120px]">
                      <div className="text-sm font-semibold text-gray-900">{member.name}</div>
                      {member.email && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          <span className="text-xs text-gray-500 truncate">{member.email}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-50 text-pink-700">
                        {member.contracted_hours || 0}h/wk
                      </span>
                      {member.max_hours && member.max_hours > (member.contracted_hours || 0) && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
                          max {member.max_hours}h
                        </span>
                      )}
                    </div>
                    {member.keyholder && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ background: '#FEF3C7', border: '1px solid #FDE68A', color: '#D97706' }}>
                        🔑
                      </span>
                    )}
                    {/* Connection status */}
                    {member.clerk_user_id ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700">✓ Connected</span>
                    ) : member.email ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-pink-50 text-pink-600">Not invited</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600">No email</span>
                    )}
                    {/* Shift prefs (compact read-only) */}
                    <div className="flex items-center gap-0.5">
                      {shiftLengths.map((len, li) => {
                        const prefs = normalizePreferredLengths(member.preferred_shift_length)
                        const active = prefs.includes(len)
                        const c = PALETTE[li % PALETTE.length]
                        return (
                          <span
                            key={len}
                            className="px-1.5 py-0.5 rounded text-[9px] font-bold border"
                            style={{
                              background: active ? c.bg : '#F9FAFB',
                              borderColor: active ? `${c.border}50` : '#E5E7EB',
                              color: active ? c.text : '#D1D5DB'
                            }}
                          >
                            {len}h
                          </span>
                        )
                      })}
                    </div>
                    {/* Expand arrow */}
                    <svg className="w-4 h-4 text-gray-300 group-hover:text-pink-400 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              )
            })}

            {/* New staff card (always expanded) */}
            {newStaffId && expandedId === newStaffId && renderExpandedCard(newStaffId, true)}
          </div>

          {/* Add team member button */}
          {!newStaffId && (
            <button
              onClick={addNewCard}
              className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all"
            >
              + Add team member
            </button>
          )}
          {staff.length === 0 && !newStaffId && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Click above to add your first team member
            </p>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && inviteData && (
        <InviteModal
          inviteData={inviteData}
          invitedMember={invitedMember}
          onClose={() => { setShowInviteModal(false); setInviteData(null); setInvitedMember(null) }}
        />
      )}
    </>
  )
}
