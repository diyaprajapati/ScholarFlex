import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import QuestionPaperHeader from '../../components/question-papers/QuestionPaperHeader'
import PaperSetGrid from '../../components/question-papers/PaperSetGrid'
import DeleteConfirmModal from '../../components/question-papers/DeleteConfirmModal'
import api from '../../services/api'

export default function QuestionPapersListPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [paperSets, setPaperSets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, paperSet: null })
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
    
    // Fetch question papers from API
    const fetchQuestionPapers = async () => {
      setIsLoading(true)
      try {
        const response = await api.questionPapers.getAll()
        // Transform backend data to frontend format
        const transformedPapers = (response.data || []).map(paper => ({
          id: paper.id,
          name: paper.paper_name,
          subject: paper.subject || '',
          year: paper.year || '',
          semester: paper.semester || '',
          totalQuestions: paper.total_questions || 0,
          duration: paper.duration_minutes || 0,
          maxMarks: paper.total_weightage || 0,
          createdAt: paper.created_at ? new Date(paper.created_at).toISOString().split('T')[0] : '',
          status: paper.status || 'draft',
          domains: paper.domains || [],
        }))
        setPaperSets(transformedPapers)
      } catch (error) {
        console.error('Error fetching question papers:', error)
        alert('Failed to load question papers. Please try again.')
        setPaperSets([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchQuestionPapers()
  }, [navigate])

  const handleEdit = (paperSet) => {
    navigate(ROUTES.QUESTION_PAPERS.EDIT(paperSet.id))
  }

  const handleDelete = (paperSet) => {
    setDeleteModal({ isOpen: true, paperSet })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.paperSet || isDeleting) return // Prevent double deletion
    
    try {
      setIsDeleting(true)
      const response = await api.questionPapers.delete(deleteModal.paperSet.id)
      // Check if the response indicates success
      if (response && response.success !== false) {
        setPaperSets((prev) => prev.filter((p) => p.id !== deleteModal.paperSet.id))
        setDeleteModal({ isOpen: false, paperSet: null })
        alert('Question paper deleted successfully!')
      } else {
        throw new Error(response?.message || 'Failed to delete question paper')
      }
    } catch (error) {
      console.error('Error deleting question paper:', error)
      alert(error.message || 'Failed to delete question paper. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, paperSet: null })
  }

  const handleView = (paperSet) => {
    navigate(ROUTES.QUESTION_PAPERS.VIEW(paperSet.id))
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 lg:py-10">
          <QuestionPaperHeader />
          <PaperSetGrid
            paperSets={paperSets}
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />
        </div>
      </main>
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        paperSet={deleteModal.paperSet}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  )
}

