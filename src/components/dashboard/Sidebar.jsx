import React, { useState } from 'react'

export default function Sidebar({ user }) {
  const [openSections, setOpenSections] = useState({
    questionPapers: true,
    internsList: false,
  })
  const [activeItem, setActiveItem] = useState('dashboard')

  const toggleSection = (section) => {
    setOpenSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const closeAllSections = () =>
    setOpenSections({
      questionPapers: false,
      internsList: false,
    })

  const handleNavClick = (itemId, { closeSections = true } = {}) => {
    setActiveItem(itemId)
    if (closeSections) {
      closeAllSections()
    }
  }

  const navItemClasses = (id) =>
    [
      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150',
      activeItem === id
        ? 'bg-emerald-100 text-emerald-700'
        : 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700',
    ].join(' ')

  return (
    <aside className="w-64 bg-white flex flex-col border-r border-gray-200">
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">
            <span className="text-emerald-500">Scholar</span>Flex
          </h2>
          <nav className="space-y-6 text-sm">
            <ul className="space-y-2">
              <li>
                <a
                  href="#"
                  onClick={() => handleNavClick('dashboard')}
                  className={navItemClasses('dashboard')}
                  aria-current={activeItem === 'dashboard' ? 'page' : undefined}
                >
                  <svg className="h-5 w-5 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Dashboard
                </a>
              </li>
            </ul>

            <div className="space-y-5">
              {/* Question Papers Group */}
              <div>
              <button
                type="button"
                onClick={() => toggleSection('questionPapers')}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none ${
                  openSections.questionPapers ? 'text-emerald-600' : 'text-gray-500 hover:text-emerald-600'
                }`}
                aria-expanded={openSections.questionPapers}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6h6v6m2 4H7a2 2 0 01-2-2V7a2 2 0 012-2h10a2 2 0 012 2v12a2 2 0 01-2 2z" />
                  </svg>
                  Question Papers
                </span>
                <svg
                  className={`h-4 w-4 flex-shrink-0 text-emerald-500 transition-transform ${openSections.questionPapers ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {openSections.questionPapers && (
                <ul className="mt-3 space-y-2 pl-6">
                  <li>
                    <a
                      href="#"
                      onClick={() => handleNavClick('question-add', { closeSections: false })}
                      className={navItemClasses('question-add')}
                    >
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Paper
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={() => handleNavClick('question-view', { closeSections: false })}
                      className={navItemClasses('question-view')}
                    >
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      View All PaperSet
                    </a>
                  </li>
                </ul>
              )}
              </div>
              {/* Interns List Group */}
              <div>
              <button
                type="button"
                onClick={() => toggleSection('internsList')}
                className={`flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide transition focus-visible:outline-none ${
                  openSections.internsList ? 'text-emerald-600' : 'text-gray-500 hover:text-emerald-600'
                }`}
                aria-expanded={openSections.internsList}
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5V8H2v12h5m10 0v-6h-4v6m4 0H7" />
                  </svg>
                  Interns List
                </span>
                <svg
                  className={`h-4 w-4 flex-shrink-0 text-emerald-500 transition-transform ${openSections.internsList ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              {openSections.internsList && (
                <ul className="mt-3 space-y-2 pl-6">
                  <li>
                    <a
                      href="#"
                      onClick={() => handleNavClick('intern-add', { closeSections: false })}
                      className={navItemClasses('intern-add')}
                    >
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Intern
                    </a>
                  </li>
                  <li>
                    <a
                      href="#"
                      onClick={() => handleNavClick('intern-view', { closeSections: false })}
                      className={navItemClasses('intern-view')}
                    >
                      <svg className="h-4 w-4 flex-shrink-0 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      View All
                    </a>
                  </li>
                </ul>
              )}
              </div>
            </div>
          </nav>
        </div>
      </div>
    </aside>
  )
}


