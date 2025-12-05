import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { authService } from '../../utils/auth'

const STATUS_COLORS = {
  Active: {
    bg: 'rgba(76, 118, 59, 0.2)',
    text: 'text-[#4C763B]',
  },
  Inactive: {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
  Pending: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
}

const APTITUDE_STATUS_COLORS = {
  Completed: {
    bg: 'rgba(76, 118, 59, 0.2)',
    text: 'text-[#4C763B]',
  },
  Pending: {
    bg: 'bg-amber-100',
    text: 'text-amber-700',
  },
}

const SELECTION_STATUS_COLORS = {
  Selected: {
    bg: 'rgba(76, 118, 59, 0.2)',
    text: 'text-[#4C763B]',
  },
  'Not Selected': {
    bg: 'bg-gray-100',
    text: 'text-gray-600',
  },
}

export default function InternsTable({ interns = [], isLoading = false, onEdit, onDelete, onView }) {
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 })
  const menuRefs = useRef({})
  
  // Check user role to determine if marks should be shown
  const userRole = authService.getUserRole()
  const isSuperAdmin = userRole === 'superadmin'
  const showMarks = isSuperAdmin // Only Super Admin can see marks

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (openMenuId) {
        const menuElement = document.querySelector(`[data-menu-id="${openMenuId}"]`)
        const buttonElement = menuRefs.current[openMenuId]
        
        if (buttonElement && !buttonElement.contains(event.target) && 
            menuElement && !menuElement.contains(event.target)) {
          setOpenMenuId(null)
        }
      }
    }
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openMenuId])

  const handleMenuToggle = (id, e) => {
    e.stopPropagation()
    e.preventDefault()
    if (openMenuId === id) {
      setOpenMenuId(null)
    } else {
      const buttonRect = e.currentTarget.getBoundingClientRect()
      setMenuPosition({
        top: buttonRect.bottom + 4,
        right: window.innerWidth - buttonRect.right
      })
      setOpenMenuId(id)
    }
  }

  const handleAction = (action, intern, e) => {
    e.stopPropagation()
    setOpenMenuId(null)
    if (action === 'edit' && onEdit) {
      onEdit(intern)
    } else if (action === 'delete' && onDelete) {
      onDelete(intern)
    } else if (action === 'view' && onView) {
      onView(intern)
    }
  }
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6">
        <div className="space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-12 sm:h-14 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!interns || interns.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
        <svg
          className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 20h5V8H2v12h5m10 0v-6h-4v6m4 0H7"
          />
        </svg>
        <h3 className="mt-3 sm:mt-4 text-base sm:text-lg lg:text-xl font-semibold text-gray-900">No interns found</h3>
        <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm lg:text-base text-gray-600">No interns have been registered yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Name
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Email
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Domain
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Status
              </th>
              {showMarks && (
                <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                  Aptitude Score
                </th>
              )}
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Aptitude Status
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Selection Status
              </th>
              <th className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-left text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">
                Registered Date
              </th>
              <th className="sticky right-0 bg-gray-50 px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 text-right text-[10px] sm:text-xs lg:text-sm font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap z-10">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {interns.map((intern) => (
              <tr
                key={intern.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900">
                    {intern.name}
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                    {intern.email}
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <div className="text-xs sm:text-sm lg:text-base text-gray-700">
                    {intern.domain}
                  </div>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${STATUS_COLORS[intern.status]?.text || 'text-gray-600'}`}
                    style={STATUS_COLORS[intern.status]?.bg ? { backgroundColor: STATUS_COLORS[intern.status].bg } : {}}
                  >
                    {intern.status}
                  </span>
                </td>
                {showMarks && (
                  <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                    <div className="text-xs sm:text-sm lg:text-base text-gray-700">
                      {intern.aptitudeScore !== null ? `${intern.aptitudeScore}` : 'N/A'}
                    </div>
                  </td>
                )}
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${APTITUDE_STATUS_COLORS[intern.aptitudeStatus]?.text || 'text-gray-600'}`}
                    style={APTITUDE_STATUS_COLORS[intern.aptitudeStatus]?.bg ? { backgroundColor: APTITUDE_STATUS_COLORS[intern.aptitudeStatus].bg } : {}}
                  >
                    {intern.aptitudeStatus}
                  </span>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold ${SELECTION_STATUS_COLORS[intern.selectionStatus]?.text || 'text-gray-600'}`}
                    style={SELECTION_STATUS_COLORS[intern.selectionStatus]?.bg ? { backgroundColor: SELECTION_STATUS_COLORS[intern.selectionStatus].bg } : {}}
                  >
                    {intern.selectionStatus}
                  </span>
                </td>
                <td className="px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap">
                  <div className="text-xs sm:text-sm lg:text-base text-gray-600">
                    {intern.registeredDate}
                  </div>
                </td>
                <td className="sticky right-0 bg-white px-3 sm:px-4 lg:px-6 py-3 sm:py-3.5 lg:py-4 whitespace-nowrap text-right z-10 hover:bg-gray-50">
                  <div className="relative" ref={(el) => (menuRefs.current[intern.id] = el)}>
                    <button
                      onClick={(e) => handleMenuToggle(intern.id, e)}
                      className={`p-1.5 sm:p-2 rounded-lg transition-colors relative ${
                        openMenuId === intern.id
                          ? 'text-[#4C763B] bg-[#4C763B]/10'
                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                      }`}
                      aria-label="Actions"
                    >
                      <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {/* Dropdown Menu - Rendered via Portal to escape stacking context */}
                    {openMenuId === intern.id && createPortal(
                      <div 
                        data-menu-id={intern.id}
                        className="fixed w-36 sm:w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
                        style={{ 
                          zIndex: 99999,
                          top: `${menuPosition.top}px`,
                          right: `${menuPosition.right}px`
                        }}
                      >
                        {/* <button
                          onClick={(e) => handleAction('view', intern, e)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 sm:gap-3 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          View
                        </button>
                        <button
                          onClick={(e) => handleAction('edit', intern, e)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 sm:gap-3 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Edit
                        </button> */}
                        <button
                          onClick={(e) => handleAction('delete', intern, e)}
                          className="w-full px-3 sm:px-4 py-2 sm:py-2.5 text-left text-xs sm:text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 sm:gap-3 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>,
                      document.body
                    )}
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

