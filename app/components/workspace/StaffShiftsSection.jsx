'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import StaffModal from './StaffModal'
import InviteModal from './InviteModal'
import { getColorForLength, calcShiftDuration, DAYS, FULL_DAYS } from '@/app/components/template/shift-constants'

// ─── Coverage Week Sidebar ──────────────────────────────────────
function CoverageWeek({ shifts, staff, shiftLengths }) {
  const shiftsByDay = useMemo(() => {
    const byDay = {}
    DAYS.forEach(d => { byDay[d] = [] })
    shifts.forEach(s => {
      const dayShort = s.day_of_week?.substring(0, 3) || s.day_of_week
      const match = DAYS.find(d =>
        d.toLowerCase() === dayShort?.toLowerCase() ||
        FULL_DAYS[d]?.toLowerCase() === s.day_of_week?.toLowerCase()
      )
      if (match && byDay[match]) byDay[match].push(s)
    })
    return byDay
  }, [shifts])

  const weeklyNeeded = DAYS.reduce((sum, d) => {
    return sum + (shiftsByDay[d] || []).reduce((a, s) =>
      a + calcShiftDuration(s.start_time, s.end_time) * (s.staff_required || 1), 0
    )
  }, 0)

  const weeklyContracted = staff.reduce((sum, s) => sum + (s.contracted_hours || 0), 0)
  const weeklyMax = staff.reduce((sum, s) => sum + (s.max_hours || s.contracted_hours || 0), 0)
  const coverageRatio = weeklyNeeded > 0 ? weeklyContracted / weeklyNeeded : 0
  const canFulfill = weeklyMax >= weeklyNeeded
  const coverageColor = canFulfill ? (coverageRatio >= 1 ? '#10B981' : '#F59E0B') : '#EF4444'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide font-cal mb-3">Template Week</h3>

      <div className="space-y-1.5">
        {DAYS.map(day => {
          const dayShifts = shiftsByDay[day] || []
          const totalH = dayShifts.reduce((sum, s) =>
            sum + calcShiftDuration(s.start_time, s.end_time) * (s.staff_required || 1), 0
          )

          if (dayShifts.length === 0) {
            return (
              <div key={day} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 border border-gray-100 opacity-50">
                <span className="text-xs font-bold text-gray-400 w-20">{FULL_DAYS[day]}</span>
                <span className="text-[10px] text-gray-400 ml-auto">Closed</span>
              </div>
            )
          }

          return (
            <div key={day} className="flex items-center gap-2 p-2.5 rounded-lg border border-gray-200 bg-white">
              <span className="text-xs font-bold text-gray-900 w-20">{FULL_DAYS[day]}</span>
              <div className="flex gap-0.5 flex-1 min-w-0">
                {dayShifts.map(s => {
                  const dur = calcShiftDuration(s.start_time, s.end_time)
                  const color = getColorForLength(dur, shiftLengths)
                  return (
                    <div
                      key={s.id}
                      className="rounded flex items-center justify-center px-1"
                      style={{ height: 18, flex: dur, background: color.bg, borderLeft: `2px solid ${color.border}` }}
                      title={`${s.shift_name}: ${s.start_time}–${s.end_time} (×${s.staff_required})`}
                    >
                      <span className="text-[8px] font-bold" style={{ color: color.text }}>×{s.staff_required}</span>
                    </div>
                  )
                })}
              </div>
              <span className="text-[11px] text-gray-500 font-medium w-8 text-right flex-shrink-0">{Math.round(totalH)}h</span>
            </div>
          )
        })}
      </div>

      {/* Coverage gauge */}
      <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-gray-500">Needed</span>
          <span className="text-sm font-bold text-gray-900">{Math.round(weeklyNeeded)}h</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] text-gray-500">Contracted</span>
          <span className="text-sm font-bold" style={{ color: coverageColor }}>{Math.round(weeklyContracted)}h</span>
        </div>
        {weeklyMax > weeklyContracted && (
          <div className="flex justify-between items-center">
            <span className="text-[11px] text-gray-500">Max available</span>
            <span className="text-sm font-bold text-gray-600">{Math.round(weeklyMax)}h</span>
          </div>
        )}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(100, coverageRatio * 100)}%`, background: coverageColor }}
          />
        </div>
        {!canFulfill && weeklyNeeded > 0 && (
          <p className="text-[10px] text-red-600 font-medium mt-1">
            ⚠️ Max staff hours ({Math.round(weeklyMax)}h) can&apos;t cover shifts ({Math.round(weeklyNeeded)}h)
          </p>
        )}
        {canFulfill && weeklyContracted < weeklyNeeded && weeklyNeeded > 0 && (
          <p className="text-[10px] text-amber-600 font-medium mt-1">
            {Math.round(weeklyNeeded - weeklyContracted)}h overtime needed (max hours can cover it)
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Staff Card ─────────────────────────────────────────────────
function StaffCard({ member, shiftLengths, onEdit, onDelete, onInvite, isInviting }) {
  const maxH = member.max_hours || member.contracted_hours || 0
  const contracted = member.contracted_hours || 0
  const ratio = maxH > 0 ? contracted / maxH : 0
  const barColor = ratio > 0.9 ? '#F59E0B' : '#10B981'

  // Parse availability summary
  const availSummary = (() => {
    try {
      const parsed = JSON.parse(member.availability || '{}')
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
      const available = days.filter(d => parsed[d]?.available !== false).length
      return `${available} days`
    } catch { return '—' }
  })()

  // Invite status
  const hasAccount = !!member.clerk_user_id
  const hasPendingInvite = !!member.invite_token && !hasAccount

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all cursor-pointer group"
      onClick={() => onEdit(member)}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
          style={{ background: '#FF1F7D' }}
        >
          {member.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        {/* Name + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-semibold text-gray-900 truncate">{member.name}</span>
            {member.role && (
              <span className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                {member.role}
              </span>
            )}
            {member.is_keyholder && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border" style={{ background: '#FDF2F8', borderColor: '#F9A8D440', color: '#BE185D' }}>
                🔑 Key
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {member.email && (
              <span className="text-[11px] text-gray-400 truncate">{member.email}</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-gray-500">{availSummary}</span>
            {member.preferred_shift_length && shiftLengths && (() => {
              const c = getColorForLength(member.preferred_shift_length, shiftLengths)
              return (
                <span className="px-1 py-0.5 rounded text-[9px] font-bold border" style={{ background: c.bg, borderColor: `${c.border}40`, color: c.text }}>
                  {member.preferred_shift_length}h pref
                </span>
              )
            })()}
          </div>
        </div>

        {/* Hours gauge */}
        <div className="flex-shrink-0 w-24 text-right">
          <div className="text-lg font-bold text-gray-900">{contracted}h</div>
          <div className="text-[10px] text-gray-500">/ {maxH}h max</div>
          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ratio * 100)}%`, background: barColor }} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
          {/* Invite button */}
          {member.email && !hasAccount && (
            <button
              onClick={() => onInvite(member)}
              disabled={isInviting}
              className="p-1.5 rounded-lg text-gray-400 hover:text-pink-600 hover:bg-pink-50 transition-colors"
              title={hasPendingInvite ? 'Resend invite' : 'Send invite'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
          )}
          {/* Status indicator */}
          {hasAccount && (
            <span className="text-[9px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-200">
              Active
            </span>
          )}
          {hasPendingInvite && (
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Invited
            </span>
          )}
          {/* Delete */}
          <button
            onClick={() => onDelete(member.id)}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────
export default function StaffShiftsSection({ selectedTeamId, shiftLengths, triggerAddStaff, teamData }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [invitedMember, setInvitedMember] = useState(null)

  // Open modal when triggered from parent (e.g. onboarding banner)
  useEffect(() => {
    if (triggerAddStaff) {
      setEditingStaff(null)
      setShowModal(true)
    }
  }, [triggerAddStaff])

  const { data: staff = [], isLoading: staffLoading } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load staff')
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['shifts', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/shifts?team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load shifts')
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  // ── Mutations ──
  const addStaff = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, team_id: selectedTeamId })
      })
      if (!res.ok) throw new Error('Failed to add staff')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
      setShowModal(false)
      setEditingStaff(null)
    }
  })

  const updateStaff = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/staff/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to update staff')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
      setShowModal(false)
      setEditingStaff(null)
    }
  })

  const deleteStaff = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/api/staff?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete staff')
      return id
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] })
  })

  const inviteStaff = useMutation({
    mutationFn: async (staffId) => {
      const res = await fetch('/api/staff/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate invite')
      return data
    },
    onSuccess: (data) => {
      setInviteData(data)
      setShowInviteModal(true)
    },
    onError: (error) => alert(error.message)
  })

  // ── Handlers ──
  const handleSubmit = async (data) => {
    try {
      if (editingStaff) {
        await updateStaff.mutateAsync(data)
      } else {
        await addStaff.mutateAsync(data)
      }
    } catch (error) {
      console.error('Error saving staff:', error)
      alert(`Failed to ${editingStaff ? 'update' : 'add'} staff member.`)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return
    try { await deleteStaff.mutateAsync(id) } catch { alert('Failed to delete staff member.') }
  }

  const handleInvite = (member) => {
    setInvitedMember(member)
    inviteStaff.mutate(member.id)
  }

  const isLoading = staffLoading || shiftsLoading

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-3 border-gray-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-5">
        {/* Left: Coverage week */}
        <div className="w-[340px] flex-shrink-0">
          <div className="sticky top-6">
            <CoverageWeek shifts={shifts} staff={staff} shiftLengths={shiftLengths} />
          </div>
        </div>

        {/* Right: Staff cards */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 font-cal">
              Staff ({staff.length})
            </h3>
            <button
              onClick={() => { setEditingStaff(null); setShowModal(true) }}
              className="px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-md"
              style={{ background: '#FF1F7D' }}
            >
              + Add Staff
            </button>
          </div>

          {staff.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <p className="text-sm text-gray-700 font-semibold font-cal mb-1">No staff members yet</p>
              <p className="text-xs text-gray-500 mb-4">Add your team members to start scheduling.</p>
              <button
                onClick={() => { setEditingStaff(null); setShowModal(true) }}
                className="px-4 py-2 text-white rounded-xl text-sm font-semibold transition-all hover:shadow-md"
                style={{ background: '#FF1F7D' }}
              >
                + Add Staff
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {staff.map(member => (
                <StaffCard
                  key={member.id}
                  member={member}
                  shiftLengths={shiftLengths}
                  onEdit={(m) => { setEditingStaff(m); setShowModal(true) }}
                  onDelete={handleDelete}
                  onInvite={handleInvite}
                  isInviting={inviteStaff.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Existing full-featured StaffModal — all fields preserved */}
      {showModal && (
        <StaffModal
          editingStaff={editingStaff}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); setEditingStaff(null) }}
          isSaving={addStaff.isPending || updateStaff.isPending}
        />
      )}

      {/* Existing InviteModal — invite link + copy + email */}
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