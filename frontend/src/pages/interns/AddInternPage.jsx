import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import ChoiceScreen from '../../components/common/ChoiceScreen'
import CopyFormLink from '../../components/interns/forms/CopyFormLink'
import InternForm from '../../components/interns/forms/InternForm'
import { api } from '../../services/api'

export default function AddInternPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('edit')
  const isEditMode = !!editId
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(isEditMode ? 'edit' : null) // null, 'spreadsheet', 'form-link', or 'edit'
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [internData, setInternData] = useState(null)
  const [isLoadingIntern, setIsLoadingIntern] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)

    // If edit mode, fetch intern data
    if (isEditMode && editId) {
      fetchInternData(editId)
    }
  }, [navigate, isEditMode, editId])


  const handleSelectSpreadsheet = () => {
    setMode('spreadsheet')
    setUploadResult(null)
  }

  const handleSelectFormLink = () => {
    setMode('form-link')
  }

  const fetchInternData = async (internId) => {
    try {
      setIsLoadingIntern(true)
      const response = await api.interns.getById(internId)
      if (response.success) {
        setInternData(response.data)
      }
    } catch (error) {
      console.error('Error fetching intern:', error)
      alert('Failed to load intern data. Please try again.')
      navigate(ROUTES.INTERNS.VIEW)
    } finally {
      setIsLoadingIntern(false)
    }
  }

  const handleBackToChoice = () => {
    if (isEditMode) {
      navigate(ROUTES.INTERNS.VIEW)
    } else {
      setMode(null)
    }
  }

  const handleFormSubmit = async (formData) => {
    try {
      setIsUploading(true)
      
      // Map form data to API format
      const updateData = {
        full_name: formData.name,
        email: formData.email,
        domain_name: formData.domain, // Backend will resolve to domain_id
        status_name: formData.status, // Backend will resolve to status_id
      }
      
      const response = await api.interns.update(editId, updateData)
      
      if (response.success) {
        alert('Intern updated successfully!')
        navigate(ROUTES.INTERNS.VIEW)
      }
    } catch (error) {
      console.error('Update error:', error)
      alert(error.message || 'Failed to update intern. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  const handleSpreadsheetUpload = async (file) => {
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ]
    
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload Excel (.xlsx, .xls) or CSV file.')
      return
    }

    try {
      setIsUploading(true)
      setUploadResult(null)
      
      const response = await api.interns.uploadSpreadsheet(file)
      
      if (response.success) {
        setUploadResult({
          success: true,
          message: response.message,
          data: response.data,
        })
        
        // Show success message
        setTimeout(() => {
          // Navigate back to list after showing results
          navigate(ROUTES.INTERNS.VIEW)
        }, 3000)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({
        success: false,
        message: error.message || 'Failed to upload spreadsheet. Please try again.',
      })
    } finally {
      setIsUploading(false)
    }
  }


  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 ml-64 overflow-y-auto pt-16">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
          {!mode ? (
            // Choice Screen
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
              <div className="mb-3 sm:mb-4">
                <button
                  onClick={() => navigate(ROUTES.INTERNS.VIEW)}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to All Interns
                </button>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Add Intern</h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">Choose how you want to add an intern</p>
              </div>
              <ChoiceScreen 
                title="How would you like to add an intern?"
                description="Choose your preferred method to add intern data"
                jsonLabel="Upload Spreadsheet"
                jsonDescription="Import interns from Excel or CSV file with drag & drop"
                formLinkLabel="Copy Form Link"
                formLinkDescription="Generate a shareable link for users to fill their data"
                onSelectJSON={handleSelectSpreadsheet}
                onSelectFormLink={handleSelectFormLink}
              />
            </div>
          ) : mode === 'spreadsheet' ? (
            // Spreadsheet Upload Screen
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
              <div className="mb-3 sm:mb-4">
                <button
                  onClick={handleBackToChoice}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Upload Spreadsheet</h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">
                  Import interns from Excel (.xlsx, .xls) or CSV file
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Required columns: First Name, Middle Name, Last Name, Email, Mobile Number (WhatsApp), Area of Interests
                </p>
              </div>
              
              {/* Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 sm:p-8 text-center hover:border-[#4C763B] transition-colors">
                <input
                  type="file"
                  id="spreadsheet-upload"
                  accept=".xlsx,.xls,.csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleSpreadsheetUpload(file)
                    }
                  }}
                  className="hidden"
                  disabled={isUploading}
                />
                <label
                  htmlFor="spreadsheet-upload"
                  className={`cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-900">
                      {isUploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Excel (.xlsx, .xls) or CSV files up to 10MB
                    </p>
                  </div>
                </label>
              </div>

              {/* Upload Result */}
              {uploadResult && (
                <div className={`mt-4 p-4 rounded-lg ${
                  uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    uploadResult.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {uploadResult.message}
                  </p>
                  {uploadResult.success && uploadResult.data && (
                    <div className="mt-2 text-xs text-green-700">
                      <p>Total: {uploadResult.data.total}</p>
                      <p>Successful: {uploadResult.data.successful}</p>
                      {uploadResult.data.skipped > 0 && (
                        <p>Skipped (duplicates): {uploadResult.data.skipped}</p>
                      )}
                      {uploadResult.data.failed > 0 && (
                        <p className="text-red-600">Failed: {uploadResult.data.failed}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : mode === 'form-link' ? (
            // Copy Form Link Screen
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
              <div className="mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Copy Form Link</h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">Generate a shareable link for user registration</p>
              </div>
              <CopyFormLink onBack={handleBackToChoice} />
            </div>
          ) : mode === 'edit' ? (
            // Edit Intern Screen
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
              <div className="mb-3 sm:mb-4">
                <button
                  onClick={handleBackToChoice}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to All Interns
                </button>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Edit Intern</h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">Update intern information</p>
              </div>
              
              {isLoadingIntern ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4C763B] mx-auto"></div>
                  <p className="mt-4 text-sm text-gray-600">Loading intern data...</p>
                </div>
              ) : internData ? (
                <InternForm
                  onSubmit={handleFormSubmit}
                  onCancel={handleBackToChoice}
                  initialData={{
                    name: internData.name,
                    email: internData.email,
                    domain: internData.domain,
                    status: internData.status,
                  }}
                  isEditMode={true}
                />
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-600">Failed to load intern data</p>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

