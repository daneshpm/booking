'use client';

import * as React from 'react';
import { Clock, Calendar, Coffee, Check, Edit2, AlertCircle, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Badge, Button, Modal } from '@bookings/ui';
import { updateStaffWorkingHoursAction, type DayScheduleInput } from '../staff/actions';

export interface AvailabilityStaff {
  id: string;
  name: string;
  email: string;
  timezone: string;
  isActive: boolean;
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

interface AvailabilityClientProps {
  workspaceId: string;
  initialStaff: AvailabilityStaff[];
}

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function toMinutes(val: string): number {
  if (!val || !val.includes(':')) return 0;
  const [h, m] = val.split(':');
  return (Number(h) || 0) * 60 + (Number(m) || 0);
}

function toTimeString(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function computeSensibleBreak(startTime: string, endTime: string): { breakStartTime: string; breakEndTime: string } {
  const startMins = toMinutes(startTime);
  const endMins = toMinutes(endTime);
  const duration = endMins - startMins;

  if (duration <= 90) {
    const mid = startMins + Math.floor(duration / 2);
    return {
      breakStartTime: toTimeString(Math.max(startMins, mid - 10)),
      breakEndTime: toTimeString(Math.min(endMins, mid + 10)),
    };
  }

  if (duration <= 240) {
    const mid = startMins + Math.floor(duration / 2);
    return {
      breakStartTime: toTimeString(mid - 15),
      breakEndTime: toTimeString(mid + 15),
    };
  }

  // Shift is >= 4 hours: default 1-hour lunch break
  const midDayMins = 13 * 60; // 13:00
  let breakStart = midDayMins;
  let breakEnd = midDayMins + 60;

  if (breakStart < startMins + 60 || breakEnd > endMins - 30) {
    const mid = startMins + Math.floor(duration / 2);
    breakStart = mid - 30;
    breakEnd = mid + 30;
  }

  return {
    breakStartTime: toTimeString(breakStart),
    breakEndTime: toTimeString(breakEnd),
  };
}

export function AvailabilityClient({ workspaceId, initialStaff }: AvailabilityClientProps) {
  const [staffList, setStaffList] = React.useState<AvailabilityStaff[]>(initialStaff);
  const [editingStaff, setEditingStaff] = React.useState<AvailabilityStaff | null>(null);
  const [workingSchedule, setWorkingSchedule] = React.useState<DayScheduleInput[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (successMessage) {
      const t = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(t);
    }
  }, [successMessage]);

  const openScheduleModal = (staff: AvailabilityStaff) => {
    setEditingStaff(staff);
    const schedule: DayScheduleInput[] = [0, 1, 2, 3, 4, 5, 6].map((dayIdx) => {
      const existingShift = staff.workingHours.find((w) => w.dayOfWeek === dayIdx);
      const hasBreak = Boolean(existingShift?.breaks && existingShift.breaks.length > 0);
      const shiftStart = existingShift?.startTime || '09:00';
      const shiftEnd = existingShift?.endTime || '17:00';
      const defaultBreak = computeSensibleBreak(shiftStart, shiftEnd);

      return {
        dayOfWeek: dayIdx,
        enabled: Boolean(existingShift),
        startTime: shiftStart,
        endTime: shiftEnd,
        hasBreak: hasBreak,
        breakStartTime: hasBreak ? existingShift?.breaks[0].startTime : defaultBreak.breakStartTime,
        breakEndTime: hasBreak ? existingShift?.breaks[0].endTime : defaultBreak.breakEndTime,
      };
    });
    setWorkingSchedule(schedule);
    setErrorMessage(null);
  };

  const updateDayTimes = (idx: number, newStart: string, newEnd: string) => {
    setWorkingSchedule((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const startMins = toMinutes(newStart);
        const endMins = toMinutes(newEnd);
        let hasBreak = d.hasBreak;
        let breakStart = d.breakStartTime || '13:00';
        let breakEnd = d.breakEndTime || '14:00';

        if (hasBreak && newStart && newEnd) {
          const bStartMins = toMinutes(breakStart);
          const bEndMins = toMinutes(breakEnd);
          if (bStartMins < startMins || bEndMins > endMins || bEndMins <= bStartMins) {
            if (endMins - startMins >= 90) {
              const adjusted = computeSensibleBreak(newStart, newEnd);
              breakStart = adjusted.breakStartTime;
              breakEnd = adjusted.breakEndTime;
            } else {
              hasBreak = false;
            }
          }
        }

        return {
          ...d,
          startTime: newStart,
          endTime: newEnd,
          hasBreak,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
        };
      })
    );
    setErrorMessage(null);
  };

