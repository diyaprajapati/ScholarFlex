import React, { useEffect, useState } from 'react'
import QuestionInput from './QuestionInput'

const SECTION_OPTIONS = [
  { label: 'Technical Section', value: 'Technical' },
  { label: 'Coding Section', value: 'Coding' },
  { label: 'Theory Section', value: 'Theory' },
  { label: 'Maths & Logical Reasoning Section', value: 'Maths & Logical Reasoning' },
]

const normalizeSectionName = (section) => {
  if (!section || typeof section !== 'string') return SECTION_OPTIONS[0].value
  const normalized = section.trim().toLowerCase()
  if (normalized === 'theory' || normalized === 'theory section') return 'Theory'
  if (normalized === 'technical' || normalized === 'technical section' || normalized === 'technical/coding' || normalized === 'technical coding') {
    return 'Technical'
  }
  if (normalized === 'coding' || normalized === 'coding section') return 'Coding'
  if (normalized === 'maths & logical reasoning' || normalized === 'maths and logical reasoning' || normalized === 'maths & logical reasoning section' || normalized === 'maths') {
    return 'Maths & Logical Reasoning'
  }
  return SECTION_OPTIONS[0].value // Default to Technical
}

const initialQuestion = {
  text: '',
  type: 'multiple-choice',
  weightage: 1,
  options: [''], // Always start with at least one option
  correctOptions: [],
  section: SECTION_OPTIONS[0].value,
}

