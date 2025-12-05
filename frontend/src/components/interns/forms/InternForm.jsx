import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { api } from '../../../services/api'

const internSchema = z.object({
  name: z.string().min(1, 'Name is required').min(2, 'Name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  domain: z.string().min(1, 'Domain is required'),
  status: z.string().min(1, 'Status is required'),
})

export default function InternForm({ onSubmit, onCancel, initialData = null, isEditMode = false }) {
  const [domains, setDomains] = useState([])
  const [isLoadingDomains, setIsLoadingDomains] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(internSchema),
    defaultValues: initialData || {
      name: '',
      email: '',
      domain: '',
      status: 'Pending',
    },
  })

  useEffect(() => {
    const fetchDomains = async () => {
      try {
        setIsLoadingDomains(true)
        const response = await api.domains.getAll()
        setDomains(response.data || [])
      } catch (error) {
        console.error('Error fetching domains:', error)
      } finally {
        setIsLoadingDomains(false)
      }
    }
    fetchDomains()
  }, [])

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        email: initialData.email || '',
        domain: initialData.domain || '',
        status: initialData.status || 'Pending',
      })
    }
  }, [initialData, reset])

  const handleFormSubmit = async (data) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5 sm:space-y-6 lg:space-y-7">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
          Full Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          {...register('name')}
          className={`w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-[#4C763B] transition-colors ${
            errors.name ? 'border-red-300' : 'border-gray-200'
          }`}
          placeholder="Enter full name"
        />
        {errors.name && (
          <p className="mt-1.5 text-xs sm:text-sm text-red-600">{errors.name.message}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label htmlFor="email" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
          Email Address <span className="text-red-500">*</span>
        </label>
        <input
          type="email"
          id="email"
          {...register('email')}
          className={`w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-[#4C763B] transition-colors ${
            errors.email ? 'border-red-300' : 'border-gray-200'
          }`}
          placeholder="Enter email address"
        />
        {errors.email && (
          <p className="mt-1.5 text-xs sm:text-sm text-red-600">{errors.email.message}</p>
        )}
      </div>

      {/* Domain Field */}
      <div>
        <label htmlFor="domain" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
          Domain <span className="text-red-500">*</span>
        </label>
        <select
          id="domain"
          {...register('domain')}
          disabled={isLoadingDomains}
          className={`w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-[#4C763B] transition-colors bg-white ${
            errors.domain ? 'border-red-300' : 'border-gray-200'
          } ${isLoadingDomains ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <option value="">{isLoadingDomains ? 'Loading domains...' : 'Select Domain'}</option>
          {domains.map((domain) => (
            <option key={domain.id} value={domain.id}>
              {domain.domain_name}
            </option>
          ))}
        </select>
        {errors.domain && (
          <p className="mt-1.5 text-xs sm:text-sm text-red-600">{errors.domain.message}</p>
        )}
      </div>

      {/* Status Field */}
      <div>
        <label htmlFor="status" className="block text-sm sm:text-base font-semibold text-gray-900 mb-2">
          Status <span className="text-red-500">*</span>
        </label>
        <select
          id="status"
          {...register('status')}
          className={`w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 rounded-lg focus:ring-2 focus:ring-[#4C763B] focus:border-[#4C763B] transition-colors bg-white ${
            errors.status ? 'border-red-300' : 'border-gray-200'
          }`}
        >
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Pending">Pending</option>
        </select>
        {errors.status && (
          <p className="mt-1.5 text-xs sm:text-sm text-red-600">{errors.status.message}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-5 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base font-semibold text-gray-700 bg-gray-50 border-2 border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 px-4 sm:px-5 lg:px-6 py-2.5 sm:py-3 lg:py-3.5 text-sm sm:text-base font-semibold text-white rounded-lg transition-colors shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#4C763B' }}
          onMouseEnter={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#043915')}
          onMouseLeave={(e) => !isSubmitting && (e.currentTarget.style.backgroundColor = '#4C763B')}
        >
          {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Intern'}
        </button>
      </div>
    </form>
  )
}

