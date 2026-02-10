import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { authService } from '../../utils/auth'
import { ROUTES } from '../../config/paths'
import api from '../../services/api'
import { Plus, X, Upload, CheckCircle, AlertCircle, Edit2, Save, XCircle, Menu } from 'lucide-react'
import ProfileViewMode from '../../components/student/ProfileViewMode'
import { useStudentLayout } from '../../contexts/StudentLayoutContext'

export default function StudentProfileFormPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setSidebarOpen } = useStudentLayout()
  const [loading, setLoading] = useState(true)
  const [checking, setChecking] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingResume, setUploadingResume] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [domains, setDomains] = useState([])
  const [isEditMode, setIsEditMode] = useState(false)
  const [user, setUser] = useState(null)
  const lastPathnameRef = useRef(location.pathname)
  const isPageVisibleRef = useRef(true)
  const isFetchingRef = useRef(false)

  // Form state
  const [formData, setFormData] = useState({
    // Identity & Contact
    fullName: '',
    email: '',
    phone: '',
    imageUrl: '',
    imageFile: null,
    
    // Education Details
    instituteName: '',
    courseTaken: '',
    currentYear: '',
    currentSemester: '',
    graduationYear: '',
    
    // Internship Information
    domainId: '',
    internshipStartDate: '',
    internshipEndDate: '',
    
    // Skills
    skills: {
      languages: [],
      frameworks: [],
      tools: [],
      softSkills: [],
    },
    
    // Personal Projects
    personalProjects: [],
    
    // Achievements
    achievements: {
      hackathons: [],
      certifications: [],
      awards: [],
      competitions: [],
    },
    
    // Documents
    resumeUrl: '',
    resumeFile: null,
    
    // Status
    profileCompleted: false,
  })

  const [skillInputs, setSkillInputs] = useState({
    language: '',
    framework: '',
    tool: '',
    softSkill: '',
  })

  useEffect(() => {
    const checkAccess = async () => {
      try {
        setChecking(true)
        
        // Check if user is authenticated
        if (!authService.isAuthenticated()) {
          navigate(ROUTES.LOGIN, { replace: true })
          return
        }

        // Check if user is a student
        const userRole = authService.getUserRole()
        if (userRole !== 'STUDENT') {
          navigate(ROUTES.DASHBOARD, { replace: true })
          return
        }

        // Check if student is selected
        const user = authService.getUser()
        if (!user?.is_selected) {
          // Non-selected students cannot access this form
          navigate(ROUTES.STUDENT.INSTRUCTIONS, { replace: true })
          return
        }

        // Check if profile is already completed (for informational purposes only)
        // Students can now access the form even after completion to view/edit
        const completionRes = await api.studentProfile.checkCompletion()
        if (completionRes.success && completionRes.isCompleted) {
          // Profile is completed, but allow access for viewing/editing
          // console.log('Profile is completed, allowing access for editing')
        }

        // All checks passed, allow access to form
        setChecking(false)
      } catch (err) {
        console.error('Error checking access:', err)
        // If error checking, still allow access (will be handled by ProtectedRoute)
        setChecking(false)
      }
    }

    checkAccess()
  }, [navigate])

  // Function to fetch profile data
  const fetchProfileData = useCallback(async (preserveEditMode = false) => {
    if (checking || isFetchingRef.current) return // Don't fetch data until access check is complete or if already fetching

    try {
      isFetchingRef.current = true
      setLoading(true)
      
      // Fetch domains
      const domainsRes = await api.domains.getAll()
      if (domainsRes.success) {
        setDomains(domainsRes.domains || domainsRes.data || [])
      }
      
      // Fetch existing profile
      const profileRes = await api.studentProfile.get()
      if (profileRes.success && profileRes.profile) {
        const profile = profileRes.profile
        const completed = profile.profileCompleted || false
        setFormData({
          fullName: profile.fullName || '',
          email: profile.email || '',
          phone: profile.phone || '',
          imageUrl: profile.imageUrl || '',
          imageFile: null,
          instituteName: profile.instituteName || '',
          courseTaken: profile.courseTaken || '',
          currentYear: profile.currentYear || '',
          currentSemester: profile.currentSemester || '',
          graduationYear: profile.graduationYear ? String(profile.graduationYear) : '',
          domainId: profile.domainId ? String(profile.domainId) : '',
          internshipStartDate: profile.internshipStartDate ? profile.internshipStartDate.split('T')[0] : '',
          internshipEndDate: profile.internshipEndDate ? profile.internshipEndDate.split('T')[0] : '',
          skills: profile.skills || { languages: [], frameworks: [], tools: [], softSkills: [] },
          personalProjects: (profile.personalProjects || []).map(project => ({
            projectTitle: project.projectTitle || '',
            description: project.description || '',
            techStack: project.techStack || '',
            role: project.role || '',
            githubLink: project.githubLink || '',
            liveLink: project.liveLink || '',
          })),
          achievements: profile.achievements ? {
            hackathons: (profile.achievements.hackathons || []).map(a => ({
              title: a.title || '',
              description: a.description || '',
              issuer: a.issuer || '',
              date: a.date ? a.date.split('T')[0] : '',
              link: a.link || '',
            })),
            certifications: (profile.achievements.certifications || []).map(a => ({
              title: a.title || '',
              description: a.description || '',
              issuer: a.issuer || '',
              date: a.date ? a.date.split('T')[0] : '',
              link: a.link || '',
            })),
            awards: (profile.achievements.awards || []).map(a => ({
              title: a.title || '',
              description: a.description || '',
              issuer: a.issuer || '',
              date: a.date ? a.date.split('T')[0] : '',
              link: a.link || '',
            })),
            competitions: (profile.achievements.competitions || []).map(a => ({
              title: a.title || '',
              description: a.description || '',
              issuer: a.issuer || '',
              date: a.date ? a.date.split('T')[0] : '',
              link: a.link || '',
            }))
          } : { hackathons: [], certifications: [], awards: [], competitions: [] },
          resumeUrl: profile.resumeUrl || '',
          resumeFile: null,
          profileCompleted: completed,
        })
        // Set edit mode: false if profile is completed (show view mode), true if not completed (show form)
        // But preserve current edit mode if preserveEditMode is true (used after saving)
        if (!preserveEditMode) {
          setIsEditMode(!completed)
        } else if (completed) {
          // If preserving edit mode but profile is completed, ensure we're in view mode
          setIsEditMode(false)
        }
      }
    } catch (err) {
      console.error('Error fetching profile:', err)
      setError(err.message || 'Failed to load profile')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [checking])

  // Fetch data when component mounts or when checking completes
  useEffect(() => {
    if (!checking) {
      fetchProfileData()
    }
  }, [checking, fetchProfileData])

  // Refresh data when pathname changes (user navigates back to this page)
  useEffect(() => {
    if (lastPathnameRef.current !== location.pathname && location.pathname === ROUTES.STUDENT.FORM) {
      lastPathnameRef.current = location.pathname
      // User navigated back to this page, refresh data only if not checking
      if (!checking) {
        fetchProfileData()
      }
    }
  }, [location.pathname, checking, fetchProfileData])

  // Listen ONLY for storage events (profile updated in another tab) - NOT for tab switches
  useEffect(() => {
    // Handle storage events (profile updated in another tab)
    // This is the ONLY event that should trigger a refresh
    const handleStorageChange = (e) => {
      // Only refresh if profile was actually updated in another tab
      if ((e.key === 'profile_completion_changed' || e.key === 'scholarflex_user') && 
          location.pathname === ROUTES.STUDENT.FORM && 
          !checking && 
          !isFetchingRef.current) {
        // Profile was updated in another tab, refresh data
        fetchProfileData()
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [location.pathname, checking, fetchProfileData])

  // Fetch user data for header
  useEffect(() => {
    const currentUser = authService.getUser()
    setUser(currentUser)
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file')
        e.target.value = '' // Clear the input
        return
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB')
        e.target.value = '' // Clear the input
        return
      }
      
      // Revoke previous blob URL if exists to prevent memory leaks
      if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.imageUrl)
      }
      
      const blobUrl = URL.createObjectURL(file)
      // console.log('Image selected, blob URL created:', blobUrl)
      // console.log('File details:', { name: file.name, type: file.type, size: file.size })
      setFormData(prev => {
        // console.log('Updating formData with imageUrl:', blobUrl)
        return {
          ...prev,
          imageFile: file,
          imageUrl: blobUrl,
        }
      })
      setError('') // Clear any previous errors
      setSuccess('') // Clear success messages
    }
  }

  const handleResumeChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Resume size must be less than 10MB')
        return
      }
      if (file.type !== 'application/pdf') {
        setError('Resume must be a PDF file')
        return
      }
      setFormData(prev => ({
        ...prev,
        resumeFile: file,
      }))
    }
  }

  const handleImageUpload = async () => {
    if (!formData.imageFile) {
      setError('Please select an image first')
      return
    }

    setUploadingImage(true)
    setError('')
    setSuccess('')

    try {
      const imageResponse = await api.studentProfile.uploadProfileImage(formData.imageFile)
      if (imageResponse.success && imageResponse.imageUrl) {
        // Revoke the blob URL to free memory
        if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
          URL.revokeObjectURL(formData.imageUrl)
        }
        setFormData(prev => ({
          ...prev,
          imageUrl: imageResponse.imageUrl,
          imageFile: null, // Clear the file since it's uploaded
        }))
        setSuccess('Image uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error uploading image:', err)
      setError(err.message || 'Failed to upload image')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleResumeUpload = async () => {
    if (!formData.resumeFile) {
      setError('Please select a resume file first')
      return
    }

    setUploadingResume(true)
    setError('')
    setSuccess('')

    try {
      const resumeResponse = await api.studentProfile.uploadResume(formData.resumeFile)
      if (resumeResponse.success && resumeResponse.resumeUrl) {
        setFormData(prev => ({
          ...prev,
          resumeUrl: resumeResponse.resumeUrl,
          resumeFile: null, // Clear the file since it's uploaded
        }))
        setSuccess('Resume uploaded successfully!')
        setTimeout(() => setSuccess(''), 3000)
      }
    } catch (err) {
      console.error('Error uploading resume:', err)
      setError(err.message || 'Failed to upload resume')
    } finally {
      setUploadingResume(false)
    }
  }

  const addSkill = (e, type) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    const inputValue = skillInputs[type]?.trim()
    if (!inputValue) return

    setFormData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [type === 'language' ? 'languages' : type === 'framework' ? 'frameworks' : type === 'tool' ? 'tools' : 'softSkills']: [
          ...prev.skills[type === 'language' ? 'languages' : type === 'framework' ? 'frameworks' : type === 'tool' ? 'tools' : 'softSkills'],
          inputValue,
        ],
      },
    }))
    setSkillInputs(prev => ({ ...prev, [type]: '' }))
  }

  const removeSkill = (type, index) => {
    const key = type === 'language' ? 'languages' : type === 'framework' ? 'frameworks' : type === 'tool' ? 'tools' : 'softSkills'
    
    // Check total skills count
    const totalSkills = (formData.skills?.languages?.length || 0) +
                       (formData.skills?.frameworks?.length || 0) +
                       (formData.skills?.tools?.length || 0) +
                       (formData.skills?.softSkills?.length || 0)
    
    // Prevent removing the last skill if it's the only one
    if (totalSkills === 1) {
      setError('At least one skill is required. Please add another skill before removing this one.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      skills: {
        ...prev.skills,
        [key]: prev.skills[key].filter((_, i) => i !== index),
      },
    }))
    setError('') // Clear any previous errors
  }

  const addProject = (e) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setFormData(prev => ({
      ...prev,
      personalProjects: [
        ...prev.personalProjects,
        { projectTitle: '', description: '', techStack: '', role: '', githubLink: '', liveLink: '' },
      ],
    }))
  }

  const updateProject = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      personalProjects: prev.personalProjects.map((project, i) =>
        i === index ? { ...project, [field]: value } : project
      ),
    }))
  }

  const removeProject = (index) => {
    // Prevent removing the last project if it's the only one
    if (formData.personalProjects.length === 1) {
      setError('At least one project is required. Please add another project before removing this one.')
      return
    }
    
    setFormData(prev => ({
      ...prev,
      personalProjects: prev.personalProjects.filter((_, i) => i !== index),
    }))
    setError('') // Clear any previous errors
  }

  const addAchievement = (e, type) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setFormData(prev => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        [type]: [
          ...prev.achievements[type],
          { title: '', description: '', issuer: '', date: '', link: '' },
        ],
      },
    }))
  }

  const updateAchievement = (type, index, field, value) => {
    setFormData(prev => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        [type]: prev.achievements[type].map((achievement, i) =>
          i === index ? { ...achievement, [field]: value } : achievement
        ),
      },
    }))
  }

  const removeAchievement = (type, index) => {
    setFormData(prev => ({
      ...prev,
      achievements: {
        ...prev.achievements,
        [type]: prev.achievements[type].filter((_, i) => i !== index),
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    try {
      // Validate all required fields
      const missingFields = []
      
      // Identity & Contact
      if (!formData.fullName?.trim()) missingFields.push('Full Name')
      if (!formData.phone?.trim()) missingFields.push('Phone Number')
      if (!formData.imageUrl && !formData.imageFile) missingFields.push('Profile Image')
      
      // Education Details
      if (!formData.instituteName?.trim()) missingFields.push('College Name')
      if (!formData.courseTaken?.trim()) missingFields.push('Degree')
      if (!formData.currentYear?.trim()) missingFields.push('Current Year')
      if (!formData.currentSemester?.trim()) missingFields.push('Current Semester')
      if (!formData.graduationYear?.trim()) missingFields.push('Graduation Year')
      
      // Internship Information
      if (!formData.domainId) missingFields.push('Domain')
      if (!formData.internshipStartDate) missingFields.push('Internship Start Date')
      if (!formData.internshipEndDate) missingFields.push('Internship End Date')
      
      // Skills - check if at least one skill exists
      const totalSkills = (formData.skills?.languages?.length || 0) +
                         (formData.skills?.frameworks?.length || 0) +
                         (formData.skills?.tools?.length || 0) +
                         (formData.skills?.softSkills?.length || 0)
      if (totalSkills === 0) missingFields.push('Skills (at least one skill is required)')
      
      // Projects - check if at least one project with title exists
      const validProjects = formData.personalProjects.filter(p => p.projectTitle.trim())
      if (validProjects.length === 0) missingFields.push('Projects (at least one)')
      
      // Documents
      if (!formData.resumeUrl && !formData.resumeFile) missingFields.push('Resume')
      
      // If any required fields are missing, show error message
      if (missingFields.length > 0) {
        let errorMessage = ''
        if (missingFields.length === 1) {
          errorMessage = `The following field is required to complete your profile: ${missingFields[0]}. Please fill in this field before saving.`
        } else {
          const fieldsList = missingFields.join(', ')
          errorMessage = `The following fields are required to complete your profile: ${fieldsList}. Please fill in all required fields before saving.`
        }
        setError(errorMessage)
        setSaving(false)
        // Scroll to top to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' })
        return
      }

      // Upload profile image if changed
      if (formData.imageFile) {
        const imageResponse = await api.studentProfile.uploadProfileImage(formData.imageFile)
        if (imageResponse.success && imageResponse.imageUrl) {
          // Update form data with the server image URL
          // Revoke the blob URL to free memory
          if (formData.imageUrl && formData.imageUrl.startsWith('blob:')) {
            URL.revokeObjectURL(formData.imageUrl)
          }
          setFormData(prev => ({
            ...prev,
            imageUrl: imageResponse.imageUrl,
            imageFile: null, // Clear the file since it's uploaded
          }))
        }
      }

      // Upload resume if changed
      if (formData.resumeFile) {
        const resumeResponse = await api.studentProfile.uploadResume(formData.resumeFile)
        if (resumeResponse.success && resumeResponse.resumeUrl) {
          // Update form data with the server resume URL
          setFormData(prev => ({
            ...prev,
            resumeUrl: resumeResponse.resumeUrl,
            resumeFile: null, // Clear the file since it's uploaded
          }))
        }
      }

      // Update profile
      const updateData = {
        fullName: formData.fullName,
        phone: formData.phone,
        instituteName: formData.instituteName,
        courseTaken: formData.courseTaken,
        currentYear: formData.currentYear,
        currentSemester: formData.currentSemester,
        graduationYear: formData.graduationYear ? parseInt(formData.graduationYear) : null,
        domainId: formData.domainId ? parseInt(formData.domainId) : null,
        internshipStartDate: formData.internshipStartDate || null,
        internshipEndDate: formData.internshipEndDate || null,
        skills: formData.skills,
        personalProjects: validProjects,
        achievements: formData.achievements,
      }

      const response = await api.studentProfile.update(updateData)
      
      if (response.success) {
        setSuccess('Profile saved successfully!')
        // Check if this was the first time completing the profile
        // We'll check by seeing if profileCompleted changed from false to true
        const wasCompleted = formData.profileCompleted
        const isNowCompleted = response.profileCompleted
        
        // Always update user data in localStorage with profile completion status
        // This ensures other tabs can detect the change and stay in sync
        authService.updateUser({ profileCompleted: isNowCompleted })
        
        // Broadcast storage event to notify other tabs if status changed
        if (isNowCompleted !== wasCompleted) {
          // Use a custom event key to trigger storage event listener
          const eventKey = 'profile_completion_changed'
          const eventData = { profileCompleted: isNowCompleted, timestamp: Date.now() }
          localStorage.setItem(eventKey, JSON.stringify(eventData))
          
          // Also dispatch a custom event for same-tab updates
          window.dispatchEvent(new CustomEvent('profileCompletionChanged', { 
            detail: { profileCompleted: isNowCompleted } 
          }))
          
          // Remove the key immediately to allow future changes to trigger the event
          setTimeout(() => localStorage.removeItem(eventKey), 100)
        }
        
        // Update the profileCompleted flag in formData
        setFormData(prev => ({ ...prev, profileCompleted: isNowCompleted }))
        
        // Only redirect to dashboard if this was the first time completing the profile
        if (isNowCompleted && !wasCompleted) {
          // First time completion, redirect to dashboard
          setTimeout(() => {
            navigate(ROUTES.STUDENT.DASHBOARD, { replace: true })
          }, 1500)
        } else {
          // If already completed or just saved, switch to view mode immediately
          // Don't refresh data immediately - let the user see their saved changes
          // Data will refresh automatically when they switch tabs or come back
          setIsEditMode(false) // Switch back to view mode after saving
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (checking || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">{checking ? 'Checking access...' : 'Loading profile...'}</p>
        </div>
      </div>
    )
  }

  // Helper function to get domain name
  const getDomainName = (domainId) => {
    const domain = domains.find(d => String(d.id) === String(domainId))
    return domain ? domain.domainName : 'N/A'
  }

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    } catch {
      return dateString
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full lg:ml-64">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30 lg:static">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-4 min-w-0 flex-1">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 shrink-0"
                  aria-label="Toggle menu"
                >
                  <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 truncate">
                    My Profile
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 truncate">
                    {isEditMode ? 'Edit your profile information' : 'View your complete profile'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  authService.logout()
                  navigate(ROUTES.LOGIN)
                }}
                className="px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                  {isEditMode ? 'Edit Profile' : 'My Profile'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {isEditMode 
                    ? 'Update your profile information below.' 
                    : 'View your complete profile information.'}
                </p>
              </div>
              {!isEditMode && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              )}
            </div>

        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-4 rounded-lg mb-6 flex items-start gap-3 shadow-sm">
            <AlertCircle className="w-6 h-6 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Profile Incomplete</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {isEditMode ? (
          <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Identity & Contact */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Identity & Contact
            <span className="text-red-600">*</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email ID *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image *</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {formData.imageUrl ? (
                      <div className="relative">
                        <img
                          key={formData.imageUrl} // Force re-render when URL changes
                          src={(() => {
                            // If it's already a full URL (http/https) or blob URL, use it directly
                            if (formData.imageUrl.startsWith('http') || formData.imageUrl.startsWith('blob:')) {
                              return formData.imageUrl
                            }
                            // Otherwise, construct the full URL for server-hosted images
                            // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                            let filePath = formData.imageUrl;
                            if (formData.imageUrl.startsWith('/scholarflex/') || formData.imageUrl.startsWith('/students/')) {
                              filePath = `/uploads${formData.imageUrl}`;
                            } else if (!formData.imageUrl.startsWith('/uploads/')) {
                              filePath = `/uploads${formData.imageUrl}`;
                            }
                            // Remove /api from base URL if present, as static files are served from root
                            const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')
                            return `${baseUrl}${filePath}`
                          })()}
                          alt="Profile"
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 bg-gray-100"
                          style={{ display: 'block', minWidth: '80px', minHeight: '80px' }}
                          onLoad={() => {
                            // console.log('Image loaded successfully:', formData.imageUrl)
                          }}
                          required
                          onError={(e) => {
                            console.error('Failed to load image:', formData.imageUrl, e)
                            // Show error state but keep the element visible
                            e.target.style.opacity = '0.5'
                            e.target.style.borderColor = 'red'
                          }}
                        />
                        {formData.imageFile && !formData.imageUrl.startsWith('blob:') && (
                          <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10" title="Image uploaded to server">
                            ✓
                          </div>
                        )}
                        {formData.imageFile && formData.imageUrl.startsWith('blob:') && (
                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center z-10" title="Image selected, not yet uploaded">
                            !
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <span className="text-gray-400 text-xs text-center px-2">No Image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                        <span className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 w-fit">
                          <Upload className="w-4 h-4" />
                          {formData.imageUrl ? 'Change' : 'Select'} Image
                        </span>
                      </label>
                      <span className="text-xs text-gray-500 mt-1">Maximum size is 5MB</span>
                    </div>
                    {formData.imageFile && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={handleImageUpload}
                          disabled={uploadingImage}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-fit"
                        >
                          <Upload className="w-4 h-4" />
                          {uploadingImage ? 'Uploading...' : 'Upload Image'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Education Details */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Education Details<span className="text-red-600">*</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">College Name *</label>
                <input
                  type="text"
                  name="instituteName"
                  value={formData.instituteName}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Degree *</label>
                <input
                  type="text"
                  name="courseTaken"
                  value={formData.courseTaken}
                  onChange={handleInputChange}
                  placeholder="B.Tech / BCA / MCA etc."
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Year / Semester *</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    name="currentYear"
                    value={formData.currentYear}
                    onChange={handleInputChange}
                    placeholder="Year"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    name="currentSemester"
                    value={formData.currentSemester}
                    onChange={handleInputChange}
                    placeholder="Semester"
                    required
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year *</label>
                <input
                  type="number"
                  name="graduationYear"
                  value={formData.graduationYear}
                  onChange={handleInputChange}
                  min="2020"
                  max="2030"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Internship Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Internship Information<span className="text-red-600">*</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Domain *</label>
                <select
                  name="domainId"
                  value={formData.domainId}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select Domain</option>
                  {domains.map((domain) => (
                    <option key={domain.id} value={domain.id}>
                      {domain.domain_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internship Start Date *</label>
                <input
                  type="date"
                  name="internshipStartDate"
                  value={formData.internshipStartDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internship End Date *</label>
                <input
                  type="date"
                  name="internshipEndDate"
                  value={formData.internshipEndDate}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Skills */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
              Skills <span className="text-red-600">*</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Minimum one skill is required to complete your profile. You can add skills from any category (Programming Languages, Frameworks, Tools, or Soft Skills).
            </p>
            
            {/* Show warning if no skills added */}
            {(() => {
              const totalSkills = (formData.skills?.languages?.length || 0) +
                                 (formData.skills?.frameworks?.length || 0) +
                                 (formData.skills?.tools?.length || 0) +
                                 (formData.skills?.softSkills?.length || 0)
              return totalSkills === 0 ? (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <span className="font-medium">No skills added yet.</span> Please add at least one skill to complete your profile.
                  </p>
                </div>
              ) : null
            })()}
            
            {['language', 'framework', 'tool', 'softSkill'].map((type) => (
              <div key={type} className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                  {type === 'softSkill' ? 'Soft Skills' : type === 'language' ? 'Programming Languages' : type === 'framework' ? 'Frameworks / Libraries' : 'Tools / Technologies'}
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInputs[type]}
                    onChange={(e) => setSkillInputs(prev => ({ ...prev, [type]: e.target.value }))}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addSkill(e, type)
                      }
                    }}
                    placeholder={`Add ${type === 'softSkill' ? 'soft skill' : type}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={(e) => addSkill(e, type)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills[type === 'language' ? 'languages' : type === 'framework' ? 'frameworks' : type === 'tool' ? 'tools' : 'softSkills'].map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-full flex items-center gap-2"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(type, index)}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Section 5: Projects */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
              Projects <span className="text-red-600">*</span>
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Minimum one project is required to complete your profile. Each project must have a title.
            </p>
            
            {formData.personalProjects.length === 0 && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <span className="font-medium">No projects added yet.</span> Please add at least one project to complete your profile.
                </p>
              </div>
            )}
            
            {formData.personalProjects.map((project, index) => (
              <div key={index} className="mb-4 p-4 border border-gray-200 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium text-gray-900">Project {index + 1}</h3>
                  <button
                    type="button"
                    onClick={() => removeProject(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Title *</label>
                    <input
                      type="text"
                      value={project.projectTitle || ''}
                      onChange={(e) => updateProject(index, 'projectTitle', e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={project.description || ''}
                      onChange={(e) => updateProject(index, 'description', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tech Stack</label>
                    <input
                      type="text"
                      value={project.techStack || ''}
                      onChange={(e) => updateProject(index, 'techStack', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                    <input
                      type="text"
                      value={project.role || ''}
                      onChange={(e) => updateProject(index, 'role', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GitHub Link</label>
                    <input
                      type="url"
                      value={project.githubLink || ''}
                      onChange={(e) => updateProject(index, 'githubLink', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Live Link</label>
                    <input
                      type="url"
                      value={project.liveLink || ''}
                      onChange={(e) => updateProject(index, 'liveLink', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            ))}
            
            <button
              type="button"
              onClick={(e) => addProject(e)}
              className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Project
            </button>
          </div>

          {/* Section 6: Achievements & Certifications */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Achievements & Certifications
            </h2>
            
            {['hackathons', 'certifications', 'awards', 'competitions'].map((type) => (
              <div key={type} className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium text-gray-900 capitalize">{type}</h3>
                  <button
                    type="button"
                    onClick={(e) => addAchievement(e, type)}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                {formData.achievements[type].map((achievement, index) => (
                  <div key={index} className="mb-3 p-3 border border-gray-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">{type.slice(0, -1)} {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAchievement(type, index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
                        <input
                          type="text"
                          value={achievement.title || ''}
                          onChange={(e) => updateAchievement(type, index, 'title', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Issuer</label>
                        <input
                          type="text"
                          value={achievement.issuer || ''}
                          onChange={(e) => updateAchievement(type, index, 'issuer', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                          value={achievement.description || ''}
                          onChange={(e) => updateAchievement(type, index, 'description', e.target.value)}
                          rows={2}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                        <input
                          type="date"
                          value={achievement.date || ''}
                          onChange={(e) => updateAchievement(type, index, 'date', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Link</label>
                        <input
                          type="url"
                          value={achievement.link || ''}
                          onChange={(e) => updateAchievement(type, index, 'link', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Section 7: Documents */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              Documents<span className="text-red-600">*</span>
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Resume (PDF) *</label>
              <div className="flex flex-col gap-3">
                {formData.resumeUrl && (
                  <div className="flex items-center gap-2">
                    <a
                      href={(() => {
                        // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                        let filePath = formData.resumeUrl;
                        if (formData.resumeUrl.startsWith('/scholarflex/') || formData.resumeUrl.startsWith('/students/')) {
                          filePath = `/uploads${formData.resumeUrl}`;
                        } else if (!formData.resumeUrl.startsWith('/uploads/')) {
                          filePath = `/uploads${formData.resumeUrl}`;
                        }
                        // Remove /api from base URL if present, as static files are served from root
                        const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')
                        return `${baseUrl}${filePath}`
                      })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-800 underline flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      View Current Resume
                    </a>
                    {!formData.resumeFile && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">✓ Uploaded</span>
                    )}
                  </div>
                )}
                {formData.resumeFile && (
                  <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm text-gray-700 flex-1">{formData.resumeFile.name}</span>
                    <span className="text-xs text-yellow-600">Not uploaded yet</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={handleResumeChange}
                        className="hidden"
                      />
                      <span className="px-4 py-2 bg-green-600 w-fit text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        {formData.resumeUrl ? 'Change' : 'Select'} Resume
                      </span>
                    </label>
                    <span className="text-xs text-gray-500 mt-1">Maximum size is 10MB</span>
                  </div>
                  {formData.resumeFile && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={handleResumeUpload}
                        disabled={uploadingResume}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm w-fit"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingResume ? 'Uploading...' : 'Upload Resume'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="bg-white rounded-lg shadow-md p-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsEditMode(false)
                setError('')
                setSuccess('')
                // Reload profile data to discard changes
                window.location.reload()
              }}
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
        ) : (
          <ProfileViewMode 
            formData={formData} 
            domains={domains}
            getDomainName={getDomainName}
            formatDate={formatDate}
          />
        )}
          </div>
        </main>
      </div>
  )
}