  const toggleBreak = (idx: number) => {
    setWorkingSchedule((prev) =>
      prev.map((d, i) => {
        if (i !== idx) return d;
        const nextHasBreak = !d.hasBreak;
        let breakStart = d.breakStartTime;
        let breakEnd = d.breakEndTime;

        if (nextHasBreak) {
          const startMins = toMinutes(d.startTime);
          const endMins = toMinutes(d.endTime);
          const bStartMins = toMinutes(breakStart || '');
          const bEndMins = toMinutes(breakEnd || '');
          if (!breakStart || !breakEnd || bStartMins < startMins || bEndMins > endMins || bEndMins <= bStartMins) {
            const sensible = computeSensibleBreak(d.startTime, d.endTime);
            breakStart = sensible.breakStartTime;
            breakEnd = sensible.breakEndTime;
          }
        }

        return {
          ...d,
          hasBreak: nextHasBreak,
          breakStartTime: breakStart,
          breakEndTime: breakEnd,
        };
      })
    );
    setErrorMessage(null);
  };

  const applyPresetToWeekdays = (startTime: string, endTime: string, hasBreak = true) => {
    const sensibleBreak = computeSensibleBreak(startTime, endTime);
    setWorkingSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek >= 1 && d.dayOfWeek <= 5) {
          return {
            ...d,
            enabled: true,
            startTime,
            endTime,
            hasBreak,
            breakStartTime: sensibleBreak.breakStartTime,
            breakEndTime: sensibleBreak.breakEndTime,
          };
        }
        return d;
      })
    );
    setErrorMessage(null);
  };

  const copyMondayToWeekdays = () => {
    const monday = workingSchedule.find((d) => d.dayOfWeek === 1);
    if (!monday) return;
    setWorkingSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek >= 2 && d.dayOfWeek <= 5) {
          return {
            ...d,
            enabled: monday.enabled,
            startTime: monday.startTime,
            endTime: monday.endTime,
            hasBreak: monday.hasBreak,
            breakStartTime: monday.breakStartTime,
            breakEndTime: monday.breakEndTime,
          };
        }
        return d;
      })
    );
    setErrorMessage(null);
  };

  const getDayValidation = (day: DayScheduleInput): string | null => {
    if (!day.enabled) return null;
    if (!day.startTime || !day.endTime) return 'Start and end time required';
    const start = toMinutes(day.startTime);
    const end = toMinutes(day.endTime);
    if (end <= start) return 'Shift must end after start time';

    if (day.hasBreak) {
      if (!day.breakStartTime || !day.breakEndTime) return 'Break start and end required';
      const bStart = toMinutes(day.breakStartTime);
      const bEnd = toMinutes(day.breakEndTime);
      if (bEnd <= bStart) return 'Break must end after break start';
      if (bStart < start || bEnd > end) return `Break must be between ${day.startTime} and ${day.endTime}`;
    }
    return null;
  };

  const hasAnyErrors = workingSchedule.some((d) => Boolean(getDayValidation(d)));

  const handleSaveSchedule = async () => {
    if (!editingStaff) return;
    if (hasAnyErrors) {
      setErrorMessage('Please resolve the highlighted shift issues before saving.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const res = await updateStaffWorkingHoursAction(workspaceId, editingStaff.id, workingSchedule);
    setIsSubmitting(false);

    if (res.success) {
      setStaffList((prev) =>
        prev.map((s) => {
          if (s.id !== editingStaff.id) return s;
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
      setSuccessMessage(`Updated weekly shift rules for ${editingStaff.name}.`);
      setEditingStaff(null);
    } else {
      setErrorMessage(res.error || 'Failed to update schedule');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Clock className="h-7 w-7 text-blue-600" />
            Availability & Working Shifts
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure weekly operating shifts, break intervals, and buffer rules for schedule
            generation.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {staffList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <Users className="h-10 w-10 text-slate-400 mb-3" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            No staff members found
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            Add team members from the Staff section to configure their working availability.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {staffList.map((staff) => (
            <Card key={staff.id} className="border-slate-200 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                      {staff.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        {staff.name} — Weekly Schedule
                      </CardTitle>
                      <span className="text-xs text-slate-500">Operating in {staff.timezone}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={staff.isActive ? 'success' : 'default'}>
                      {staff.isActive ? 'Active Shifts' : 'Inactive'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openScheduleModal(staff)}
                      className="gap-1.5 text-xs h-8"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit Shifts
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="space-y-3">
                  {DAYS_OF_WEEK.map((dayName, idx) => {
                    const shift = staff.workingHours.find((w) => w.dayOfWeek === idx);
                    const isWorking = Boolean(shift);

                    return (
                      <div
                        key={dayName}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl border text-xs transition-all ${
                          isWorking
                            ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : 'bg-slate-50 dark:bg-slate-950/40 border-dashed border-slate-200 dark:border-slate-800 text-slate-400 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 w-32 font-bold text-slate-800 dark:text-slate-200">
                          <Calendar className="h-3.5 w-3.5 text-blue-500" />
                          <span>{dayName}</span>
                        </div>

                        {isWorking && shift ? (
                          <div className="flex flex-wrap items-center gap-4 mt-2 sm:mt-0">
                            <div className="flex items-center gap-1.5 font-mono bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300">
                              <Clock className="h-3 w-3 text-blue-400" />
                              <span>
                                {shift.startTime} – {shift.endTime}
                              </span>
                            </div>

                            {shift.breaks && shift.breaks.length > 0 && (
                              <div className="flex items-center gap-1.5 text-slate-500">
                                <Coffee className="h-3.5 w-3.5 text-amber-500" />
                                <span>
                                  Break: {shift.breaks[0].startTime} – {shift.breaks[0].endTime}
                                </span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="italic mt-1 sm:mt-0">Off Day</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Edit Modal */}
      <Modal
        isOpen={Boolean(editingStaff)}
        onClose={() => setEditingStaff(null)}
        title={`Weekly Working Shifts — ${editingStaff?.name || ''}`}
        description="Configure available working hours and lunch break windows for each day of the week."
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs mt-3">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Quick Presets Toolbar */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Quick Shift Presets (Weekdays)
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => applyPresetToWeekdays('09:00', '17:00', true)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs transition-all"
              >
                9 AM – 5 PM
              </button>
              <button
                type="button"
                onClick={() => applyPresetToWeekdays('08:00', '16:00', true)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs transition-all"
              >
                8 AM – 4 PM
              </button>
              <button
                type="button"
                onClick={() => applyPresetToWeekdays('09:00', '13:00', false)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs transition-all"
              >
                9 AM – 1 PM (Half Day)
              </button>
              <button
                type="button"
                onClick={() => applyPresetToWeekdays('13:00', '21:00', true)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 hover:text-blue-600 text-slate-700 dark:text-slate-200 text-xs font-medium shadow-2xs transition-all"
              >
                1 PM – 9 PM (Evening)
              </button>
              <button
                type="button"
                onClick={copyMondayToWeekdays}
                className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 text-blue-700 dark:text-blue-300 text-xs font-semibold shadow-2xs transition-all"
              >
                Copy Mon to All Weekdays
              </button>
            </div>
          </div>

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {workingSchedule.map((day, idx) => {
              const dayError = getDayValidation(day);

              return (
                <div
                  key={day.dayOfWeek}
                  className={`p-3.5 rounded-xl border transition-all ${
                    dayError
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-sm'
                      : day.enabled
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-950/40 border-dashed border-slate-200 dark:border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 w-32">
                      <input
                        type="checkbox"
                        id={`avail-day-${day.dayOfWeek}`}
                        checked={day.enabled}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setWorkingSchedule((prev) =>
                            prev.map((d, i) => (i === idx ? { ...d, enabled: checked } : d))
                          );
                          setErrorMessage(null);
                        }}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <label
                        htmlFor={`avail-day-${day.dayOfWeek}`}
                        className="font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                      >
                        {DAYS_OF_WEEK[day.dayOfWeek]}
                      </label>
                    </div>

                    {day.enabled ? (
                      <div className="flex flex-wrap items-center gap-3 flex-1 justify-end">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-semibold">Shift:</span>
                          <input
                            type="time"
                            value={day.startTime}
                            onChange={(e) => updateDayTimes(idx, e.target.value, day.endTime)}
                            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                          />
                          <span className="text-slate-400">–</span>
                          <input
                            type="time"
                            value={day.endTime}
                            onChange={(e) => updateDayTimes(idx, day.startTime, e.target.value)}
                            className="px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => toggleBreak(idx)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                              day.hasBreak
                                ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800'
                            }`}
                            title={day.hasBreak ? 'Click to remove break' : 'Click to add break window'}
                          >
                            <Coffee className="h-3 w-3" />
                            <span>{day.hasBreak ? 'Break On' : '+ Break'}</span>
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
                                  setErrorMessage(null);
                                }}
                                className="px-1.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-mono"
                              />
                              <span className="text-slate-400">–</span>
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
                                  setErrorMessage(null);
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

                  {dayError && (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-2 pt-2 border-t border-rose-100 dark:border-rose-900/40 flex items-center gap-1.5">
                      <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                      <span>{dayError}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky footer with inline error note and action buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              {hasAnyErrors ? (
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  Please fix invalid times above before saving.
                </span>
              ) : (
                <span className="text-[11px] text-slate-400">
                  Times are automatically verified against operating constraints.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingStaff(null)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleSaveSchedule}
                isLoading={isSubmitting}
                disabled={hasAnyErrors || isSubmitting}
                className="gap-2"
              >
                <Check className="h-4 w-4" />
                Save Shift Rules
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
