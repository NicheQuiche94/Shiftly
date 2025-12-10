'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'

export default function Navigation() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Prevent scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [mobileMenuOpen])

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      name: 'Workspace', 
      path: '/dashboard/workspace',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    },
    { 
      name: 'Rota Builder', 
      path: '/dashboard/generate',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    { 
      name: 'Payroll', 
      path: '/dashboard/payroll',
      locked: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ]

  const isActive = (path) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
  }

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-gradient-to-r from-pink-500 to-pink-600 flex items-center justify-between px-4 z-50">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-pink-600 font-bold text-base">S</span>
          </div>
          <span className="text-white font-bold text-lg">Shiftly</span>
        </Link>
        
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="w-10 h-10 flex items-center justify-center text-white"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <div className={`lg:hidden fixed top-16 left-0 bottom-0 w-72 bg-gradient-to-b from-pink-500 to-pink-600 z-50 transform transition-transform duration-300 ease-in-out ${
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Nav Items */}
        <div className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-4 py-3.5 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-white text-pink-600 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.locked && (
                  <svg className={`w-4 h-4 ${isActive(item.path) ? 'text-pink-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/20">
          <div className="flex items-center space-x-3 px-2">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">Account</p>
              <p className="text-white/60 text-xs truncate">Settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sidebar - Hidden on mobile */}
      <nav className="hidden lg:flex fixed left-0 top-0 bottom-0 w-52 bg-gradient-to-b from-pink-500 to-pink-600 flex-col z-50 rounded-r-[2rem]">
        {/* Logo */}
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-pink-600 font-bold text-lg">S</span>
            </div>
            <span className="text-white font-bold text-xl">Shiftly</span>
          </Link>
        </div>

        {/* Nav Items */}
        <div className="flex-1 px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  isActive(item.path)
                    ? 'bg-white text-pink-600 shadow-lg'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {item.icon}
                  <span className="font-medium text-sm">{item.name}</span>
                </div>
                {item.locked && (
                  <svg className={`w-4 h-4 ${isActive(item.path) ? 'text-pink-400' : 'text-white/50'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* User Section */}
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center space-x-3 px-2">
            <UserButton 
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  avatarBox: "w-9 h-9"
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm truncate">Account</p>
              <p className="text-white/60 text-xs truncate">Settings</p>
            </div>
          </div>
        </div>
      </nav>
    </>
  )
}