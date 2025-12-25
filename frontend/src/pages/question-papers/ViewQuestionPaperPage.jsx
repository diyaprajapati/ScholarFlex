import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import QuestionPaperView from '../../components/question-papers/view/QuestionPaperView'
import { NoDataFound } from '../../components/common/errors'
import api from '../../services/api'

export default function ViewQuestionPaperPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [paperSet, setPaperSet] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)

    // Load paper set data from API
    const fetchQuestionPaper = async () => {
      setIsLoading(true)
      try {
        const response = await api.questionPapers.getById(id)
        const paper = response.data
        
        // Transform backend data to frontend format
        // Handle sections format if available, otherwise use flat questions
        let questions = []
        if (paper.sections && Array.isArray(paper.sections)) {
          // Flatten questions from sections
          paper.sections.forEach(section => {
            if (section.questions && Array.isArray(section.questions)) {
              section.questions.forEach(q => {
                questions.push({
                  id: q.id,
                  text: q.text || q.question_text,
                  type: q.type,
                  weightage: q.weightage,
                  options: q.options || [],
                  correctOptions: q.correctOptions || [],
                  correctAnswer: q.correctAnswer || q.correct_answer || '',
                  section: section.name || '',
                })
              })
            }
          })
        } else {
          // Use flat questions array
          questions = (paper.questions || []).map(q => ({
            id: q.id,
            text: q.text || q.question_text,
            type: q.type,
            weightage: q.weightage,
            options: q.options || [],
            correctOptions: q.correctOptions || [],
            correctAnswer: q.correctAnswer || q.correct_answer || '',
            section: q.section || '',
          }))
        }
        
        const transformedPaper = {
          id: paper.id,
          name: paper.paper_name,
          subject: paper.subject || '',
          year: paper.year || '',
          semester: paper.semester || '',
          totalQuestions: paper.total_questions || questions.length,
          duration: paper.duration_minutes || 0,
          maxMarks: paper.total_weightage || 0,
          createdAt: paper.created_at ? new Date(paper.created_at).toISOString().split('T')[0] : '',
          status: paper.status || 'draft',
          questions: questions,
          sections: paper.sections || [],
        }
        
        setPaperSet(transformedPaper)
      } catch (error) {
        console.error('Error fetching question paper:', error)
        setPaperSet(null) // Will show NoDataFound component
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestionPaper()
  }, [navigate, id])

  if (isLoading) {
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

  if (!paperSet) {
    return (
      <div className="h-screen flex bg-gray-50 overflow-hidden">
        <Sidebar user={user} />
        <TopNavbar user={user} />
        <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
          <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex items-center justify-center">
            <NoDataFound
              title="Question Paper Not Found"
              message="The question paper you're looking for doesn't exist or has been deleted."
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
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="w-full px-3 sm:px-4 lg:px-6 py-3 sm:py-4 lg:py-5">
          {/* Header */}
          <div className="mb-2 sm:mb-3">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <button
                onClick={() => navigate(ROUTES.QUESTION_PAPERS.LIST)}
                className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-gray-600 hover:text-[#4C763B] transition-colors cursor-pointer"
              >
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-medium text-[#4C763B] border border-[#4C763B] rounded hover:bg-[#4C763B] hover:text-white transition-colors cursor-pointer"
              >
                <svg className="h-3 w-3 sm:h-3.5 sm:w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                Print
              </button>
            </div>
            <h1 className="text-base sm:text-lg lg:text-xl font-bold text-gray-900">View Question Paper</h1>
          </div>

          {/* Question Paper View */}
          <QuestionPaperView paperSet={paperSet} showAnswers={true} />
        </div>
      </main>
    </div>
  )
}

