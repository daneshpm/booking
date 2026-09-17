'use client';

import * as React from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Label,
} from '@bookings/ui';
import { Download, FileSpreadsheet, FileText, CheckCircle2 } from 'lucide-react';
import { exportAppointmentsAction, type ExportInput } from './actions';

interface FieldOption {
  key: string;
  label: string;
}

interface ExportClientProps {
  workspaceId: string;
  fields: FieldOption[];
}

/** Fields selected by default, matching what a business owner most often needs. */
const DEFAULT_FIELD_KEYS = [
  'startTime',
  'endTime',
  'bookingId',
  'service',
  'staff',
  'customerName',
  'status',
];

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function ExportClient({ workspaceId, fields }: ExportClientProps) {
  const [dateFrom, setDateFrom] = React.useState(daysAgoIsoDate(30));
  const [dateTo, setDateTo] = React.useState(todayIsoDate());
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(
    new Set(DEFAULT_FIELD_KEYS)
  );
  const [format, setFormat] = React.useState<'csv' | 'xlsx'>('xlsx');
  const [includeCustomFields, setIncludeCustomFields] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);

  const toggleField = (key: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedFields((prev) =>
      prev.size === fields.length ? new Set() : new Set(fields.map((f) => f.key))
    );
  };

  const handleExport = async () => {
    setError(null);
    setSuccessMessage(null);

    if (selectedFields.size === 0) {
      setError('Select at least one field to export.');
      return;
    }

    setIsExporting(true);
    try {
      const input: ExportInput = {
        dateFrom,
        dateTo,
        fields: Array.from(selectedFields) as ExportInput['fields'],
        format,
        includeCustomFields,
      };
      const res = await exportAppointmentsAction(workspaceId, input);

      if (!res.success || !res.base64 || !res.filename || !res.mimeType) {
        setError(res.error || 'Export failed. Please try again.');
        return;
      }

      // Server actions can't stream a file response, so the data travels as
      // base64 and the browser is handed a Blob URL to download from here.
      const byteChars = atob(res.base64);
      const bytes = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) bytes[i] = byteChars.charCodeAt(i);
      const blob = new Blob([bytes], { type: res.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage(res.warning || `Exported ${res.filename} successfully.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-[#5c34ad]">
            <Download className="h-5 w-5" />
          </div>
          Export Data
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Download appointment data for a date range as a spreadsheet.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium"
        >
          {error}
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="flex items-center gap-2 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Appointments</CardTitle>
          <CardDescription>The only exportable module today.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="export-from">Date Range Start</Label>
              <input
                id="export-from"
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
              />
            </div>
            <div>
              <Label htmlFor="export-to">Date Range End</Label>
              <input
                id="export-to"
                type="date"
                value={dateTo}
                min={dateFrom}
                max={todayIsoDate()}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full mt-1 text-xs px-3 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:border-[#5c34ad]"
              />
            </div>
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">Fields ({selectedFields.size} Selected)</Label>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-semibold text-[#5c34ad] hover:underline cursor-pointer"
              >
                {selectedFields.size === fields.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 rounded-xl border border-slate-200 bg-slate-50/60 max-h-52 overflow-y-auto">
              {fields.map((field) => (
                <label
                  key={field.key}
                  className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    checked={selectedFields.has(field.key)}
                    onChange={() => toggleField(field.key)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-[#5c34ad] focus:ring-[#5c34ad]/30"
                  />
                  {field.label}
                </label>
              ))}
            </div>
          </div>

          {/* Custom fields */}
          <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeCustomFields}
              onChange={(e) => setIncludeCustomFields(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-[#5c34ad] focus:ring-[#5c34ad]/30"
            />
            Include Custom Fields (intake question answers)
          </label>

          {/* Export As */}
          <div>
            <Label className="mb-2 block">Export As</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormat('csv')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  format === 'csv'
                    ? 'border-[#5c34ad] bg-purple-50 text-[#5c34ad]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                CSV
              </button>
              <button
                type="button"
                onClick={() => setFormat('xlsx')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  format === 'xlsx'
                    ? 'border-[#5c34ad] bg-purple-50 text-[#5c34ad]'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                XLSX
              </button>
            </div>
          </div>

          <Button
            type="button"
            variant="primary"
            onClick={handleExport}
            isLoading={isExporting}
            className="w-full gap-2 bg-[#5c34ad] hover:bg-[#4d2994]"
          >
            <Download className="h-4 w-4" />
            Export Data
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
