'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  Settings,
  Laptop,
  Users,
  Lock,
  Award,
  Check,
  Edit2,
  AlertCircle,
  Building,
  Globe,
  DollarSign,
  Key,
  LogOut,
  ExternalLink,
  Camera,
  Upload,
  ArrowLeft,
  Calendar,
  Smartphone,
  CheckCircle2,
  X,
  Search,
  Crown,
  Briefcase,
  Trash2,
} from 'lucide-react';
import {
  updateWorkspaceSettingsAction,
  updateUserProfileAction,
  changeUserPasswordAction,
  revokeSessionAction,
  type ProfileInput,
} from './actions';

interface SessionItem {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  isCurrent: boolean;
}

export interface WorkspaceUserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  isCurrentUser: boolean;
  services: string[];
  joinedAt: string;
}

interface SettingsClientProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
    currency: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
    phone: string | null;
    gender: string | null;
    country: string | null;
    state: string | null;
    language: string | null;
    timezone: string | null;
    bio: string | null;
    headline: string | null;
    instagram: string | null;
    linkedin: string | null;
    twitter: string | null;
    website: string | null;
    createdAt: string;
  };
  staffProfile?: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatarUrl: string | null;
    timezone: string;
  } | null;
  sessions: SessionItem[];
  workspaceUsers: WorkspaceUserItem[];
  currentSessionId: string;
  role: string;
}

const TIMEZONES = [
  'Asia/Kolkata',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

const CURRENCIES = [
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'CAD', label: 'CAD ($) - Canadian Dollar' },
  { code: 'AUD', label: 'AUD ($) - Australian Dollar' },
  { code: 'AED', label: 'AED (د.إ) - UAE Dirham' },
  { code: 'SGD', label: 'SGD ($) - Singapore Dollar' },
];

const COUNTRIES = [
  { name: 'India', flag: '🇮🇳' },
  { name: 'United States', flag: '🇺🇸' },
  { name: 'United Kingdom', flag: '🇬🇧' },
  { name: 'United Arab Emirates', flag: '🇦🇪' },
  { name: 'Canada', flag: '🇨🇦' },
  { name: 'Australia', flag: '🇦🇺' },
  { name: 'Singapore', flag: '🇸🇬' },
  { name: 'Germany', flag: '🇩🇪' },
  { name: 'France', flag: '🇫🇷' },
];

const GENDERS = ["I'd prefer not to say", 'Male', 'Female', 'Non-binary', 'Custom'];

const LANGUAGES = [
  'English',
  'Hindi',
  'Kannada',
  'Tamil',
  'Telugu',
  'Spanish',
  'French',
  'German',
  'Arabic',
];

const AVATAR_PRESETS = [
  { id: 'purple', bg: 'bg-gradient-to-tr from-[#5c34ad] to-indigo-600', text: 'text-white' },
  { id: 'emerald', bg: 'bg-gradient-to-tr from-emerald-600 to-teal-500', text: 'text-white' },
  {
    id: 'sunset',
    bg: 'bg-gradient-to-tr from-rose-500 via-orange-500 to-amber-400',
    text: 'text-white',
  },
  { id: 'blue', bg: 'bg-gradient-to-tr from-blue-600 to-cyan-500', text: 'text-white' },
  { id: 'dark', bg: 'bg-gradient-to-tr from-slate-900 to-slate-700', text: 'text-white' },
];

