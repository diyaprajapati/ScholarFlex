import React from 'react'

const ChartGrid = () => (
  <g className="text-emerald-100" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4">
    {[20, 40, 60, 80].map((y) => (
      <line key={y} x1="0" y1={y} x2="100%" y2={y} />
    ))}
  </g>
)

const buildPolyline = (data, key, height) => {
  const maxValue = Math.max(...data.map((d) => d[key]))
  return data
    .map((point, index) => {
      const x = (index / (data.length - 1)) * 100
      const y = height - (point[key] / maxValue) * height
      return `${x},${y}`
    })
    .join(' ')
}

export default function RevenueTrendChart({ data }) {
  const height = 100
  const linePoints = buildPolyline(data, 'revenue', height)
  const targetPoints = buildPolyline(data, 'target', height)

  return (
    <div className="bg-gradient-to-br from-white via-emerald-50/30 to-sky-50 border border-emerald-100 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm">
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-600">Revenue Performance</p>
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mt-0.5 sm:mt-1">ARR Growth</h3>
          <p className="text-xs sm:text-sm text-emerald-600/70 mt-0.5 sm:mt-1">Comparing actual revenue vs quarterly target</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-semibold text-emerald-700 flex-shrink-0">
          <span className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.15)] sm:shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
            Actual
          </span>
          <span className="flex items-center gap-1.5 sm:gap-2">
            <span className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full bg-sky-300 shadow-[0_0_0_3px_rgba(125,211,252,0.25)] sm:shadow-[0_0_0_4px_rgba(125,211,252,0.25)]" />
            Target
          </span>
        </div>
      </header>

      <div className="mt-4 sm:mt-5 lg:mt-6 h-48 sm:h-56 lg:h-64">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="revenue-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(16,185,129,0.45)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0.05)" />
            </linearGradient>
            <linearGradient id="target-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(56,189,248,0.35)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.05)" />
            </linearGradient>
          </defs>
          <ChartGrid />
          <polygon
            points={`${targetPoints} 100,100 0,100`}
            fill="url(#target-fill)"
            opacity="0.7"
          />
          <polyline
            points={targetPoints}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeDasharray="6 4"
          />
          <polygon
            points={`${linePoints} 100,100 0,100`}
            fill="url(#revenue-fill)"
          />
          <polyline
            points={linePoints}
            fill="none"
            stroke="#0ea5e9"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * 100
            const y = height - (point.revenue / Math.max(...data.map((d) => d.revenue))) * height
            return (
              <circle
                key={point.month}
                cx={x}
                cy={y}
                r="1.6"
                fill="#0ea5e9"
                stroke="#fff"
                strokeWidth="0.6"
              />
            )
          })}
        </svg>
        <div className="mt-4 flex items-center justify-between text-xs font-semibold text-emerald-700/80">
          {data.map((item) => (
            <span key={item.month}>{item.month}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
