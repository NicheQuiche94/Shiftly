'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import StaffModal from './StaffModal'
import InviteModal from './InviteModal'
import StaffTable from './StaffTable'
import HoursComparison from './HoursComparison'

export default function StaffSection({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteData, setInviteData] = useState(null)
  const [invitedMember, setInvitedMember] = useState(null)

  // ── Data fetching ──
  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff', selectedTeamId],
    queryFn: async () => {
      const res = await fetch(`/api/staff?team_id=${selectedTeamId}`)
      if (!res.ok) throw new Error('Failed to load staff')
      return res.json()
    },
    enabled: !!selectedTeamId
  })

  const { data: shifts = [] } = useQuery({
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
      const res = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, team_id: selectedTeamId }) })
      if (!res.ok) throw new Error('Failed to add staff')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] }); setShowModal(false); setEditingStaff(null) }
  })

  const updateStaff = useMutation({
    mutationFn: async (data) => {
      const res = await fetch(`/api/staff/${data.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Failed to update staff')
      return res.json()
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['staff', selectedTeamId] }); setShowModal(false); setEditingStaff(null) }
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
      const res = await fetch('/api/staff/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: staffId }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate invite')
      return data
    },
    onSuccess: (data) => { setInviteData(data); setShowInviteModal(true) },
    onError: (error) => alert(error.message)
  })

  // ── Hours comparison (memoized) ──
  const hoursData = useMemo(() => {
    const totalStaffHours = staff.reduce((sum, m) => sum + (m.contracted_hours || 0), 0)
    const totalMaxHours = staff.reduce((sum, m) => sum + (m.max_hours || m.contracted_hours || 0), 0)

    let totalShiftHours = 0
    shifts.forEach(shift => {
      const [sH, sM] = shift.start_time.split(':').map(Number)
      const [eH, eM] = shift.end_time.split(':').map(Number)
      let mins = (eH * 60 + eM) - (sH * 60 + sM)
      if (mins < 0) mins += 24 * 60
      totalShiftHours += (mins / 60) * (shift.staff_required || 1)
    })

    return {
      staffHours: totalStaffHours,
      maxStaffHours: totalMaxHours,
      shiftHours: totalShiftHours,
      hoursMatch: Math.abs(totalStaffHours - totalShiftHours) < 0.5,
      canFulfill: totalMaxHours >= totalShiftHours,
      hoursDiff: totalStaffHours - totalShiftHours
    }
  }, [staff, shifts])

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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 font-cal">Staff Members</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your team and their availability</p>
        </div>
        {staff.length > 0 && <HoursComparison {...hoursData} />}
      </div>

      {/* Add button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={() => { setEditingStaff(null); setShowModal(true) }}
          className="px-3 sm:px-4 py-2 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all text-sm"
          style={{ background: '#FF1F7D' }}
        >
          + Add Staff
        </button>
      </div>

      {/* Table */}
      <StaffTable
        staff={staff}
        isLoading={isLoading}
        onEdit={(member) => { setEditingStaff(member); setShowModal(true) }}
        onDelete={handleDelete}
        onInvite={handleInvite}
        isDeleting={deleteStaff.isPending}
        isInviting={inviteStaff.isPending}
      />

      {/* Modals */}
      {showModal && (
        <StaffModal
          editingStaff={editingStaff}
          onSubmit={handleSubmit}
          onClose={() => { setShowModal(false); setEditingStaff(null) }}
          isSaving={addStaff.isPending || updateStaff.isPending}
        />
      )}

      {showInviteModal && inviteData && (
        <InviteModal
          inviteData={inviteData}
          invitedMember={invitedMember}
          onClose={() => { setShowInviteModal(false); setInviteData(null); setInvitedMember(null) }}
        />
      )}
    </div>
  )
}