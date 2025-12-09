'use client'

import { useState, useEffect } from 'react'

export default function TeamSelector({ selectedTeamId, onTeamChange, showAddButton = true }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      loadTeams()
    }
  }, [mounted])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to load teams')
      const data = await response.json()
      setTeams(data)
      
      // Auto-select first team if none selected
      if (data.length > 0 && !selectedTeamId) {
        onTeamChange(data[0].id)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTeam = async (e) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: newTeamName,
          description: newTeamDescription
        })
      })

      if (!response.ok) throw new Error('Failed to create team')
      
      const newTeam = await response.json()
      
      setNewTeamName('')
      setNewTeamDescription('')
      setShowAddModal(false)
      
      await loadTeams()
      onTeamChange(newTeam.id)
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    }
  }

  const handleDeleteTeam = async () => {
    const team = teams.find(t => t.id === selectedTeamId)
    if (!team) return
    
    if (!confirm(`Are you sure you want to delete "${team.team_name}"? This will also delete all staff, shifts, and rules for this team.`)) {
      return
    }

    try {
      const response = await fetch(`/api/teams?id=${selectedTeamId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete team')
      }

      // Reload teams and select the first available team
      await loadTeams()
    } catch (error) {
      console.error('Error deleting team:', error)
      alert(error.message || 'Failed to delete team. Please try again.')
    }
  }

  if (!mounted || loading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="w-48 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        {/* Team Dropdown */}
        <select
          value={selectedTeamId || ''}
          onChange={(e) => onTeamChange(parseInt(e.target.value))}
          className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all min-w-[200px]"
        >
          {teams.length === 0 ? (
            <option value="">No teams yet</option>
          ) : (
            teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.team_name} ({team.description || 'No description'})
              </option>
            ))
          )}
        </select>

        {/* Delete Team Button - Only show for non-default teams */}
        {selectedTeamId && teams.find(t => t.id === selectedTeamId && !t.is_default) && (
          <button
            onClick={handleDeleteTeam}
            className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
            title="Delete team"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}

        {/* Add Team Button - Only show if showAddButton is true */}
        {showAddButton && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Team</span>
          </button>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add New Team</h2>
              <button 
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddTeam}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Team Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Kitchen Staff"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Main kitchen team"
                  />
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}