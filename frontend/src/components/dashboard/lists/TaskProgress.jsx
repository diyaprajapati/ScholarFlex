import React from 'react'

const COLORS = ['bg-emerald-500', 'bg-sky-500', 'bg-violet-500']

const Avatar = ({ initials, index }) => (
  <span
    className={`h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold text-white ${COLORS[index % COLORS.length]}`}
  >
    {initials}
  </span>
)

export default function TaskProgress({ items }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-sm h-full">
      <header className="mb-4 sm:mb-5 lg:mb-6">
        <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-gray-500">Execution</p>
        <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mt-0.5 sm:mt-1">Team Priorities</h3>
      </header>

      <div className="space-y-3 sm:space-y-4 lg:space-y-5">
        {items.map((task, index) => (
          <div key={task.id} className="space-y-2 sm:space-y-2.5 lg:space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs sm:text-sm lg:text-base font-semibold text-gray-900 truncate flex-1 pr-2">{task.label}</p>
              <span className="text-[10px] sm:text-xs font-semibold text-gray-500 flex-shrink-0">{task.progress}%</span>
            </div>
            <div className="h-1.5 sm:h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-full bg-emerald-500" style={{ width: `${task.progress}%` }} />
            </div>
            <div className="flex -space-x-1.5 sm:-space-x-2">
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

