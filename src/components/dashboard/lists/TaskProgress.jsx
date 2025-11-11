import React from 'react'

const COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500']

const Avatar = ({ initials, index }) => (
  <span
    className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold text-white ${COLORS[index % COLORS.length]}`}
  >
    {initials}
  </span>
)

export default function TaskProgress({ items }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm h-full">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Execution</p>
        <h3 className="text-lg font-semibold text-gray-900 mt-1">Team Priorities</h3>
      </header>

      <div className="space-y-5">
        {items.map((task, index) => (
          <div key={task.id} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">{task.label}</p>
              <span className="text-xs font-semibold text-gray-500">{task.progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${task.progress}%` }} />
            </div>
            <div className="flex -space-x-2">
              {task.owners.map((initials, ownerIndex) => (
                <Avatar key={initials} initials={initials} index={index + ownerIndex} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

