import React from 'react'

export default function PieChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)
  let currentAngle = -90 // Start from top

  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle

    // Calculate path for pie slice
    const largeArcFlag = angle > 180 ? 1 : 0
    const x1 = 100 + 80 * Math.cos((startAngle * Math.PI) / 180)
    const y1 = 100 + 80 * Math.sin((startAngle * Math.PI) / 180)
    const x2 = 100 + 80 * Math.cos((endAngle * Math.PI) / 180)
    const y2 = 100 + 80 * Math.sin((endAngle * Math.PI) / 180)

    return {
      ...item,
      percentage: percentage.toFixed(1),
      path: `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`,
      startAngle,
      endAngle,
    }
  })

  return (
    <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-10">
      {/* Pie Chart SVG */}
      <div className="flex-shrink-0">
        <svg viewBox="0 0 200 200" className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 xl:w-72 xl:h-72">
          {segments.map((segment, index) => (
            <path
              key={index}
              d={segment.path}
              fill={segment.color}
              stroke="white"
              strokeWidth="2"
              className="transition-opacity hover:opacity-80"
            />
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex-1 w-full lg:w-auto space-y-2 sm:space-y-3">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div
                className="w-3 h-3 sm:w-4 sm:h-4 rounded-full flex-shrink-0"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 truncate">{segment.label}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <span className="text-xs sm:text-sm lg:text-base text-gray-600">{segment.value}</span>
              <span className="text-[10px] sm:text-xs text-gray-500 w-10 sm:w-12 text-right">({segment.percentage}%)</span>
            </div>
          </div>
        ))}
        <div className="pt-2 sm:pt-3 border-t border-gray-200 mt-2 sm:mt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900">Total</span>
            <span className="text-xs sm:text-sm lg:text-base font-semibold text-[#4C763B]">{total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

