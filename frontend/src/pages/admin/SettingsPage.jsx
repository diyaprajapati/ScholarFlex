import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { authService } from '../../utils/auth';
import { ROUTES } from '../../config/paths';
import Sidebar from '../../components/dashboard/Sidebar';
import TopNavbar from '../../components/layout/TopNavbar';
import api from '../../services/api';

export default function SettingsPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [candidateRegistrationEnabled, setCandidateRegistrationEnabled] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    const userData = authService.getUser();
    setUser(userData);
    
    // Check if user is SUPER_ADMIN
    if (userData?.role !== 'SUPER_ADMIN') {
      navigate(ROUTES.DASHBOARD, { replace: true });
      return;
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const res = await api.admin.getSettings();
        if (res.settings) {
          setCandidateRegistrationEnabled(!!res.settings.candidate_registration_enabled);
        }
      } catch (e) {
        setError(e.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleToggleRegistration = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    const next = !candidateRegistrationEnabled;
    try {
      await api.admin.updateSettings({ candidate_registration_enabled: next });
      setCandidateRegistrationEnabled(next);
      setSuccess(next ? 'Candidate registration is now open.' : 'Candidate registration is now closed.');
      setTimeout(() => setSuccess(''), 4000);
    } catch (e) {
      setError(e.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen flex bg-gray-50 overflow-hidden">
      <Sidebar user={user} />
      <TopNavbar user={user} />
      <main className="flex-1 lg:ml-64 overflow-y-auto pt-14 sm:pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-semibold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Control app-wide options. Only Super Admin can change these.</p>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-lg">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg">
              {success}
            </div>
          )}

          {/* Settings Content */}
          {loading ? (
            <div className="flex items-center justify-center min-h-[40vh]">
              <Loader2 className="w-10 h-10 text-[#4C763B] animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Candidate registration</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    When enabled, anyone can submit the public registration form. When disabled, the form shows &quot;Registrations are closed&quot;.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleRegistration}
                  disabled={saving}
                  className="shrink-0 flex items-center gap-2 text-[#4C763B] hover:opacity-80 disabled:opacity-60 cursor-pointer"
                  aria-label={candidateRegistrationEnabled ? 'Disable registration' : 'Enable registration'}
                >
                  {saving ? (
                    <Loader2 className="w-10 h-10 animate-spin" />
                  ) : candidateRegistrationEnabled ? (
                    <ToggleRight className="w-12 h-12" />
                  ) : (
                    <ToggleLeft className="w-12 h-12 text-gray-400" />
                  )}
                  <span className="text-sm font-medium">
                    {candidateRegistrationEnabled ? 'On' : 'Off'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
