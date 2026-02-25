'use client'

import { useState, useRef, useEffect } from 'react'

export default function TemplateTabs({ templates, activeTemplate, onSelect, onAdd, onDuplicate }) {
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const templateNames = Object.keys(templates)

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {templateNames.map(name => (
        <button
          key={name}
          onClick={() => onSelect(name)}
          className={`px-4 py-2 rounded-lg border text-xs font-semibold transition-all ${
            activeTemplate === name
              ? 'border-pink-500 bg-pink-50 text-pink-600'
              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          {name}
        </button>
      ))}

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
        >
          + New template
          <svg className={`w-3 h-3 transition-transform ${showMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl border border-gray-200 shadow-lg z-10 overflow-hidden">
            <button
              onClick={() => {
                const name = prompt('Template name:')
                if (name && !templates[name]) { onAdd(name); setShowMenu(false) }
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="text-sm font-semibold text-gray-900">Start fresh</div>
              <div className="text-xs text-gray-500">Empty template with no shifts</div>
            </button>

            {templateNames.length > 0 && (
              <div className="px-3 py-2">
                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Duplicate from</div>
                {templateNames.map(name => (
                  <button
                    key={name}
                    onClick={() => {
                      const newName = prompt('Name for the copy:', `${name} Copy`)
                      if (newName && !templates[newName]) { onDuplicate(name, newName); setShowMenu(false) }
                    }}
                    className="w-full px-2 py-2 text-left rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 font-medium">{name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}