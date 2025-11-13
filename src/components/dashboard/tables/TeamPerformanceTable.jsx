import React from 'react'

const STATUS_BADGES = {
  'on-track': 'text-[#4C763B]',
  'at-risk': 'bg-amber-50 text-amber-600',
  exceeding: 'text-[#4C763B]',
}

export default function TeamPerformanceTable({ rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm">
      <header className="flex items-center justify-between mb-4 sm:mb-5 lg:mb-6">
        <div>
          <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Team Performance</p>
          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mt-0.5 sm:mt-1">Pipeline Leaders</h3>
        </div>
        <button
          type="button"
          className="text-xs sm:text-sm font-semibold text-[#4C763B] hover:text-[#043915] transition"
        >
          View team
        </button>
      </header>

      <div className="overflow-x-auto -mx-4 sm:-mx-5 lg:-mx-6 px-4 sm:px-5 lg:px-6">
        <table className="min-w-full text-left">
          <thead className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Representative</th>
              <th className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Deals</th>
              <th className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Revenue</th>
              <th className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">Quota</th>
              <th className="py-2 sm:py-2.5 lg:py-3 font-semibold text-right whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="text-xs sm:text-sm text-gray-700">
            {rows.map((rep) => (
              <tr key={rep.id} className="border-t border-gray-100">
                <td className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4">
                  <div>
                    <p className="font-semibold text-gray-900">{rep.name}</p>
                    <p className="text-[10px] sm:text-xs text-gray-500 mt-0.5">{rep.role}</p>
                  </div>
                </td>
                <td className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">{rep.deals}</td>
                <td className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4 font-semibold whitespace-nowrap">{rep.revenue}</td>
                <td className="py-2 sm:py-2.5 lg:py-3 pr-3 sm:pr-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex-1 h-1 sm:h-1.5 rounded-full bg-gray-100 overflow-hidden min-w-[60px]">
                      <div className="h-full" style={{ width: `${rep.quota}%`, backgroundColor: '#4C763B' }} />
                    </div>
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-600 whitespace-nowrap">{rep.quota}%</span>
                  </div>
                </td>
                <td className="py-2 sm:py-2.5 lg:py-3 text-right">
                  <span
                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${STATUS_BADGES[rep.status]}`}
                    style={rep.status === 'on-track' || rep.status === 'exceeding' ? { backgroundColor: 'rgba(76, 118, 59, 0.2)' } : {}}
                  >
                    {rep.status === 'on-track' && 'On Track'}
                    {rep.status === 'at-risk' && 'At Risk'}
                    {rep.status === 'exceeding' && 'Exceeding'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

