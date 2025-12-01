import React, { useRef, useState } from 'react'

const SECTIONS = [
  { name: 'Technical', value: 'Technical', label: 'Technical Section' },
  { name: 'Coding', value: 'Coding', label: 'Coding Section' },
  { name: 'Theory', value: 'Theory', label: 'Theory Section' },
  { name: 'Maths & Logical Reasoning', value: 'Maths & Logical Reasoning', label: 'Maths & Logical Reasoning Section' },
]

export default function JSONUploadArea({ onFileUpload, onBack, onDownloadTemplate, onDownloadSectionTemplate, onContinueToForm, uploadedFiles: uploadedFilesProp }) {
  const fileInputRefs = {
    Technical: useRef(null),
    Coding: useRef(null),
    Theory: useRef(null),
    'Maths & Logical Reasoning': useRef(null),
  }
  const [isDragging, setIsDragging] = useState({})
  const [uploadErrors, setUploadErrors] = useState({})
  const [localUploadedFiles, setLocalUploadedFiles] = useState({})
  
  // Use prop if provided, otherwise use local state
  const uploadedFiles = uploadedFilesProp !== undefined ? uploadedFilesProp : localUploadedFiles

  const handleFile = (file, section) => {
    if (!file) return

    // Validate file type
    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setUploadErrors(prev => ({ ...prev, [section]: 'Please upload a valid JSON file' }))
      return
    }

    setUploadErrors(prev => ({ ...prev, [section]: '' }))
    // Only update local state if prop is not provided
    if (uploadedFilesProp === undefined) {
      setLocalUploadedFiles(prev => ({ ...prev, [section]: file.name }))
    }
    onFileUpload(file, section)
  }

  const handleDragOver = (e, section) => {
    e.preventDefault()
    setIsDragging(prev => ({ ...prev, [section]: true }))
  }

  const handleDragLeave = (e, section) => {
    e.preventDefault()
    setIsDragging(prev => ({ ...prev, [section]: false }))
  }

  const handleDrop = (e, section) => {
    e.preventDefault()
    setIsDragging(prev => ({ ...prev, [section]: false }))
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file, section)
    }
  }

  const handleFileSelect = (e, section) => {
    const file = e.target.files[0]
    if (file) {
      handleFile(file, section)
    }
    // Reset input
    if (fileInputRefs[section].current) {
      fileInputRefs[section].current.value = ''
    }
  }

  const handleClick = (section) => {
    fileInputRefs[section].current?.click()
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

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
        <h3 className="text-sm sm:text-base font-semibold text-blue-900 mb-2">Upload Instructions</h3>
        <p className="text-xs sm:text-sm text-blue-800">
          Upload 4 separate JSON files - one for each section. Each file should contain questions for that specific section.
        </p>
      </div>

      {/* Section Upload Areas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {SECTIONS.map((section) => (
          <div key={section.value} className="space-y-2">
            <h4 className="text-xs sm:text-sm font-semibold text-gray-900">{section.label}</h4>
            <div
              onDragOver={(e) => handleDragOver(e, section.value)}
              onDragLeave={(e) => handleDragLeave(e, section.value)}
              onDrop={(e) => handleDrop(e, section.value)}
              onClick={() => handleClick(section.value)}
              className={`relative border-2 border-dashed rounded-lg p-3 sm:p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragging[section.value]
                  ? 'border-[#4C763B] bg-[#4C763B]/5'
                  : uploadedFiles[section.value]
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-300 hover:border-[#4C763B] hover:bg-gray-50'
              }`}
            >
              <input
                ref={fileInputRefs[section.value]}
                type="file"
                accept=".json,application/json"
                onChange={(e) => handleFileSelect(e, section.value)}
                className="hidden"
                aria-label={`Upload ${section.label} JSON file`}
              />

              <div className="space-y-2">
                {/* Upload Icon */}
                <div className="flex justify-center">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-colors ${
                    isDragging[section.value] ? 'bg-[#4C763B]/20' : uploadedFiles[section.value] ? 'bg-green-200' : 'bg-[#4C763B]/10'
                  }`}>
                    {uploadedFiles[section.value] ? (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 sm:h-5 sm:w-5 text-[#4C763B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* Text Content */}
                <div className="space-y-1">
                  {uploadedFiles[section.value] ? (
                    <>
                      <p className="text-xs sm:text-sm font-medium text-green-700">
                        {uploadedFiles[section.value]}
                      </p>
                      <p className="text-[10px] sm:text-xs text-green-600">
                        Click to change file
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs sm:text-sm font-medium text-gray-700">
                        {isDragging[section.value] ? 'Drop file here' : 'Click to upload'}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500">
                        JSON file for {section.label}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message for this section */}
            {uploadErrors[section.value] && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-[10px] sm:text-xs text-red-600 flex items-center gap-1">
                  <svg className="h-3 w-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {uploadErrors[section.value]}
                </p>
              </div>
            )}

            {/* Download Template Button for this section */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                if (onDownloadSectionTemplate) {
                  onDownloadSectionTemplate(section.value)
                }
              }}
              className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-[#4C763B] border border-[#4C763B] rounded-lg hover:bg-[#4C763B]/10 transition-colors flex items-center justify-center gap-1"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download {section.label} Template
            </button>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={onDownloadTemplate}
          className="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors"
          style={{ backgroundColor: '#4C763B' }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
        >
          <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Download All 4 Templates
        </button>
        
        {onContinueToForm && Object.keys(uploadedFiles).some(key => uploadedFiles[key]) && (
          <button
            type="button"
            onClick={onContinueToForm}
            className="px-3 sm:px-4 lg:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#4C763B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline-block mr-1.5 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Continue to Form
          </button>
        )}
      </div>
    </div>
  )
}

