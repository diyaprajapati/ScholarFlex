import React from 'react'

const TREND_STYLES = {
  up: 'text-emerald-600 bg-emerald-50',
  down: 'text-rose-600 bg-rose-50',
}

export default function KPIGrid({ items }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {items.map((card) => (
        <div key={card.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-2xl font-semibold text-gray-900">{card.value}</span>
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${TREND_STYLES[card.trend]}`}>
              {card.change}
            </span>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full bg-emerald-500"
              style={{ width: card.trend === 'down' ? '45%' : '72%' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

