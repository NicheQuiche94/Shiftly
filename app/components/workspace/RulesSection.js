'use client'

import { useState, useEffect } from 'react'

const AVAILABLE_RULES = [
  {
    type: 'no_double_shifts',
    name: 'No Double Shifts',
    description: 'Staff cannot work overlapping shifts on the same day',
    icon: '⚡',
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'rest_between_shifts',
    name: 'Rest Between Shifts',
    description: 'Minimum hours of rest required between shifts on consecutive days',
    icon: '💤',
    hasValue: true,
    valueLabel: 'Hours',
    defaultValue: 11,
    min: 8,
    max: 14
  },
  {
    type: 'no_clopening',
    name: 'No Clopening',
    description: 'Staff cannot work a closing shift followed by an opening shift the next day',
    icon: '🌙',
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'fair_weekend_distribution',
    name: 'Fair Weekend Distribution',
    description: 'Weekend shifts are distributed evenly among all available staff members',
    icon: '🎯',
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'max_consecutive_days',
    name: 'Max Consecutive Days',
    description: 'Maximum number of days a staff member can work in a row',
    icon: '📅',
    hasValue: true,
    valueLabel: 'Days',
    defaultValue: 6,
    min: 3,
    max: 7
  },
  {
    type: 'minimum_days_off',
    name: 'Minimum Days Off',
    description: 'Minimum number of days off required per week',
    icon: '🏖️',
    hasValue: true,
    valueLabel: 'Days',
    defaultValue: 1,
    min: 1,
    max: 3
  }
]

export default function RulesSection({ selectedTeamId }) {
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (selectedTeamId) {
      loadRules()
    }
  }, [selectedTeamId])

  const loadRules = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/rules?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load rules')
      const savedRules = await response.json()
      
      // Merge saved rules with available rules
      const mergedRules = AVAILABLE_RULES.map(availableRule => {
        const savedRule = savedRules.find(r => r.type === availableRule.type)
        return {
          ...availableRule,
          enabled: savedRule ? savedRule.enabled : false,
          value: savedRule ? savedRule.value : availableRule.defaultValue
        }
      })
      
      setRules(mergedRules)
    } catch (error) {
      console.error('Error loading rules:', error)
      // Initialize with default rules if load fails
      setRules(AVAILABLE_RULES.map(rule => ({
        ...rule,
        enabled: false,
        value: rule.defaultValue
      })))
    } finally {
      setLoading(false)
    }
  }

  const saveRule = async (ruleType, enabled, value) => {
    setSaving(true)
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: selectedTeamId,
          type: ruleType,
          enabled,
          value
        })
      })
      
      if (!response.ok) throw new Error('Failed to save rule')
    } catch (error) {
      console.error('Error saving rule:', error)
    } finally {
      setSaving(false)
    }
  }

  const toggleRule = (ruleType) => {
    setRules(prevRules => {
      const updated = prevRules.map(rule => {
        if (rule.type === ruleType) {
          const newEnabled = !rule.enabled
          saveRule(ruleType, newEnabled, rule.value)
          return { ...rule, enabled: newEnabled }
        }
        return rule
      })
      return updated
    })
  }

  const updateRuleValue = (ruleType, newValue) => {
    const numValue = parseInt(newValue) || 0
    setRules(prevRules => {
      const updated = prevRules.map(rule => {
        if (rule.type === ruleType) {
          saveRule(ruleType, rule.enabled, numValue)
          return { ...rule, value: numValue }
        }
        return rule
      })
      return updated
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Scheduling Rules</h2>
        <p className="text-sm text-gray-600 mt-1">Configure constraints for fair and balanced scheduling</p>
      </div>

      {/* Rules Grid - 3 columns, 2 rows */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules.map((rule) => (
          <div
            key={rule.type}
            className={`bg-white rounded-xl border-2 p-6 transition-all cursor-pointer ${
              rule.enabled 
                ? 'border-pink-500 shadow-lg shadow-pink-500/25' 
                : 'border-gray-200 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/10'
            }`}
            onClick={() => toggleRule(rule.type)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-4xl">{rule.icon}</div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleRule(rule.type)
                }}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                  rule.enabled ? 'bg-pink-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    rule.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {rule.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {rule.description}
            </p>
            
            {rule.hasValue && rule.enabled && (
              <div 
                className="flex items-center gap-3 pt-4 border-t border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <label className="text-sm font-medium text-gray-700 flex-shrink-0">
                  {rule.valueLabel}:
                </label>
                <input
                  type="number"
                  min={rule.min || 1}
                  max={rule.max || 24}
                  value={rule.value}
                  onChange={(e) => updateRuleValue(rule.type, e.target.value)}
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Saving indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium text-gray-900">Saving...</span>
        </div>
      )}
    </div>
  )
}