import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import QuestionPaperForm from '../../components/question-papers/forms/QuestionPaperForm'
import QuestionPaperChoice from '../../components/question-papers/forms/QuestionPaperChoice'
import JSONUploadArea from '../../components/question-papers/forms/JSONUploadArea'
import { NoDataFound } from '../../components/common/errors'
import api from '../../services/api'

const SECTION_OPTIONS = ['Technical', 'Coding', 'Theory', 'Maths & Logical Reasoning']

const normalizeSectionName = (section) => {
  if (!section || typeof section !== 'string') return 'Technical'
  const normalized = section.trim().toLowerCase()
  if (normalized === 'theory' || normalized === 'theory section') return 'Theory'
  if (normalized === 'technical' || normalized === 'technical section' || normalized === 'technical/coding' || normalized === 'technical coding') {
    return 'Technical'
  }
  if (normalized === 'coding' || normalized === 'coding section') return 'Coding'
  if (normalized === 'maths & logical reasoning' || normalized === 'maths and logical reasoning' || normalized === 'maths & logical reasoning section' || normalized === 'maths' || normalized === 'logical reasoning') {
    return 'Maths & Logical Reasoning'
  }
  return 'Technical' // Default
}

export default function AddQuestionPaperFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id
  const [user, setUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState(null) // null, 'manual', or 'json'
  const [uploadedQuestions, setUploadedQuestions] = useState(null)
  const [paperSetData, setPaperSetData] = useState(null)
  const [sectionFiles, setSectionFiles] = useState({
    Technical: null,
    Coding: null,
    Theory: null,
    'Maths & Logical Reasoning': null,
  })
  const [uploadedFileNames, setUploadedFileNames] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [domains, setDomains] = useState([])

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)

    const fetchDomains = async () => {
      try {
        const response = await api.domains.getAll()
        setDomains(response.data || [])
      } catch (error) {
        console.error('Error fetching domains:', error)
      }
    }
    fetchDomains()

    // Load paper set data if in edit mode
    if (isEditMode) {
      const fetchQuestionPaper = async () => {
        setIsLoading(true)
        try {
          const response = await api.questionPapers.getById(id)
          const paper = response.data
          
          // Transform backend data to frontend format
          setPaperSetData({
            name: paper.paper_name,
            subject: paper.subject || '',
            year: paper.year || '',
            semester: paper.semester || '',
            duration: paper.duration_minutes || 180,
            totalMarks: paper.total_weightage || 0,
            status: paper.status || 'draft',
            description: paper.description || '',
            domainIds: (paper.domains || []).map((domain) => domain.id),
            sections: paper.sections || [],
            questions: (paper.questions || []).map(q => ({
              id: q.id, // Keep ID for update
              text: q.text || q.question_text,
              type: q.type,
              weightage: q.weightage,
              options: q.options || [],
              correctOptions: q.correctOptions || [],
              correctAnswer: q.correctAnswer || q.correct_answer || '',
              section: q.section || '',
            })),
          })
          setMode('manual') // Skip choice screen in edit mode
        } catch (error) {
          console.error('Error fetching question paper:', error)
          // Will show NoDataFound component
        } finally {
          setIsLoading(false)
        }
      }
      
      fetchQuestionPaper()
    }
  }, [navigate, id, isEditMode])

  const handleSubmit = async (formData) => {
    setIsSubmitting(true)
    try {
      // Ensure status is set (default to 'draft' if not provided)
      const dataToSubmit = {
        ...formData,
        status: formData.status || 'draft',
        description: formData.description || '',
        domainIds: formData.domainIds || [],
      }
      
      if (isEditMode) {
        await api.questionPapers.update(id, dataToSubmit)
        alert('Question paper updated successfully!')
      } else {
        await api.questionPapers.create(dataToSubmit)
        alert('Question paper created successfully!')
      }
      
      // Navigate back to list
      navigate(ROUTES.QUESTION_PAPERS.LIST)
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} question paper:`, error)
      console.error('Full error details:', error)
      
      let errorMessage = error.message || `Failed to ${isEditMode ? 'update' : 'create'} question paper. Please try again.`
      
      // Format validation errors for better readability
      if (errorMessage.includes('\n')) {
        // Split by newlines and format as a list
        const lines = errorMessage.split('\n')
        const mainMessage = lines[0]
        const errorList = lines.slice(1).filter(line => line.trim())
        
        if (errorList.length > 0) {
          // Show first 10 errors to avoid overwhelming the user
          const errorsToShow = errorList.slice(0, 10)
          const remainingCount = errorList.length - errorsToShow.length
          
          errorMessage = `${mainMessage}\n\n${errorsToShow.join('\n')}`
          if (remainingCount > 0) {
            errorMessage += `\n\n... and ${remainingCount} more error(s). Check the console for full details.`
          }
          
          // Log all errors to console for debugging
          console.error('All validation errors:', errorList)
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.QUESTION_PAPERS.LIST)
  }

  const handleSelectManual = () => {
    setMode('manual')
  }

  const handleSelectJSON = () => {
    setMode('json')
  }

  const handleBackToChoice = () => {
    setMode(null)
    setUploadedQuestions(null)
    setSectionFiles({
      Technical: null,
      Coding: null,
      Theory: null,
      'Maths & Logical Reasoning': null,
    })
    setUploadedFileNames({})
  }

  const handleContinueToForm = () => {
    setMode('manual')
  }

  const handleJSONFileUpload = async (file, section) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)
        
        let questionsToProcess = [];
        
        // Handle new format with sections
        if (jsonData.sections && Array.isArray(jsonData.sections)) {
          jsonData.sections.forEach(sec => {
            if (sec.questions && Array.isArray(sec.questions)) {
              sec.questions.forEach(q => {
                questionsToProcess.push({ ...q, section: sec.name || section });
              });
            }
          });
        } 
        // Handle old format with flat questions array - assign to the section being uploaded
        else if (jsonData.questions && Array.isArray(jsonData.questions)) {
          questionsToProcess = jsonData.questions.map(q => ({ ...q, section: section }));
        } else {
          alert(`JSON must contain either a "sections" array or a "questions" array for ${section} section`)
          return
        }

        if (questionsToProcess.length === 0) {
          alert(`No questions found in JSON file for ${section} section`)
          return
        }

        // Process questions
        const processedQuestions = questionsToProcess.map((q, idx) => {
          const normalizedSection = normalizeSectionName(q.section || section || q.sectionName) || section
          const question = {
            text: q.text || '',
            type: q.type || 'multiple-choice',
            weightage: q.weightage || q.marks || 1,
            options: q.options || [],
            correctOptions: q.correctOptions || [],
            correctAnswer: q.correctAnswer || '',
            section: normalizedSection,
          }

          // Ensure at least one option for multiple/single choice
          if ((question.type === 'multiple-choice' || question.type === 'single-choice') && 
              (!question.options || question.options.length === 0)) {
            question.options = ['']
          }

          // Auto-set True/False options
          if (question.type === 'true-false' && (!question.options || question.options.length === 0)) {
            question.options = ['True', 'False']
          }

          // Handle correctAnswer
          if (q.correctAnswer !== undefined && q.correctAnswer !== null && 
              (question.type === 'multiple-choice' || question.type === 'single-choice')) {
            const answerIndex = typeof q.correctAnswer === 'number' 
              ? q.correctAnswer 
              : question.options.findIndex(opt => opt === q.correctAnswer)
            if (answerIndex >= 0) {
              question.correctOptions = question.type === 'single-choice' ? [answerIndex] : [answerIndex]
            }
          }

          return question
        })

        if (processedQuestions.length === 0) {
          alert(`No valid questions found in JSON file for ${section} section`)
          return
        }

        // Store questions for this section and combine all questions
        setSectionFiles(prev => {
          const updated = { ...prev, [section]: { file, questions: processedQuestions } }
          
          // Combine all section questions
          const allQuestions = [
            ...(updated.Technical?.questions || []),
            ...(updated.Coding?.questions || []),
            ...(updated.Theory?.questions || []),
            ...(updated['Maths & Logical Reasoning']?.questions || []),
          ]

          setUploadedQuestions(allQuestions)
          
          // Track uploaded file names for UI display
          setUploadedFileNames(prev => ({ ...prev, [section]: file.name }))
          
          // Don't automatically switch to manual mode - let users continue uploading section files
          // Users can manually navigate to the form when ready
          
          return updated
        })
      } catch (error) {
        alert(`Error parsing JSON for ${section} section: ${error.message}`)
        console.error('JSON parsing error:', error)
      }
    }

    reader.onerror = () => {
      alert(`Error reading file for ${section} section. Please try again.`)
    }

    reader.readAsText(file)
  }

  const handleDownloadTemplate = (section = null) => {
    // Section-specific templates
    const sectionTemplates = {
      Technical: {
        questions: [
          {
            text: "What is the primary purpose of REST API?",
            type: "multiple-choice",
            weightage: 2,
            options: ["Real-time communication", "Resource representation via HTTP", "Database queries", "File storage"],
            correctOptions: [1]
          },
          {
            text: "Which HTTP method is used to retrieve data from a server?",
            type: "single-choice",
            weightage: 1,
            options: ["GET", "POST", "PUT", "DELETE"],
            correctOptions: [0]
          }
        ]
      },
      Coding: {
        questions: [
          {
            text: "What does the following code output?\n\nfunction test() {\n  console.log(a);\n  var a = 5;\n}",
            type: "multiple-choice",
            weightage: 2,
            options: ["5", "undefined", "Error", "null"],
            correctOptions: [1]
          },
          {
            text: "What is the output of: console.log(typeof null);",
            type: "single-choice",
            weightage: 1,
            options: ["null", "object", "undefined", "string"],
            correctOptions: [1]
          }
        ]
      },
      Theory: {
        questions: [
          {
            text: "What is the capital of France?",
            type: "multiple-choice",
            weightage: 2,
            options: ["London", "Paris", "Berlin", "Madrid"],
            correctOptions: [1]
          },
          {
            text: "Which data structure follows LIFO (Last In First Out) principle?",
            type: "single-choice",
            weightage: 1,
            options: ["Queue", "Stack", "Array", "Linked List"],
            correctOptions: [1]
          }
        ]
      },
      "Maths & Logical Reasoning": {
        questions: [
          {
            text: "If 2x + 5 = 15, what is the value of x?",
            type: "multiple-choice",
            weightage: 2,
            options: ["5", "10", "7", "8"],
            correctOptions: [0]
          },
          {
            text: "What is the next number in the sequence: 2, 4, 8, 16, ?",
            type: "single-choice",
            weightage: 1,
            options: ["24", "32", "28", "20"],
            correctOptions: [1]
          }
        ]
      }
    }

    // If specific section is requested, download template for that section only
    if (section && sectionTemplates[section]) {
      const blob = new Blob([JSON.stringify(sectionTemplates[section], null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${section.toLowerCase().replace(/\s+/g, '-')}-section-template.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      return
    }

    // Download all 4 templates sequentially
    const sections = ['Technical', 'Coding', 'Theory', 'Maths & Logical Reasoning']
    
    sections.forEach((sec, index) => {
      setTimeout(() => {
        const blob = new Blob([JSON.stringify(sectionTemplates[sec], null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `${sec.toLowerCase().replace(/\s+/g, '-')}-section-template.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      }, index * 300) // Stagger downloads by 300ms
    })
    
    // Show message after all downloads
    setTimeout(() => {
      alert('All 4 section templates downloaded! Each file contains sample questions for that specific section. Upload each file to its corresponding section.')
    }, sections.length * 300 + 100)
  }

  // Show loading state while fetching edit data
  if (isEditMode && isLoading) {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <Sidebar user={user} />
        <TopNavbar user={user} />
        <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
          <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
            <div className="bg-white rounded-lg border border-gray-200 p-8 sm:p-10 lg:p-12 text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-3 sm:border-4 border-[#4C763B] border-t-transparent"></div>
              <p className="mt-3 sm:mt-4 text-xs sm:text-sm lg:text-base text-gray-600">Loading question paper...</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // Show error if paper set not found in edit mode
  if (isEditMode && !isLoading && !paperSetData) {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <Sidebar user={user} />
        <TopNavbar user={user} />
        <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
          <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex items-center justify-center">
            <NoDataFound
              title="Question Paper Not Found"
              message="The question paper you're trying to edit doesn't exist or has been deleted."
              buttonText="Back to Question Papers"
              onButtonClick={() => navigate(ROUTES.QUESTION_PAPERS.LIST)}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 ml-64 overflow-y-auto pt-16">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-4 sm:py-5 lg:py-6">
          {!mode && !isEditMode ? (
            // Choice Screen
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6 xl:p-8">
              <div className="mb-4 sm:mb-5 lg:mb-6">
                <button
                  onClick={() => navigate(ROUTES.QUESTION_PAPERS.LIST)}
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-3 sm:mb-4 cursor-pointer"
                >
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Question Papers
                </button>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Add Question Paper</h1>
                <p className="mt-1 text-xs sm:text-sm lg:text-base text-gray-600">Choose how you want to add questions</p>
              </div>
              <QuestionPaperChoice 
                onSelectManual={handleSelectManual}
                onSelectJSON={handleSelectJSON}
              />
            </div>
          ) : mode === 'json' ? (
            // JSON Upload Screen
            <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-5 lg:p-6 xl:p-8">
              <div className="mb-4 sm:mb-5 lg:mb-6">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Upload JSON File</h1>
                <p className="mt-1 text-xs sm:text-sm lg:text-base text-gray-600">Import questions from a JSON file</p>
              </div>
              <JSONUploadArea
                onFileUpload={handleJSONFileUpload}
                onBack={handleBackToChoice}
                onDownloadTemplate={handleDownloadTemplate}
                onDownloadSectionTemplate={handleDownloadTemplate}
                onContinueToForm={handleContinueToForm}
                uploadedFiles={uploadedFileNames}
              />
            </div>
          ) : (
            // Manual Form Screen
            <>
              <div className="mb-4 sm:mb-5 lg:mb-6">
                {!isEditMode && (
                  <button
                    onClick={handleBackToChoice}
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Options
                  </button>
                )}
                {isEditMode && (
                  <button
                    onClick={() => navigate(ROUTES.QUESTION_PAPERS.LIST)}
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Question Papers
                  </button>
                )}
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
                  {isEditMode ? 'Edit Question Paper' : 'Add Question Paper'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm lg:text-base text-gray-600">
                  {isEditMode 
                    ? 'Edit your question paper set and update questions' 
                    : 'Create a new question paper set with questions and options'}
                </p>
              </div>
              
              {isSubmitting ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-[#4C763B] border-t-transparent"></div>
                  <p className="mt-4 text-gray-600">
                    {isEditMode ? 'Updating question paper...' : 'Saving question paper...'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <QuestionPaperForm 
                    onSubmit={handleSubmit} 
                    onCancel={handleCancel}
                    initialData={paperSetData || (uploadedQuestions ? { questions: uploadedQuestions } : null)}
                    availableDomains={domains}
                    isEditMode={isEditMode}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

