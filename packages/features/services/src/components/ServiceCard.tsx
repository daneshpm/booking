'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Button,
} from '@bookings/ui';
import {
  Clock,
  DollarSign,
  MapPin,
  Video,
  Building,
  Phone,
  Shield,
  Edit,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { ServiceOutputDTO } from '../application/create-service/CreateServiceDTO';

interface ServiceCardProps {
  service: ServiceOutputDTO;
  onDelete?: (id: string) => void;
}

export function ServiceCard({ service, onDelete }: ServiceCardProps) {
  const getLocationIcon = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return <Video className="h-3.5 w-3.5" />;
      case 'IN_PERSON_BUSINESS':
        return <Building className="h-3.5 w-3.5" />;
      case 'PHONE_CALL':
        return <Phone className="h-3.5 w-3.5" />;
      default:
        return <MapPin className="h-3.5 w-3.5" />;
    }
  };

  const formatLocationLabel = (type: string) => {
    switch (type) {
      case 'ONLINE_MEETING':
        return 'Online Video';
      case 'IN_PERSON_BUSINESS':
        return 'In Office';
      case 'IN_PERSON_CUSTOMER':
        return 'At Customer';
      case 'PHONE_CALL':
        return 'Phone Call';
      default:
        return type;
    }
  };

  return (
    <Card className="flex flex-col justify-between border-slate-200/90 dark:border-slate-800 transition-all hover:border-blue-400 dark:hover:border-blue-600 hover:shadow-lg group">
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {service.name}
              </CardTitle>
              <div className="flex items-center gap-1.5 mt-1 font-mono text-xs text-slate-400">
                <span>/services/{service.slug}</span>
              </div>
            </div>
            <Badge variant={service.isActive ? 'success' : 'default'}>
              {service.isActive ? 'Active' : 'Draft'}
            </Badge>
          </div>
          {service.description && (
            <CardDescription className="line-clamp-2 mt-2 text-xs">
              {service.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3 pt-2">
          {/* Metadata Badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 font-medium">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>{service.formattedDuration}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 font-medium">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              <span>{service.formattedPrice}</span>
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 font-medium">
              {getLocationIcon(service.locationType)}
              <span>{formatLocationLabel(service.locationType)}</span>
            </div>
          </div>

          {/* Buffer Information if present */}
          {(service.bufferBeforeMinutes > 0 || service.bufferAfterMinutes > 0) && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <Shield className="h-3.5 w-3.5 text-indigo-500" />
              <span>
                Buffer: {service.bufferBeforeMinutes}m before • {service.bufferAfterMinutes}m after
              </span>
            </div>
          )}
        </CardContent>
      </div>

      <CardFooter className="pt-3 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80">
        <Link
          href={`/book/service/${service.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Preview Booker
        </Link>

        <div className="flex items-center gap-1">
          <Link href={`/services/${service.id}/edit`}>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </Link>
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(service.id)}
              className="h-8 w-8 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
