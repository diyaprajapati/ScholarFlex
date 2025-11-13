import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import ChoiceScreen from '../../components/common/ChoiceScreen'
import JSONUploadArea from '../../components/question-papers/forms/JSONUploadArea'
import CopyFormLink from '../../components/interns/forms/CopyFormLink'

export default function AddInternPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id
  const [user, setUser] = useState(null)
  const [mode, setMode] = useState(null) // null, 'json', or 'form-link'

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)

    // Edit mode is not supported for this flow
    // Users can only add via JSON or form link
    if (isEditMode) {
      navigate(ROUTES.INTERNS.VIEW)
    }
  }, [navigate, id, isEditMode])


  const handleSelectJSON = () => {
    setMode('json')
  }

  const handleSelectFormLink = () => {
    setMode('form-link')
  }

  const handleBackToChoice = () => {
    setMode(null)
  }

  const handleJSONFileUpload = async (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)
        
        // Validate JSON structure
        if (!jsonData.interns || !Array.isArray(jsonData.interns)) {
          alert('JSON must contain an "interns" array')
          return
        }

        // Process interns
        const processedInterns = jsonData.interns.map((intern) => {
          return {
            name: intern.name || '',
            email: intern.email || '',
            domain: intern.domain || '',
            status: intern.status || 'Pending',
          }
        })

        if (processedInterns.length === 0) {
          alert('No valid interns found in JSON file')
          return
        }

        // For JSON upload, we'll process all interns
        // In a real app, you'd save all of them via API
        alert(`${processedInterns.length} intern(s) imported successfully!`)
        // Navigate back to list
        navigate(ROUTES.INTERNS.VIEW)
      } catch (error) {
        alert(`Error parsing JSON: ${error.message}`)
        console.error('JSON parsing error:', error)
      }
    }

    reader.onerror = () => {
      alert('Error reading file. Please try again.')
    }

    reader.readAsText(file)
  }

  const handleDownloadTemplate = () => {
    const template = {
      interns: [
        {
          name: "John Doe",
          email: "john.doe@example.com",
          domain: "Web Development",
          status: "Active"
        },
        {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          domain: "Mobile Development",
          status: "Pending"
        }
      ]
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'interns-template.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
                jsonLabel="Upload JSON"
                jsonDescription="Import interns from a JSON file with drag & drop"
                formLinkLabel="Copy Form Link"
                formLinkDescription="Generate a shareable link for users to fill their data"
                onSelectJSON={handleSelectJSON}
                onSelectFormLink={handleSelectFormLink}
              />
            </div>
          ) : mode === 'json' ? (
            // JSON Upload Screen
            <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
              <div className="mb-3 sm:mb-4">
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Upload JSON File</h1>
                <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-600">Import interns from a JSON file</p>
              </div>
              <JSONUploadArea
                onFileUpload={handleJSONFileUpload}
                onBack={handleBackToChoice}
                onDownloadTemplate={handleDownloadTemplate}
              />
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
          ) : null}
        </div>
      </main>
    </div>
  )
}

