'use client';

import * as React from 'react';
import {
  Users,
  Mail,
  Phone,
  Clock,
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  Calendar,
  Coffee,
  Check,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  Input,
  Select,
  Modal,
} from '@zoho-bookings/ui';
import {
  createStaffAction,
  updateStaffAction,
  toggleStaffStatusAction,
  deleteStaffAction,
  updateStaffWorkingHoursAction,
  type DayScheduleInput,
} from './actions';

export interface StaffItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  timezone: string;
  isActive: boolean;
  serviceAssignments: Array<{
    id: string;
    serviceId: string;
    service: {
      id: string;
      name: string;
      slug: string;
      price?: any;
    };
  }>;
  workingHours: Array<{
    id: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    breaks: Array<{
      id: string;
      startTime: string;
      endTime: string;
    }>;
  }>;
}

export interface ServiceOption {
  id: string;
  name: string;
  slug: string;
}

interface StaffManagementClientProps {
  workspaceId: string;
  initialStaff: StaffItem[];
  availableServices: ServiceOption[];
  defaultTimezone: string;
}

const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

export function StaffManagementClient({
  workspaceId,
  initialStaff,
  availableServices,
  defaultTimezone,
}: StaffManagementClientProps) {
  const [staffList, setStaffList] = React.useState<StaffItem[]>(initialStaff);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
  const [editingStaff, setEditingStaff] = React.useState<StaffItem | null>(null);
  const [scheduleStaff, setScheduleStaff] = React.useState<StaffItem | null>(null);
  const [deleteTargetStaff, setDeleteTargetStaff] = React.useState<StaffItem | null>(null);

  // Form States for Add / Edit Details
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    phone: '',
    timezone: defaultTimezone || 'America/New_York',
    isActive: true,
    assignedServiceIds: [] as string[],
  });

  // Working Hours State
  const [workingSchedule, setWorkingSchedule] = React.useState<DayScheduleInput[]>([]);

  // Action Loading & Errors
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [actionSuccessMessage, setActionSuccessMessage] = React.useState<string | null>(null);

  // Auto-hide success banner
  React.useEffect(() => {
    if (actionSuccessMessage) {
      const t = setTimeout(() => setActionSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [actionSuccessMessage]);

  // Reset Add Form
  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      timezone: defaultTimezone || 'America/New_York',
      isActive: true,
      assignedServiceIds: availableServices.map((s) => s.id), // Assign all by default
    });
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Form
  const openEditModal = (staff: StaffItem) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      timezone: staff.timezone || defaultTimezone || 'America/New_York',
      isActive: staff.isActive,
      assignedServiceIds: staff.serviceAssignments.map((sa) => sa.serviceId),
    });
    setFormError(null);
  };

  // Open Schedule Editor Modal
  const openScheduleModal = (staff: StaffItem) => {
    setScheduleStaff(staff);
    // Build schedule for 7 days
    const schedule: DayScheduleInput[] = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
      const existingShift = staff.workingHours.find((w) => w.dayOfWeek === dayIdx);
      const hasBreak = Boolean(existingShift?.breaks && existingShift.breaks.length > 0);
      return {
        dayOfWeek: dayIdx,
        enabled: Boolean(existingShift),
        startTime: existingShift?.startTime || '09:00',
        endTime: existingShift?.endTime || '17:00',
        hasBreak: hasBreak,
        breakStartTime: hasBreak ? existingShift?.breaks[0].startTime : '13:00',
        breakEndTime: hasBreak ? existingShift?.breaks[0].endTime : '14:00',
      };
    });
    setWorkingSchedule(schedule);
    setFormError(null);
  };

  // Filtered staff
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? s.isActive
        : !s.isActive;
    return matchesSearch && matchesStatus;
  });

  // Handle Add Staff Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Valid email address is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await createStaffAction(workspaceId, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      timezone: formData.timezone,
      isActive: formData.isActive,
      assignedServiceIds: formData.assignedServiceIds,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setStaffList((prev) => [...prev, res.data as any]);
      setIsAddModalOpen(false);
      setActionSuccessMessage(`Successfully added "${formData.name}" to team.`);
    } else {
      setFormError(res.error || 'Failed to create staff member');
    }
  };

  // Handle Edit Staff Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    if (!formData.name.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Valid email address is required');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const res = await updateStaffAction(workspaceId, editingStaff.id, {
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      timezone: formData.timezone,
      isActive: formData.isActive,
      assignedServiceIds: formData.assignedServiceIds,
    });

    setIsSubmitting(false);

    if (res.success && res.data) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === editingStaff.id ? (res.data as any) : s))
      );
      setEditingStaff(null);
      setActionSuccessMessage(`Successfully updated details for "${formData.name}".`);
    } else {
      setFormError(res.error || 'Failed to update staff member');
    }
  };

  // Handle Toggle Active Status
  const handleToggleStatus = async (staff: StaffItem) => {
    const nextStatus = !staff.isActive;
    // Optimistic update
    setStaffList((prev) =>
      prev.map((s) => (s.id === staff.id ? { ...s, isActive: nextStatus } : s))
    );

    const res = await toggleStaffStatusAction(workspaceId, staff.id, nextStatus);
    if (!res.success) {
      // Revert if failed
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, isActive: !nextStatus } : s))
      );
      alert(res.error || 'Failed to change staff status');
    } else {
      setActionSuccessMessage(
        `${staff.name} is now marked as ${nextStatus ? 'Active' : 'Inactive'}.`
      );
    }
  };

  // Handle Delete Staff
  const handleDeleteConfirm = async () => {
    if (!deleteTargetStaff) return;
    setIsSubmitting(true);
    const res = await deleteStaffAction(workspaceId, deleteTargetStaff.id);
    setIsSubmitting(false);

    if (res.success) {
      setStaffList((prev) => prev.filter((s) => s.id !== deleteTargetStaff.id));
      setActionSuccessMessage(`Staff member "${deleteTargetStaff.name}" has been removed.`);
      setDeleteTargetStaff(null);
    } else {
      alert(res.error || 'Failed to delete staff member');
    }
  };

  // Handle Save Working Schedule
  const handleSaveSchedule = async () => {
    if (!scheduleStaff) return;
    setIsSubmitting(true);
    const res = await updateStaffWorkingHoursAction(
      workspaceId,
      scheduleStaff.id,
      workingSchedule
    );
    setIsSubmitting(false);

    if (res.success) {
      // Update local state
      setStaffList((prev) =>
        prev.map((s) => {
          if (s.id !== scheduleStaff.id) return s;
          const updatedHours = workingSchedule
            .filter((w) => w.enabled)
            .map((w) => ({
              id: `wh-${w.dayOfWeek}`,
              dayOfWeek: w.dayOfWeek,
              startTime: w.startTime,
              endTime: w.endTime,
              breaks: w.hasBreak
                ? [
                    {
                      id: `b-${w.dayOfWeek}`,
                      startTime: w.breakStartTime || '13:00',
                      endTime: w.breakEndTime || '14:00',
                    },
                  ]
                : [],
            }));
          return { ...s, workingHours: updatedHours };
        })
      );
      setScheduleStaff(null);
      setActionSuccessMessage(`Updated weekly shift schedule for ${scheduleStaff.name}.`);
    } else {
      setFormError(res.error || 'Failed to update schedule');
    }
  };

  // Toggle assigned service
  const toggleService = (serviceId: string) => {
    setFormData((prev) => {
      const exists = prev.assignedServiceIds.includes(serviceId);
      return {
        ...prev,
        assignedServiceIds: exists
          ? prev.assignedServiceIds.filter((id) => id !== serviceId)
          : [...prev.assignedServiceIds, serviceId],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-blue-600" />
            Staff & Team
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage consultants, service assignments, working shifts, and scheduling availability.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={openAddModal}
          className="gap-2 shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search team members by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 bg-slate-50 dark:bg-slate-800/50 shadow-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-36 text-xs h-9 bg-slate-50 dark:bg-slate-800/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive Staff</option>
          </Select>
        </div>
      </div>

      {/* Staff Grid */}
      {filteredStaff.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
            <Users className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {searchQuery ? 'No staff members match your search' : 'No staff members added yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {searchQuery
              ? 'Try searching with a different name or clear the filters.'
              : 'Add your first consultant or service provider to start taking customer bookings.'}
          </p>
          <Button variant="primary" onClick={openAddModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Staff Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredStaff.map((staff) => (
            <Card
              key={staff.id}
              className={`border-slate-200 dark:border-slate-800 transition-all shadow-sm hover:shadow-md ${
                !staff.isActive ? 'opacity-70 bg-slate-50/40 dark:bg-slate-950/30' : ''
              }`}
            >
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-base shadow-md shadow-blue-500/20 shrink-0">
                      {staff.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {staff.name}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                        <Mail className="h-3 w-3 text-slate-400" />
                        <span>{staff.email}</span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={staff.isActive ? 'success' : 'default'} className="text-[11px]">
                      {staff.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => handleToggleStatus(staff)}
                      className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 underline font-medium"
                    >
                      {staff.isActive ? 'Mark Inactive' : 'Activate'}
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 pt-4 text-xs">
                {/* Meta details */}
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    <Clock className="h-3.5 w-3.5 text-blue-500" />
                    <span>{staff.timezone}</span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{staff.workingHours.length} Active Shift Days / wk</span>
                  </div>
                </div>

                {/* Assigned Services */}
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold block mb-2">
                    Assigned Services ({staff.serviceAssignments.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {staff.serviceAssignments.length > 0 ? (
                      staff.serviceAssignments.map((sa) => (
                        <span
                          key={sa.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-medium text-[11px] border border-blue-100 dark:border-blue-900/50"
                        >
                          <Briefcase className="h-3 w-3" />
                          {sa.service.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-xs">
                        No services assigned. Click "Edit Details" to assign services.
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(staff)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-slate-500" />
                      Edit Details
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScheduleModal(staff)}
                      className="gap-1.5 text-xs h-8 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900/50 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Working Shifts
                    </Button>
                  </div>

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteTargetStaff(staff)}
                    className="h-8 px-2.5 text-xs"
                    title="Delete Staff Member"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal 1: Add Staff Member */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Staff Member"
        description="Add a consultant or service provider to your workspace team."
        maxWidth="lg"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs mt-3">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <Input
                placeholder="e.g. Dr. Emily Watson"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                placeholder="e.g. emily.watson@company.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <Input
                type="tel"
                placeholder="+1 (555) 234-5678"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Timezone
              </label>
              <Select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="text-xs h-9"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Assigned Services */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Services (Select all that this staff member can deliver)
            </label>
            {availableServices.length === 0 ? (
              <p className="text-slate-400 italic">No services exist in workspace yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                {availableServices.map((service) => {
                  const isChecked = formData.assignedServiceIds.includes(service.id);
                  return (
                    <button
                      type="button"
                      key={service.id}
                      onClick={() => toggleService(service.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                        isChecked
                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-semibold'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`h-4 w-4 rounded flex items-center justify-center border ${
                          isChecked
                            ? 'bg-blue-600 border-blue-600 text-white'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        {isChecked && <Check className="h-3 w-3" />}
                      </div>
                      <span className="truncate text-xs">{service.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Staff Member
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 2: Edit Staff Details */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title="Edit Staff Member Details"
        description="Update profile, contact information, and assigned consultation services."
        maxWidth="lg"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4 text-xs mt-3">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Full Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number (Optional)
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Timezone
              </label>
              <Select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="text-xs h-9"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <input
              type="checkbox"
              id="isActiveToggle"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
            />
            <label htmlFor="isActiveToggle" className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer">
              Staff Member is Active (eligible for customer bookings and appointments)
            </label>
          </div>

          {/* Assigned Services */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Assigned Services
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
              {availableServices.map((service) => {
                const isChecked = formData.assignedServiceIds.includes(service.id);
                return (
                  <button
                    type="button"
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                      isChecked
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100 font-semibold'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded flex items-center justify-center border ${
                        isChecked
                          ? 'bg-blue-600 border-blue-600 text-white'
                          : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate text-xs">{service.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingStaff(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} className="gap-2">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal 3: Weekly Working Shifts & Breaks */}
      <Modal
        isOpen={Boolean(scheduleStaff)}
        onClose={() => setScheduleStaff(null)}
        title={`Weekly Working Shifts — ${scheduleStaff?.name || ''}`}
        description="Configure available working hours and lunch break windows for each day of the week."
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs mt-3">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {workingSchedule.map((day, idx) => (
              <div
                key={day.dayOfWeek}
                className={`p-3.5 rounded-xl border transition-all ${
                  day.enabled
                    ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-dashed border-slate-200 dark:border-slate-800/80 opacity-60'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 w-32">
                    <input
                      type="checkbox"
                      id={`day-${day.dayOfWeek}`}
                      checked={day.enabled}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setWorkingSchedule((prev) =>
                          prev.map((d, i) => (i === idx ? { ...d, enabled: checked } : d))
                        );
                      }}
                      className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${day.dayOfWeek}`}
                      className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      {DAYS_OF_WEEK[day.dayOfWeek]}
                    </label>
                  </div>

                  {day.enabled ? (
                    <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
                      {/* Shift Hours */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold">Shift:</span>
                        <input
                          type="time"
                          value={day.startTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWorkingSchedule((prev) =>
                              prev.map((d, i) => (i === idx ? { ...d, startTime: val } : d))
                            );
                          }}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                        />
                        <span className="text-slate-400">–</span>
                        <input
                          type="time"
                          value={day.endTime}
                          onChange={(e) => {
                            const val = e.target.value;
                            setWorkingSchedule((prev) =>
                              prev.map((d, i) => (i === idx ? { ...d, endTime: val } : d))
                            );
                          }}
                          className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                        />
                      </div>

                      {/* Break Toggle */}
                      <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                        <button
                          type="button"
                          onClick={() => {
                            setWorkingSchedule((prev) =>
                              prev.map((d, i) =>
                                i === idx ? { ...d, hasBreak: !d.hasBreak } : d
                              )
                            );
                          }}
                          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                            day.hasBreak
                              ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                              : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500'
                          }`}
                        >
                          <Coffee className="h-3 w-3" />
                          <span>Break</span>
                        </button>

                        {day.hasBreak && (
                          <div className="flex items-center gap-1">
                            <input
                              type="time"
                              value={day.breakStartTime || '13:00'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWorkingSchedule((prev) =>
                                  prev.map((d, i) =>
                                    i === idx ? { ...d, breakStartTime: val } : d
                                  )
                                );
                              }}
                              className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                            />
                            <span>–</span>
                            <input
                              type="time"
                              value={day.breakEndTime || '14:00'}
                              onChange={(e) => {
                                const val = e.target.value;
                                setWorkingSchedule((prev) =>
                                  prev.map((d, i) =>
                                    i === idx ? { ...d, breakEndTime: val } : d
                                  )
                                );
                              }}
                              className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">Off Day</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setScheduleStaff(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSaveSchedule}
              isLoading={isSubmitting}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Save Working Shifts
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal 4: Delete Confirmation */}
      <Modal
        isOpen={Boolean(deleteTargetStaff)}
        onClose={() => setDeleteTargetStaff(null)}
        title="Remove Staff Member"
        description={`Are you sure you want to remove "${deleteTargetStaff?.name}" from the team?`}
      >
        <div className="space-y-4 mt-2 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            This will remove their shift schedule and service assignments. Note that if this staff member has upcoming scheduled appointments, they cannot be deleted until those appointments are rescheduled or cancelled.
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => setDeleteTargetStaff(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              isLoading={isSubmitting}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
