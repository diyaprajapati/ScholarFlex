import React from 'react'

const STAGE_LABELS = {
  Prospect: 'Prospect',
  Qualified: 'Qualified',
  Proposal: 'Proposal',
  Negotiation: 'Negotiation',
  'Closed Won': 'Closed Won',
}

export default function PipelineFunnelChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0)

  return (
    <div className="bg-gradient-to-br from-white via-sky-50/40 to-indigo-50 border border-sky-100 rounded-xl sm:rounded-2xl lg:rounded-3xl p-4 sm:p-5 lg:p-6 shadow-sm h-full">
      <header className="mb-4 sm:mb-5 lg:mb-6">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-sky-600">Pipeline Health</p>
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mt-0.5 sm:mt-1">Conversion Funnel</h3>
        <p className="text-xs sm:text-sm text-sky-600/80 mt-1.5 sm:mt-2">
          {total} deals in motion · Avg. conversion {Math.round((data[data.length - 1].value / data[0].value) * 100)}%
        </p>
      </header>

      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        {data.map((item) => (
          <div key={item.stage} className="p-2.5 sm:p-3 lg:p-4 rounded-xl sm:rounded-2xl bg-white/60 backdrop-blur-sm border border-white/50 shadow-sm">
            <div className="flex items-center justify-between text-[10px] sm:text-xs font-semibold text-slate-600 mb-1.5 sm:mb-2">
              <span>{STAGE_LABELS[item.stage]}</span>
              <span>{item.value}</span>
            </div>
            <div className="h-2.5 sm:h-3 lg:h-3.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`${item.color} h-full`}
                style={{ width: `${Math.round((item.value / data[0].value) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

