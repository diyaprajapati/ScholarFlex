import React, { useEffect, useState } from 'react'
import QuestionInput from './QuestionInput'

const initialQuestion = {
  text: '',
  type: 'multiple-choice',
  weightage: 1,
  options: [''], // Always start with at least one option
  correctOptions: [],
  correctAnswer: '',
}

export default function QuestionPaperForm({ onSubmit, initialData, onCancel, isEditMode = false, availableDomains = [] }) {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    subject: initialData?.subject || '',
    year: initialData?.year || new Date().getFullYear().toString(),
    semester: initialData?.semester || 'Spring',
    totalMarks: initialData?.totalMarks || 100,
    duration: initialData?.duration || 180,
    status: initialData?.status || 'draft',
    questions: initialData?.questions || [initialQuestion],
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
        questions: initialData.questions && initialData.questions.length > 0 ? initialData.questions : [initialQuestion],
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
    
    // Clear options if type changed away from multiple/single choice
    if (updatedQuestion.type === 'short-answer') {
      updatedQuestion.options = []
      updatedQuestion.correctOptions = []
    }
    
    newQuestions[index] = updatedQuestion
    setFormData({ ...formData, questions: newQuestions })
  }

  const handleAddQuestion = () => {
    setFormData({
      ...formData,
      questions: [...formData.questions, { ...initialQuestion }],
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
      if (q.type === 'short-answer' && !q.correctAnswer?.trim()) {
        alert(`Please enter correct answer for Question ${i + 1}`)
        return
      }
    }

    // Calculate total marks
    const calculatedTotalMarks = formData.questions.reduce((sum, q) => sum + (q.weightage || 0), 0)
    
    onSubmit({
      ...formData,
      status: formData.status || 'draft',
      totalMarks: calculatedTotalMarks,
      totalQuestions: formData.questions.length,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5 lg:space-y-6">
      {/* Basic Information Section */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 lg:p-5 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Basic Information</h2>
        
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
              onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
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

      {/* Questions Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900">Questions</h2>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {formData.questions.map((question, index) => (
            <div key={index} className="space-y-2 sm:space-y-3">
              <QuestionInput
                question={question}
                index={index}
                onChange={(updatedQuestion) => handleQuestionChange(index, updatedQuestion)}
                onRemove={formData.questions.length > 1 ? () => handleRemoveQuestion(index) : null}
                onAddOption={() => handleAddOption(index)}
              />

              {/* Add Question Button - Below each question */}
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
                Add Question
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t border-gray-200">
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
    </form>
  )
}
