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

export default function AddQuestionPaperFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id
  const [user, setUser] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState(null) // null, 'manual', or 'json'
  const [uploadedQuestions, setUploadedQuestions] = useState(null)
  const [paperSetData, setPaperSetData] = useState(null)
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
            questions: (paper.questions || []).map(q => ({
              id: q.id, // Keep ID for update
              text: q.text || q.question_text,
              type: q.type,
              weightage: q.weightage,
              options: q.options || [],
              correctOptions: q.correctOptions || [],
              correctAnswer: q.correctAnswer || q.correct_answer || '',
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
      const errorMessage = error.message || `Failed to ${isEditMode ? 'update' : 'create'} question paper. Please try again.`
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
  }

  const handleJSONFileUpload = async (file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = JSON.parse(e.target.result)
        
        // Validate JSON structure
        if (!jsonData.questions || !Array.isArray(jsonData.questions)) {
          alert('JSON must contain a "questions" array')
          return
        }

        // Process questions
        const processedQuestions = jsonData.questions.map((q) => {
          const question = {
            text: q.text || '',
            type: q.type || 'multiple-choice',
            weightage: q.weightage || q.marks || 1,
            options: q.options || [],
            correctOptions: q.correctOptions || [],
            correctAnswer: q.correctAnswer || '',
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
          alert('No valid questions found in JSON file')
          return
        }

        setUploadedQuestions(processedQuestions)
        setMode('manual') // Switch to manual form with imported questions
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
      questions: [
        {
          text: "What is the capital of France?",
          type: "multiple-choice",
          weightage: 2,
          options: ["London", "Paris", "Berlin", "Madrid"],
          correctOptions: [1]
        },
        {
          text: "JavaScript is a programming language.",
          type: "true-false",
          weightage: 1,
          options: ["True", "False"],
          correctOptions: [0]
        },
        {
          text: "Explain the concept of closures in JavaScript.",
          type: "short-answer",
          weightage: 5,
          correctAnswer: "A closure is a function that has access to variables in its outer scope even after the outer function has returned."
        }
      ]
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'question-paper-template.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
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
                  className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-3 sm:mb-4"
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
              />
            </div>
          ) : (
            // Manual Form Screen
            <>
              <div className="mb-4 sm:mb-5 lg:mb-6">
                {!isEditMode && (
                  <button
                    onClick={handleBackToChoice}
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3"
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
                    className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-gray-600 hover:text-[#4C763B] transition-colors mb-2 sm:mb-3"
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

