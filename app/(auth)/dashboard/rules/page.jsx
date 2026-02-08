'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import PageHeader from '@/app/components/PageHeader'

const AVAILABLE_RULES = [
  {
    type: 'no_double_shifts',
    name: 'No Double Shifts',
    description: 'Staff cannot work overlapping shifts on the same day',
    icon: '⚡',
    defaultValue: null
  },
  {
    type: 'rest_between_shifts',
    name: 'Rest Between Shifts',
    description: 'Staff must have minimum rest hours between shifts on consecutive days',
    icon: '💤',
    defaultValue: 12,
    hasValue: true,
    valueLabel: 'Min hours rest',
    min: 8,
    max: 24
  },
  {
    type: 'no_clopening',
    name: 'No Clopening',
    description: 'Staff cannot work a closing shift followed by an opening shift the next day',
    icon: '🌙',
    defaultValue: null
  },
  {
    type: 'fair_weekend_distribution',
    name: 'Fair Weekend Distribution',
    description: 'Weekend shifts are distributed evenly among all available staff members',
    icon: '🎯',
    defaultValue: null
  },
  {
    type: 'max_consecutive_days',
    name: 'Maximum Consecutive Days',
    description: 'Staff cannot work more than a set number of consecutive days',
    icon: '📅',
    defaultValue: 6,
    hasValue: true,
    valueLabel: 'Max consecutive days',
    min: 3,
    max: 7
  },
  {
    type: 'minimum_days_off',
    name: 'Minimum Days Off',
    description: 'Staff must have a minimum number of days off per week',
    icon: '🏖️',
    defaultValue: 2,
    hasValue: true,
    valueLabel: 'Min days off per week',
    min: 1,
    max: 4
  }
]

export default function RulesPage() {
  const { user } = useUser()
  const [rules, setRules] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      loadRules()
    }
  }, [user])

  const loadRules = async () => {
    try {
      const response = await fetch('/api/rules')
      if (response.ok) {
        const data = await response.json()
        
        const initialRules = AVAILABLE_RULES.map(ruleTemplate => {
          const existingRule = data.find(r => r.type === ruleTemplate.type)
          return {
            ...ruleTemplate,
            enabled: existingRule?.enabled ?? false,
            value: existingRule?.value ?? ruleTemplate.defaultValue
          }
        })
        
        setRules(initialRules)
      }
    } catch (error) {
      console.error('Error loading rules:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleRule = async (ruleType) => {
    const updatedRules = rules.map(rule => 
      rule.type === ruleType 
        ? { ...rule, enabled: !rule.enabled }
        : rule
    )
    setRules(updatedRules)
    await saveRule(updatedRules.find(r => r.type === ruleType))
  }

  const updateRuleValue = async (ruleType, newValue) => {
    const updatedRules = rules.map(rule => 
      rule.type === ruleType 
        ? { ...rule, value: parseInt(newValue) }
        : rule
    )
    setRules(updatedRules)
    await saveRule(updatedRules.find(r => r.type === ruleType))
  }

  const saveRule = async (rule) => {
    setSaving(true)
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: rule.type,
          name: rule.name,
          enabled: rule.enabled,
          value: rule.value
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to save rule')
      }
    } catch (error) {
      console.error('Error saving rule:', error)
      alert('Failed to save rule')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <>
      <main className="max-w-6xl mx-auto px-6 lg:px-8 py-12">
        <PageHeader 
          title="Scheduling Rules"
          subtitle="Configure constraints for fair and balanced scheduling"
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              
              <h3 className="heading-subsection mb-2">
                {rule.name}
              </h3>
              <p className="body-small text-gray-600 mb-4">
                {rule.description}
              </p>
              
              {rule.hasValue && rule.enabled && (
                <div 
                  className="flex items-center gap-3 pt-4 border-t border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="body-small font-medium text-gray-700 flex-shrink-0">
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

        {saving && (
          <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="body-small font-medium">Saving...</span>
          </div>
        )}
      </main>
    </>
  )
}