'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import BusinessHoursStep from './template/BusinessHoursStep'
import ShiftLengthPicker from './template/ShiftLengthPicker'
import TimelineBuilder from './template/TimelineBuilder'
import TemplateTabs from './template/TemplateTabs'
import WeekOverview from './template/WeekOverview'
import CoverageGauge from './template/CoverageGauge'
import StaffAvailabilityGrid from './template/StaffAvailabilityGrid'
import { DAYS, PALETTE, getBlockColor, formatTime } from './template/shift-constants'

const AVAILABLE_RULES = [
  { type: 'no_double_shifts', name: 'No Double Shifts', description: 'Staff cannot work overlapping shifts on the same day', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'rest_between_shifts', name: 'Rest Between Shifts', description: 'Minimum hours rest required between consecutive shifts', hasValue: true, valueLabel: 'Hours', defaultValue: 11, min: 8, max: 14, defaultEnabled: true },
  { type: 'no_clopening', name: 'No Clopening', description: 'No closing shift followed by an opening shift next day', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'fair_weekend_distribution', name: 'Fair Weekend Distribution', description: 'Weekend shifts distributed evenly among available staff', hasValue: false, defaultValue: null, defaultEnabled: true },
  { type: 'max_consecutive_days', name: 'Max Consecutive Days', description: 'Maximum days in a row a staff member can work', hasValue: true, valueLabel: 'Days', defaultValue: 6, min: 3, max: 7, defaultEnabled: true },
  { type: 'minimum_days_off', name: 'Minimum Days Off', description: 'Minimum days off required per week', hasValue: true, valueLabel: 'Days', defaultValue: 1, min: 1, max: 3, defaultEnabled: true }
]

const STEP_LABELS = ['Location', 'Business', 'Hours', 'Shift Lengths', 'Template Day', 'Template Week', 'Your Team']

function snapLen(len, lengths) {
  return lengths.reduce((p, c) => Math.abs(c - len) < Math.abs(p - len) ? c : p)
}

