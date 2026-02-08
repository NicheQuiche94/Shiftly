// app/contexts/LocaleContext.js
'use client'

import { createContext, useContext, useEffect, useState } from 'react'

const LocaleContext = createContext(null)

export function LocaleProvider({ children, teamId }) {
  const [locale, setLocale] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (teamId) {
      loadLocale(teamId)
    }
  }, [teamId])

  const loadLocale = async (teamId) => {
    try {
      const res = await fetch(`/api/locales/${teamId}`)
      if (res.ok) {
        const data = await res.json()
        setLocale(data)
      }
    } catch (error) {
      console.error('Failed to load locale:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <LocaleContext.Provider value={{ locale, loading }}>
      {children}
    </LocaleContext.Provider>
  )
}

export const useLocale = () => {
  const context = useContext(LocaleContext)
  if (!context) throw new Error('useLocale must be used within LocaleProvider')
  return context
}