export function SettingsClient({
  workspace,
  user,
  staffProfile,
  sessions,
  workspaceUsers,
  currentSessionId,
  role,
}: SettingsClientProps) {
  const [activeTab, setActiveTab] = React.useState<
    'profile' | 'security' | 'mfa' | 'settings' | 'sessions' | 'groups' | 'privacy'
  >('profile');
  const [activeSubTab, setActiveSubTab] = React.useState<'personal' | 'email' | 'mobile'>(
    'personal'
  );

  // Hidden local file input ref
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Edit Mode state
  const [isEditingProfile, setIsEditingProfile] = React.useState(false);
  const [profileData, setProfileData] = React.useState<ProfileInput>({
    name: user.name || '',
    displayName: user.displayName || user.name || '',
    phone: user.phone || staffProfile?.phone || '',
    gender: user.gender || "I'd prefer not to say",
    country: user.country || 'India',
    state: user.state || 'Karnataka',
    language: user.language || 'English',
    timezone: user.timezone || staffProfile?.timezone || 'Asia/Kolkata',
    bio: user.bio || '',
    headline: user.headline || '',
    instagram: user.instagram || '',
    linkedin: user.linkedin || '',
    twitter: user.twitter || '',
    website: user.website || '',
    avatarUrl: user.avatarUrl || staffProfile?.avatarUrl || '',
  });

  const [selectedAvatarPreset, setSelectedAvatarPreset] = React.useState('purple');

  // Search filter in Groups & Roles tab
  const [memberSearchQuery, setMemberSearchQuery] = React.useState('');

  // Workspace form state
  const [workspaceData, setWorkspaceData] = React.useState({
    name: workspace.name,
    timezone: workspace.timezone,
    currency: workspace.currency,
  });

  // Password form state
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  // Handle local image file picker
  const handleLocalImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      setErrorMessage('Image size must be less than 3MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      setProfileData((prev) => ({ ...prev, avatarUrl: base64Url }));
      setSuccessMessage('Local photo selected! Click "Save Changes" to apply.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setProfileData((prev) => ({ ...prev, avatarUrl: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSuccessMessage('Photo removed. Click "Save Changes" to apply.');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateUserProfileAction(profileData);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Profile details updated successfully!');
      setIsEditingProfile(false);
    } else {
      setErrorMessage(res.error || 'Failed to update profile.');
    }
  };

  const handleWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await updateWorkspaceSettingsAction(workspace.id, workspaceData);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Workspace settings updated successfully!');
    } else {
      setErrorMessage(res.error || 'Failed to update workspace settings.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await changeUserPasswordAction(passwordData);
    setIsSubmitting(false);

    if (res.success) {
      setSuccessMessage('Password changed successfully!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      setErrorMessage(res.error || 'Failed to change password.');
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to revoke this session?')) return;
    setIsSubmitting(true);
    const res = await revokeSessionAction(sessionId);
    setIsSubmitting(false);
    if (res.success) {
      setSuccessMessage('Session revoked successfully.');
    } else {
      setErrorMessage(res.error || 'Failed to revoke session.');
    }
  };

  const userInitial = (profileData.name || user.name || 'U').charAt(0).toUpperCase();

  const filteredUsers = workspaceUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      {/* Hidden local photo file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/png, image/jpeg, image/webp, image/gif"
        onChange={handleLocalImageSelect}
        className="hidden"
      />

      {/* Top Header Bar matching application theme */}
      <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-[#5c34ad] flex items-center justify-center text-white shadow-sm shadow-purple-900/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Account & Profile
            </span>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-[#5c34ad] dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              {workspace.name}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/appointments"
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Appointments
          </a>

          <a
            href={`/book/${workspace.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-white bg-[#5c34ad] hover:bg-[#4d2994] px-3.5 py-1.5 rounded-lg shadow-sm shadow-purple-900/20 flex items-center gap-1.5 transition-all"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Preview Booker
          </a>

          <div className="h-8 w-8 rounded-full bg-[#5c34ad] text-white font-bold text-xs flex items-center justify-center shadow-sm ring-2 ring-purple-100 dark:ring-purple-950 overflow-hidden">
            {profileData.avatarUrl ? (
              <img src={profileData.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
        </div>
      </header>

      {/* Main layout with Application-Cohesive Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar styled with Application theme */}
        <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 p-3 shadow-[1px_0_3px_rgba(0,0,0,0.02)]">
          <div className="space-y-4">
            <div className="px-3 py-2 bg-[#f8f5ff] dark:bg-purple-950/30 rounded-xl border border-purple-100 dark:border-purple-900/50 flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-md bg-[#e05666] text-white font-black text-xs flex items-center justify-center shadow-sm">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {workspace.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 capitalize">
                  {role.toLowerCase()} workspace
                </div>
              </div>
            </div>

            <nav className="space-y-1 text-xs">
              {/* Profile Item */}
              <div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('profile');
                    setActiveSubTab('personal');
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                    activeTab === 'profile'
                      ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                      : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                  }`}
                >
                  <User className="h-4 w-4" />
                  <span>Profile</span>
                </button>

                {activeTab === 'profile' && (
                  <div className="ml-7 mt-1.5 space-y-1 pl-2.5 border-l-2 border-[#5c34ad]/40">
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('personal')}
                      className={`block w-full text-left py-1 text-[11px] font-medium transition-colors ${
                        activeSubTab === 'personal'
                          ? 'text-[#5c34ad] dark:text-purple-300 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Personal Information
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('email')}
                      className={`block w-full text-left py-1 text-[11px] font-medium transition-colors ${
                        activeSubTab === 'email'
                          ? 'text-[#5c34ad] dark:text-purple-300 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Email Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('mobile')}
                      className={`block w-full text-left py-1 text-[11px] font-medium transition-colors ${
                        activeSubTab === 'mobile'
                          ? 'text-[#5c34ad] dark:text-purple-300 font-bold'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                      }`}
                    >
                      Mobile Numbers
                    </button>
                  </div>
                )}
              </div>

              {/* Security Item */}
              <button
                type="button"
                onClick={() => setActiveTab('security')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'security'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <Shield className="h-4 w-4" />
                <span>Security</span>
              </button>

              {/* Multi-Factor Authentication */}
              <button
                type="button"
                onClick={() => setActiveTab('mfa')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'mfa'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Multi-Factor Auth</span>
              </button>

              {/* Workspace Settings */}
              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'settings'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <Settings className="h-4 w-4" />
                <span>Workspace Settings</span>
              </button>

              {/* Sessions */}
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'sessions'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span className="flex-1 text-left">Sessions</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'sessions'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100 dark:bg-purple-950 text-[#5c34ad] dark:text-purple-300'
                  }`}
                >
                  {sessions.length}
                </span>
              </button>

              {/* Groups & Roles */}
              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'groups'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <Users className="h-4 w-4" />
                <span className="flex-1 text-left">Groups & Roles</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === 'groups'
                      ? 'bg-white/20 text-white'
                      : 'bg-purple-100 dark:bg-purple-950 text-[#5c34ad] dark:text-purple-300'
                  }`}
                >
                  {workspaceUsers.length}
                </span>
              </button>

              {/* Privacy */}
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-semibold transition-all ${
                  activeTab === 'privacy'
                    ? 'bg-[#5c34ad] text-white shadow-sm shadow-purple-900/15'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#5c34ad] hover:bg-purple-50/60 dark:hover:bg-purple-950/40'
                }`}
              >
                <Lock className="h-4 w-4" />
                <span>Privacy</span>
              </button>
            </nav>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="font-bold text-slate-700 dark:text-slate-300">Signed in as</div>
            <div className="truncate text-[10px] text-slate-400">{user.email}</div>
          </div>
        </aside>

        {/* Right Content Area with Framer Motion transitions */}
        <main className="flex-1 overflow-y-auto p-8 max-w-5xl">
          {/* Notifications */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-3 shadow-sm"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </motion.div>
          )}

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-3 shadow-sm"
            >
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          {/* ===================== TAB 1: PROFILE ===================== */}
          {activeTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Profile
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your personal information, local profile photo, contact details, and social
                  links.
                </p>
              </div>

              {/* CARD 1: Personal Information Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Header with Avatar, Photo Controls & Edit Button */}
                <div className="p-6 flex items-start justify-between border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-5">
                    {/* Big Circular Avatar with Local Image Upload Support */}
                    <div className="relative group">
                      <div className="h-16 w-16 rounded-full bg-[#5c34ad] text-white font-bold text-2xl flex items-center justify-center shadow-md ring-4 ring-purple-50 dark:ring-purple-950/50 overflow-hidden">
                        {profileData.avatarUrl ? (
                          <img
                            src={profileData.avatarUrl}
                            alt={profileData.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{userInitial}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Upload local photo from device"
                        className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                          {profileData.displayName || profileData.name || 'Danesh'}
                        </h3>
                        {profileData.avatarUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-[11px] text-rose-500 hover:text-rose-600 font-medium ml-2"
                          >
                            Remove photo
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {user.email}
                      </p>
                      {profileData.headline && (
                        <span className="inline-block mt-1 text-[11px] font-medium text-[#5c34ad] dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                          {profileData.headline}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Green Edit button matching screenshot */}
                  {!isEditingProfile ? (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>

                {/* Card Body: View Mode or Edit Mode */}
                <div className="p-6">
                  {!isEditingProfile ? (
                    /* View Mode Grid */
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-8 text-xs">
                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Full Name
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            {profileData.name || 'Danesh'}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Display Name
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            {profileData.displayName || profileData.name || 'Danesh'}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Gender
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            {profileData.gender || "I'd prefer not to say"}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Country/Region
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm flex items-center gap-1.5">
                            <span>🇮🇳</span>
                            <span>{profileData.country || 'India'}</span>
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            State
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            {profileData.state || 'Karnataka'}
                          </div>
                        </div>

                        <div>
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Language
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            {profileData.language || 'English'}
                          </div>
                        </div>

                        <div className="sm:col-span-2">
                          <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                            Time zone
                          </div>
                          <div className="text-slate-900 dark:text-slate-100 font-semibold text-sm">
                            (GMT +05:30) India Standard Time ({' '}
                            {profileData.timezone || 'Asia/Kolkata'} )
                          </div>
                        </div>

                        {profileData.bio && (
                          <div className="sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-1">
                              Bio / About Me
                            </div>
                            <div className="text-slate-700 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
                              {profileData.bio}
                            </div>
                          </div>
                        )}

                        {(profileData.instagram ||
                          profileData.linkedin ||
                          profileData.twitter ||
                          profileData.website) && (
                          <div className="sm:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mb-2">
                              Social & Web Presence
                            </div>
                            <div className="flex flex-wrap gap-2.5">
                              {profileData.instagram && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-400 border border-pink-200 dark:border-pink-800 font-semibold text-xs">
                                  📸 @{profileData.instagram}
                                </span>
                              )}
                              {profileData.linkedin && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 font-semibold text-xs">
                                  💼 LinkedIn
                                </span>
                              )}
                              {profileData.twitter && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-semibold text-xs">
                                  𝕏 @{profileData.twitter}
                                </span>
                              )}
                              {profileData.website && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-[#5c34ad] dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-semibold text-xs">
                                  🌐 {profileData.website}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Edit Mode Form */
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                      {/* Local Photo Selection Card */}
                      <div className="p-4 rounded-2xl bg-purple-50/40 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <Camera className="h-4 w-4 text-[#5c34ad]" />
                            <span>Profile Photo (Choose from Device)</span>
                          </div>
                          {profileData.avatarUrl && (
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            Upload Photo from Computer
                          </button>

                          <span className="text-[11px] text-slate-400">
                            Supports PNG, JPG, WEBP (Max 3MB)
                          </span>
                        </div>

                        {/* Presets if preferred */}
                        <div className="pt-2 border-t border-purple-100 dark:border-purple-900/30 flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium">
                            Or pick color preset:
                          </span>
                          <div className="flex items-center gap-2">
                            {AVATAR_PRESETS.map((preset) => (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => {
                                  setSelectedAvatarPreset(preset.id);
                                  setProfileData({ ...profileData, avatarUrl: '' });
                                }}
                                className={`h-6 w-6 rounded-full ${preset.bg} ring-2 ${
                                  selectedAvatarPreset === preset.id && !profileData.avatarUrl
                                    ? 'ring-[#5c34ad] ring-offset-2'
                                    : 'ring-transparent'
                                } transition-all`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Main Profile Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={profileData.name}
                            onChange={(e) =>
                              setProfileData({ ...profileData, name: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Display Name / Handle
                          </label>
                          <input
                            type="text"
                            value={profileData.displayName || ''}
                            onChange={(e) =>
                              setProfileData({ ...profileData, displayName: e.target.value })
                            }
                            placeholder="e.g. Danesh"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Gender
                          </label>
                          <select
                            value={profileData.gender || "I'd prefer not to say"}
                            onChange={(e) =>
                              setProfileData({ ...profileData, gender: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          >
                            {GENDERS.map((g) => (
                              <option key={g} value={g}>
                                {g}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Country / Region
                          </label>
                          <select
                            value={profileData.country || 'India'}
                            onChange={(e) =>
                              setProfileData({ ...profileData, country: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          >
                            {COUNTRIES.map((c) => (
                              <option key={c.name} value={c.name}>
                                {c.flag} {c.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            State / Province
                          </label>
                          <input
                            type="text"
                            value={profileData.state || ''}
                            onChange={(e) =>
                              setProfileData({ ...profileData, state: e.target.value })
                            }
                            placeholder="e.g. Karnataka"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Language
                          </label>
                          <select
                            value={profileData.language || 'English'}
                            onChange={(e) =>
                              setProfileData({ ...profileData, language: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          >
                            {LANGUAGES.map((lang) => (
                              <option key={lang} value={lang}>
                                {lang}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Professional Headline
                          </label>
                          <input
                            type="text"
                            maxLength={100}
                            value={profileData.headline || ''}
                            onChange={(e) =>
                              setProfileData({ ...profileData, headline: e.target.value })
                            }
                            placeholder="e.g. Senior Career Advisor & Cloud Architect at Rooman"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <div className="flex justify-between items-center mb-1">
                            <label className="font-semibold text-slate-700 dark:text-slate-300">
                              Instagram-Style Bio (About Me)
                            </label>
                            <span className="text-[10px] text-slate-400">
                              {(profileData.bio || '').length}/300
                            </span>
                          </div>
                          <textarea
                            rows={3}
                            maxLength={300}
                            value={profileData.bio || ''}
                            onChange={(e) =>
                              setProfileData({ ...profileData, bio: e.target.value })
                            }
                            placeholder="e.g. Helping professionals master cloud tech 🚀 | 1-on-1 career guidance"
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none resize-none"
                          />
                        </div>

                        <div className="sm:col-span-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                            Social Profiles (Instagram, LinkedIn, Twitter/X)
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                📸 Instagram Username
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">
                                  @
                                </span>
                                <input
                                  type="text"
                                  value={profileData.instagram || ''}
                                  onChange={(e) =>
                                    setProfileData({ ...profileData, instagram: e.target.value })
                                  }
                                  placeholder="username"
                                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                💼 LinkedIn Profile URL
                              </label>
                              <input
                                type="url"
                                value={profileData.linkedin || ''}
                                onChange={(e) =>
                                  setProfileData({ ...profileData, linkedin: e.target.value })
                                }
                                placeholder="https://linkedin.com/in/username"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                𝕏 Twitter / X Handle
                              </label>
                              <div className="relative">
                                <span className="absolute left-3 top-2 text-slate-400 text-xs">
                                  @
                                </span>
                                <input
                                  type="text"
                                  value={profileData.twitter || ''}
                                  onChange={(e) =>
                                    setProfileData({ ...profileData, twitter: e.target.value })
                                  }
                                  placeholder="handle"
                                  className="w-full pl-7 pr-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                                🌐 Personal Website / Portfolio
                              </label>
                              <input
                                type="url"
                                value={profileData.website || ''}
                                onChange={(e) =>
                                  setProfileData({ ...profileData, website: e.target.value })
                                }
                                placeholder="https://danesh.dev"
                                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Submit Actions */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-2 shadow-sm shadow-emerald-500/20 disabled:opacity-50"
                        >
                          {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* CARD 2: My Email Addresses matching screenshot */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    My Email Addresses
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    View and manage the email addresses associated with your account. They can be
                    used to sign in and to reset password if you ever forget it.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#5c34ad] dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{user.email}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          Primary
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                        <Check className="h-3 w-3 text-emerald-500" />
                        Verified for login & notifications
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD 3: Mobile Numbers matching screenshot */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Mobile Numbers
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    View and manage the mobile phone numbers associated with your account for
                    appointment alerts and WhatsApp updates.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-sm">
                      <Smartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        <span>{profileData.phone || '+91 98765 43210'}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300">
                          WhatsApp Active
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Active for SMS & WhatsApp notifications
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(true)}
                    className="text-xs font-bold text-[#5c34ad] hover:text-[#4d2994]"
                  >
                    Update
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 2: SECURITY ===================== */}
          {activeTab === 'security' && (
            <motion.div
              key="security"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Security
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage password security, active login tokens, and protection policies.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                  Ensure your account uses a strong password of at least 8 characters.
                </p>

                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Current Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                    />
                  </div>

                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2.5 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-purple-900/20 disabled:opacity-50"
                    >
                      <Key className="h-3.5 w-3.5" />
                      {isSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 3: MULTI-FACTOR AUTH ===================== */}
          {activeTab === 'mfa' && (
            <motion.div
              key="mfa"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Multi-Factor Authentication (MFA)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Add an extra layer of security to your Rooman Bookings account.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-100 dark:bg-purple-950 text-[#5c34ad] flex items-center justify-center font-bold">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        Authenticator App (TOTP)
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Use Google Authenticator, 1Password, or Authy to generate single-use
                        verification codes.
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Authenticator app configuration ready. Scan QR with your preferred authenticator app.'
                      )
                    }
                    className="px-4 py-1.5 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold shadow-sm"
                  >
                    Setup
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 4: WORKSPACE SETTINGS ===================== */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Workspace Settings
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Configure organization preferences, timezones, currency, and booking page slug.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <form onSubmit={handleWorkspaceSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      required
                      value={workspaceData.name}
                      onChange={(e) => setWorkspaceData({ ...workspaceData, name: e.target.value })}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Workspace Slug (URL identifier)
                    </label>
                    <input
                      type="text"
                      disabled
                      defaultValue={workspace.slug}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed"
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      Your public booking link: /book/{workspace.slug}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Default Timezone
                      </label>
                      <select
                        value={workspaceData.timezone}
                        onChange={(e) =>
                          setWorkspaceData({ ...workspaceData, timezone: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz} value={tz}>
                            {tz}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Default Currency
                      </label>
                      <select
                        value={workspaceData.currency}
                        onChange={(e) =>
                          setWorkspaceData({ ...workspaceData, currency: e.target.value })
                        }
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-[#5c34ad] focus:outline-none"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white font-bold text-xs flex items-center gap-2 shadow-sm shadow-purple-900/20 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Save Preferences
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 5: SESSIONS ===================== */}
          {activeTab === 'sessions' && (
            <motion.div
              key="sessions"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Active Sessions & Devices
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage devices currently signed into your account. You can revoke any unfamiliar
                  session.
                </p>
              </div>

              <div className="space-y-3">
                {sessions.map((sess) => (
                  <div
                    key={sess.id}
                    className={`p-4 rounded-2xl border bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm ${
                      sess.isCurrent
                        ? 'border-purple-300 dark:border-purple-800 ring-1 ring-[#5c34ad]/20'
                        : 'border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-[#5c34ad] flex items-center justify-center font-bold">
                        <Laptop className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>
                            {sess.userAgent ? sess.userAgent.split(' ')[0] : 'Web Browser'}
                          </span>
                          {sess.isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 dark:bg-purple-950/60 text-[#5c34ad] dark:text-purple-300">
                              Current Device
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>IP: {sess.ipAddress || '127.0.0.1'}</span>
                          <span>•</span>
                          <span>Last active: {new Date(sess.lastUsedAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {!sess.isCurrent && (
                      <button
                        type="button"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 6: GROUPS & ROLES (ALL USERS VIEW) ===================== */}
          {activeTab === 'groups' && (
            <motion.div
              key="groups"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                    Groups & Workspace Members
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    View, search, and manage all team members, role permissions, and service
                    assignments in {workspace.name}.
                  </p>
                </div>

                <a
                  href="/users"
                  className="px-4 py-2 rounded-xl bg-[#5c34ad] hover:bg-[#4d2994] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all shrink-0"
                >
                  <Users className="h-4 w-4" />
                  Manage in Team Directory
                </a>
              </div>

              {/* Quick metrics header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] text-slate-400 font-medium">Total Members</div>
                  <div className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
                    {workspaceUsers.length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] text-slate-400 font-medium">Owners & Admins</div>
                  <div className="text-xl font-black text-purple-700 dark:text-purple-400 mt-0.5">
                    {workspaceUsers.filter((u) => u.role === 'OWNER' || u.role === 'ADMIN').length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] text-slate-400 font-medium">Active Providers</div>
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {workspaceUsers.filter((u) => u.isActive).length}
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                  <div className="text-[11px] text-slate-400 font-medium">Your Role</div>
                  <div className="text-base font-bold text-slate-800 dark:text-slate-200 mt-1 uppercase">
                    {role}
                  </div>
                </div>
              </div>

              {/* Members Directory Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search member by name, email, or role..."
                      value={memberSearchQuery}
                      onChange={(e) => setMemberSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#5c34ad]"
                    />
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Showing {filteredUsers.length} of {workspaceUsers.length} members
                  </span>
                </div>

                {/* Members List */}
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      No members matched your search query.
                    </div>
                  ) : (
                    filteredUsers.map((m) => (
                      <div
                        key={m.id + m.email}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3.5">
                          <div className="h-10 w-10 rounded-full bg-[#5c34ad] text-white font-bold text-sm flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                            {m.avatarUrl ? (
                              <img
                                src={m.avatarUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <span>{m.name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {m.name}
                              </span>
                              {m.isCurrentUser && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-[#5c34ad] dark:text-purple-300">
                                  You
                                </span>
                              )}
                              {m.isActive ? (
                                <span
                                  className="h-2 w-2 rounded-full bg-emerald-500"
                                  title="Active"
                                />
                              ) : (
                                <span
                                  className="h-2 w-2 rounded-full bg-slate-300"
                                  title="Inactive"
                                />
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">{m.email}</div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-13 sm:ml-0">
                          {/* Services */}
                          {m.services.length > 0 && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-slate-400">Services:</span>
                              <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                                {m.services.length} assigned
                              </span>
                            </div>
                          )}

                          {/* Role Badge */}
                          <span
                            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                              m.role === 'OWNER'
                                ? 'bg-purple-100 dark:bg-purple-950/60 text-[#5c34ad] dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                                : m.role === 'ADMIN'
                                  ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                  : m.role === 'STAFF'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                            }`}
                          >
                            {m.role}
                          </span>

                          <a
                            href="/staff"
                            className="text-xs font-semibold text-[#5c34ad] hover:text-[#4d2994] px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-colors"
                          >
                            Edit
                          </a>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Role Permissions Card */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-3">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Role Permissions Hierarchy
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
                    <div className="font-bold text-[#5c34ad] tracking-wide">OWNER</div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Full workspace authority, billing control, team membership management, and
                      tenant settings.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                    <div className="font-bold text-blue-700 dark:text-blue-400 tracking-wide">
                      ADMIN
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Create and edit services, configure staff shifts & buffer rules, publish
                      booking pages.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                    <div className="font-bold text-emerald-700 dark:text-emerald-400 tracking-wide">
                      STAFF
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      View their own appointments, set shift availability and breaks, accept client
                      bookings.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                    <div className="font-bold text-amber-700 dark:text-amber-400 tracking-wide">
                      RECEPTIONIST
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      Front-desk booking intake, view calendar schedules, check in clients, record
                      attendance.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ===================== TAB 7: PRIVACY ===================== */}
          {activeTab === 'privacy' && (
            <motion.div
              key="privacy"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                  Privacy & Data Controls
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Manage your data export, public discoverability, and privacy settings.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Public Booking Page Profile
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Show your display name, headline, and bio to clients on the booking portal.
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                    Public
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </main>
      </div>
    </div>
  );
}
