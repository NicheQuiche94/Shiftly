'use client'

export default function PillTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="flex gap-2">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            activeTab === tab.id
              ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
              : 'text-gray-500 hover:text-gray-700 hover:bg-white/60'
          }`}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
                tab.badgeColor === 'amber'
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-white'
              }`}
              style={tab.badgeColor !== 'amber' ? { backgroundColor: '#FF1F7D' } : {}}
            >
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}