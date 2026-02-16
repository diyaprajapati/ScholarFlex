import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';
import { Mail, User, Phone, Building2, BookOpen, Calendar, FileText, Loader2, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { ROUTES } from '../config/paths';

// Zod validation schema for candidate registration
// Matches admin form requirements: full_name, email, phone, domain (via domain_id or area_of_interests), 
// institute_name, course_taken, internship_start_date, internship_end_date, internship_duration are required
const candidateRegistrationSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Full name must be at least 2 characters')
    .max(255, 'Full name must be less than 255 characters')
    .trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .refine(
      (val) => {
        const digitsOnly = val.replace(/\D/g, '');
        return digitsOnly.length === 10;
      },
      'Phone number must have exactly 10 digits'
    )
    .transform((val) => val.replace(/\D/g, '')), // Store only digits
  domain_id: z
    .string()
    .optional(),
  area_of_interests: z
    .string()
    .optional()
    .transform((val) => val?.trim() || ''),
  institute_name: z
    .string()
    .min(1, 'Institute name is required')
    .max(255, 'Institute name must be less than 255 characters')
    .trim(),
  course_taken: z
    .string()
    .min(1, 'Course taken is required')
    .max(255, 'Course name must be less than 255 characters')
    .trim(),
  internship_start_date: z
    .string()
    .min(1, 'Internship start date is required')
    .refine(
      (val) => !isNaN(Date.parse(val)),
      'Please enter a valid start date'
    ),
  internship_end_date: z
    .string()
    .min(1, 'Internship end date is required')
    .refine(
      (val) => !isNaN(Date.parse(val)),
      'Please enter a valid end date'
    ),
  internship_duration: z
    .string()
    .min(1, 'Internship duration is required')
    .max(50, 'Duration must be less than 50 characters')
    .trim(),
  reference_information: z
    .string()
    .optional()
    .transform((val) => val?.trim() || ''),
  internal_faculty_name: z
    .string()
    .max(255, 'Faculty name must be less than 255 characters')
    .optional()
    .transform((val) => val?.trim() || ''),
  faculty_contact: z
    .string()
    .max(20, 'Contact must be less than 20 characters')
    .optional()
    .transform((val) => val?.trim() || ''),
  faculty_email: z
    .string()
    .email('Please enter a valid faculty email')
    .optional()
    .or(z.literal(''))
    .transform((val) => val?.trim() || ''),
}).refine(
  (data) => {
    // Domain is required: either domain_id (from dropdown) or area_of_interests (when "Other" is selected)
    if (!data.domain_id || data.domain_id === '__other__') {
      // If "Other" is selected or nothing selected, area_of_interests must be provided
      if (!data.area_of_interests || data.area_of_interests.trim() === '') {
        return false;
      }
    }
    return true;
  },
  {
    message: 'Please select a domain or enter a new one',
    path: ['area_of_interests'],
  }
).refine(
  (data) => {
    // End date must be after or equal to start date
    if (data.internship_start_date && data.internship_end_date) {
      const start = new Date(data.internship_start_date);
      const end = new Date(data.internship_end_date);
      return end >= start;
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['internship_end_date'],
  }
);

const initialForm = {
  full_name: '',
  email: '',
  phone: '',
  domain_id: '',
  area_of_interests: '',
  institute_name: '',
  course_taken: '',
  internship_start_date: '',
  internship_end_date: '',
  internship_duration: '',
  reference_information: '',
  internal_faculty_name: '',
  faculty_contact: '',
  faculty_email: '',
};

export default function CandidateRegistrationPage() {
  const [enabled, setEnabled] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [domains, setDomains] = useState([]);
  const [institutes, setInstitutes] = useState([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [domainSelectValue, setDomainSelectValue] = useState('');
  const [instituteSelectValue, setInstituteSelectValue] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.public.getCandidateRegistrationEnabled();
        if (!cancelled) setEnabled(!!res.enabled);
      } catch (_) {
        if (!cancelled) setEnabled(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch domains and institutes
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        setIsLoadingDomains(true);
        const domainsRes = await api.public.getDomains();
        if (!cancelled) setDomains(domainsRes.domains || domainsRes.data || []);
      } catch (err) {
        console.error('Error fetching domains:', err);
      } finally {
        if (!cancelled) setIsLoadingDomains(false);
      }
    })();
    (async () => {
      try {
        setIsLoadingInstitutes(true);
        const institutesRes = await api.public.getInstitutesStats();
        if (!cancelled) setInstitutes(institutesRes.institutes || institutesRes.data || []);
      } catch (err) {
        console.error('Error fetching institutes:', err);
      } finally {
        if (!cancelled) setIsLoadingInstitutes(false);
      }
    })();
    return () => { cancelled = true; };
  }, [enabled]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    // Remove all non-digit characters
    const digitsOnly = value.replace(/\D/g, '');
    // Limit to 10 digits
    const limitedValue = digitsOnly.slice(0, 10);
    setFormData((prev) => ({ ...prev, phone: limitedValue }));
    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
  };

  const handleDomainChange = (e) => {
    const value = e.target.value;
    setDomainSelectValue(value);
    if (value === '__other__') {
      setFormData((prev) => ({ ...prev, domain_id: '', area_of_interests: '' }));
    } else {
      setFormData((prev) => ({ ...prev, domain_id: value, area_of_interests: '' }));
    }
    if (errors.domain_id || errors.area_of_interests) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.domain_id;
        delete newErrors.area_of_interests;
        return newErrors;
      });
    }
  };

  const handleInstituteChange = (e) => {
    const value = e.target.value;
    setInstituteSelectValue(value);
    if (value === '__other__') {
      setFormData((prev) => ({ ...prev, institute_name: '' }));
    } else {
      setFormData((prev) => ({ ...prev, institute_name: value }));
    }
    if (errors.institute_name) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.institute_name;
        return newErrors;
      });
    }
  };

  const validate = () => {
    try {
      // Validate using Zod schema
      candidateRegistrationSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError && error.errors && Array.isArray(error.errors)) {
        const newErrors = {};
        error.errors.forEach((err) => {
          if (err.path && err.path.length > 0) {
            newErrors[err.path[0]] = err.message;
          }
        });
        setErrors(newErrors);
        // Scroll to first error field
        const firstErrorField = Object.keys(newErrors)[0];
        if (firstErrorField) {
          setTimeout(() => {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
            }
          }, 100);
        }
      } else {
        // Show generic error only if we can't parse Zod errors
        console.error('Validation error:', error);
        setErrors({ submit: 'Please check all required fields and try again.' });
      }
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    setErrors({});
    try {
      // Parse and transform data using Zod schema
      const validatedData = candidateRegistrationSchema.parse(formData);
      
      // For domain: if domain_id is selected, get the domain name; otherwise use area_of_interests (for "Other")
      let domainValue = validatedData.area_of_interests;
      if (validatedData.domain_id && validatedData.domain_id !== '__other__' && domains && Array.isArray(domains)) {
        const selectedDomain = domains.find(d => String(d.id) === validatedData.domain_id);
        if (selectedDomain) {
          domainValue = selectedDomain.domain_name;
        }
      }
      
      // Prepare payload (convert empty strings to undefined)
      const payload = {
        full_name: validatedData.full_name,
        email: validatedData.email,
        phone: validatedData.phone || undefined,
        institute_name: validatedData.institute_name || undefined,
        course_taken: validatedData.course_taken || undefined,
        area_of_interests: domainValue || undefined,
        internship_start_date: validatedData.internship_start_date || undefined,
        internship_end_date: validatedData.internship_end_date || undefined,
        internship_duration: validatedData.internship_duration || undefined,
        reference_information: validatedData.reference_information || undefined,
        internal_faculty_name: validatedData.internal_faculty_name || undefined,
        faculty_contact: validatedData.faculty_contact || undefined,
        faculty_email: validatedData.faculty_email || undefined,
      };
      
      await api.public.registerCandidate(payload);
      setSuccessMessage('Registration successful. You can log in as an intern once your account is activated.');
      setFormData(initialForm);
      setDomainSelectValue('');
      setInstituteSelectValue('');
    } catch (err) {
      console.error('Registration error:', err);
      
      if (err instanceof z.ZodError && err.errors && Array.isArray(err.errors)) {
        // Handle Zod validation errors - show field-specific errors
        const newErrors = {};
        err.errors.forEach((error) => {
          if (error.path && error.path.length > 0) {
            newErrors[error.path[0]] = error.message;
          }
        });
        setErrors(newErrors);
        // Scroll to first error field
        setTimeout(() => {
          const firstErrorField = Object.keys(newErrors)[0];
          if (firstErrorField) {
            const element = document.querySelector(`[name="${firstErrorField}"]`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
              element.focus();
            }
          }
        }, 100);
      } else {
        // Handle API errors
        const errorMessage = err.message || 'Registration failed. Please try again.';
        
        // Common error messages that should be shown clearly
        const commonErrors = {
          'This email is already registered': 'This email is already registered. Please use a different email address.',
          'Registrations are currently closed': 'Registrations are currently closed. Please check back later.',
          'Invalid email format': 'Please enter a valid email address.',
          'Full name and email are required': 'Full name and email are required fields.',
        };
        
        // Check if it's a common error
        let displayMessage = errorMessage;
        for (const [key, value] of Object.entries(commonErrors)) {
          if (errorMessage.includes(key)) {
            displayMessage = value;
            break;
          }
        }
        
        // Try to extract field-specific errors from detailed error messages
        const newErrors = {};
        if (errorMessage.includes('\n\n')) {
          const parts = errorMessage.split('\n\n');
          const details = parts[1] || '';
          const lines = details.split('\n');
          
          lines.forEach((line) => {
            // Try to match express-validator format: "param: msg" or "Row X: message (param)"
            const match = line.match(/(?:Row \d+: )?(.+?)(?: \((.+?)\))?/);
            if (match) {
              const [, message, param] = match;
              if (param) {
                // Map backend field names to frontend field names
                const fieldMap = {
                  'full_name': 'full_name',
                  'email': 'email',
                  'phone': 'phone',
                  'institute_name': 'institute_name',
                  'course_taken': 'course_taken',
                  'area_of_interests': 'area_of_interests',
                  'internship_start_date': 'internship_start_date',
                  'internship_end_date': 'internship_end_date',
                  'internship_duration': 'internship_duration',
                };
                const frontendField = fieldMap[param] || param;
                newErrors[frontendField] = message.trim();
              }
            }
          });
        }
        
        if (Object.keys(newErrors).length > 0) {
          // Show field-specific errors
          setErrors(newErrors);
          setTimeout(() => {
            const firstErrorField = Object.keys(newErrors)[0];
            if (firstErrorField) {
              const element = document.querySelector(`[name="${firstErrorField}"]`);
              if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                element.focus();
              }
            }
          }, 100);
        } else {
          // Show general error message
          setErrors({ submit: displayMessage });
          setTimeout(() => {
            const formElement = document.querySelector('form');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#4C763B] animate-spin" />
      </div>
    );
  }

  if (!enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl shadow-md p-8">
          <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-gray-500 font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Registrations are closed</h1>
          <p className="text-gray-600 mb-6">Candidate registration is currently not open. Please check back later.</p>
          <Link
            to={ROUTES.LANDING}
            className="inline-flex items-center gap-2 text-[#4C763B] font-medium hover:underline"
          >
            Back to home <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (successMessage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center bg-white rounded-xl shadow-md p-8">
          <div className="w-16 h-16 bg-[#4C763B] rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">S</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank you</h1>
          <p className="text-gray-600 mb-6">{successMessage}</p>
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 bg-[#4C763B] text-white px-6 py-2.5 rounded-full font-medium hover:bg-[#3a5c2d]"
          >
            Intern Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          {/* <div className="w-14 h-14 bg-[#4C763B] rounded-lg flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold text-xl">S</span>
          </div> */}
          <h1 className="text-2xl font-bold text-gray-900">Internship candidate registration</h1>
          <p className="text-gray-600 mt-1">Academic year is set automatically from your internship dates.</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {errors.submit && (
              <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <div className="font-medium mb-1">Error:</div>
                <div>{errors.submit}</div>
                {errors._details && (
                  <div className="mt-2 pt-2 border-t border-red-200 text-xs">
                    <div className="font-medium mb-1">Details:</div>
                    <pre className="whitespace-pre-wrap text-xs">{errors._details}</pre>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name <span className="text-red-500">*</span></label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.full_name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="Your full name"
                    required
                  />
                </div>
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    name="phone"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    maxLength={10}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="10 digit phone number"
                    required
                  />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institute name <span className="text-red-500">*</span></label>
                <select
                  value={instituteSelectValue}
                  onChange={handleInstituteChange}
                  disabled={isLoadingInstitutes}
                  className={`mb-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white ${
                    isLoadingInstitutes ? 'opacity-50 cursor-not-allowed' : ''
                  } ${errors.institute_name ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                >
                  <option value="">
                    {isLoadingInstitutes ? 'Loading institutes...' : 'Select Institute'}
                  </option>
                  {institutes.map((inst) => (
                    <option key={inst.institute_name} value={inst.institute_name}>
                      {inst.institute_name} {inst.student_count ? `(${inst.student_count} students)` : ''}
                    </option>
                  ))}
                  <option value="__other__">Other (add new institute)</option>
                </select>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="institute_name"
                    value={formData.institute_name}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.institute_name ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder={instituteSelectValue === '__other__' ? 'Type institute name' : 'Select or type institute name'}
                    required
                  />
                </div>
                {errors.institute_name && <p className="text-red-500 text-xs mt-1">{errors.institute_name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Course <span className="text-red-500">*</span></label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="course_taken"
                    value={formData.course_taken}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.course_taken ? 'border-red-500' : 'border-gray-300'}`}
                    placeholder="e.g. B.Tech CSE"
                    required
                  />
                </div>
                {errors.course_taken && <p className="text-red-500 text-xs mt-1">{errors.course_taken}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Area of interest / Domain <span className="text-red-500">*</span></label>
              <select
                value={domainSelectValue}
                onChange={handleDomainChange}
                disabled={isLoadingDomains}
                className={`mb-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white ${
                  isLoadingDomains ? 'opacity-50 cursor-not-allowed' : ''
                } ${errors.domain_id || errors.area_of_interests ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
              >
                <option value="">
                  {isLoadingDomains ? 'Loading domains...' : 'Select Domain'}
                </option>
                {domains.map((domain) => (
                  <option key={domain.id} value={domain.id}>
                    {domain.domain_name}
                  </option>
                ))}
                <option value="__other__">Other (add new domain)</option>
              </select>
              {domainSelectValue === '__other__' && (
                <input
                  type="text"
                  name="area_of_interests"
                  value={formData.area_of_interests}
                  onChange={handleChange}
                  className={`block w-full px-3 py-2 border rounded-lg ${errors.area_of_interests ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="e.g. Web Development, Data Science"
                  required
                />
              )}
              {(errors.domain_id || errors.area_of_interests) && (
                <p className="text-red-500 text-xs mt-1">{errors.domain_id || errors.area_of_interests}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internship start date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="internship_start_date"
                    value={formData.internship_start_date}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.internship_start_date ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                </div>
                {errors.internship_start_date && <p className="text-red-500 text-xs mt-1">{errors.internship_start_date}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internship end date <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    name="internship_end_date"
                    value={formData.internship_end_date}
                    onChange={handleChange}
                    className={`block w-full pl-10 pr-3 py-2 border rounded-lg ${errors.internship_end_date ? 'border-red-500' : 'border-gray-300'}`}
                    required
                  />
                </div>
                {errors.internship_end_date && <p className="text-red-500 text-xs mt-1">{errors.internship_end_date}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internship duration <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="internship_duration"
                value={formData.internship_duration}
                onChange={handleChange}
                className={`block w-full px-3 py-2 border rounded-lg ${errors.internship_duration ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="e.g. 6 months"
                required
              />
              {errors.internship_duration && <p className="text-red-500 text-xs mt-1">{errors.internship_duration}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference information</label>
              <textarea
                name="reference_information"
                value={formData.reference_information}
                onChange={handleChange}
                rows={2}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Reference must be of company person"
              />
            </div>

            <div className="border-t border-gray-200 pt-5">
              <p className="text-sm font-medium text-gray-700 mb-3">Faculty contact</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Faculty name <span className="text-red-500">*</span></label>

                  <input
                    type="text"
                    name="internal_faculty_name"
                    value={formData.internal_faculty_name}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Contact</label>
                  <input
                    type="text"
                    name="faculty_contact"
                    value={formData.faculty_contact}
                    onChange={handleChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input
                    type="email"
                    name="faculty_email"
                    value={formData.faculty_email}
                    onChange={handleChange}
                    className={`block w-full px-3 py-2 border rounded-lg text-sm ${errors.faculty_email ? 'border-red-500' : 'border-gray-300'}`}
                  />
                  {errors.faculty_email && <p className="text-red-500 text-xs mt-1">{errors.faculty_email}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 bg-[#4C763B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#3a5c2d] disabled:opacity-60"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {isSubmitting ? 'Submitting...' : 'Submit registration'}
              </button>
              <Link
                to={ROUTES.LANDING}
                className="flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900 py-3"
              >
                Back to home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
