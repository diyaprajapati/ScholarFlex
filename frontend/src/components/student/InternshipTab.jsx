import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Clock, CheckCircle, Calendar, FileText, AlertCircle } from 'lucide-react';

const InternshipTab = () => {
  const [status, setStatus] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusResponse, projectsResponse] = await Promise.all([
        api.internshipStatus.getStudentStatus(),
        api.projects.getStudentProjects(),
      ]);

      if (statusResponse.success) {
        setStatus(statusResponse.data);
      }

      if (projectsResponse.success) {
        setProjects(projectsResponse.data || []);
      }
    } catch (err) {
      console.error('Error fetching internship data:', err);
      setError(err.message || 'Failed to load internship information');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (statusValue) => {
    const badges = {
      NOT_STARTED: {
        bg: 'bg-gray-100',
        text: 'text-gray-800',
        icon: Clock,
        label: 'Not Started',
        description: 'Your internship has not started yet.',
      },
      ONGOING: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: Calendar,
        label: 'Ongoing',
        description: 'Your internship is currently in progress.',
      },
      COMPLETED: {
        bg: 'bg-green-100',
        text: 'text-green-800',
        icon: CheckCircle,
        label: 'Completed',
        description: 'Your internship has been completed.',
      },
    };

    const badge = badges[statusValue] || badges.NOT_STARTED;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${badge.bg} ${badge.text}`}>
        <Icon className="w-5 h-5" />
        <div>
          <div className="font-semibold">{badge.label}</div>
          <div className="text-xs opacity-80">{badge.description}</div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Internship Status Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Internship Status</h2>
        <div className="space-y-4">
          <div>{status && getStatusBadge(status.status)}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <div className="text-sm text-gray-500 mb-1">Start Date</div>
              <div className="text-base font-medium text-gray-900">
                {formatDate(status?.startDate)}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-1">End Date</div>
              <div className="text-base font-medium text-gray-900">
                {formatDate(status?.endDate)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Projects Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Assigned Projects</h2>
          <span className="text-sm text-gray-500">{projects.length} project(s)</span>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No projects assigned yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{project.projectTitle}</h3>
                  {project.deadline && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>Due: {formatDate(project.deadline)}</span>
                    </div>
                  )}
                </div>
                {project.projectDescription && (
                  <p className="text-gray-600 mb-3">{project.projectDescription}</p>
                )}
                <div className="text-xs text-gray-400">
                  Assigned: {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Note about Evaluations */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div className="text-sm text-green-800">
            <p className="font-medium mb-1">About Evaluations</p>
            <p>
              Weekly evaluations are conducted by your supervisor during your internship. These
              evaluations are for internal company use and are not visible to students. Focus on
              your assigned projects and maintain good communication with your team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InternshipTab;

