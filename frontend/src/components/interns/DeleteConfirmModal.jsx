import React from 'react'

export default function DeleteConfirmModal({ isOpen, intern, onConfirm, onCancel, isDeleting = false }) {
  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onCancel()
    }
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-xl sm:rounded-2xl shadow-xl max-w-md w-full mx-2 sm:mx-4 p-4 sm:p-5 lg:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Delete Intern</h3>
            <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">This action cannot be undone.</p>
          </div>
        </div>
        <div className="mb-4 sm:mb-5 lg:mb-6">
          <p className="text-xs sm:text-sm lg:text-base text-gray-700">
            Are you sure you want to delete <span className="font-semibold text-gray-900">"{intern?.name}"</span>? This will permanently remove the intern and all associated data.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="flex-1 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

