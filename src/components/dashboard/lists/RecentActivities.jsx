import React from 'react'

const TYPE_STYLES = {
  call: 'bg-emerald-50 text-emerald-600',
  proposal: 'bg-sky-50 text-sky-600',
  meeting: 'bg-violet-50 text-violet-600',
  note: 'bg-amber-50 text-amber-600',
}

export default function RecentActivities({ items }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Timeline</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-1">Recent Activities</h3>
      </header>

      <div className="space-y-5">
        {items.map((activity) => (
          <div key={activity.id} className="flex items-start gap-4">
            <span className={`mt-1 flex h-9 w-9 items-center justify-center rounded-full ${TYPE_STYLES[activity.type]}`}>
              {activity.type === 'call' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.05 5A5 5 0 0119 8.95m-3.95-7A9 9 0 0123 8.95M13 16v-2a2 2 0 012-2h0a2 2 0 012 2v2m-5 0h6m-3 3a3 3 0 100-6 3 3 0 000 6z"
                  />
                </svg>
              )}
              {activity.type === 'proposal' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                </svg>
              )}
              {activity.type === 'meeting' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 4h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" />
                </svg>
              )}
              {activity.type === 'note' && (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h10M7 16h6M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H7.5A2.5 2.5 0 005 6.5V20z" />
                </svg>
              )}
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
              <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
            </div>
            <span className="text-xs font-semibold text-gray-500">{activity.owner}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

