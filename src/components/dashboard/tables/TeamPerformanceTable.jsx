import React from 'react'

const STATUS_BADGES = {
  'on-track': 'bg-emerald-50 text-emerald-600',
  'at-risk': 'bg-amber-50 text-amber-600',
  exceeding: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
}

export default function TeamPerformanceTable({ rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <header className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Team Performance</p>
          <h3 className="text-lg font-semibold text-gray-900 mt-1">Pipeline Leaders</h3>
        </div>
        <button
          type="button"
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition"
        >
          View team
        </button>
      </header>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="py-3 pr-4 font-semibold">Representative</th>
              <th className="py-3 pr-4 font-semibold">Deals</th>
              <th className="py-3 pr-4 font-semibold">Revenue</th>
              <th className="py-3 pr-4 font-semibold">Quota</th>
              <th className="py-3 font-semibold text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {rows.map((rep) => (
              <tr key={rep.id} className="border-t border-gray-100">
                <td className="py-3 pr-4">
                  <div>
                    <p className="font-semibold text-gray-900">{rep.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{rep.role}</p>
                  </div>
                </td>
                <td className="py-3 pr-4 font-semibold">{rep.deals}</td>
                <td className="py-3 pr-4 font-semibold">{rep.revenue}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${rep.quota}%` }} />
                    </div>
                    <span className="font-semibold">{rep.quota}%</span>
                  </div>
                </td>
                <td className="py-3">
                  <div className="flex justify-end">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_BADGES[rep.status]}`}>
                      {rep.status.replace('-', ' ')}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

