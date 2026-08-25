import * as React from 'react';
import { cn } from '../lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const variants = {
    info: 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800/80',
    success: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/80',
    warning: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-800/80',
    danger: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800/80',
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-xl border p-4 text-sm shadow-sm', variants[variant], className)}
      {...props}
    >
      {title && <h5 className="mb-1 font-bold leading-none tracking-tight">{title}</h5>}
      <div className="text-xs leading-relaxed opacity-90">{children}</div>
    </div>
  );
}
