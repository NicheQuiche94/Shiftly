'use client'

import { useState, useEffect } from 'react'

export default function TeamSelector({ selectedTeamId, onTeamChange }) {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamDescription, setNewTeamDescription] = useState('')

  useEffect(() => {
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const response = await fetch('/api/teams')
      if (!response.ok) throw new Error('Failed to load teams')
      const data = await response.json()
      setTeams(data)
      
      // If no team is selected yet, select the first team (default team)
      if (!selectedTeamId && data.length > 0) {
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
    
    if (!newTeamName.trim()) return

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_name: newTeamName,
          description: newTeamDescription
        })
      })

      if (!response.ok) throw new Error('Failed to create team')

      const newTeam = await response.json()
      
      // Reload teams and select the new team
      await loadTeams()
      onTeamChange(newTeam.id)
      
      // Close modal and reset form
      setShowAddModal(false)
      setNewTeamName('')
      setNewTeamDescription('')
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-5 h-5 border-2 border-gray-300 border-t-pink-500 rounded-full animate-spin"></div>
        <span className="text-sm text-gray-600">Loading teams...</span>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        {/* Team Dropdown */}
        <div className="relative">
          <select
            value={selectedTeamId || ''}
            onChange={(e) => onTeamChange(parseInt(e.target.value))}
            className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 font-medium hover:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all cursor-pointer"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.team_name} {team.is_default ? '(Main)' : ''}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Add Team Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg font-medium hover:shadow-lg hover:shadow-pink-500/25 transition-all flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Team</span>
        </button>
      </div>

      {/* Add Team Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add New Team</h2>
              <button 
                onClick={() => {
                  setShowAddModal(false)
                  setNewTeamName('')
                  setNewTeamDescription('')
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddTeam}>
              <div className="space-y-4">
                {/* Team Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Team Name <span className="text-pink-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all"
                    placeholder="e.g., Front of House, Kitchen, Bar"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Description (optional)
                  </label>
                  <textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white transition-all resize-none"
                    placeholder="What does this team do?"
                    rows={3}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewTeamName('')
                    setNewTeamDescription('')
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/25 font-semibold transition-all"
                >
                  Add Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}