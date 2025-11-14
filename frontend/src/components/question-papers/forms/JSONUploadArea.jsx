import React, { useRef, useState } from 'react'

export default function JSONUploadArea({ onFileUpload, onBack, onDownloadTemplate }) {
  const fileInputRef = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const handleFile = (file) => {
    if (!file) return

    // Validate file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setUploadError('Please upload a valid JSON file')
      return
    }

    setUploadError('')
    onFileUpload(file)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file)
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors"
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Options
      </button>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-lg sm:rounded-xl p-4 sm:p-5 lg:p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragging
            ? 'border-[#4C763B] bg-[#4C763B]/5'
            : 'border-gray-300 hover:border-[#4C763B] hover:bg-gray-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileSelect}
          className="hidden"
          aria-label="Upload JSON file"
        />

        <div className="space-y-3 sm:space-y-4">
          {/* Upload Icon */}
          <div className="flex justify-center">
            <div className={`w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-colors ${
              isDragging ? 'bg-[#4C763B]/20' : 'bg-[#4C763B]/10'
            }`}>
              <svg className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-1 sm:space-y-1.5">
            <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">
              {isDragging ? 'Drop your JSON file here' : 'Upload JSON File'}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600">
              Drag and drop your JSON file here, or click to browse
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 pt-2 sm:pt-3">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                handleClick()
              }}
              className="w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#4C763B' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Select from Computer
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDownloadTemplate()
              }}
              className="w-full sm:w-auto px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Template
            </button>
          </div>

          {/* Supported Formats */}
          <div className="pt-2 sm:pt-3 border-t border-gray-200">
            <p className="text-[10px] sm:text-xs text-gray-500">
              Supported format: JSON (.json) • Maximum file size: 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {uploadError && (
        <div className="p-2.5 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-xs sm:text-sm text-red-600 flex items-center gap-1.5 sm:gap-2">
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {uploadError}
          </p>
        </div>
      )}
    </div>
  )
}

