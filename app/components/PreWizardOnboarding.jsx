'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const dayAbbrev = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun' }

const timeOptions = []
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '15', '30', '45']) {
    timeOptions.push(`${String(h).padStart(2, '0')}:${m}`)
  }
}

function shiftDurationHours(start, end) {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  let startMins = sh * 60 + sm
  let endMins = eh * 60 + em
  if (endMins <= startMins) endMins += 24 * 60
  return (endMins - startMins) / 60
}

function calcTotalShiftHours(shifts) {
  let total = 0
  for (const s of shifts) {
    total += shiftDurationHours(s.start_time, s.end_time) * s.days.length * s.staff_required
  }
  return Math.round(total * 10) / 10
}

function calcTotalStaffHours(staff) {
  return staff.reduce((sum, s) => sum + (parseFloat(s.contracted_hours) || 0), 0)
}

function calcTotalMaxHours(staff) {
  return staff.reduce((sum, s) => sum + (parseFloat(s.max_hours) || parseFloat(s.contracted_hours) || 0), 0)
}

const AVAILABLE_RULES = [
  { type: 'no_double_shifts', name: 'No Double Shifts', description: 'Staff cannot work overlapping shifts on the same day', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'rest_between_shifts', name: 'Rest Between Shifts', description: 'Minimum hours rest required between consecutive shifts', hasValue: true, valueLabel: 'Hours', defaultValue: 11, min: 8, max: 14, defaultEnabled: true },
  { type: 'no_clopening', name: 'No Clopening', description: 'No closing shift followed by an opening shift next day', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'fair_weekend_distribution', name: 'Fair Weekend Distribution', description: 'Weekend shifts distributed evenly among available staff', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'max_consecutive_days', name: 'Max Consecutive Days', description: 'Maximum days in a row a staff member can work', hasValue: true, valueLabel: 'Days', defaultValue: 6, min: 3, max: 7, defaultEnabled: true },
  { type: 'minimum_days_off', name: 'Minimum Days Off', description: 'Minimum days off required per week', hasValue: true, valueLabel: 'Days', defaultValue: 1, min: 1, max: 3, defaultEnabled: true }
]