export default function PreWizardOnboarding() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)

  // Step 1-2
  const [formData, setFormData] = useState({ locale_id: null, business_name: '' })
  const [locales, setLocales] = useState([])
  const [selectedLocale, setSelectedLocale] = useState(null)
  const [localesLoading, setLocalesLoading] = useState(true)

  // Step 3
  const [hours, setHours] = useState({ openTime: 8, closeTime: 18, openBuffer: 30, closeBuffer: 30 })

  // Step 4
  const [shiftLengths, setShiftLengths] = useState([8])

  // Step 5
  const [templates, setTemplates] = useState({
    Weekday: { name: 'Weekday', shifts: [] },
    Weekend: { name: 'Weekend', shifts: [] },
  })
  const [activeTemplate, setActiveTemplate] = useState('Weekday')

  // Step 6
  const [weekDays, setWeekDays] = useState({
    Mon: { on: true, tmpl: 'Weekday' }, Tue: { on: true, tmpl: 'Weekday' },
    Wed: { on: true, tmpl: 'Weekday' }, Thu: { on: true, tmpl: 'Weekday' },
    Fri: { on: true, tmpl: 'Weekday' }, Sat: { on: true, tmpl: 'Weekend' },
    Sun: { on: false, tmpl: 'Weekend' },
  })

  // Step 7
  const [staffEntries, setStaffEntries] = useState([])

  // Rules
  const [rules, setRules] = useState(AVAILABLE_RULES.map(r => ({ type: r.type, enabled: r.defaultEnabled, value: r.defaultValue })))

  useEffect(() => {
    fetch('/api/locales').then(r => r.ok ? r.json() : []).then(setLocales).catch(() => {}).finally(() => setLocalesLoading(false))
  }, [])

  // Auto-generate shifts when entering step 5 if template is empty
  useEffect(() => {
    if (currentStep === 5) {
      const t = templates[activeTemplate]
      if (t && t.shifts.length === 0) {
        const dl = shiftLengths.includes(8) ? 8 : shiftLengths[0]
        const opS = hours.openTime - hours.openBuffer / 60
        const opE = hours.closeTime + hours.closeBuffer / 60
        const shifts = []
        let pos = opS, id = 0
        while (pos < opE) {
          const len = Math.min(dl, opE - pos)
          if (len >= 2) shifts.push({ id: `s${id++}`, start: pos, length: snapLen(len, shiftLengths), headcount: 2 })
          pos += dl
        }
        setTemplates(prev => ({ ...prev, [activeTemplate]: { ...prev[activeTemplate], shifts } }))
      }
    }
  }, [currentStep, activeTemplate])

  // Calculations
  const weeklyShiftHours = useMemo(() => {
    return DAYS.reduce((sum, d) => {
      if (!weekDays[d]?.on) return sum
      const tmpl = templates[weekDays[d].tmpl]
      if (!tmpl?.shifts) return sum
      return sum + tmpl.shifts.reduce((a, s) => a + s.length * s.headcount, 0)
    }, 0)
  }, [weekDays, templates])

  const totalContractedHours = useMemo(() => staffEntries.reduce((s, m) => s + (parseFloat(m.contracted_hours) || 0), 0), [staffEntries])
  const totalMaxHours = useMemo(() => staffEntries.reduce((s, m) => s + (parseFloat(m.max_hours) || parseFloat(m.contracted_hours) || 0), 0), [staffEntries])

  const currencySymbol = selectedLocale?.currency_code === 'GBP' ? '£' : selectedLocale?.currency_code === 'EUR' ? '€' : selectedLocale?.currency_code === 'USD' ? '$' : '£'

  const canProceed = () => {
    switch (currentStep) {
      case 1: return formData.locale_id !== null
      case 2: return formData.business_name.trim().length > 0
      case 3: return hours.closeTime > hours.openTime
      case 4: return shiftLengths.length > 0
      case 5: return Object.values(templates).some(t => t.shifts.length > 0)
      case 6: return DAYS.some(d => weekDays[d]?.on)
      case 7: return true
      default: return false
    }
  }

  // Staff helpers
  const addStaff = () => {
    setStaffEntries(prev => [...prev, { id: `staff-${Date.now()}`, name: '', contracted_hours: '', max_hours: '40', hourly_rate: '', keyholder: false, preferred_lengths: [...shiftLengths], availability_grid: {} }])
  }
  const updateStaff = (id, field, value) => setStaffEntries(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  const removeStaff = (id) => setStaffEntries(prev => prev.filter(s => s.id !== id))
  const togglePrefLength = (staffId, len) => {
    setStaffEntries(prev => prev.map(s => {
      if (s.id !== staffId) return s
      const set = new Set(s.preferred_lengths)
      if (set.has(len)) { if (set.size > 1) set.delete(len) } else set.add(len)
      return { ...s, preferred_lengths: [...set].sort((a, b) => a - b) }
    }))
  }

  // Template helpers
  const addTemplate = (name) => { setTemplates(prev => ({ ...prev, [name]: { name, shifts: [] } })); setActiveTemplate(name) }
  const duplicateTemplate = (fromName, newName) => {
    const source = templates[fromName]
    setTemplates(prev => ({ ...prev, [newName]: { name: newName, shifts: source.shifts.map(s => ({ ...s, id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` })) } }))
    setActiveTemplate(newName)
  }

  // Rules helpers
  const toggleRule = (type) => setRules(prev => prev.map(r => r.type === type ? { ...r, enabled: !r.enabled } : r))
  const updateRuleValue = (type, value) => {
    const def = AVAILABLE_RULES.find(r => r.type === type)
    const clamped = Math.max(def.min, Math.min(def.max, parseInt(value) || 0))
    setRules(prev => prev.map(r => r.type === type ? { ...r, value: clamped } : r))
  }

  const handleLocaleSelect = (localeId) => {
    const locale = locales.find(l => l.id === localeId)
    setSelectedLocale(locale)
    setFormData(prev => ({ ...prev, locale_id: localeId }))
  }

  // Submit
  const handleSubmit = async () => {
    setSaving(true)
    try {
      const onboardingRes = await fetch('/api/onboarding', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locale_id: formData.locale_id, business_name: formData.business_name,
          open_time: String(hours.openTime), close_time: String(hours.closeTime),
          open_buffer: hours.openBuffer, close_buffer: hours.closeBuffer,
          shift_lengths: shiftLengths, day_templates: templates, week_template: weekDays,
        })
      })
      if (!onboardingRes.ok) { const d = await onboardingRes.json(); alert(d.error || 'Failed to save'); setSaving(false); return }
      const { team_id: teamId } = await onboardingRes.json()
      if (!teamId) { alert('Team creation failed.'); setSaving(false); return }

      for (const staff of staffEntries) {
        if (!staff.name.trim()) continue
        const staffRes = await fetch('/api/staff', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            team_id: teamId, name: staff.name, email: '', role: 'staff',
            contracted_hours: parseFloat(staff.contracted_hours) || 0,
            max_hours: parseFloat(staff.max_hours) || parseFloat(staff.contracted_hours) || 0,
            hourly_rate: parseFloat(staff.hourly_rate) || 0,
            keyholder: staff.keyholder,
            preferred_shift_length: staff.preferred_lengths?.[0] || shiftLengths[0],
            availability_grid: staff.availability_grid,
          })
        })
        if (staffRes.ok && staff.hourly_rate) {
          const saved = await staffRes.json()
          if (saved?.id) {
            await fetch('/api/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ staff_id: saved.id, pay_type: 'hourly', hourly_rate: parseFloat(staff.hourly_rate) || null, annual_salary: null }) })
          }
        }
      }

      for (const rule of rules) {
        await fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ team_id: teamId, type: rule.type, enabled: rule.enabled, value: rule.value }) })
      }

      router.push('/dashboard/generate?tour=start')
    } catch (error) { console.error('Error:', error); alert('Something went wrong. Please try again.') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-pink-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 p-6 flex flex-col flex-shrink-0">
        <div className="inline-flex items-center gap-2.5 bg-white px-5 py-3 rounded-2xl shadow-lg mb-10">
          <Image src="/logo.svg" alt="Shiftly" width={36} height={36} />
          <span className="text-xl font-bold text-gray-900 font-cal">Shiftly</span>
        </div>

        <div className="flex flex-col gap-1">
          {STEP_LABELS.map((label, i) => {
            const step = i + 1
            const isDone = step < currentStep
            const isActive = step === currentStep
            return (
              <button
                key={step}
                onClick={() => { if (step <= currentStep) setCurrentStep(step) }}
                disabled={step > currentStep}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${isActive ? 'bg-pink-50' : isDone ? 'hover:bg-gray-50' : ''}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border transition-all ${isDone ? 'bg-green-500 border-green-500 text-white' : isActive ? 'bg-pink-500 border-pink-500 text-white' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                  {isDone ? '✓' : step}
                </div>
                <span className={`text-sm font-medium ${isActive ? 'text-gray-900 font-semibold' : isDone ? 'text-gray-600' : 'text-gray-400'}`}>{label}</span>
              </button>
            )
          })}
        </div>

        <div className="flex-1" />
        <div className="pt-4 border-t border-gray-100">
          <span className="text-[11px] text-gray-400">Setting up your workspace</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 p-8 lg:p-12 overflow-y-auto flex flex-col items-center">
        <div className={`w-full ${currentStep >= 5 ? 'max-w-5xl' : 'max-w-3xl'} transition-all`}>

          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 min-h-[500px] flex flex-col">

            {/* STEP 1: Location */}
            <div className={`flex-1 flex flex-col ${currentStep === 1 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">Where is your business based?</h1>
              <p className="text-base text-gray-600 mb-8">We'll apply the right compliance rules and formatting for your region.</p>
              {localesLoading ? (
                <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-gray-200 border-t-pink-500 rounded-full animate-spin" /></div>
              ) : (
                <div className="space-y-3">
                  {locales.map(locale => (
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
                  <p className="text-sm font-medium text-blue-900 mb-1">Your compliance settings</p>
                  <div className="text-xs text-blue-700 space-y-0.5">
                    {selectedLocale.max_weekly_hours && <div>Max {selectedLocale.max_weekly_hours} hours per week</div>}
                    {selectedLocale.min_rest_hours && <div>Min {selectedLocale.min_rest_hours} hours rest between shifts</div>}
                    <div>{selectedLocale.annual_leave_days} days annual leave · Currency: {selectedLocale.currency_code}</div>
                  </div>
                </div>
              )}
            </div>

            {/* STEP 2: Business Name */}
            <div className={`flex-1 flex flex-col ${currentStep === 2 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">What's your business name?</h1>
              <p className="text-base text-gray-600 mb-8">This will appear throughout your workspace.</p>
              <input type="text" value={formData.business_name} onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))} placeholder="e.g., Main Street Coffee" className="w-full px-6 py-4 text-2xl border-2 border-gray-300 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all text-gray-900 bg-white placeholder-gray-400" />
            </div>

            {/* STEP 3: Business Hours */}
            <div className={`flex-1 flex flex-col ${currentStep === 3 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">When are you open?</h1>
              <p className="text-base text-gray-600 mb-6">Set your operating hours and buffer time for setup & cleanup.</p>
              <BusinessHoursStep
                openTime={hours.openTime} closeTime={hours.closeTime}
                openBuffer={hours.openBuffer} closeBuffer={hours.closeBuffer}
                onChange={(patch) => {
                  setHours(prev => ({ ...prev, ...patch }))
                  setTemplates(prev => {
                    const updated = {}
                    for (const [k, v] of Object.entries(prev)) updated[k] = { ...v, shifts: [] }
                    return updated
                  })
                }}
              />
            </div>

            {/* STEP 4: Shift Lengths */}
            <div className={`flex-1 flex flex-col ${currentStep === 4 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">What shift lengths do you use?</h1>
              <p className="text-base text-gray-600 mb-8">Select all that apply. Staff can work any mix of these.</p>
              <ShiftLengthPicker selected={shiftLengths} onChange={(val) => {
                setShiftLengths(val)
                setTemplates(prev => {
                  const updated = {}
                  for (const [k, v] of Object.entries(prev)) updated[k] = { ...v, shifts: [] }
                  return updated
                })
              }} />
              <p className="text-sm text-gray-500 mt-5">You can change these later in your workspace settings.</p>
            </div>

            {/* STEP 5: Template Day */}
            <div className={`flex-1 flex flex-col ${currentStep === 5 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">Build your template day</h1>
              <p className="text-base text-gray-600 mb-5">Drag blocks to reposition. Click the cycle button to change length. Set headcount per block.</p>
              <div className="mb-4">
                <TemplateTabs templates={templates} activeTemplate={activeTemplate} onSelect={setActiveTemplate} onAdd={addTemplate} onDuplicate={duplicateTemplate} />
              </div>
              <TimelineBuilder
                shifts={templates[activeTemplate]?.shifts || []}
                shiftLengths={shiftLengths}
                openTime={hours.openTime} closeTime={hours.closeTime}
                openBuffer={hours.openBuffer} closeBuffer={hours.closeBuffer}
                onChange={(newShifts) => setTemplates(prev => ({ ...prev, [activeTemplate]: { ...prev[activeTemplate], shifts: newShifts } }))}
              />
            </div>

            {/* STEP 6: Template Week */}
            <div className={`flex-1 flex flex-col ${currentStep === 6 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">Your template week</h1>
              <p className="text-base text-gray-600 mb-6">Assign a day template to each day. Toggle off days you're closed.</p>
              <WeekOverview weekDays={weekDays} templates={templates} shiftLengths={shiftLengths}
                onToggleDay={(d) => setWeekDays(prev => ({ ...prev, [d]: { ...prev[d], on: !prev[d].on } }))}
                onAssignTemplate={(d, tmpl) => setWeekDays(prev => ({ ...prev, [d]: { ...prev[d], tmpl } }))}
              />
            </div>

            {/* STEP 7: Your Team (split screen) */}
            <div className={`flex-1 flex flex-col ${currentStep === 7 ? '' : 'hidden'}`}>
              <h1 className="text-3xl font-bold text-gray-900 mb-3 font-cal">Add your team</h1>
              <p className="text-base text-gray-600 mb-5">Your shifts need <span className="font-bold text-pink-600">{Math.round(weeklyShiftHours)}h</span> of cover per week.</p>

              <CoverageGauge shiftHours={weeklyShiftHours} contractedHours={totalContractedHours} maxHours={totalMaxHours} />

              <div className="flex gap-6 mt-5 flex-1">
                {/* LEFT: Vertical week overview */}
                <div className="w-64 flex-shrink-0 self-start sticky top-0">
                  <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
                    <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide mb-3">Template Week</h3>
                    <WeekOverview weekDays={weekDays} templates={templates} shiftLengths={shiftLengths}
                      onToggleDay={() => {}} onAssignTemplate={() => {}} compact readOnly vertical />
                    <div className="mt-3 p-3 rounded-lg bg-white border border-gray-200 text-xs text-gray-500 space-y-1">
                      <div className="flex justify-between"><span>Needed</span><span className="font-bold text-gray-900">{Math.round(weeklyShiftHours)}h</span></div>
                      <div className="flex justify-between"><span>Contracted</span><span className="font-bold text-gray-700">{Math.round(totalContractedHours)}h</span></div>
                      <div className="flex justify-between"><span>Available (incl. overtime)</span><span className="font-bold" style={{ color: totalMaxHours >= weeklyShiftHours ? '#10B981' : '#EF4444' }}>{Math.round(totalMaxHours)}h</span></div>
                    </div>
                  </div>
                </div>

                {/* RIGHT: Staff list */}
                <div className="flex-1 min-w-0">
                  <div className="space-y-3 overflow-y-auto max-h-[450px] pr-1">
                    {staffEntries.map(staff => (
                      <div key={staff.id} className="p-4 rounded-xl border border-gray-200 bg-white hover:border-pink-200 transition-colors">
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center text-pink-600 font-bold text-sm flex-shrink-0">
                            {(staff.name || '?')[0].toUpperCase()}
                          </div>
                          <input type="text" value={staff.name} onChange={(e) => updateStaff(staff.id, 'name', e.target.value)} placeholder="Name" className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                          <div className="flex items-center gap-1">
                            <input type="number" value={staff.contracted_hours} onChange={(e) => updateStaff(staff.id, 'contracted_hours', e.target.value)} placeholder="Hrs" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                            <span className="text-[10px] text-gray-400">h/wk</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input type="number" value={staff.max_hours} onChange={(e) => updateStaff(staff.id, 'max_hours', e.target.value)} placeholder="Max" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                            <span className="text-[10px] text-gray-400">max</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">{currencySymbol}</span>
                            <input type="number" value={staff.hourly_rate} onChange={(e) => updateStaff(staff.id, 'hourly_rate', e.target.value)} placeholder="Rate" step="0.01" min="0" className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center text-gray-900 focus:ring-2 focus:ring-pink-500 focus:border-transparent" />
                            <span className="text-[10px] text-gray-400">/hr</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500 font-medium">Keyholder</span>
                            <button onClick={() => updateStaff(staff.id, 'keyholder', !staff.keyholder)} className={`relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0 ${staff.keyholder ? 'bg-orange-400' : 'bg-gray-200'}`}>
                              <div className={`absolute w-[18px] h-[18px] bg-white rounded-full top-[2px] shadow-sm transition-all ${staff.keyholder ? 'left-[20px]' : 'left-[2px]'}`} />
                            </button>
                          </div>
                          <button onClick={() => removeStaff(staff.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 mb-2">
                          <span className="text-xs text-gray-400 mr-1">Shift lengths:</span>
                          {shiftLengths.map((len, li) => {
                            const active = staff.preferred_lengths?.includes(len)
                            const c = PALETTE[li % PALETTE.length]
                            return (
                              <button key={len} onClick={() => togglePrefLength(staff.id, len)} className="px-2 py-0.5 rounded text-[10px] font-bold border transition-all" style={{ background: active ? c.bg : '#F9FAFB', borderColor: active ? `${c.border}50` : '#E5E7EB', color: active ? c.text : '#9CA3AF' }}>
                                {len}h
                              </button>
                            )
                          })}
                        </div>

                        <StaffAvailabilityGrid weekDays={weekDays} templates={templates} shiftLengths={shiftLengths} preferredLengths={staff.preferred_lengths} availabilityGrid={staff.availability_grid} onChange={(grid) => updateStaff(staff.id, 'availability_grid', grid)} />
                      </div>
                    ))}
                  </div>

                  <button onClick={addStaff} className="mt-3 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:border-pink-400 hover:text-pink-600 transition-all">+ Add team member</button>
                  {staffEntries.length === 0 && <p className="text-xs text-gray-400 mt-3 text-center">You can skip this and add staff later in your workspace.</p>}
                </div>
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button onClick={() => setCurrentStep(prev => prev - 1)} disabled={currentStep === 1} className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium disabled:opacity-0 disabled:cursor-default transition-all">Back</button>
              {currentStep < STEP_LABELS.length ? (
                <button onClick={() => setCurrentStep(prev => prev + 1)} disabled={!canProceed()} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all">Continue</button>
              ) : (
                <button onClick={handleSubmit} disabled={saving} className="px-8 py-3 bg-gradient-to-r from-pink-500 to-pink-600 text-white font-semibold rounded-xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2">
                  {saving ? (<><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Setting up...</>) : 'Set up my workspace 🚀'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}