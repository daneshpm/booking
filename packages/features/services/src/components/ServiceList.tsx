'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Button,
  Input,
  Select,
  Modal,
} from '@bookings/ui';
import {
  Plus,
  Search,
  Briefcase,
  Trash2,
} from 'lucide-react';
import { ServiceCard } from './ServiceCard';
import { deleteServiceAction } from '../api/service.actions';
import type { ServiceOutputDTO } from '../application/create-service/CreateServiceDTO';

interface ServiceListProps {
  workspaceId: string;
  initialServices: ServiceOutputDTO[];
}

export function ServiceList({ workspaceId, initialServices }: ServiceListProps) {
  const [services, setServices] = React.useState<ServiceOutputDTO[]>(initialServices);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'ALL' | 'ACTIVE' | 'DRAFT'>('ALL');
  
  // Deletion modal state
  const [deleteId, setDeleteId] = React.useState<string | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ACTIVE'
        ? s.isActive
        : !s.isActive;

    return matchesSearch && matchesStatus;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    const res = await deleteServiceAction(workspaceId, deleteId);
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.id !== deleteId));
      setDeleteId(null);
    }
    setIsDeleting(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Services
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure your commercial services, consultation lengths, buffers, and meeting locations.
          </p>
        </div>

        <Link href="/services/new">
          <Button variant="primary" className="gap-2 shadow-lg shadow-blue-500/20">
            <Plus className="h-4 w-4" />
            Create Service
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search services by name or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 border-0 bg-slate-50 dark:bg-slate-800/50 shadow-none focus:ring-1"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-36 text-xs h-9 bg-slate-50 dark:bg-slate-800/50"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="DRAFT">Draft Only</option>
          </Select>
        </div>
      </div>

      {/* Services Grid or Empty State */}
      {filteredServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 mb-4 shadow-sm">
            <Briefcase className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {searchQuery ? 'No services found' : 'No services configured yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6">
            {searchQuery
              ? 'Try adjusting your search query or clear the filter to see all services.'
              : 'Create your first appointment service to allow clients to view your availability and book appointments.'}
          </p>
          <Link href="/services/new">
            <Button variant="primary" className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Service
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onDelete={(id) => setDeleteId(id)}
            />
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        title="Delete Service"
        description="Are you sure you want to delete this service? Existing booked appointments will remain intact, but new clients won't be able to book it."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={() => setDeleteId(null)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteConfirm}
            isLoading={isDeleting}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Service
          </Button>
        </div>
      </Modal>
    </div>
  );
}