export default function PreWizardOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const totalSteps = 7

  const [formData, setFormData] = useState({ locale_id: null, business_name: '', employee_count_range: null, industry: null })

  const [shiftPatterns, setShiftPatterns] = useState([{
    id: 'shift-0', name: '', start_time: '09:00', end_time: '17:00',
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], staff_required: 1
  }])

  const [staffEntries, setStaffEntries] = useState([])

  const [rules, setRules] = useState(AVAILABLE_RULES.map(r => ({ type: r.type, enabled: r.defaultEnabled, value: r.defaultValue })))

  const [locales, setLocales] = useState([])
  const [selectedLocale, setSelectedLocale] = useState(null)
  const [localesLoading, setLocalesLoading] = useState(true)

  useEffect(() => {
    const fetchLocales = async () => {
      try {
        const response = await fetch('/api/locales')
        if (response.ok) setLocales(await response.json())
      } catch (error) { console.error('Error fetching locales:', error) }
      finally { setLocalesLoading(false) }
    }
    fetchLocales()
  }, [])

  const employeeRanges = [
    { value: '1-4', label: '1-4 employees' }, { value: '5-10', label: '5-10 employees' },
    { value: '11-25', label: '11-25 employees' }, { value: '26-50', label: '26-50 employees' },
    { value: '51-100', label: '51-100 employees' }, { value: '100+', label: '100+ employees' }
  ]

  const industries = [
    { value: 'hospitality', label: 'Hospitality', icon: '🍽️' }, { value: 'retail', label: 'Retail', icon: '🛍️' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥' }, { value: 'other', label: 'Other', icon: '🏢' }
  ]

  const handleLocaleSelect = (localeId) => {
    const locale = locales.find(l => l.id === localeId)
    setSelectedLocale(locale)
    setFormData(prev => ({ ...prev, locale_id: localeId }))
  }

  const handleNext = () => setCurrentStep(prev => prev + 1)
  const handleBack = () => setCurrentStep(prev => prev - 1)

  // Shift helpers
  const addShiftPattern = () => setShiftPatterns(prev => [...prev, { id: `shift-${Date.now()}`, name: '', start_time: '09:00', end_time: '17:00', days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], staff_required: 1 }])
  const updateShiftPattern = (id, field, value) => setShiftPatterns(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  const toggleShiftDay = (id, day) => setShiftPatterns(prev => prev.map(s => { if (s.id !== id) return s; const days = s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day]; return { ...s, days } }))
  const removeShiftPattern = (id) => setShiftPatterns(prev => prev.filter(s => s.id !== id))

  // Staff helpers
  const addStaffEntry = () => setStaffEntries(prev => [...prev, { id: `staff-${Date.now()}`, name: '', contracted_hours: '', max_hours: '', hourly_rate: '', availability: daysOfWeek.reduce((acc, day) => { acc[day] = { available: true, start: '00:00', end: '23:45' }; return acc }, {}) }])
  const updateStaffEntry = (id, field, value) => setStaffEntries(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  const toggleStaffDay = (id, day) => setStaffEntries(prev => prev.map(s => { if (s.id !== id) return s; return { ...s, availability: { ...s.availability, [day]: { ...s.availability[day], available: !s.availability[day].available } } } }))
  const removeStaffEntry = (id) => setStaffEntries(prev => prev.filter(s => s.id !== id))

  // Rules helpers
  const toggleRule = (type) => setRules(prev => prev.map(r => r.type === type ? { ...r, enabled: !r.enabled } : r))
  const updateRuleValue = (type, value) => { const def = AVAILABLE_RULES.find(r => r.type === type); const clamped = Math.max(def.min, Math.min(def.max, parseInt(value) || 0)); setRules(prev => prev.map(r => r.type === type ? { ...r, value: clamped } : r)) }

  // Calculations
  const totalShiftHours = useMemo(() => calcTotalShiftHours(shiftPatterns), [shiftPatterns])
  const totalContractedHours = useMemo(() => calcTotalStaffHours(staffEntries), [staffEntries])
  const totalMaxHours = useMemo(() => calcTotalMaxHours(staffEntries), [staffEntries])
  const hoursStatus = useMemo(() => {
    if (staffEntries.length === 0) return 'empty'
    if (totalContractedHours >= totalShiftHours) return 'good'
    if (totalMaxHours >= totalShiftHours) return 'overtime'
    return 'short'
  }, [totalContractedHours, totalMaxHours, totalShiftHours, staffEntries.length])

  const currencySymbol = selectedLocale?.currency_code === 'GBP' ? '£' : selectedLocale?.currency_code === 'EUR' ? '€' : selectedLocale?.currency_code === 'USD' ? '$' : selectedLocale?.currency_code === 'AUD' ? 'A$' : selectedLocale?.currency_code === 'CAD' ? 'C$' : selectedLocale?.currency_code === 'NZD' ? 'NZ$' : '£'

  const handleSubmit = async () => {
    setSaving(true)
    try {
      const onboardingRes = await fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...formData, skip_shift_generation: true }) })
      if (!onboardingRes.ok) { const data = await onboardingRes.json(); alert(data.error || 'Failed to save'); setSaving(false); return }
      const onboardingData = await onboardingRes.json()
      let teamId = onboardingData.team_id
      if (!teamId) { const teamsRes = await fetch('/api/teams'); const teams = await teamsRes.json(); teamId = teams[0]?.id }
      if (!teamId) { alert('Team creation failed.'); setSaving(false); return }

      // Clear existing shifts
      const existingShiftsRes = await fetch(`/api/shifts?team_id=${teamId}`)
      const existingShifts = await existingShiftsRes.json()
      if (Array.isArray(existingShifts)) { for (const shift of existingShifts) { await fetch(`/api/shifts?id=${shift.id}`, { method: 'DELETE' }) } }

      // Save shifts
      for (const pattern of shiftPatterns) { for (const day of pattern.days) { await fetch('/api/shifts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, shift_name: pattern.name, day_of_week: day, start_time: pattern.start_time, end_time: pattern.end_time, staff_required: pattern.staff_required }) }) } }

      // Save staff + payroll info
      for (const staff of staffEntries) {
        if (!staff.name.trim()) continue
        const availability = {}
        daysOfWeek.forEach(day => { const a = staff.availability[day]; availability[day] = { available: a.available, start: a.available ? a.start : null, end: a.available ? a.end : null } })
        const staffRes = await fetch('/api/staff', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, name: staff.name, email: '', role: 'staff', contracted_hours: parseFloat(staff.contracted_hours) || 0, max_hours: parseFloat(staff.max_hours) || parseFloat(staff.contracted_hours) || 0, hourly_rate: parseFloat(staff.hourly_rate) || 0, availability }) })
        
        // Also write to payroll_info table so Payroll page reflects the rate
        if (staffRes.ok && staff.hourly_rate) {
          const savedStaff = await staffRes.json()
          if (savedStaff?.id) {
            await fetch('/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: savedStaff.id, pay_type: 'hourly', hourly_rate: parseFloat(staff.hourly_rate) || null, annual_salary: null }) })
          }
        }
      }

      // Save rules
      for (const rule of rules) { await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, type: rule.type, enabled: rule.enabled, value: rule.value }) }) }

      router.push('/dashboard/generate?tour=start')
    } catch (error) { console.error('Error:', error); alert('Something went wrong. Please try again.') }
    finally { setSaving(false) }
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.locale_id !== null
      case 2: return formData.business_name.trim().length > 0
      case 3: return formData.employee_count_range !== null
      case 4: return formData.industry !== null
      case 5: return shiftPatterns.length > 0 && shiftPatterns.every(s => s.name.trim() && s.days.length > 0)
      case 6: return true
      case 7: return true
      default: return false
    }
  }

  const stepLabels = ['Location', 'Business', 'Team Size', 'Industry', 'Shifts', 'Staff', 'Rules']

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-2.5 bg-white px-7 py-4 rounded-2xl shadow-lg">
          <Image src="/logo.svg" alt="Shiftly" width={52} height={52} className="flex-shrink-0" />
          <span className="text-3xl font-bold text-gray-900 mt-0.5" style={{ fontFamily: "'Cal Sans', sans-serif" }}>Shiftly</span>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">{stepLabels[currentStep - 1]}</span>
            <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-pink-500 to-pink-600 rounded-full" style={{ width: `${(currentStep / totalSteps) * 100}%`, transition: 'width 0.4s ease' }} />
          </div>
        </div>

        <div className={`bg-white rounded-3xl shadow-xl p-8 sm:p-12 flex flex-col ${currentStep >= 5 ? 'min-h-[620px]' : 'min-h-[500px]'}`} style={{ transition: 'min-height 0.3s ease' }}>

          {/* STEP 1: Location */}
          <div className={`flex-1 flex flex-col ${currentStep === 1 ? '' : 'hidden'}`}>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">Where is your business based?</h1>
              <p className="text-lg text-gray-600">We'll apply the right compliance rules and formatting for your region.</p>
            </div>
            {localesLoading ? (
              <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin"></div></div>
            ) : (
              <div className="space-y-3 flex-1">
                {locales.map((locale) => (
                  <button key={locale.id} onClick={() => handleLocaleSelect(locale.id)} className={`w-full p-4 rounded-xl border-2 transition-all text-left ${formData.locale_id === locale.id ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-medium text-gray-900">{locale.country_name}</span>
                      {formData.locale_id === locale.id && <div className="w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center"><svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedLocale && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900 mb-1">Your compliance settings</p>
                    <div className="text-xs text-blue-700 space-y-0.5">
                      {selectedLocale.max_weekly_hours && <div>Max {selectedLocale.max_weekly_hours} hours per week</div>}
                      {selectedLocale.min_rest_hours && <div>Min {selectedLocale.min_rest_hours} hours rest between shifts</div>}
                      <div>{selectedLocale.annual_leave_days} days annual leave</div>
                      <div>Currency: {selectedLocale.currency_code}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: Business Name */}
          <div className={`flex-1 flex flex-col ${currentStep === 2 ? '' : 'hidden'}`}>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">What's your business name?</h1>
              <p className="text-lg text-gray-600">This will appear throughout your workspace.</p>
            </div>
            <div className="flex-1">
              <input type="text" value={formData.business_name} onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))} placeholder="e.g., Main Street Coffee" className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all text-gray-900 bg-white placeholder-gray-400" autoFocus={currentStep === 2} />
            </div>
          </div>

          {/* STEP 3: Employee Count */}
          <div className={`flex-1 flex flex-col ${currentStep === 3 ? '' : 'hidden'}`}>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">How many employees do you have?</h1>
              <p className="text-lg text-gray-600">This helps us understand your team size.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
              {employeeRanges.map((range) => (
                <button key={range.value} onClick={() => setFormData(prev => ({ ...prev, employee_count_range: range.value }))} className={`p-6 rounded-xl border-2 transition-all ${formData.employee_count_range === range.value ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                  <span className="text-xl font-semibold text-gray-900">{range.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 4: Industry */}
          <div className={`flex-1 flex flex-col ${currentStep === 4 ? '' : 'hidden'}`}>
            <div className="mb-8">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">What industry are you in?</h1>
              <p className="text-lg text-gray-600">We'll customise your experience based on your industry.</p>
            </div>
            <div className="grid grid-cols-2 gap-4 flex-1">
              {industries.map((ind) => (
                <button key={ind.value} onClick={() => setFormData(prev => ({ ...prev, industry: ind.value }))} className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-3 ${formData.industry === ind.value ? 'border-pink-500 bg-pink-50 shadow-md' : 'border-gray-200 hover:border-pink-300 hover:bg-pink-50/50'}`}>
                  <span className="text-4xl">{ind.icon}</span>
                  <span className="text-lg font-semibold text-gray-900">{ind.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* STEP 5: Shifts */}
          <div className={`flex-1 flex flex-col ${currentStep === 5 ? '' : 'hidden'}`}>
            <div className="mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">What are your recurring shifts?</h1>
              <p className="text-lg text-gray-600 mb-1">Enter each shift pattern your business runs. These are the slots you need to fill each week.</p>
            </div>
            <div className="flex items-center justify-between mb-4 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-700">Total weekly cover needed</span>
              <span className="text-lg font-bold text-gray-900">{totalShiftHours}h</span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[380px] pr-1">
              {shiftPatterns.map((shift) => (
                <div key={shift.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-pink-200 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="text" value={shift.name} onChange={(e) => updateShiftPattern(shift.id, 'name', e.target.value)} placeholder="Shift name" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                    <select value={shift.start_time} onChange={(e) => updateShiftPattern(shift.id, 'start_time', e.target.value)} className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <span className="text-gray-400 text-xs">to</span>
                    <select value={shift.end_time} onChange={(e) => updateShiftPattern(shift.id, 'end_time', e.target.value)} className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-pink-500 focus:border-transparent">{timeOptions.map(t => <option key={t} value={t}>{t}</option>)}</select>
                    <div className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1.5">
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      <input type="number" min="1" max="50" value={shift.staff_required} onChange={(e) => updateShiftPattern(shift.id, 'staff_required', parseInt(e.target.value) || 1)} className="w-8 text-sm text-center text-gray-900 border-0 p-0 focus:ring-0" />
                    </div>
                    <button onClick={() => removeShiftPattern(shift.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {daysOfWeek.map(day => (<button key={day} onClick={() => toggleShiftDay(shift.id, day)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${shift.days.includes(day) ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{dayAbbrev[day]}</button>))}
                    <span className="ml-auto text-xs text-gray-400">{shiftDurationHours(shift.start_time, shift.end_time)}h x {shift.days.length}d x {shift.staff_required} = {Math.round(shiftDurationHours(shift.start_time, shift.end_time) * shift.days.length * shift.staff_required * 10) / 10}h</span>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addShiftPattern} className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all">+ Add another shift pattern</button>
          </div>

          {/* STEP 6: Staff */}
          <div className={`flex-1 flex flex-col ${currentStep === 6 ? '' : 'hidden'}`}>
            <div className="mb-5">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">Add your team</h1>
              <p className="text-lg text-gray-600">Enter your staff, their contracted hours, pay rate, and which days they can work. Your shifts need <span className="font-bold text-pink-600">{totalShiftHours}h</span> of cover per week.</p>
            </div>
            <div className={`flex items-center justify-between px-4 py-3 rounded-xl border mb-4 transition-colors ${hoursStatus === 'good' ? 'bg-green-50 border-green-200' : hoursStatus === 'overtime' ? 'bg-amber-50 border-amber-200' : hoursStatus === 'short' ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <div className="flex items-center gap-4">
                <div className="text-center"><div className="text-xs text-gray-500 mb-0.5">Shifts need</div><div className="text-lg font-bold text-gray-900">{totalShiftHours}h</div></div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${hoursStatus === 'good' ? 'bg-green-500' : hoursStatus === 'overtime' ? 'bg-amber-500' : hoursStatus === 'short' ? 'bg-red-400' : 'bg-gray-300'}`}>
                  {hoursStatus === 'good' ? <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> : hoursStatus === 'overtime' ? <span className="text-white text-xs font-bold">~</span> : hoursStatus === 'short' ? <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> : <span className="text-white text-xs font-bold">?</span>}
                </div>
                <div className="text-center"><div className="text-xs text-gray-500 mb-0.5">Staff cover</div><div className="text-lg font-bold text-gray-900">{totalContractedHours}h</div></div>
              </div>
              <div className="text-right">
                {hoursStatus === 'good' && <span className="text-sm font-medium text-green-700">Fully covered</span>}
                {hoursStatus === 'overtime' && <span className="text-sm font-medium text-amber-700">{Math.round(totalShiftHours - totalContractedHours)}h overtime needed</span>}
                {hoursStatus === 'short' && <span className="text-sm font-medium text-red-700">{Math.round(totalShiftHours - totalMaxHours)}h short even with overtime</span>}
                {hoursStatus === 'empty' && <span className="text-sm text-gray-500">Add staff below</span>}
              </div>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {staffEntries.map((staff) => (
                <div key={staff.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-pink-200 transition-colors">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="text" value={staff.name} onChange={(e) => updateStaffEntry(staff.id, 'name', e.target.value)} placeholder="Name" className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                    <div className="flex items-center gap-1"><input type="number" value={staff.contracted_hours} onChange={(e) => updateStaffEntry(staff.id, 'contracted_hours', e.target.value)} placeholder="Hrs" min="0" max="168" className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent" /><span className="text-xs text-gray-400">h/wk</span></div>
                    <div className="flex items-center gap-1"><span className="text-xs text-gray-400">{currencySymbol}</span><input type="number" value={staff.hourly_rate} onChange={(e) => updateStaffEntry(staff.id, 'hourly_rate', e.target.value)} placeholder="Rate" min="0" step="0.01" className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 text-center focus:ring-2 focus:ring-pink-500 focus:border-transparent" /><span className="text-xs text-gray-400">/hr</span></div>
                    <button onClick={() => removeStaffEntry(staff.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-400 mr-1">Available:</span>
                    {daysOfWeek.map(day => (<button key={day} onClick={() => toggleStaffDay(staff.id, day)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${staff.availability[day].available ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}>{dayAbbrev[day]}</button>))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addStaffEntry} className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all">+ Add team member</button>
            {hoursStatus === 'short' && staffEntries.length > 0 && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl"><p className="text-sm text-red-700">Your team doesn't have enough hours to cover all shifts, even with overtime. You can still proceed and add more staff later.</p></div>}
            {staffEntries.length === 0 && <p className="text-xs text-gray-400 mt-3 text-center">You can skip this and add staff later in your workspace.</p>}
          </div>

          {/* STEP 7: Rules */}
          <div className={`flex-1 flex flex-col ${currentStep === 7 ? '' : 'hidden'}`}>
            <div className="mb-5">
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3 font-cal">Scheduling rules</h1>
              <p className="text-lg text-gray-600">We've turned on sensible defaults. Toggle any off if they don't apply to your business.</p>
            </div>
            <div className="space-y-2 flex-1 overflow-y-auto max-h-[420px] pr-1">
              {rules.map((rule) => {
                const def = AVAILABLE_RULES.find(r => r.type === rule.type)
                return (
                  <div key={rule.type} className={`p-4 rounded-xl border transition-colors ${rule.enabled ? 'border-pink-200 bg-pink-50/40' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <h3 className="text-sm font-semibold text-gray-900">{def.name}</h3>
                      <button onClick={() => toggleRule(rule.type)} className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${rule.enabled ? 'bg-pink-600' : 'bg-gray-200'}`}>
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${rule.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">{def.description}</p>
                    {def.hasValue && rule.enabled && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-600">{def.valueLabel}:</span>
                        <button onClick={() => updateRuleValue(rule.type, rule.value - 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold">-</button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-900">{rule.value}</span>
                        <button onClick={() => updateRuleValue(rule.type, rule.value + 1)} className="w-6 h-6 flex items-center justify-center rounded bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs font-bold">+</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">You can change these anytime in your Workspace under the Rules tab.</p>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            <button onClick={handleBack} disabled={currentStep === 1} className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-0 disabled:cursor-default transition-all">Back</button>
            {currentStep < totalSteps ? (
              <button onClick={handleNext} disabled={!canProceed()} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">Continue</button>
            ) : (
              <button onClick={handleSubmit} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>Setting up...</>) : 'Set up my workspace'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}