import React from 'react'

export default function DashboardHeader({ user }) {
  const displayName = user?.name || user?.email || 'Revenue Team'
  const today = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Revenue Command Center</p>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">Welcome back, {displayName.split('@')[0]}</h1>
        <p className="text-sm text-gray-500 mt-2">Today is {today}. Here&apos;s how your pipeline is performing.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3 border border-gray-200 rounded-full px-4 py-2 bg-white">
          <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 5a6 6 0 110 12 6 6 0 010-12z" />
          </svg>
          <input
            type="search"
            placeholder="Search accounts, deals or people"
            className="bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none w-full"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-600 transition"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Deal
        </button>
      </div>
    </header>
  )
}

