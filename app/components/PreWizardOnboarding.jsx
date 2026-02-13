'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

const defaultOpeningHours = () => {
  const hours = {}
  daysOfWeek.forEach(day => {
    const isWeekday = !['Saturday', 'Sunday'].includes(day)
    hours[day] = {
      open: isWeekday,
      start: '09',
      startMin: '00',
      end: '17',
      endMin: '00'
    }
  })
  return hours
}

const hourOptions = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const minuteOptions = ['00', '15', '30', '45']

export default function PreWizardOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const totalSteps = 5
  
  // Form state
  const [formData, setFormData] = useState({
    locale_id: null,
    business_name: '',
    employee_count_range: null,
    industry: null,
    opening_hours: defaultOpeningHours()
  })

  // Locale options with compliance info
  const [locales, setLocales] = useState([])
  const [selectedLocale, setSelectedLocale] = useState(null)
  const [localesLoading, setLocalesLoading] = useState(true)

  // Fetch locales on mount
  useEffect(() => {
    const fetchLocales = async () => {
      try {
        const response = await fetch('/api/locales')
        if (response.ok) {
          const data = await response.json()
          setLocales(data)
        }
      } catch (error) {
        console.error('Error fetching locales:', error)
      } finally {
        setLocalesLoading(false)
      }
    }
    fetchLocales()
  }, [])

  const employeeRanges = [
    { value: '5-10', label: '5-10 employees' },
    { value: '11-25', label: '11-25 employees' },
    { value: '26-50', label: '26-50 employees' },
    { value: '51-100', label: '51-100 employees' },
    { value: '100+', label: '100+ employees' }
  ]

  const industries = [
    { value: 'hospitality', label: 'Hospitality', icon: '🍽️' },
    { value: 'retail', label: 'Retail', icon: '🛍️' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' },
    { value: 'other', label: 'Other', icon: '🏢' }
  ]

  const handleLocaleSelect = (localeId) => {
    const locale = locales.find(l => l.id === localeId)
    setSelectedLocale(locale)
    setFormData({ ...formData, locale_id: localeId })
  }

  const updateOpeningHours = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          [field]: value
        }
      }
    }))
  }

  const toggleDayOpen = (day) => {
    setFormData(prev => ({
      ...prev,
      opening_hours: {
        ...prev.opening_hours,
        [day]: {
          ...prev.opening_hours[day],
          open: !prev.opening_hours[day].open
        }
      }
    }))
  }

  // Copy first open day's hours to all other open days
  const applyToAllOpen = () => {
    const firstOpenDay = daysOfWeek.find(d => formData.opening_hours[d].open)
    if (!firstOpenDay) return
    const source = formData.opening_hours[firstOpenDay]
    
    setFormData(prev => {
      const updated = { ...prev.opening_hours }
      daysOfWeek.forEach(day => {
        if (updated[day].open) {
          updated[day] = { ...updated[day], start: source.start, startMin: source.startMin, end: source.end, endMin: source.endMin }
        }
      })
      return { ...prev, opening_hours: updated }
    })
  }

  const handleNext = () => {
    setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        router.push('/dashboard')
      } else {
        alert('Failed to save onboarding data')
      }
    } catch (error) {
      console.error('Error saving onboarding:', error)
      alert('Failed to save onboarding data')
    } finally {
      setSaving(false)
    }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.locale_id !== null
      case 2: return formData.business_name.trim().length > 0
      case 3: return formData.employee_count_range !== null
      case 4: return formData.industry !== null
      case 5: {
        // At least one day must be open
        return daysOfWeek.some(d => formData.opening_hours[d].open)
      }
      default: return false
    }
  }

  // Summary of open days for step 5
  const openDaysSummary = () => {
    const openDays = daysOfWeek.filter(d => formData.opening_hours[d].open)
    if (openDays.length === 7) return 'Open every day'
    if (openDays.length === 0) return 'No days selected'
    if (openDays.length === 5 && !formData.opening_hours.Saturday.open && !formData.opening_hours.Sunday.open) {
      return 'Mon – Fri'
    }
    if (openDays.length === 6) {
      const closedDay = daysOfWeek.find(d => !formData.opening_hours[d].open)
      return `Every day except ${closedDay}`
    }
    return openDays.map(d => d.slice(0, 3)).join(', ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 bg-white px-7 py-4 rounded-2xl shadow-lg">
          <Image 
            src="/logo.svg" 
            alt="Shiftly" 
            width={52} 
            height={52}
            className="flex-shrink-0"
          />
          <span className="text-3xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: "'Cal Sans', sans-serif" }}>
            Shiftly
          </span>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Step {currentStep} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-pink-500 to-pink-600 transition-all duration-500 ease-out"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Cards */}
        <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-12 min-h-[500px] flex flex-col">
          {/* Step 1: Location */}
          {currentStep === 1 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">
                  Where is your business based? 🌍
                </h1>
                <p className="text-lg text-gray-600">
                  We'll apply the right compliance rules and formatting for your region.
                </p>
              </div>

              {localesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="space-y-3 flex-1">
                  {locales.map((locale) => (
                    <button
                      key={locale.id}
                      onClick={() => handleLocaleSelect(locale.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        formData.locale_id === locale.id
                          ? 'border-pink-500 bg-pink-50 shadow-md'
                          : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900">
                          {locale.country_name}
                        </span>
                        {formData.locale_id === locale.id && (
                          <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center">
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Compliance Info */}
              {selectedLocale && (
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 mb-1">Your compliance settings</p>
                      <div className="text-xs text-blue-700 space-y-0.5">
                        {selectedLocale.max_weekly_hours && (
                          <div>• Max {selectedLocale.max_weekly_hours} hours per week</div>
                        )}
                        {selectedLocale.min_rest_hours && (
                          <div>• Min {selectedLocale.min_rest_hours} hours rest between shifts</div>
                        )}
                        <div>• {selectedLocale.annual_leave_days} days annual leave</div>
                        <div>• Currency: {selectedLocale.currency_code}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Business Name */}
          {currentStep === 2 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">
                  What's your business name? 🏢
                </h1>
                <p className="text-lg text-gray-600">
                  This will appear throughout your workspace.
                </p>
              </div>

              <div className="flex-1">
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="e.g., Main Street Coffee"
                  className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all text-gray-900 bg-white placeholder-gray-400"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Step 3: Employee Count */}
          {currentStep === 3 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">
                  How many employees do you have? 👥
                </h1>
                <p className="text-lg text-gray-600">
                  This helps us understand your team size.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
                {employeeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setFormData({ ...formData, employee_count_range: range.value })}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      formData.employee_count_range === range.value
                        ? 'border-pink-500 bg-pink-50 shadow-md'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <span className="text-xl font-semibold text-gray-900">{range.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Industry */}
          {currentStep === 4 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">
                  What industry are you in? 🎯
                </h1>
                <p className="text-lg text-gray-600">
                  We'll customize your experience based on your industry.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1">
                {industries.map((ind) => (
                  <button
                    key={ind.value}
                    onClick={() => setFormData({ ...formData, industry: ind.value })}
                    className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${
                      formData.industry === ind.value
                        ? 'border-pink-500 bg-pink-50 shadow-md'
                        : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'
                    }`}
                  >
                    <span className="text-4xl">{ind.icon}</span>
                    <span className="text-lg font-semibold text-gray-900">{ind.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Opening Hours */}
          {currentStep === 5 && (
            <div className="flex-1 flex flex-col animate-fade-in">
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">
                  What are your opening hours? 🕐
                </h1>
                <p className="text-lg text-gray-600">
                  We'll use this to generate your shift patterns. You can always adjust later.
                </p>
              </div>

              {/* Apply to all button */}
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-500">{openDaysSummary()}</p>
                <button
                  type="button"
                  onClick={applyToAllOpen}
                  className="text-xs font-medium text-pink-600 hover:text-pink-700 transition-colors"
                >
                  Apply first day to all
                </button>
              </div>

              {/* Days grid */}
              <div className="space-y-2 flex-1">
                {daysOfWeek.map((day) => {
                  const dayData = formData.opening_hours[day]
                  return (
                    <div
                      key={day}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                        dayData.open ? 'bg-white border border-gray-200' : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      {/* Day name + toggle */}
                      <button
                        onClick={() => toggleDayOpen(day)}
                        className="flex items-center gap-2 w-24 flex-shrink-0"
                      >
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-all ${
                          dayData.open ? 'bg-pink-500' : 'bg-gray-300'
                        }`}>
                          {dayData.open && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm font-medium ${dayData.open ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day.slice(0, 3)}
                        </span>
                      </button>

                      {/* Time selectors or Closed label */}
                      {dayData.open ? (
                        <div className="flex items-center gap-1.5 flex-1">
                          {/* Start time */}
                          <select
                            value={dayData.start}
                            onChange={(e) => updateOpeningHours(day, 'start', e.target.value)}
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none"
                          >
                            {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold text-xs">:</span>
                          <select
                            value={dayData.startMin}
                            onChange={(e) => updateOpeningHours(day, 'startMin', e.target.value)}
                            className="w-14 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none"
                          >
                            {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>

                          <span className="text-gray-400 mx-1">→</span>

                          {/* End time */}
                          <select
                            value={dayData.end}
                            onChange={(e) => updateOpeningHours(day, 'end', e.target.value)}
                            className="w-16 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none"
                          >
                            {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                          </select>
                          <span className="text-gray-400 font-bold text-xs">:</span>
                          <select
                            value={dayData.endMin}
                            onChange={(e) => updateOpeningHours(day, 'endMin', e.target.value)}
                            className="w-14 px-1.5 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent appearance-none"
                          >
                            {minuteOptions.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic flex-1">Closed</span>
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Don&apos;t worry about staff prep or close-down time — you can fine-tune shift patterns in your workspace.
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-0 disabled:cursor-default transition-all"
            >
              ← Back
            </button>

            {currentStep < totalSteps ? (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!canProceed() || saving}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  'Get Started →'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}