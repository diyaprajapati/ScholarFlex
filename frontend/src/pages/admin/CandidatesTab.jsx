import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { 
  X, User, Mail, Phone, Building2, GraduationCap, Calendar, 
  Award, Briefcase, FileText, Link as LinkIcon, CheckCircle, 
  XCircle, Clock, Star, Code, Wrench, Users, Trophy, ExternalLink
} from 'lucide-react';

const CandidatesTab = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [domains, setDomains] = useState([]);
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [institutes, setInstitutes] = useState([]);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(false);
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [failedImages, setFailedImages] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState('');
  const [filters, setFilters] = useState({
    instituteName: '',
    courseTaken: [], // Array of selected courses
    domain: [], // Array of selected domain IDs
    testGiven: '', // 'yes', 'no', or ''
    marksRange: '', // 'below70', 'above70', or ''
    selected: '', // 'yes', 'no', or ''
    referencePresence: '', // 'yes', 'no', or '' (has reference or not)
    referenceText: '', // free text search within reference
    startDate: '',
    endDate: '',
    testDateStart: '', // Test date filter start
    testDateEnd: '', // Test date filter end
    internshipStatus: '', // 'NOT_STARTED', 'ONGOING', 'COMPLETED', or ''
  });
  const itemsPerPage = 10;
  const fileInputRef = useRef(null);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.candidates.getAll(
        selectedAcademicYear ? { academic_year: selectedAcademicYear } : {}
      );
      setStudents(response.candidates || []);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to fetch students');
      console.error('Error fetching students:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAcademicYear]);

  const fetchDomains = useCallback(async () => {
    try {
      setIsLoadingDomains(true);
      const response = await api.domains.getAll();
      // API returns both 'data' and 'domains' for backward compatibility
      setDomains(response.domains || response.data || []);
    } catch (err) {
      console.error('Error fetching domains:', err);
    } finally {
      setIsLoadingDomains(false);
    }
  }, []);

  const fetchInstitutes = useCallback(async () => {
    try {
      setIsLoadingInstitutes(true);
      const response = await api.institutes.getStats();
      setInstitutes(response.institutes || response.data || []);
    } catch (err) {
      console.error('Error fetching institutes:', err);
    } finally {
      setIsLoadingInstitutes(false);
    }
  }, []);

  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await api.candidates.getAcademicYears();
      setAcademicYears(response.academic_years || []);
    } catch (err) {
      console.error('Error fetching academic years:', err);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
    fetchDomains();
    fetchInstitutes();
    fetchAcademicYears();
  }, [fetchStudents, fetchDomains, fetchInstitutes, fetchAcademicYears]);

  const fetchStudentDetails = useCallback(async (id) => {
    try {
      const response = await api.candidates.getById(id);
      setSelectedStudent(response.student);
      setShowDetailsModal(true);
    } catch (err) {
      alert(err.message || 'Failed to fetch student details');
      console.error('Error fetching student details:', err);
    }
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setError('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setUploadResult(null);
      
      const response = await api.candidates.uploadSpreadsheet(file);
      
      if (response.success) {
        setUploadResult({
          success: true,
          message: response.message,
          data: response.data,
        });
        setSuccess(response.message);
        fetchStudents();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Upload error:', err);
      // Format error message properly
      let errorMessage = err.message || 'Failed to upload spreadsheet. Please try again.';
      
      // If error has details, format them nicely
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        const errorDetails = err.response.data.errors
          .slice(0, 5) // Show first 5 errors
          .map((e, idx) => {
            if (typeof e === 'object' && e !== null) {
              return `Row ${e.row || idx + 1}: ${e.reason || e.message || 'Unknown error'}`;
            }
            return String(e);
          })
          .join('\n');
        
        if (err.response.data.errors.length > 5) {
          errorMessage = `${errorMessage}\n\nFirst 5 errors:\n${errorDetails}\n... and ${err.response.data.errors.length - 5} more errors.`;
        } else {
          errorMessage = `${errorMessage}\n\nErrors:\n${errorDetails}`;
        }
      }
      
      setError(errorMessage);
      setUploadResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [fetchStudents]);

  const handleGoogleSheetsImport = useCallback(async () => {
    if (!googleSheetsUrl.trim()) {
      setError('Please enter a Google Sheets URL');
      return;
    }

    try {
      setImporting(true);
      setError('');
      setSuccess('');
      
      const response = await api.candidates.importFromGoogleSheets(googleSheetsUrl);
      
      if (response.success) {
        setSuccess(response.message);
        setGoogleSheetsUrl('');
        setShowImportModal(false);
        fetchStudents();
        setTimeout(() => setSuccess(''), 5000);
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message || 'Failed to import from Google Sheets');
    } finally {
      setImporting(false);
    }
  }, [googleSheetsUrl, fetchStudents]);

  // Convert Google Drive link to embeddable format
  const getImageUrl = useCallback((url) => {
    if (!url) return null;
    
    // If it's already a full URL (http/https), use it directly
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // If it's a Google Drive URL
    if (url.includes('thumbnail?id=')) return url;
    
    const openMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    const fileMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    const fileId = openMatch ? openMatch[1] : (fileMatch ? fileMatch[1] : null);
    
    if (fileId) {
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
    }
    
    // If it's a relative path (uploaded file), construct full URL
    // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
    let filePath = url;
    if (url.startsWith('/scholarflex/') || url.startsWith('/students/')) {
      filePath = `/uploads${url}`;
    } else if (!url.startsWith('/uploads/')) {
      filePath = `/uploads${url}`;
    }
    
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    return baseUrl.replace('/api', '') + filePath;
  }, []);

  const formatDate = useCallback((dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'N/A';
    }
  }, []);

  // Helper function to split full name into first, middle, last
  const splitName = useCallback((fullName) => {
    if (!fullName) return { firstName: '', middleName: '', lastName: '' };
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], middleName: '', lastName: '' };
    } else if (parts.length === 2) {
      return { firstName: parts[0], middleName: '', lastName: parts[1] };
    } else {
      return {
        firstName: parts[0],
        middleName: parts.slice(1, -1).join(' '),
        lastName: parts[parts.length - 1]
      };
    }
  }, []);

  // Helper function to normalize a date to date-only (local time, no time component)
  const normalizeDate = useCallback((dateInput) => {
    // If it's a date string in YYYY-MM-DD format, parse it directly to avoid timezone issues
    if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
      const [year, month, day] = dateInput.split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    // Otherwise, create a Date object and normalize to date-only
    const d = new Date(dateInput);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Helper function to compare dates (date only, ignoring time)
  const compareDates = useCallback((date1, date2) => {
    const date1Only = normalizeDate(date1);
    const date2Only = normalizeDate(date2);
    return date1Only.getTime() - date2Only.getTime();
  }, [normalizeDate]);

  // Filter students by search query and all filters - memoized
  const filteredStudents = useMemo(() => {
    let result = [...students];

    // Apply search query filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(student => 
        student.full_name?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      );
    }

    // Apply institute name filter
    if (filters.instituteName) {
      result = result.filter(student =>
        student.institute_name?.toLowerCase().includes(filters.instituteName.toLowerCase())
      );
    }

    // Apply course taken filter (multiple courses)
    if (filters.courseTaken && filters.courseTaken.length > 0) {
      result = result.filter(student => {
        if (!student.course_taken) return false;
        return filters.courseTaken.some(course => 
          student.course_taken.toLowerCase() === course.toLowerCase()
        );
      });
    }

    // Apply domain filter (multiple domains)
    if (filters.domain && filters.domain.length > 0) {
      result = result.filter(student => {
        // Check if student has domain_id that matches selected domains
        if (student.domain_id !== null && student.domain_id !== undefined) {
          return filters.domain.includes(student.domain_id);
        }
        // Fallback: check domain_name if domain_id is not available
        if (student.domain_name || student.domain) {
          const domainName = (student.domain_name || student.domain || '').toLowerCase();
          return filters.domain.some(domainId => {
            const selectedDomain = domains.find(d => d.id === domainId);
            return selectedDomain && domainName === selectedDomain.domain_name.toLowerCase();
          });
        }
        return false;
      });
    }


    // Apply test given filter (marks > 0 means test given)
    if (filters.testGiven === 'yes') {
      result = result.filter(student => 
        typeof student.marks === 'number' && student.marks > 0
      );
    } else if (filters.testGiven === 'no') {
      result = result.filter(student => 
        !(typeof student.marks === 'number' && student.marks > 0)
      );
    }

    // Apply marks range filter
    if (filters.marksRange === 'below70') {
      result = result.filter(student => 
        student.marks !== null && student.marks !== undefined && student.marks < 70
      );
    } else if (filters.marksRange === 'above70') {
      result = result.filter(student => 
        student.marks !== null && student.marks !== undefined && student.marks >= 70
      );
    }

    // Apply selected filter
    if (filters.selected === 'yes') {
      result = result.filter(student => student.is_selected === true);
    } else if (filters.selected === 'no') {
      result = result.filter(student => !student.is_selected);
    }

    // Apply reference presence filter
    if (filters.referencePresence === 'yes') {
      result = result.filter(student => !!student.reference_information && student.reference_information.trim() !== '');
    } else if (filters.referencePresence === 'no') {
      result = result.filter(student => !student.reference_information || student.reference_information.trim() === '');
    }

    // Apply reference text filter
    if (filters.referenceText) {
      const refQuery = filters.referenceText.toLowerCase();
      result = result.filter(student =>
        student.reference_information?.toLowerCase().includes(refQuery)
      );
    }

    // Apply date range filters - EXACT DATE MATCH
    if (filters.startDate) {
      result = result.filter(student => {
        // Skip students without internship start date
        if (!student.internship_start_date) return false;
        
        try {
          const studentStartDate = new Date(student.internship_start_date);
          // Validate the date is valid
          if (isNaN(studentStartDate.getTime())) return false;
          
          const filterStartDate = new Date(filters.startDate);
          if (isNaN(filterStartDate.getTime())) return false;
          
          // Use compareDates helper for EXACT date match
          // compareDates returns: 0 if dates are equal (same day)
          return compareDates(studentStartDate, filterStartDate) === 0;
        } catch (error) {
          console.error('Error comparing start dates:', error, student.internship_start_date);
          return false;
        }
      });
    }

    if (filters.endDate) {
      result = result.filter(student => {
        // Skip students without internship end date
        if (!student.internship_end_date) return false;
        
        try {
          const studentEndDate = new Date(student.internship_end_date);
          // Validate the date is valid
          if (isNaN(studentEndDate.getTime())) return false;
          
          const filterEndDate = new Date(filters.endDate);
          if (isNaN(filterEndDate.getTime())) return false;
          
          // Use compareDates helper for EXACT date match
          // compareDates returns: 0 if dates are equal (same day)
          return compareDates(studentEndDate, filterEndDate) === 0;
        } catch (error) {
          console.error('Error comparing end dates:', error, student.internship_end_date);
          return false;
        }
      });
    }

    // Apply test date range filters
    if (filters.testDateStart || filters.testDateEnd) {
      result = result.filter(student => {
        // Skip students who haven't taken a test (no last_test_date)
        if (!student.last_test_date) return false;
        
        try {
          const studentTestDate = new Date(student.last_test_date);
          // Validate the date is valid
          if (isNaN(studentTestDate.getTime())) return false;
          
          // Check start date filter
          if (filters.testDateStart) {
            const startDate = new Date(filters.testDateStart);
            if (isNaN(startDate.getTime())) return false;
            if (compareDates(studentTestDate, startDate) < 0) return false;
          }
          
          // Check end date filter
          if (filters.testDateEnd) {
            const endDate = new Date(filters.testDateEnd);
            if (isNaN(endDate.getTime())) return false;
            if (compareDates(studentTestDate, endDate) > 0) return false;
          }
          
          return true;
        } catch (error) {
          console.error('Error comparing test dates:', error, student.last_test_date);
          return false;
        }
      });
    }

    // Apply internship status filter
    if (filters.internshipStatus) {
      result = result.filter(student => {
        return student.internship_status === filters.internshipStatus;
      });
    }

    return result;
  }, [students, searchQuery, filters, domains, compareDates]);

  // Pagination calculations - memoized (using filteredStudents)
  const totalPages = useMemo(() => Math.ceil(filteredStudents.length / itemsPerPage), [filteredStudents.length, itemsPerPage]);
  const startIndex = useMemo(() => (currentPage - 1) * itemsPerPage, [currentPage, itemsPerPage]);
  const endIndex = useMemo(() => startIndex + itemsPerPage, [startIndex, itemsPerPage]);
  const currentStudents = useMemo(() => filteredStudents.slice(startIndex, endIndex), [filteredStudents, startIndex, endIndex]);

  // Reset to page 1 when filtered students list changes or search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredStudents.length, searchQuery]);

  const handlePageChange = useCallback((page) => {
    setCurrentPage(page);
    // Scroll to top of table
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCloseDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  }, []);

  const handleCloseImportModal = useCallback(() => {
    setShowImportModal(false);
    setGoogleSheetsUrl('');
  }, []);

  const studentSchema = z.object({
    full_name: z
      .string()
      .min(1, 'Full name is required')
      .min(2, 'Full name must be at least 2 characters'),
    email: z
      .string()
      .min(1, 'Email is required')
      .email('Please enter a valid email address'),
    phone: z
      .string()
      .min(1, 'Phone number is required')
      .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits'),
    domain_id: z
      .string()
      .min(1, 'Please select a domain'),
    institute_name: z
      .string()
      .min(1, 'Institute name is required'),
    course_taken: z
      .string()
      .min(1, 'Course taken is required'),
    internship_start_date: z
      .string()
      .min(1, 'Start date is required'),
    internship_end_date: z
      .string()
      .min(1, 'End date is required'),
    internship_duration: z
      .string()
      .min(1, 'Internship duration is required'),
    reference_information: z.string().optional(),
    internal_faculty_name: z.string().optional(),
    faculty_contact: z.string().optional(),
    faculty_email: z.string().email('Please enter a valid faculty email').optional().or(z.literal('')),
    image_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  }).refine((data) => {
    if (!data.internship_start_date || !data.internship_end_date) return true;
    const start = new Date(data.internship_start_date);
    const end = new Date(data.internship_end_date);
    return end >= start;
  }, {
    message: 'End date cannot be before start date.',
    path: ['internship_end_date'],
  });

  const {
    register,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      domain_id: '',
      institute_name: '',
      course_taken: '',
      internship_start_date: '',
      internship_end_date: '',
      internship_duration: '',
      reference_information: '',
      internal_faculty_name: '',
      faculty_contact: '',
      faculty_email: '',
      image_url: '',
    },
  });

  const [instituteSelectValue, setInstituteSelectValue] = useState('');

  const handleOpenFormModal = useCallback((student = null) => {
    setEditingStudent(student);
    if (student) {
      reset({
        full_name: student.full_name || '',
        email: student.email || '',
        phone: student.phone || student.mobile_number || '',
        domain_id: student.domain_id ? String(student.domain_id) : '',
        institute_name: student.institute_name || '',
        course_taken: student.course_taken || '',
        internship_start_date: student.internship_start_date
          ? new Date(student.internship_start_date).toISOString().split('T')[0]
          : '',
        internship_end_date: student.internship_end_date
          ? new Date(student.internship_end_date).toISOString().split('T')[0]
          : '',
        internship_duration: student.internship_duration || '',
        reference_information: student.reference_information || '',
        internal_faculty_name: student.internal_faculty_name || '',
        faculty_contact: student.faculty_contact || '',
        faculty_email: student.faculty_email || '',
        image_url: student.image_url || '',
      });
      const normalized = (student.institute_name || '').trim().toLowerCase();
      const match = institutes.find(
        (i) => (i.institute_name || '').trim().toLowerCase() === normalized
      );
      setInstituteSelectValue(match ? match.institute_name : '__other__');
    } else {
      reset();
      setInstituteSelectValue('');
    }
    setShowFormModal(true);
  }, [reset, institutes]);

  const handleCloseFormModal = useCallback(() => {
    setShowFormModal(false);
    setEditingStudent(null);
    reset();
  }, [reset]);

  const handleFormSubmit = useCallback(async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmittingForm(true);

    try {
      const form = event.currentTarget;
      const formData = new FormData(form);

      const getValue = (name) => {
        const value = formData.get(name);
        if (value === null || value === undefined) return null;
        const str = value.toString().trim();
        return str === '' ? null : str;
      };

      const instituteNameValue = getValue('institute_name');

      const normalizedInstitute =
        (instituteNameValue || '').trim().toLowerCase();
      if (
        instituteSelectValue === '__other__' &&
        normalizedInstitute &&
        institutes.some(
          (i) =>
            (i.institute_name || '').trim().toLowerCase() ===
            normalizedInstitute
        )
      ) {
        setError(
          'This institute already exists. Please select it from the dropdown instead of adding as new.'
        );
        setIsSubmittingForm(false);
        return;
      }

      const studentData = {
        full_name: (getValue('full_name') || '').trim(),
        email: (getValue('email') || '').toLowerCase(),
        phone: getValue('phone') || '',
        domain_id: getValue('domain_id') || null,
        institute_name: instituteNameValue,
        course_taken: getValue('course_taken'),
        internship_start_date: getValue('internship_start_date'),
        internship_end_date: getValue('internship_end_date'),
        internship_duration: getValue('internship_duration'),
        reference_information: getValue('reference_information'),
        internal_faculty_name: getValue('internal_faculty_name'),
        faculty_contact: getValue('faculty_contact'),
        faculty_email: (() => {
          const v = getValue('faculty_email');
          return v ? v.toLowerCase() : null;
        })(),
        image_url: getValue('image_url'),
      };

      if (editingStudent) {
        await api.candidates.update(editingStudent.id, studentData);
        setSuccess('Student updated successfully!');
      } else {
        await api.candidates.create(studentData);
        setSuccess('Student added successfully!');
      }

      handleCloseFormModal();
      fetchStudents();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      const message = (err && typeof err === 'object' && 'message' in err) ? err.message : 'Failed to save student';
      setError(message || 'Failed to save student');
      console.error('Error saving student:', err);
    } finally {
      setIsSubmittingForm(false);
    }
  }, [editingStudent, fetchStudents, handleCloseFormModal, institutes, instituteSelectValue]);

  const handleOpenImportModal = useCallback(() => {
    setShowImportModal(true);
  }, []);

  const handleSelectionChange = useCallback(
    async (studentId, isSelected, options = {}) => {
      try {
        // Optimistically update the UI
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === studentId
              ? { ...student, is_selected: isSelected }
              : student
          )
        );

        // Update in database – only selection here.
        // Retest access (can_retest) is managed explicitly from the Retest Management page.
        await api.candidates.updateSelection(studentId, isSelected);
      } catch (err) {
        console.error('Error updating selection:', err);
        // Revert on error
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === studentId
              ? { ...student, is_selected: !isSelected }
              : student
          )
        );
        setError(err.message || 'Failed to update selection status');
        setTimeout(() => setError(''), 3000);
      }
    },
    []
  );

  const handleDeleteStudent = useCallback(
    async (studentId, studentName) => {
      // Confirm deletion
      const confirmed = window.confirm(
        `Are you sure you want to delete "${studentName}"? This action cannot be undone.`
      );

      if (!confirmed) {
        return;
      }

      try {
        // Delete student
        await api.candidates.delete(studentId);

        // Remove from local state
        setStudents(prevStudents =>
          prevStudents.filter(student => student.id !== studentId)
        );

        setSuccess(`Student "${studentName}" deleted successfully`);
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        console.error('Error deleting student:', err);
        setError(err.message || 'Failed to delete student');
        setTimeout(() => setError(''), 3000);
      }
    },
    []
  );

  const handleNOCStatusChange = useCallback(
    async (studentId, nocReceived) => {
      try {
        // Optimistically update the UI
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === studentId
              ? { ...student, noc_received: nocReceived }
              : student
          )
        );

        const response = await api.candidates.updateNOCStatus(studentId, nocReceived);
        
        if (response.success) {
          // console.log('✅ NOC status updated successfully:', {
          //   studentId,
          //   nocReceived,
          //   response: response.data,
          // });
        }
      } catch (err) {
        console.error('❌ Error updating NOC received status:', err);
        // Revert on error
        setStudents(prevStudents =>
          prevStudents.map(student =>
            student.id === studentId
              ? { ...student, noc_received: !nocReceived }
              : student
          )
        );
        setError(err.message || 'Failed to update NOC received status');
        setTimeout(() => setError(''), 3000);
      }
    },
    []
  );

  const handleImageError = useCallback((imageKey) => (e) => {
    // Prevent infinite loop by hiding the image and marking it as failed
    e.target.style.display = 'none';
    setFailedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(imageKey);
      return newSet;
    });
  }, []);

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      instituteName: '',
      courseTaken: [],
      domain: [],
      testGiven: '',
      marksRange: '',
      selected: '',
      referencePresence: '',
      referenceText: '',
      startDate: '',
      endDate: '',
      testDateStart: '',
      testDateEnd: '',
      internshipStatus: '',
    });
    setSearchQuery('');
  }, []);

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some(value => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      return value !== '';
    }) || searchQuery.trim() !== '';
  }, [filters, searchQuery]);

  // Get unique courses from students data
  const availableCourses = useMemo(() => {
    const coursesSet = new Set();
    students.forEach(student => {
      if (student.course_taken && student.course_taken.trim()) {
        coursesSet.add(student.course_taken.trim());
      }
    });
    return Array.from(coursesSet).sort();
  }, [students]);

  const handleCourseToggle = useCallback((course) => {
    setFilters(prev => {
      const currentCourses = prev.courseTaken || [];
      if (currentCourses.includes(course)) {
        return {
          ...prev,
          courseTaken: currentCourses.filter(c => c !== course),
        };
      } else {
        return {
          ...prev,
          courseTaken: [...currentCourses, course],
        };
      }
    });
  }, []);

  const handleDomainToggle = useCallback((domainId) => {
    setFilters(prev => {
      const currentDomains = prev.domain || [];
      if (currentDomains.includes(domainId)) {
        return {
          ...prev,
          domain: currentDomains.filter(d => d !== domainId),
        };
      } else {
        return {
          ...prev,
          domain: [...currentDomains, domainId],
        };
      }
    });
  }, []);

  const downloadExcel = useCallback(() => {
    // Prepare data for Excel export
    const excelData = filteredStudents.map(student => {
      const nameParts = splitName(student.full_name);
      const timestamp = student.created_at || student.registration_date || new Date().toISOString();
      
      return {
        'Timestamp': timestamp ? new Date(timestamp).toLocaleString() : '',
        'First Name': nameParts.firstName,
        'Middle Name': nameParts.middleName,
        'Last Name': nameParts.lastName,
        'Mobile Number (WhatsApp)': student.phone || student.mobile_number || '',
        'Email': student.email || '',
        'Name of Institute': student.institute_name || '',
        'Course Taken': student.course_taken || '',
        'Domain': student.domain || '',
        'Internship Start Date': student.internship_start_date 
          ? new Date(student.internship_start_date).toLocaleDateString() 
          : '',
        'Internship End Date': student.internship_end_date 
          ? new Date(student.internship_end_date).toLocaleDateString() 
          : '',
        'Reference Information': student.reference_information || '',
        'Photograph': student.image_url || '',
        'Internal Faculty of Institute': student.internal_faculty_name || '',
        'Faculty Contact': student.faculty_contact || '',
        'Faculty Email Id': student.faculty_email || '',
        'Column 16': '', // Empty column as requested
        'Test Marks': student.marks !== null && student.marks !== undefined 
          ? `${student.marks.toFixed(2)}%` 
          : 'Not Given',
        'NOC Received': student.noc_received ? 'Yes' : 'No',
        'Selected?': student.is_selected ? 'Yes' : 'No',
      };
    });

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Students');

    // Set column widths
    const colWidths = [
      { wch: 20 }, // Timestamp
      { wch: 15 }, // First Name
      { wch: 15 }, // Middle Name
      { wch: 15 }, // Last Name
      { wch: 20 }, // Mobile Number (WhatsApp)
      { wch: 30 }, // Email
      { wch: 30 }, // Name of Institute
      { wch: 25 }, // Course Taken
      { wch: 25 }, // Domain
      { wch: 20 }, // Internship Start Date
      { wch: 20 }, // Internship End Date
      { wch: 30 }, // Reference Information
      { wch: 50 }, // Photograph
      { wch: 30 }, // Internal Faculty of Institute
      { wch: 15 }, // Faculty Contact
      { wch: 30 }, // Faculty Email Id
      { wch: 15 }, // Column 16
      { wch: 12 }, // Test Marks
      { wch: 14 }, // NOC Received
      { wch: 10 }, // Selected?
    ];
    ws['!cols'] = colWidths;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filterInfo = hasActiveFilters ? '_filtered' : '_all';
    const filename = `students_export${filterInfo}_${timestamp}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    
    setSuccess(`Excel file downloaded successfully! (${filteredStudents.length} students)`);
    setTimeout(() => setSuccess(''), 5000);
  }, [filteredStudents, splitName, hasActiveFilters]);

  return (
    <div className="space-y-6">
      {/* Header with Search and Upload */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <h2 className="text-2xl font-semibold text-gray-900">Students</h2>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleOpenFormModal(null)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors cursor-pointer"
            >
              Add Student Manually
            </button>
            {/* <button
              onClick={handleOpenImportModal}
              disabled={importing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {importing ? 'Importing...' : 'Import from Google Sheets'}
            </button> */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {uploading ? 'Uploading...' : 'Upload Spreadsheet'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
        </div>
        
        {/* Search Bar and Filters */}
        <div className="space-y-3">
          <div className="flex gap-3 items-center flex-wrap">
            {/* Academic year filter */}
            <div className="min-w-[140px]">
              <label htmlFor="academic-year-filter" className="sr-only">Academic year</label>
              <select
                id="academic-year-filter"
                value={selectedAcademicYear}
                onChange={(e) => setSelectedAcademicYear(e.target.value)}
                className="block w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All years</option>
                {academicYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                showFilters || hasActiveFilters
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } cursor-pointer`}
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a1 1 0 00-2 0v7.268a2 2 0 000 3.464V16a1 1 0 102 0v-1.268a2 2 0 000-3.464V4zM11 4a1 1 0 10-2 0v1.268a2 2 0 000 3.464V16a1 1 0 102 0V8.732a2 2 0 000-3.464V4zM16 3a1 1 0 011 1v7.268a2 2 0 010 3.464V16a1 1 0 11-2 0v-1.268a2 2 0 010-3.464V4a1 1 0 011-1z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-500 bg-opacity-20 rounded-full border border-white text-xs">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={downloadExcel}
              disabled={filteredStudents.length === 0}
              className="px-4 py-2.5 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Download Excel ({filteredStudents.length})
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={clearFilters}
                  className="text-sm text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                >
                  Clear All
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Institute Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institute Name</label>
                  <input
                    type="text"
                    value={filters.instituteName}
                    onChange={(e) => handleFilterChange('instituteName', e.target.value)}
                    placeholder="Filter by institute..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Course Taken - Multi-select */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Course Taken</label>
                  {availableCourses.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                      <div className="space-y-2">
                        {availableCourses.map((course) => (
                          <label
                            key={course}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={filters.courseTaken.includes(course)}
                              onChange={() => handleCourseToggle(course)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="flex-1">{course}</span>
                            {filters.courseTaken.includes(course) && (
                              <span className="text-xs text-indigo-600 font-medium">
                                ({filters.courseTaken.filter(c => c === course).length})
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      {filters.courseTaken.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, courseTaken: [] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                          >
                            Clear selection ({filters.courseTaken.length} selected)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
                      No courses available
                    </div>
                  )}
                </div>

                {/* Domain - Multi-select */}
                <div className="md:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Domain</label>
                  {isLoadingDomains ? (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
                      Loading domains...
                    </div>
                  ) : domains.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                      <div className="space-y-2">
                        {domains.map((domain) => (
                          <label
                            key={domain.id}
                            className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-2 py-1 rounded"
                          >
                            <input
                              type="checkbox"
                              checked={filters.domain.includes(domain.id)}
                              onChange={() => handleDomainToggle(domain.id)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            <span className="flex-1">{domain.domain_name}</span>
                            {filters.domain.includes(domain.id) && (
                              <span className="text-xs text-indigo-600 font-medium">
                                ({filters.domain.filter(d => d === domain.id).length})
                              </span>
                            )}
                          </label>
                        ))}
                      </div>
                      {filters.domain.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={() => setFilters(prev => ({ ...prev, domain: [] }))}
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                          >
                            Clear selection ({filters.domain.length} selected)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 border border-gray-300 rounded-lg px-3 py-2">
                      No domains available
                    </div>
                  )}
                </div>

                {/* Test Given */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Given</label>
                  <select
                    value={filters.testGiven}
                    onChange={(e) => handleFilterChange('testGiven', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Marks Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Marks Range</label>
                  <select
                    value={filters.marksRange}
                    onChange={(e) => handleFilterChange('marksRange', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">All</option>
                    <option value="below70">Below 70%</option>
                    <option value="above70">70% and Above</option>
                  </select>
                </div>

                {/* Selected */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selected</label>
                  <select
                    value={filters.selected}
                    onChange={(e) => handleFilterChange('selected', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">All</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>

                {/* Internship Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internship Status</label>
                  <select
                    value={filters.internshipStatus}
                    onChange={(e) => handleFilterChange('internshipStatus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">All</option>
                    <option value="NOT_STARTED">Not Started</option>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                {/* Reference Information */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
                  <select
                    value={filters.referencePresence}
                    onChange={(e) => handleFilterChange('referencePresence', e.target.value)}
                    className="w-full px-3 py-2 mb-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  >
                    <option value="">All</option>
                    <option value="yes">Has Reference</option>
                    <option value="no">No Reference</option>
                  </select>
                  <input
                    type="text"
                    value={filters.referenceText}
                    onChange={(e) => handleFilterChange('referenceText', e.target.value)}
                    placeholder="Search in reference..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internship Start Date (From)</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internship End Date (To)</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Test Date Start */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Date (From)</label>
                  <input
                    type="date"
                    value={filters.testDateStart}
                    onChange={(e) => handleFilterChange('testDateStart', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>

                {/* Test Date End */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Date (To)</label>
                  <input
                    type="date"
                    value={filters.testDateEnd}
                    onChange={(e) => handleFilterChange('testDateEnd', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results Count */}
          {(hasActiveFilters || searchQuery) && (
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold">{filteredStudents.length}</span> of <span className="font-semibold">{students.length}</span> students
            </p>
          )}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
          {success}
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`p-4 rounded-lg border ${uploadResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`font-semibold ${uploadResult.success ? 'text-green-800' : 'text-red-800'}`}>
            {uploadResult.message}
          </p>
          {uploadResult.data && uploadResult.data.details && (
            <div className="mt-3 space-y-2">
              {uploadResult.data.details.created && uploadResult.data.details.created.length > 0 && (
                <div className="text-sm text-green-700">
                  <p className="font-medium">Created ({uploadResult.data.details.created.length}):</p>
                  <ul className="list-disc list-inside mt-1">
                    {uploadResult.data.details.created.slice(0, 5).map((item, idx) => (
                      <li key={idx}>{item.name} ({item.email})</li>
                    ))}
                    {uploadResult.data.details.created.length > 5 && (
                      <li>... and {uploadResult.data.details.created.length - 5} more</li>
                    )}
                  </ul>
                </div>
              )}
              {uploadResult.data.details.failed && uploadResult.data.details.failed.length > 0 && (
                <div className="text-sm text-red-700">
                  <p className="font-medium">Failed ({uploadResult.data.details.failed.length}):</p>
                  <ul className="list-disc list-inside mt-1 max-h-40 overflow-y-auto">
                    {uploadResult.data.details.failed.map((item, idx) => (
                      <li key={idx}>Row {item.row}: {item.email} - {item.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500 text-lg">Loading students...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Image</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Mobile</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Institute</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Course</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Marks</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">NOC Received</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase sticky right-0 bg-gray-50 z-10 border-l border-gray-200">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                      {searchQuery 
                        ? `No students found matching "${searchQuery}". Try a different search term.`
                        : 'No students found. Upload a spreadsheet or import from Google Sheets to get started.'}
                    </td>
                  </tr>
                ) : (
                  currentStudents.map((student) => {
                    const handleViewClick = () => fetchStudentDetails(student.id);
                    const imageKey = student.image_url || `student-${student.id}`;
                    const imageFailed = failedImages.has(imageKey);
                    
                    return (
                      <tr key={student.id} className="hover:bg-gray-50 transition-colors group">
                        <td className="px-6 py-4">
                          {student.image_url && !imageFailed ? (
                            <img
                              src={getImageUrl(student.image_url)}
                              alt={student.full_name}
                              className="w-16 h-16 object-cover rounded-lg"
                              onError={handleImageError(imageKey)}
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="font-medium">{student.full_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.mobile_number || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {student.institute_name || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {student.course_taken || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {student.marks !== null && student.marks !== undefined ? `${student.marks.toFixed(2)}%` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="flex items-center cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={student.noc_received || false}
                              onChange={(e) =>
                                handleNOCStatusChange(student.id, e.target.checked)
                              }
                              className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500 focus:ring-2 cursor-pointer"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-700">
                              {student.noc_received ? 'Received' : 'Not Received'}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <label className="flex items-center cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={student.is_selected || false}
                              onChange={(e) =>
                                handleSelectionChange(student.id, e.target.checked)
                              }
                              className="w-5 h-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2 cursor-pointer"
                            />
                            <span className={`ml-2 text-sm font-medium ${
                              student.is_selected 
                                ? 'text-green-700' 
                                : 'text-gray-500'
                            }`}>
                              {student.is_selected ? 'Selected' : 'Not Selected'}
                            </span>
                          </label>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium sticky right-0 bg-white group-hover:bg-gray-50 z-10 border-l border-gray-200">
                          <div className="flex gap-3">
                            <button
                              onClick={handleViewClick}
                              className="text-indigo-600 hover:text-indigo-900 font-medium cursor-pointer"
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleOpenFormModal(student)}
                              className="text-green-600 hover:text-green-900 font-medium cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteStudent(student.id, student.full_name)}
                              className="text-red-600 hover:text-red-900 font-medium cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {filteredStudents.length > 0 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Previous page"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  aria-label="Next page"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(endIndex, filteredStudents.length)}</span> of{' '}
                    <span className="font-medium">{filteredStudents.length}</span> result{filteredStudents.length !== 1 ? 's' : ''}
                    {searchQuery && students.length !== filteredStudents.length && (
                      <span className="text-gray-500"> (filtered from {students.length} total)</span>
                    )}
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="sr-only">Previous</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    
                    {/* Page Numbers */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      const handlePageClick = () => handlePageChange(page);
                      
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={handlePageClick}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              currentPage === page
                                ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 cursor-pointer'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return (
                          <span key={page} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <span className="sr-only">Next</span>
                      <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Student Details Modal */}
      {showDetailsModal && selectedStudent && (
        <>
          <div 
            className="fixed inset-0 z-100 bg-gray-900/50 backdrop-blur-sm"
            onClick={handleCloseDetailsModal}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-5xl transform transition-all pointer-events-auto max-h-[95vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-8 py-6 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-4">
                  {selectedStudent.image_url && !failedImages.has(`modal-${selectedStudent.id}`) ? (
                    <img
                      src={getImageUrl(selectedStudent.image_url)}
                      alt={selectedStudent.full_name}
                      className="w-16 h-16 object-cover rounded-full border-2 border-gray-200 shadow-md"
                      onError={handleImageError(`modal-${selectedStudent.id}`)}
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center border-2 border-green-200 shadow-md">
                      <User className="w-8 h-8 text-white" />
                    </div>
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.full_name}</h2>
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <Mail className="w-4 h-4" />
                      {selectedStudent.email}
                    </p>
                  </div>
                </div>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-2 transition-all duration-200"
                  onClick={handleCloseDetailsModal}
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="px-8 py-6">
                <div className="space-y-6">
                  {/* Personal Information Card */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <User className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Personal Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Full Name</span>
                        </div>
                        <p className="text-base font-semibold text-gray-900">{selectedStudent.full_name}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Mail className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</span>
                        </div>
                        <p className="text-base text-gray-900 break-all">{selectedStudent.email}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Number</span>
                        </div>
                        <p className="text-base text-gray-900">{selectedStudent.phone || selectedStudent.mobile_number || 'N/A'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Registration Date</span>
                        </div>
                        <p className="text-base text-gray-900">{formatDate(selectedStudent.registration_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Academic Information Card */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <GraduationCap className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Academic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Institute Name</span>
                        </div>
                        <p className="text-base font-medium text-gray-900">{selectedStudent.institute_name || 'N/A'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <GraduationCap className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Course Taken</span>
                        </div>
                        <p className="text-base font-medium text-gray-900">{selectedStudent.course_taken || 'N/A'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Domain</span>
                        </div>
                        <p className="text-base font-medium text-gray-900">{selectedStudent.domain || 'N/A'}</p>
                      </div>
                      <div className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</span>
                        </div>
                        <span
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                            selectedStudent.status === 'Active' || selectedStudent.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {selectedStudent.status || (selectedStudent.is_active ? 'Active' : 'Inactive')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Internship & Faculty Information - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Internship Information Card */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Internship Information</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Start Date</span>
                          </div>
                          <p className="text-base font-medium text-gray-900">{formatDate(selectedStudent.internship_start_date)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">End Date</span>
                          </div>
                          <p className="text-base font-medium text-gray-900">{formatDate(selectedStudent.internship_end_date)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</span>
                          </div>
                          <p className="text-base font-medium text-gray-900">{selectedStudent.internship_duration || 'N/A'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Faculty Information Card */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Users className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Faculty Information</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Faculty Name</span>
                          </div>
                          <p className="text-base font-medium text-gray-900">{selectedStudent.internal_faculty_name || 'N/A'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Phone className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</span>
                          </div>
                          <p className="text-base font-medium text-gray-900">{selectedStudent.faculty_contact || 'N/A'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Mail className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</span>
                          </div>
                          <p className="text-base text-gray-900 break-all">{selectedStudent.faculty_email || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Performance Card */}
                  <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-green-600 rounded-lg">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900">Test Performance</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg p-5 border border-gray-200 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Trophy className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Marks</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">
                          {selectedStudent.marks !== null && selectedStudent.marks !== undefined 
                            ? `${selectedStudent.marks.toFixed(1)}%` 
                            : 'N/A'}
                        </p>
                      </div>
                      <div className="bg-white rounded-lg p-5 border border-gray-200 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Attempts</span>
                        </div>
                        <p className="text-3xl font-bold text-gray-900">{selectedStudent.total_attempts || 0}</p>
                      </div>
                      <div className="bg-white rounded-lg p-5 border border-gray-200 text-center">
                        <div className="flex items-center justify-center gap-2 mb-3">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Test Date</span>
                        </div>
                        <p className="text-base font-medium text-gray-900">{formatDate(selectedStudent.last_test_date)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Skills Card */}
                  {selectedStudent.skills && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Code className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Skills</h3>
                      </div>
                      <div className="space-y-4">
                        {selectedStudent.skills.languages && selectedStudent.skills.languages.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">Programming Languages</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedStudent.skills.languages.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedStudent.skills.frameworks && selectedStudent.skills.frameworks.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Code className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">Frameworks / Libraries</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedStudent.skills.frameworks.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedStudent.skills.tools && selectedStudent.skills.tools.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Wrench className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">Tools / Technologies</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedStudent.skills.tools.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {selectedStudent.skills.softSkills && selectedStudent.skills.softSkills.length > 0 && (
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <div className="flex items-center gap-2 mb-3">
                              <Users className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-semibold text-gray-700">Soft Skills</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {selectedStudent.skills.softSkills.map((skill, index) => (
                                <span key={index} className="px-3 py-1.5 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(!selectedStudent.skills.languages || selectedStudent.skills.languages.length === 0) &&
                         (!selectedStudent.skills.frameworks || selectedStudent.skills.frameworks.length === 0) &&
                         (!selectedStudent.skills.tools || selectedStudent.skills.tools.length === 0) &&
                         (!selectedStudent.skills.softSkills || selectedStudent.skills.softSkills.length === 0) && (
                          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                            <p className="text-sm text-gray-500">No skills added yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Personal Projects Card */}
                  {selectedStudent.personal_projects && selectedStudent.personal_projects.length > 0 && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Personal Projects</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {selectedStudent.personal_projects.map((project, index) => (
                          <div key={index} className="bg-white rounded-lg p-5 border border-gray-200 hover:shadow-md transition-shadow">
                            <h4 className="text-base font-bold text-gray-900 mb-2">
                              {project.projectTitle || project.title || `Project ${index + 1}`}
                            </h4>
                            {project.description && (
                              <p className="text-sm text-gray-700 mb-4 line-clamp-3">{project.description}</p>
                            )}
                            <div className="space-y-2">
                              {project.techStack && (
                                <div className="flex items-start gap-2">
                                  <Code className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-xs font-semibold text-gray-500">Tech Stack: </span>
                                    <span className="text-sm text-gray-900">{project.techStack}</span>
                                  </div>
                                </div>
                              )}
                              {project.role && (
                                <div className="flex items-start gap-2">
                                  <User className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                  <div>
                                    <span className="text-xs font-semibold text-gray-500">Role: </span>
                                    <span className="text-sm text-gray-900">{project.role}</span>
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-3 pt-2">
                                {(project.githubLink || project.github) && (
                                  <a
                                    href={project.githubLink || project.github}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                    GitHub
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                                {(project.liveLink || project.live) && (
                                  <a
                                    href={project.liveLink || project.live}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    <LinkIcon className="w-4 h-4" />
                                    Live Demo
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Achievements Card */}
                  {selectedStudent.achievements && (
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Achievements & Certifications</h3>
                      </div>
                      <div className="space-y-4">
                        {['hackathons', 'certifications', 'awards', 'competitions'].map((type) => (
                          selectedStudent.achievements[type] && selectedStudent.achievements[type].length > 0 && (
                            <div key={type} className="bg-white rounded-lg p-4 border border-gray-200">
                              <div className="flex items-center gap-2 mb-3">
                                <Award className="w-4 h-4 text-green-600" />
                                <span className="text-sm font-bold text-gray-900 capitalize">{type}</span>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {selectedStudent.achievements[type].map((achievement, index) => (
                                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                    <h5 className="text-sm font-bold text-gray-900 mb-2">{achievement.title}</h5>
                                    {achievement.issuer && (
                                      <p className="text-xs text-gray-600 mb-1">
                                        <span className="font-semibold">Issuer:</span> {achievement.issuer}
                                      </p>
                                    )}
                                    {achievement.description && (
                                      <p className="text-xs text-gray-700 mb-2 line-clamp-2">{achievement.description}</p>
                                    )}
                                    <div className="flex items-center justify-between mt-3">
                                      {achievement.date && (
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                          <Calendar className="w-3 h-3" />
                                          {formatDate(achievement.date)}
                                        </div>
                                      )}
                                      {achievement.link && (
                                        <a
                                          href={achievement.link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                                        >
                                          View
                                          <ExternalLink className="w-3 h-3" />
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        ))}
                        {(!selectedStudent.achievements.hackathons || selectedStudent.achievements.hackathons.length === 0) &&
                         (!selectedStudent.achievements.certifications || selectedStudent.achievements.certifications.length === 0) &&
                         (!selectedStudent.achievements.awards || selectedStudent.achievements.awards.length === 0) &&
                         (!selectedStudent.achievements.competitions || selectedStudent.achievements.competitions.length === 0) && (
                          <div className="bg-white rounded-lg p-6 border border-gray-200 text-center">
                            <p className="text-sm text-gray-500">No achievements added yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Resume & Additional Information - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Resume Card */}
                    {selectedStudent.resume_url && (
                      <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-green-600 rounded-lg">
                            <FileText className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="text-lg font-bold text-gray-900">Resume</h3>
                        </div>
                        <a
                          href={(() => {
                            // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                            let filePath = selectedStudent.resume_url;
                            if (selectedStudent.resume_url.startsWith('/scholarflex/') || selectedStudent.resume_url.startsWith('/students/')) {
                              filePath = `/uploads${selectedStudent.resume_url}`;
                            } else if (!selectedStudent.resume_url.startsWith('/uploads/')) {
                              filePath = `/uploads${selectedStudent.resume_url}`;
                            }
                            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
                            return baseUrl.replace('/api', '') + filePath;
                          })()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-3 bg-white hover:bg-green-50 border border-green-300 rounded-lg text-sm font-semibold text-gray-900 transition-colors w-full justify-center"
                        >
                          <FileText className="w-5 h-5 text-green-600" />
                          View Resume (PDF)
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    )}

                    {/* Additional Information Card */}
                    <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-green-600 rounded-lg">
                          <FileText className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Additional Information</h3>
                      </div>
                      <div className="space-y-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Reference Information</span>
                          </div>
                          <p className="text-sm text-gray-900">{selectedStudent.reference_information || 'N/A'}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Profile Completed</span>
                          </div>
                          <span
                            className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold ${
                              selectedStudent.profile_completed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {selectedStudent.profile_completed ? (
                              <>
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Yes
                              </>
                            ) : (
                              <>
                                <XCircle className="w-4 h-4 mr-1" />
                                No
                              </>
                            )}
                          </span>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Created At</span>
                          </div>
                          <p className="text-sm text-gray-900">{formatDate(selectedStudent.created_at)}</p>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <Calendar className="w-4 h-4 text-green-600" />
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Updated At</span>
                          </div>
                          <p className="text-sm text-gray-900">{formatDate(selectedStudent.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 px-8 py-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <button
                  type="button"
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all shadow-md hover:shadow-lg"
                  onClick={handleCloseDetailsModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Import from Google Sheets Modal */}
      {showImportModal && (
        <>
          <div 
            className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
            onClick={handleCloseImportModal}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-md transform transition-all pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Import from Google Sheets</h2>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  onClick={handleCloseImportModal}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Form */}
              <div className="px-6 py-5">
                <div className="space-y-4">
                  <div>
                    <label htmlFor="google-sheets-url" className="block text-sm font-medium text-gray-700 mb-2">
                      Google Sheets URL <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="google-sheets-url"
                      value={googleSheetsUrl}
                      onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                      placeholder="https://drive.google.com/open?id=..."
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Paste your Google Sheets shareable link here. The CSV will be downloaded and students will be updated.
                    </p>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  onClick={handleCloseImportModal}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleGoogleSheetsImport}
                  disabled={importing || !googleSheetsUrl.trim()}
                >
                  {importing ? 'Importing...' : 'Import'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Student Form Modal */}
      {showFormModal && (
        <>
          <div 
            className="fixed inset-0 z-100 bg-gray-900/20 backdrop-blur-md"
            onClick={handleCloseFormModal}
          ></div>
          
          <div className="fixed inset-0 z-110 overflow-y-auto flex items-center justify-center p-4 pointer-events-none">
            <div
              className="relative bg-white rounded-lg shadow-2xl border border-gray-200 w-full max-w-3xl transform transition-all pointer-events-auto max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingStudent ? 'Edit Student' : 'Add Student'}
                </h2>
                <button
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-all duration-200"
                  onClick={handleCloseFormModal}
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleFormSubmit} className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="full_name"
                      {...register('full_name')}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.full_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-xs text-red-600">{errors.full_name.message}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...register('email')}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      {...register('phone')}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.phone ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-600">{errors.phone.message}</p>
                    )}
                  </div>

                  {/* Domain */}
                  <div>
                    <label htmlFor="domain_id" className="block text-sm font-medium text-gray-700 mb-1">
                      Domain <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="domain_id"
                      {...register('domain_id')}
                      disabled={isLoadingDomains}
                      required
                      defaultValue={editingStudent?.domain_id || ''}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white ${
                        isLoadingDomains ? 'opacity-50 cursor-not-allowed' : ''
                      } ${errors.domain_id ? 'border-red-500 bg-red-50' : 'border-gray-300'}`}
                    >
                      <option value="">{isLoadingDomains ? 'Loading domains...' : 'Select Domain'}</option>
                      {domains.map((domain) => (
                        <option key={domain.id} value={domain.id}>
                          {domain.domain_name}
                        </option>
                      ))}
                    </select>
                    {errors.domain_id && (
                      <p className="mt-1 text-xs text-red-600">{errors.domain_id.message}</p>
                    )}
                  </div>

                  {/* Institute Name */}
                  <div>
                    <label htmlFor="institute_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Institute Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={instituteSelectValue}
                      onChange={(e) => {
                        const value = e.target.value;
                        setInstituteSelectValue(value);
                        const inputEl = document.getElementById('institute_name');
                        if (inputEl) {
                          inputEl.value = value === '__other__' ? '' : value;
                        }
                      }}
                      disabled={isLoadingInstitutes}
                      className="mb-2 w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {isLoadingInstitutes ? 'Loading institutes...' : 'Select Institute'}
                      </option>
                      {institutes.map((inst) => (
                        <option key={inst.institute_name} value={inst.institute_name}>
                          {inst.institute_name} ({inst.student_count ?? 0} students)
                        </option>
                      ))}
                      <option value="__other__">Other (add new institute)</option>
                    </select>
                    <input
                      type="text"
                      id="institute_name"
                      {...register('institute_name')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.institute_name ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="Type institute name"
                      required
                    />
                    {errors.institute_name && (
                      <p className="mt-1 text-xs text-red-600">{errors.institute_name.message}</p>
                    )}
                  </div>

                  {/* Course Taken */}
                  <div>
                    <label htmlFor="course_taken" className="block text-sm font-medium text-gray-700 mb-1">
                      Course Taken <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="course_taken"
                      {...register('course_taken')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.course_taken ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.course_taken && (
                      <p className="mt-1 text-xs text-red-600">{errors.course_taken.message}</p>
                    )}
                  </div>

                  {/* Internship Start Date */}
                  <div>
                    <label htmlFor="internship_start_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Internship Start Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="internship_start_date"
                      {...register('internship_start_date')}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.internship_start_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      required
                    />
                    {errors.internship_start_date && (
                      <p className="mt-1 text-xs text-red-600">{errors.internship_start_date.message}</p>
                    )}
                  </div>

                  {/* Internship End Date */}
                  <div>
                    <label htmlFor="internship_end_date" className="block text-sm font-medium text-gray-700 mb-1">
                      Internship End Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="internship_end_date"
                      {...register('internship_end_date')}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.internship_end_date ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.internship_end_date && (
                      <p className="mt-1 text-xs text-red-600">{errors.internship_end_date.message}</p>
                    )}
                  </div>

                  {/* Internship Duration */}
                  <div>
                    <label htmlFor="internship_duration" className="block text-sm font-medium text-gray-700 mb-1">
                      Internship Duration <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="internship_duration"
                      {...register('internship_duration')}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm ${
                        errors.internship_duration ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                    {errors.internship_duration && (
                      <p className="mt-1 text-xs text-red-600">{errors.internship_duration.message}</p>
                    )}
                  </div>

                  {/* Image URL */}
                  <div>
                    <label htmlFor="image_url" className="block text-sm font-medium text-gray-700 mb-1">
                      Image URL
                    </label>
                    <input
                      // type="url"
                      id="image_url"
                      name="image_url"
                      defaultValue={editingStudent?.image_url || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Reference Information */}
                  <div className="md:col-span-2">
                    <label htmlFor="reference_information" className="block text-sm font-medium text-gray-700 mb-1">
                      Reference Information
                    </label>
                    <textarea
                      id="reference_information"
                      name="reference_information"
                      rows={3}
                      defaultValue={editingStudent?.reference_information || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Internal Faculty Name */}
                  <div>
                    <label htmlFor="internal_faculty_name" className="block text-sm font-medium text-gray-700 mb-1">
                      Internal Faculty Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="internal_faculty_name"
                      required
                      name="internal_faculty_name"
                      defaultValue={editingStudent?.internal_faculty_name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Faculty Contact */}
                  <div>
                    <label htmlFor="faculty_contact" className="block text-sm font-medium text-gray-700 mb-1">
                      Faculty Contact
                    </label>
                    <input
                      type="tel"
                      id="faculty_contact"
                      name="faculty_contact"
                      defaultValue={editingStudent?.faculty_contact || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>

                  {/* Faculty Email */}
                  <div className="md:col-span-2">
                    <label htmlFor="faculty_email" className="block text-sm font-medium text-gray-700 mb-1">
                      Faculty Email
                    </label>
                    <input
                      type="email"
                      id="faculty_email"
                      name="faculty_email"
                      defaultValue={editingStudent?.faculty_email || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all cursor-pointer"
                    onClick={handleCloseFormModal}
                    disabled={isSubmittingForm}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingForm}
                    className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmittingForm ? 'Saving...' : editingStudent ? 'Update Student' : 'Add Student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidatesTab;
