import * as React from 'react';
import { cn } from '../lib/utils';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, required, children, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn('block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5', className)}
        {...props}
      >
        {children}
        {required && <span className="text-rose-500 ml-1 font-bold">*</span>}
      </label>
    );
  }
);
Label.displayName = 'Label';
