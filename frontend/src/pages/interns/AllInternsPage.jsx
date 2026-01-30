import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import Sidebar from '../../components/dashboard/Sidebar'
import TopNavbar from '../../components/layout/TopNavbar'
import InternsHeader from '../../components/interns/InternsHeader'
import FilterPanel from '../../components/interns/FilterPanel'
import InternsTable from '../../components/interns/InternsTable'
import DeleteConfirmModal from '../../components/interns/DeleteConfirmModal'
import { api } from '../../services/api'

export default function AllInternsPage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [interns, setInterns] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false)
  const [filters, setFilters] = useState({
    status: [],
    domain: [],
    aptitudeStatus: [],
    selectionStatus: [],
  })
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, intern: null })
  const [isDeleting, setIsDeleting] = useState(false)
  
  // Pagination States
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true })
      return
    }
    const userData = authService.getUser()
    setUser(userData)
    
    // Fetch interns from API
    fetchInterns()
  }, [navigate])

  const fetchInterns = async () => {
    try {
      setIsLoading(true)
      const response = await api.interns.getAll()
      
      if (response.success) {
        // Map API response to frontend format
        const mappedInterns = response.data.map(intern => ({
          id: intern.id,
          name: intern.name,
          email: intern.email,
          domain: intern.domain,
          status: intern.status || 'Pending',
          registration_date: intern.registration_date,
          // Default values for fields not yet in API
          aptitudeStatus: 'Pending',
          selectionStatus: 'Not Selected',
        }))
        setInterns(mappedInterns)
      }
    } catch (error) {
      console.error('Error fetching interns:', error)
      alert('Failed to load interns. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Filter and search logic
  const filteredInterns = useMemo(() => {
    return interns.filter((intern) => {
      // Search filter
      const matchesSearch = 
        searchValue === '' ||
        intern.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        intern.email.toLowerCase().includes(searchValue.toLowerCase())

      // Status filter
      const matchesStatus = filters.status.length === 0 || filters.status.includes(intern.status)

      // Domain filter
      const matchesDomain = filters.domain.length === 0 || filters.domain.includes(intern.domain)

      // Aptitude Status filter
      const matchesAptitudeStatus = 
        filters.aptitudeStatus.length === 0 || filters.aptitudeStatus.includes(intern.aptitudeStatus)

      // Selection Status filter
      const matchesSelectionStatus = 
        filters.selectionStatus.length === 0 || filters.selectionStatus.includes(intern.selectionStatus)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesDomain &&
        matchesAptitudeStatus &&
        matchesSelectionStatus
      )
    })
  }, [interns, searchValue, filters])

  // Pagination calculations
  const totalPages = Math.ceil(filteredInterns.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedInterns = filteredInterns.slice(startIndex, endIndex)

  // Reset to page 1 when filters or search change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchValue, filters])

  const goToPage = (page) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSearch = (value) => {
    setSearchValue(value)
  }

  const handleFilterChange = (filterType, value) => {
    setFilters((prev) => {
      // Handle clear all
      if (value === 'clear-all') {
        return {
          ...prev,
          [filterType]: [],
        }
      }
      
      const currentValues = prev[filterType] || []
      const isSelected = currentValues.includes(value)
      
      if (isSelected) {
        // Remove the value if already selected
        return {
          ...prev,
          [filterType]: currentValues.filter((v) => v !== value),
        }
      } else {
        // Add the value if not selected
        return {
          ...prev,
          [filterType]: [...currentValues, value],
        }
      }
    })
  }

  const handleFilterClick = () => {
    setIsFilterPanelOpen(true)
  }

  const handleCloseFilterPanel = () => {
    setIsFilterPanelOpen(false)
  }

  const handleEdit = (intern) => {
    // Navigate to edit page
    navigate(`${ROUTES.INTERNS.ADD}?edit=${intern.id}`)
  }

  const handleDelete = (intern) => {
    setDeleteModal({ isOpen: true, intern })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteModal.intern) return

    try {
      setIsDeleting(true)
      await api.interns.delete(deleteModal.intern.id)
      
      // Remove from local state
      setInterns((prev) => prev.filter((i) => i.id !== deleteModal.intern.id))
      
      // Close modal
      setDeleteModal({ isOpen: false, intern: null })
      
      // Optionally refresh the list to ensure consistency
      // fetchInterns()
    } catch (error) {
      console.error('Error deleting intern:', error)
      alert(error.message || 'Failed to delete intern. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModal({ isOpen: false, intern: null })
  }

  const handleView = (intern) => {
    // console.log('View intern:', intern)
    // Navigate to view page or open view modal
  }

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(value => Array.isArray(value) ? value.length > 0 : value !== 'all')

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-[1280px] 2xl:max-w-[1536px] px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 py-6 sm:py-8 lg:py-10">
          {/* Header with Search and Filter Button */}
          <InternsHeader
            onSearch={handleSearch}
            searchValue={searchValue}
            onFilterClick={handleFilterClick}
            filters={filters}
            hasActiveFilters={hasActiveFilters}
            totalCount={interns.length}
          />

          {/* Filter Panel
        <FilterPanel
          isOpen={isFilterPanelOpen}
          onClose={handleCloseFilterPanel}
          filters={filters}
          onFilterChange={handleFilterChange}
          onApplyFilters={(newFilters) => {
            setFilters(newFilters)
          }}
        /> */}

          {/* Interns Table */}
          <InternsTable 
            interns={paginatedInterns} 
            isLoading={isLoading}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onView={handleView}
          />

          {/* Pagination */}
          {filteredInterns.length > itemsPerPage && (
            <div className="mt-6 bg-white rounded-lg border border-gray-200 px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(endIndex, filteredInterns.length)}</span> of{' '}
                  <span className="font-medium">{filteredInterns.length}</span> interns
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => goToPage(page)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                              currentPage === page
                                ? 'bg-[#4C763B] text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        )
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-2 text-gray-500">...</span>
                      }
                      return null
                    })}
                  </div>

                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === totalPages
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        intern={deleteModal.intern}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        isDeleting={isDeleting}
      />
    </div>
  )
}