export default function QuestionPaperForm({ onSubmit, initialData, onCancel, isEditMode = false, availableDomains = [] }) {
  const [activeSection, setActiveSection] = useState(SECTION_OPTIONS[0].value)
  const [isBasicInfoExpanded, setIsBasicInfoExpanded] = useState(true)
  // Convert sections to flat questions if sections exist
  const getInitialQuestions = () => {
    if (initialData?.sections && Array.isArray(initialData.sections)) {
      // Convert sections format to flat questions with section field
      const questions = [];
      initialData.sections.forEach(section => {
        if (section.questions && Array.isArray(section.questions)) {
          const normalizedSection = normalizeSectionName(section.name);
          section.questions.forEach(q => {
            questions.push({
              ...initialQuestion,
              ...q,
              section: normalizedSection || SECTION_OPTIONS[0].value,
            });
          });
        }
      });
      return questions.length > 0 ? questions : [initialQuestion];
    }

    if (initialData?.questions) {
      return initialData.questions.map((question) => ({
        ...initialQuestion,
        ...question,
        section: normalizeSectionName(question.section || question.sectionName) || SECTION_OPTIONS[0].value,
      }));
    }

    return [initialQuestion];
  };

  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    year: initialData?.year || new Date().getFullYear().toString(),
    semester: initialData?.semester || 'Spring',
    totalMarks: initialData?.totalMarks || 100,
    duration: initialData?.duration || 180,
    status: initialData?.status || 'draft',
    questions: getInitialQuestions(),
    domainIds: initialData?.domainIds || [],
  })

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || '',
        subject: initialData.subject || '',
        year: initialData.year || new Date().getFullYear().toString(),
        semester: initialData.semester || 'Spring',
        totalMarks: initialData.totalMarks || 100,
        duration: initialData.duration || 180,
        status: initialData.status || 'draft',
        questions: initialData.questions && initialData.questions.length > 0
          ? initialData.questions.map((question) => ({
              ...initialQuestion,
              ...question,
              section: normalizeSectionName(question.section || question.sectionName) || SECTION_OPTIONS[0].value,
            }))
          : [initialQuestion],
        domainIds: initialData.domainIds || [],
      }))
    }
  }, [initialData])

  const handleQuestionChange = (index, updatedQuestion) => {
    const newQuestions = [...formData.questions]
    const existingQuestion = newQuestions[index]
    
    // Preserve question ID if it exists (for edit mode)
    if (existingQuestion && existingQuestion.id) {
      updatedQuestion.id = existingQuestion.id
    }
    
    // Auto-set True/False options if type changed to true-false
    if (updatedQuestion.type === 'true-false' && (!updatedQuestion.options || updatedQuestion.options.length === 0)) {
      updatedQuestion.options = ['True', 'False']
      updatedQuestion.correctOptions = []
    }
    
    // Ensure at least one option for multiple/single choice
    if ((updatedQuestion.type === 'multiple-choice' || updatedQuestion.type === 'single-choice') && 
        (!updatedQuestion.options || updatedQuestion.options.length === 0)) {
      updatedQuestion.options = ['']
      updatedQuestion.correctOptions = []
    }
    
    updatedQuestion.section = normalizeSectionName(updatedQuestion.section) || SECTION_OPTIONS[0].value
    
    
    newQuestions[index] = updatedQuestion
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...initialQuestion, section: activeSection }],
    })
  }

  const handleRemoveQuestion = (index) => {
    if (formData.questions.length > 1) {
      const newQuestions = formData.questions.filter((_, i) => i !== index)
      setFormData({ ...formData, questions: newQuestions })
    }
  }

  const handleAddOption = (questionIndex) => {
    const newQuestions = [...formData.questions]
    if (!newQuestions[questionIndex].options) {
      newQuestions[questionIndex].options = []
    }
    newQuestions[questionIndex].options.push('')
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleDomainToggle = (domainId) => {
    let updatedDomains = []
    if (formData.domainIds.includes(domainId)) {
      updatedDomains = formData.domainIds.filter((id) => id !== domainId)
    } else {
      updatedDomains = [...formData.domainIds, domainId]
    }
    setFormData({ ...formData, domainIds: updatedDomains })
  }


  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter the question paper set name')
      return
    }

    if (!formData.domainIds || formData.domainIds.length === 0) {
      alert('Please select at least one domain')
      return
    }

    if (!formData.duration || formData.duration < 1) {
      alert('Please enter a valid duration in minutes')
      return
    }

    if (formData.questions.length === 0) {
      alert('Please add at least one question')
      return
    }

    // Validate each question
    for (let i = 0; i < formData.questions.length; i++) {
      const q = formData.questions[i]
      if (!q.text?.trim()) {
        alert(`Please enter question text for Question ${i + 1}`)
        return
      }
      if (!q.weightage || q.weightage < 1) {
        alert(`Please enter valid weightage for Question ${i + 1}`)
        return
      }
      if ((q.type === 'multiple-choice' || q.type === 'single-choice' || q.type === 'true-false')) {
        if (!q.options || q.options.length < 2) {
          alert(`Question ${i + 1} must have at least 2 options`)
          return
        }
        if (!q.correctOptions || q.correctOptions.length === 0) {
          alert(`Please select correct option(s) for Question ${i + 1}`)
          return
        }
      }
      if (!q.section || !normalizeSectionName(q.section)) {
        alert(`Question ${i + 1} must be assigned to a valid section`)
        return
      }
    }

    // Calculate total marks
    const calculatedTotalMarks = formData.questions.reduce((sum, q) => sum + (q.weightage || 0), 0)
    
    // Group questions by section for new format
    const questionsBySection = {};
    formData.questions.forEach(q => {
      const normalizedSection = normalizeSectionName(q.section);
      if (!normalizedSection) return;
      if (!questionsBySection[normalizedSection]) {
        questionsBySection[normalizedSection] = [];
      }
      questionsBySection[normalizedSection].push({
        ...q,
        section: normalizedSection,
      });
    });

    // Convert to sections format
    const sections = Object.keys(questionsBySection).map(sectionName => ({
      name: sectionName,
      questions: questionsBySection[sectionName],
    }));
    
    onSubmit({
      ...formData,
      status: formData.status || 'draft',
      totalMarks: calculatedTotalMarks,
      totalQuestions: formData.questions.length,
      sections, // New format with sections
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Form Actions - Moved to Top */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm -mx-4 px-4 py-3 sm:py-4 mb-4 sm:mb-5 lg:mb-6">
        <div className="flex items-center justify-end gap-2 sm:gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="px-3 sm:px-4 lg:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ backgroundColor: '#4C763B' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#043915'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4C763B'}
          >
            {isEditMode ? 'Save Changes' : 'Add Paper Set'}
          </button>
        </div>
      </div>

      {/* Basic Information Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5">
        {/* Header - Clickable to toggle */}
        <button
          type="button"
          onClick={() => setIsBasicInfoExpanded(!isBasicInfoExpanded)}
          className="w-full flex items-center justify-between mb-3 sm:mb-4 text-left"
        >
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Basic Information</h2>
          <svg
            className={`h-5 w-5 sm:h-6 sm:w-6 text-gray-600 transition-transform duration-200 ${
              isBasicInfoExpanded ? 'transform rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Content - Conditionally rendered */}
        {isBasicInfoExpanded && (
          <div className="space-y-3 sm:space-y-4">
            <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Assign to Domains <span className="text-red-500">*</span>
          </label>
          {availableDomains.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {availableDomains.map((domain) => (
                <label
                  key={domain.id}
                  className="flex items-center gap-2 text-xs sm:text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 cursor-pointer hover:border-[#4C763B]"
                >
                  <input
                    type="checkbox"
                    checked={formData.domainIds.includes(domain.id)}
                    onChange={() => handleDomainToggle(domain.id)}
                    className="h-4 w-4 text-[#4C763B] border-gray-300 rounded focus:ring-[#4C763B]"
                  />
                  <span className="font-medium">{domain.domain_name}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="text-xs sm:text-sm text-gray-500 bg-white border border-dashed border-gray-300 rounded-lg px-3 py-2">
              No domains available. Please add domains first.
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Status <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
            Name of Question Paper Set <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Mathematics - Advanced Calculus"
            className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
            required
          />
        </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="e.g., Mathematics"
              className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Year <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              placeholder="e.g., 2024"
              className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Semester <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.semester}
              onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
              className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
              required
            >
              <option value="Spring">Spring</option>
              <option value="Summer">Summer</option>
              <option value="Fall">Fall</option>
              <option value="Winter">Winter</option>
            </select>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Duration (minutes) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => {
                const value = Number(e.target.value)
                setFormData({
                  ...formData,
                  duration: Number.isFinite(value) && value > 0 ? Math.round(value) : 0,
                })
              }}
              placeholder="e.g., 180"
              min="1"
              className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#4C763B]/50 focus:border-[#4C763B] transition-colors"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
              Total Marks (Auto-calculated)
            </label>
            <input
              type="number"
              value={formData.questions.reduce((sum, q) => sum + (q.weightage || 0), 0)}
              readOnly
              className="w-full px-2.5 sm:px-3 lg:px-4 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
          </div>
          <div className="flex items-end">
            <p className="text-[10px] sm:text-xs text-gray-500">Total marks calculated from question weightages</p>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Questions Section with Tabs */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Questions</h2>
        </div>

        {/* Section Tabs - Horizontal Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
          {SECTION_OPTIONS.map((section) => {
            const sectionQuestions = formData.questions.filter(q => normalizeSectionName(q.section) === section.value)
            const isActive = activeSection === section.value
            return (
              <button
                key={section.value}
                type="button"
                onClick={() => setActiveSection(section.value)}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                  isActive
                    ? 'border-[#4C763B] bg-[#4C763B]/10 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex flex-col space-y-1 sm:space-y-2">
                  <h3 className={`text-xs sm:text-sm font-semibold ${
                    isActive ? 'text-[#4C763B]' : 'text-gray-700'
                  }`}>
                    {section.label}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">
                    {sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Questions for Active Section */}
        <div className="space-y-3 sm:space-y-4">
          {formData.questions
            .map((question, originalIndex) => ({ question, originalIndex }))
            .filter(({ question }) => normalizeSectionName(question.section) === activeSection)
            .map(({ question, originalIndex }) => (
              <div key={originalIndex} className="space-y-2 sm:space-y-3">
                <QuestionInput
                  question={question}
                  index={originalIndex}
                  onChange={(updatedQuestion) => handleQuestionChange(originalIndex, updatedQuestion)}
                  onRemove={formData.questions.length > 1 ? () => handleRemoveQuestion(originalIndex) : null}
                  onAddOption={() => handleAddOption(originalIndex)}
                />
              </div>
            ))}
          
          {/* Add Question Button - Only show for active section */}
          <button
            type="button"
            onClick={handleAddQuestion}
            className="w-full py-2 sm:py-2.5 lg:py-3 px-3 sm:px-4 border-2 border-dashed rounded-lg text-xs sm:text-sm font-medium text-[#4C763B] transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
            style={{
              backgroundColor: 'rgba(76, 118, 59, 0.1)',
              borderColor: '#4C763B'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(76, 118, 59, 0.2)'
              e.currentTarget.style.borderColor = '#043915'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(76, 118, 59, 0.1)'
              e.currentTarget.style.borderColor = '#4C763B'
            }}
          >
            <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Question to {SECTION_OPTIONS.find(s => s.value === activeSection)?.label}
          </button>
        </div>
      </div>
    </form>
  )
}
