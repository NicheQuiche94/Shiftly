'use client'

import { useState } from 'react'

export default function RulesComplianceSection({ rules }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [expandedRules, setExpandedRules] = useState(() => {
    return rules.reduce((acc, rule, idx) => {
      acc[idx] = false
      return acc
    }, {})
  })

  const toggleRule = (idx) => {
    setExpandedRules(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }))
  }

  return (
    <div className="border-b border-gray-200/60 bg-gray-50/30 no-print">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 sm:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <h3 className="heading-section">Rules Compliance</h3>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isExpanded && (
        <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-2">
          {rules.map((rule, idx) => {
            const isRuleExpanded = expandedRules[idx]
            const hasViolations = rule.violations && rule.violations.length > 0
            
            return (
              <div
                key={idx}
                className={`rounded-lg border transition-all ${
                  rule.status === 'followed'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-amber-50 border-amber-200'
                }`}
              >
                <button
                  onClick={() => toggleRule(idx)}
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between hover:bg-black/5 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                      rule.status === 'followed' ? 'bg-green-100' : 'bg-amber-100'
                    }`}>
                      {rule.status === 'followed' ? (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="body-text font-semibold">{rule.rule}</p>
                      <p className="body-small">{rule.details}</p>
                    </div>
                  </div>
                  {hasViolations && (
                    <svg 
                      className={`w-4 h-4 sm:w-5 sm:h-5 text-gray-400 transition-transform flex-shrink-0 ml-2 ${isRuleExpanded ? 'rotate-180' : ''}`}
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
                
                {hasViolations && isRuleExpanded && (
                  <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                      {rule.violations.map((violation, vIdx) => (
                        <div key={vIdx} className="bg-white rounded border border-gray-200 p-2 sm:p-3">
                          <div className="body-text font-medium mb-1">
                            {violation.staff} - {violation.day} - {violation.week}
                          </div>
                          <div className="body-small mb-2">
                            <span className="font-medium">Issue:</span> {violation.issue || (violation.count ? `${violation.count} weekend shifts` : 'See details')}
                          </div>
                          <div className="body-small">
                            <span className="font-medium">Solution:</span> {violation.solution}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}