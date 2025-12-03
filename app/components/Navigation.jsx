'use client'

import Link from 'next/link'
import { UserButton } from '@clerk/nextjs'
import { usePathname } from 'next/navigation'

export default function Navigation() {
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Shifts', path: '/dashboard/shifts' },
    { name: 'Staff', path: '/dashboard/staff' },
    { name: 'Rules', path: '/dashboard/rules' },
    { name: 'Rotas', path: '/dashboard/generate' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
            Shiftly<span className="text-pink-500">●</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const isActive = pathname === item.path
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-pink-50 text-pink-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>

          {/* User Button */}
          <UserButton 
            appearance={{
              elements: {
                avatarBox: 'bg-pink-100'
              }
            }}
          />
        </div>
      </div>
    </nav>
  )
}