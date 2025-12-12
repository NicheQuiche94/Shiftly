'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const AVAILABLE_RULES = [
  {
    type: 'no_double_shifts',
    name: 'No Double Shifts',
    description: 'Staff cannot work overlapping shifts on the same day',
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'rest_between_shifts',
    name: 'Rest Between Shifts',
    description: 'Minimum hours of rest required between shifts on consecutive days',
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
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'fair_weekend_distribution',
    name: 'Fair Weekend Distribution',
    description: 'Weekend shifts are distributed evenly among all available staff members',
    hasValue: false,
    defaultValue: null
  },
  {
    type: 'max_consecutive_days',
    name: 'Max Consecutive Days',
    description: 'Maximum number of days a staff member can work in a row',
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
    hasValue: true,
    valueLabel: 'Days',
    defaultValue: 1,
    min: 1,
    max: 3
  }
]

// Icon components for each rule type
const RuleIcons = {
  no_double_shifts: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  rest_between_shifts: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  ),
  no_clopening: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  fair_weekend_distribution: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
    </svg>
  ),
  max_consecutive_days: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  minimum_days_off: (
    <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  )
}

export default function RulesSection({ selectedTeamId }) {
  const queryClient = useQueryClient()
  const [localRules, setLocalRules] = useState([])

  // Fetch rules with React Query
  const { data: savedRules = [], isLoading } = useQuery({
    queryKey: ['rules', selectedTeamId],
    queryFn: async () => {
      const response = await fetch(`/api/rules?team_id=${selectedTeamId}`)
      if (!response.ok) throw new Error('Failed to load rules')
      return response.json()
    },
    enabled: !!selectedTeamId
  })

  // Merge saved rules with available rules (memoized)
  const rules = useMemo(() => {
    return AVAILABLE_RULES.map(availableRule => {
      const savedRule = savedRules.find(r => r.type === availableRule.type)
      return {
        ...availableRule,
        enabled: savedRule ? savedRule.enabled : false,
        value: savedRule ? savedRule.value : availableRule.defaultValue
      }
    })
  }, [savedRules])

  // Save rule mutation
  const saveRuleMutation = useMutation({
    mutationFn: async ({ ruleType, enabled, value }) => {
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
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rules', selectedTeamId] })
    }
  })

  const toggleRule = (ruleType) => {
    const rule = rules.find(r => r.type === ruleType)
    if (rule) {
      const newEnabled = !rule.enabled
      saveRuleMutation.mutate({ ruleType, enabled: newEnabled, value: rule.value })
    }
  }

  const updateRuleValue = (ruleType, newValue) => {
    const numValue = parseInt(newValue) || 0
    const rule = rules.find(r => r.type === ruleType)
    if (rule) {
      saveRuleMutation.mutate({ ruleType, enabled: rule.enabled, value: numValue })
    }
  }

  const enabledCount = rules.filter(r => r.enabled).length

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Scheduling Rules</h2>
          <p className="text-sm text-gray-600 mt-1">Configure constraints for fair and balanced scheduling</p>
        </div>
        
        {enabledCount > 0 && (
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200/60 px-4 sm:px-6 py-2 sm:py-3">
            <div className="text-xs text-gray-600 mb-0.5 sm:mb-1">Active Rules</div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">{enabledCount}</div>
            <div className="text-xs text-gray-500 mt-0.5 hidden sm:block">of {rules.length} available</div>
          </div>
        )}
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-lg border border-gray-200/60 overflow-hidden divide-y divide-gray-200/60">
        {rules.map((rule) => (
          <div
            key={rule.type}
            className={`px-4 sm:px-6 py-4 sm:py-5 transition-colors ${
              rule.enabled ? 'bg-pink-50/50' : 'hover:bg-gray-50/50'
            }`}
          >
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Icon */}
              <div className={`flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center ${
                rule.enabled 
                  ? 'bg-pink-100 text-pink-600' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {RuleIcons[rule.type]}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                    {rule.name}
                  </h3>
                  
                  {/* Toggle */}
                  <button
                    onClick={() => toggleRule(rule.type)}
                    disabled={saveRuleMutation.isPending}
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
                
                <p className="text-xs sm:text-sm text-gray-600">
                  {rule.description}
                </p>
                
                {/* Value selector */}
                {rule.hasValue && rule.enabled && (
                  <div className="flex items-center gap-2 sm:gap-3 mt-3">
                    <label className="text-xs sm:text-sm font-medium text-gray-700">
                      {rule.valueLabel}:
                    </label>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        onClick={() => updateRuleValue(rule.type, Math.max(rule.min, rule.value - 1))}
                        disabled={saveRuleMutation.isPending}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="w-10 sm:w-12 text-center text-base sm:text-lg font-semibold text-gray-900">
                        {rule.value}
                      </span>
                      <button
                        onClick={() => updateRuleValue(rule.type, Math.min(rule.max, rule.value + 1))}
                        disabled={saveRuleMutation.isPending}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saving indicator */}
      {saveRuleMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 z-50">
          <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs sm:text-sm font-medium text-gray-900">Saving...</span>
        </div>
      )}
    </div>
  )
}