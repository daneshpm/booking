'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Input,
  Textarea,
  Select,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Alert,
} from '@bookings/ui';
import {
  Clock,
  DollarSign,
  Shield,
  MapPin,
  Video,
  Building,
  Phone,
  ArrowLeft,
  Check,
  Users,
  Sparkles,
  Percent,
} from 'lucide-react';
import { createServiceAction, updateServiceAction } from '../api/service.actions';
import type { ServiceFormData } from '../api/service.schema';
import type { ServiceOutputDTO } from '../application/create-service/CreateServiceDTO';

interface ServiceFormProps {
  workspaceId: string;
  initialData?: ServiceOutputDTO;
  isEditing?: boolean;
  availableStaff?: Array<{ id: string; name: string; email: string }>;
  initialAssignedStaffIds?: string[];
}

const daysOfWeekList = [
  { day: 1, label: 'Mon' },
  { day: 2, label: 'Tue' },
  { day: 3, label: 'Wed' },
  { day: 4, label: 'Thu' },
  { day: 5, label: 'Fri' },
  { day: 6, label: 'Sat' },
  { day: 0, label: 'Sun' },
];

export function ServiceForm({
  workspaceId,
  initialData,
  isEditing = false,
  availableStaff = [],
  initialAssignedStaffIds = [],
}: ServiceFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});

  const [formData, setFormData] = React.useState<ServiceFormData>({
    name: initialData?.name ?? '',
    slug: initialData?.slug ?? '',
    description: initialData?.description ?? '',
    categoryId: initialData?.categoryId ?? null,
    durationMinutes: initialData?.durationMinutes ?? 30,
    bufferBeforeMinutes: initialData?.bufferBeforeMinutes ?? 0,
    bufferAfterMinutes: initialData?.bufferAfterMinutes ?? 0,
    price: initialData?.price ?? 0,
    currency: initialData?.currency ?? 'USD',
    locationType: initialData?.locationType ?? 'ONLINE_MEETING',
    locationDetails: initialData?.locationDetails ?? '',
    isActive: initialData?.isActive ?? true,
    hasYieldPricing: initialData?.hasYieldPricing ?? false,
    yieldDiscountPercent: initialData?.yieldDiscountPercent ?? 15,
    yieldDays: initialData?.yieldDays ?? '1,2,3,4',
    yieldStartTime: initialData?.yieldStartTime ?? '11:00',
    yieldEndTime: initialData?.yieldEndTime ?? '15:00',
    yieldLabel: initialData?.yieldLabel ?? 'Off-Peak Special',
    assignedStaffIds: initialAssignedStaffIds,
  });

  const toggleYieldDay = (day: number) => {
    const current = (formData.yieldDays || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    const exists = current.includes(day);
    const next = exists ? current.filter((d) => d !== day) : [...current, day].sort();
    setFormData({ ...formData, yieldDays: next.join(',') });
  };

  const toggleStaff = (staffId: string) => {
    const current = formData.assignedStaffIds || [];
    const exists = current.includes(staffId);
    setFormData({
      ...formData,
      assignedStaffIds: exists ? current.filter((id) => id !== staffId) : [...current, staffId],
    });
  };

  const durationPresets = [15, 30, 45, 60, 90, 120];
  const bufferPresets = [0, 5, 10, 15, 30];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      let res;
      if (isEditing && initialData) {
        res = await updateServiceAction(workspaceId, initialData.id, formData);
      } else {
        res = await createServiceAction(workspaceId, formData);
      }

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save service.');
        if (res.fieldErrors) setFieldErrors(res.fieldErrors);
        setIsLoading(false);
        return;
      }

      router.push('/services');
      router.refresh();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push('/services')}
            className="gap-1 text-slate-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Services
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/services')}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading} className="gap-2">
            <Check className="h-4 w-4" />
            {isEditing ? 'Save Changes' : 'Create Service'}
          </Button>
        </div>
      </div>

      {errorMessage && (
        <Alert variant="danger" title="Could not save service">
          {errorMessage}
        </Alert>
      )}

      {/* Section 1: Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Service Details</CardTitle>
          <CardDescription>
            Specify how your service will appear to customers on your public booking page.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label required>Service Name</Label>
            <Input
              placeholder="e.g. 45-Minute Strategy Consultation"
              value={formData.name}
              onChange={(e) => {
                const name = e.target.value;
                setFormData((prev) => ({
                  ...prev,
                  name,
                  slug: isEditing
                    ? prev.slug
                    : name
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, '-')
                        .replace(/(^-|-$)/g, ''),
                }));
              }}
              error={fieldErrors.name?.[0]}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Custom URL Slug</Label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono text-slate-400 select-none">
                  /services/
                </span>
                <Input
                  className="pl-20 font-mono text-sm"
                  placeholder="strategy-consultation"
                  value={formData.slug ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  error={fieldErrors.slug?.[0]}
                />
              </div>
            </div>

            <div>
              <Label>Active Status</Label>
              <Select
                value={formData.isActive ? 'true' : 'false'}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
              >
                <option value="true">Active (Bookable publicly)</option>
                <option value="false">Hidden / Inactive</option>
              </Select>
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              rows={3}
              placeholder="Describe what customers will get out of this service session..."
              value={formData.description ?? ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              error={fieldErrors.description?.[0]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Duration & Buffer Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <CardTitle>Duration & Buffer Configuration</CardTitle>
          </div>
          <CardDescription>
            Control appointment length and build automatic prep/wrap-up buffers around slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Duration Selector */}
          <div>
            <Label required>Service Duration (Minutes)</Label>
            <div className="flex flex-wrap gap-2 mb-3">
              {durationPresets.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setFormData({ ...formData, durationMinutes: mins })}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                    formData.durationMinutes === mins
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h ${mins % 60 ? `${mins % 60}m` : ''}`}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={5}
              max={1440}
              value={formData.durationMinutes}
              onChange={(e) =>
                setFormData({ ...formData, durationMinutes: Number(e.target.value) })
              }
              error={fieldErrors.durationMinutes?.[0]}
            />
          </div>

          {/* Buffers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div>
              <Label>Buffer Before Appointment (Minutes)</Label>
              <p className="text-xs text-slate-500 mb-2">Preparation time blocked before start</p>
              <div className="flex gap-2 mb-2">
                {bufferPresets.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFormData({ ...formData, bufferBeforeMinutes: b })}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                      formData.bufferBeforeMinutes === b
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b === 0 ? 'None' : `${b}m`}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={0}
                max={180}
                value={formData.bufferBeforeMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, bufferBeforeMinutes: Number(e.target.value) })
                }
                error={fieldErrors.bufferBeforeMinutes?.[0]}
              />
            </div>

            <div>
              <Label>Buffer After Appointment (Minutes)</Label>
              <p className="text-xs text-slate-500 mb-2">
                Wrap-up/transition time blocked after end
              </p>
              <div className="flex gap-2 mb-2">
                {bufferPresets.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setFormData({ ...formData, bufferAfterMinutes: b })}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                      formData.bufferAfterMinutes === b
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {b === 0 ? 'None' : `${b}m`}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                min={0}
                max={180}
                value={formData.bufferAfterMinutes}
                onChange={(e) =>
                  setFormData({ ...formData, bufferAfterMinutes: Number(e.target.value) })
                }
                error={fieldErrors.bufferAfterMinutes?.[0]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Pricing & Location */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <CardTitle>Pricing</CardTitle>
            </div>
            <CardDescription>Set session fee or offer free appointments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Price (0 for Free)</Label>
              <Input
                type="number"
                step="0.01"
                min={0}
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                error={fieldErrors.price?.[0]}
              />
            </div>

            <div>
              <Label>Currency</Label>
              <Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
                <option value="AUD">AUD ($)</option>
                <option value="INR">INR (₹)</option>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              <CardTitle>Meeting Location</CardTitle>
            </div>
            <CardDescription>How and where will this service take place?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Location Mode</Label>
              <Select
                value={formData.locationType}
                onChange={(e) => setFormData({ ...formData, locationType: e.target.value as any })}
              >
                <option value="ONLINE_MEETING">Online Video Meeting (Google Meet / Zoom)</option>
                <option value="IN_PERSON_BUSINESS">In-Person at Business Office</option>
                <option value="IN_PERSON_CUSTOMER">In-Person at Customer Address</option>
                <option value="PHONE_CALL">Phone Call</option>
              </Select>
            </div>

            <div>
              <Label>Location Details / Address</Label>
              <Input
                placeholder={
                  formData.locationType === 'ONLINE_MEETING'
                    ? 'e.g. Video link generated automatically'
                    : formData.locationType === 'IN_PERSON_BUSINESS'
                      ? 'e.g. Suite 400, 100 Broadway, NY'
                      : 'e.g. Customer will provide location during booking'
                }
                value={formData.locationDetails ?? ''}
                onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
                error={fieldErrors.locationDetails?.[0]}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Section 4: Dynamic Off-Peak Yield Pricing ("Happy Hours") */}
      <Card className="border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/20 via-white to-purple-50/20 dark:from-slate-900 dark:to-slate-900 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span>Dynamic Off-Peak Yield Pricing</span>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-300/60">
                    Happy Hours
                  </span>
                </CardTitle>
                <CardDescription>
                  Automatically discount slow hours to fill gaps in your team's calendar and drive off-peak bookings.
                </CardDescription>
              </div>
            </div>

            {/* Toggle Switch */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.hasYieldPricing}
                onChange={(e) => setFormData({ ...formData, hasYieldPricing: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </CardHeader>

        {formData.hasYieldPricing && (
          <CardContent className="space-y-6 pt-2 border-t border-amber-100/70 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label required>Promotional Discount Percentage</Label>
                <p className="text-xs text-slate-500 mb-2">Discount applied automatically to qualified slots</p>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    max={99}
                    value={formData.yieldDiscountPercent ?? 15}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        yieldDiscountPercent: Number(e.target.value),
                      })
                    }
                    placeholder="15"
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                </div>
                {formData.price > 0 && formData.yieldDiscountPercent ? (
                  <p className="text-xs font-semibold text-emerald-600 mt-1.5 flex items-center gap-1.5">
                    <span>Preview:</span>
                    <span className="line-through text-slate-400">${Number(formData.price).toFixed(2)}</span>
                    <span>→</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                      ${(Number(formData.price) * (1 - (formData.yieldDiscountPercent || 0) / 100)).toFixed(2)}
                    </span>
                    <span className="text-slate-500">({formData.yieldDiscountPercent}% savings)</span>
                  </p>
                ) : null}
              </div>

              <div>
                <Label>Promotional Badge Label</Label>
                <p className="text-xs text-slate-500 mb-2">Shown to clients on booking slots (e.g. "Off-Peak Special")</p>
                <Input
                  type="text"
                  value={formData.yieldLabel ?? ''}
                  onChange={(e) => setFormData({ ...formData, yieldLabel: e.target.value })}
                  placeholder="Off-Peak Special"
                />
              </div>
            </div>

            {/* Applicable Days */}
            <div>
              <Label required>Eligible Days of the Week</Label>
              <p className="text-xs text-slate-500 mb-2">Select which days dynamic discounts should be active</p>
              <div className="flex flex-wrap gap-2">
                {daysOfWeekList.map((d) => {
                  const activeDays = (formData.yieldDays || '')
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                    .map(Number);
                  const isSelected = activeDays.includes(d.day);
                  return (
                    <button
                      key={d.day}
                      type="button"
                      onClick={() => toggleYieldDay(d.day)}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Window */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <Label>Window Start Time (HH:mm)</Label>
                <Input
                  type="time"
                  value={formData.yieldStartTime ?? '11:00'}
                  onChange={(e) => setFormData({ ...formData, yieldStartTime: e.target.value })}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Typically early afternoon or mid-day lull</span>
              </div>

              <div>
                <Label>Window End Time (HH:mm)</Label>
                <Input
                  type="time"
                  value={formData.yieldEndTime ?? '15:00'}
                  onChange={(e) => setFormData({ ...formData, yieldEndTime: e.target.value })}
                />
                <span className="text-[11px] text-slate-500 mt-1 block">Slots starting prior to this time get discounted</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Section 5: Assigned Team Members */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <CardTitle>Assigned Team Members</CardTitle>
            </div>
            <span className="text-xs text-slate-500 font-semibold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              {formData.assignedStaffIds?.length ?? 0} selected
            </span>
          </div>
          <CardDescription>
            Choose which team members can be booked for this service. If none are selected, all active staff members in this workspace will be available by default.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableStaff.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No staff members found in this workspace yet. Add staff under Staff & Team.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {availableStaff.map((staff) => {
                const isSelected = formData.assignedStaffIds?.includes(staff.id);
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleStaff(staff.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 pointer-events-none"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                        {staff.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {staff.email}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Footer Submit Bar */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/services')}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="lg" isLoading={isLoading} className="gap-2">
          <Check className="h-5 w-5" />
          {isEditing ? 'Update Service' : 'Create & Publish Service'}
        </Button>
      </div>
    </form>
  );
}
