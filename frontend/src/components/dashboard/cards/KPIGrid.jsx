import React from 'react'

const TREND_STYLES = {
  up: 'text-[#4C763B]',
  down: 'text-rose-600 bg-rose-50',
}

export default function KPIGrid({ items, onCardClick, selectedCard }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
      {items.map((card) => {
        const isSelected = selectedCard === card.id
        return (
          <button
            key={card.id}
            onClick={() => onCardClick?.(card.id)}
            className={`bg-white border rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm text-left hover:shadow-md transition-all duration-200 cursor-pointer group ${
              isSelected
                ? 'border-[#4C763B] border-2 shadow-md'
                : 'border-gray-200 hover:border-[#4C763B]'
            }`}
          >
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">{card.label}</p>
          <div className="mt-2 sm:mt-3 flex items-center justify-between">
            <span className="text-xl sm:text-2xl lg:text-3xl font-semibold text-gray-900 group-hover:text-[#4C763B] transition-colors">{card.value}</span>
            <span 
              className={`px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${TREND_STYLES[card.trend]}`}
              style={card.trend === 'up' ? { backgroundColor: 'rgba(76, 118, 59, 0.2)' } : {}}
            >
              {card.change}
            </span>
          </div>
          <div className="mt-3 sm:mt-4 h-1.5 sm:h-2 w-full rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full"
              style={{ 
                width: card.trend === 'down' ? '45%' : '72%',
                backgroundColor: '#4C763B'
              }}
            />
          </div>
        </button>
        )
      })}
    </div>
  )
}

