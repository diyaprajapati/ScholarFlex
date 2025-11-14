import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import QuestionPaperHeader from '../../components/question-papers/QuestionPaperHeader'
import PaperSetGrid from '../../components/question-papers/PaperSetGrid'
import DeleteConfirmModal from '../../components/question-papers/DeleteConfirmModal'
import { mockPaperSets } from '../../utils/questionPaperData'

export default function QuestionPapersListPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [paperSets, setPaperSets] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, paperSet: null })

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
    // Simulate loading
    setTimeout(() => {
      setPaperSets(mockPaperSets)
      setIsLoading(false)
    }, 500)
  }, [navigate])

  const handleEdit = (paperSet) => {
    navigate(ROUTES.QUESTION_PAPERS.EDIT(paperSet.id))
  }

  const handleDelete = (paperSet) => {
    setDeleteModal({ isOpen: true, paperSet })
  }

  const handleDeleteConfirm = () => {
    if (deleteModal.paperSet) {
      setPaperSets((prev) => prev.filter((p) => p.id !== deleteModal.paperSet.id))
      setDeleteModal({ isOpen: false, paperSet: null })
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
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
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
      />
    </div>
  )
}

