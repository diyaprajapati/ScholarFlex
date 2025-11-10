import React from 'react'

export default function Sidebar({ user, onLogout }) {
  return (
    <aside className="w-64 bg-white shadow-lg flex flex-col border-r border-gray-200">
      <div className="p-6 flex-1">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          <span className="text-emerald-500">Scholar</span>Flex
        </h2>
        <nav>
          <ul className="space-y-2">
            <li>
              <a
                href="#"
                className="flex items-center px-4 py-3 text-gray-700 bg-emerald-50 rounded-lg font-medium hover:bg-emerald-100 transition border-l-4 border-emerald-500"
              >
                <svg className="w-5 h-5 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </a>
            </li>

            {/* Question Papers Group */}
            <li className="mt-4 px-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Question Papers</p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <svg className="w-4 h-4 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Paper
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <svg className="w-4 h-4 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    View All PaperSet
                  </a>
                </li>
              </ul>
            </li>

            {/* Interns List Group */}
            <li className="mt-4 px-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Interns List</p>
              <ul className="space-y-2">
                <li>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <svg className="w-4 h-4 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Intern
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="flex items-center px-3 py-2 text-gray-700 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition"
                  >
                    <svg className="w-4 h-4 mr-3 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    View All
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </nav>
      </div>
      <div className="p-6 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 transition"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </aside>
  )
}


