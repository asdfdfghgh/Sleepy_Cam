// Adapted from @codedthemes/uiable (MIT License) — Futuristic HUD Timeline
import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const timelineVariants = cva('group/timeline relative flex flex-col', {
  variants: {
    variant: {
      default: '',
      compact: 'text-xs'
    }
  },
  defaultVariants: {
    variant: 'default'
  }
});

export interface TimelineProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof timelineVariants> {}

export function Timeline({ className, variant, ...props }: TimelineProps) {
  return (
    <div
      data-slot="timeline"
      className={cn(timelineVariants({ variant, className }))}
      {...props}
    />
  );
}

const timelineItemVariants = cva('group/item relative flex min-w-0 flex-row', {
  variants: {
    status: {
      default: '',
      completed: 'is-completed',
      warning: 'is-warning',
      error: 'is-error'
    }
  },
  defaultVariants: {
    status: 'default'
  }
});

export interface TimelineItemProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof timelineItemVariants> {}

export function TimelineItem({ className, status, ...props }: TimelineItemProps) {
  return (
    <div
      data-slot="timeline-item"
      className={cn(timelineItemVariants({ status, className }))}
      {...props}
    />
  );
}

export function TimelineSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-separator"
      className={cn('relative flex shrink-0 flex-col items-center self-stretch', className)}
      {...props}
    />
  );
}

const timelineIndicatorVariants = cva(
  'relative z-10 flex size-7 shrink-0 items-center justify-center rounded-lg border text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-black/15 bg-white text-black dark:border-white/15 dark:bg-[#14161b] dark:text-zinc-200',
        teal: 'border-[#00ffc6]/50 bg-[#00ffc6]/18 text-[#007a5f] dark:text-[#00ffc6]',
        warning: 'border-amber-400/35 bg-amber-400/12 text-amber-700 dark:text-amber-300',
        error: 'border-red-500/35 bg-red-500/12 text-red-600 dark:text-red-400'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface TimelineIndicatorProps
  extends React.ComponentProps<'div'>,
    VariantProps<typeof timelineIndicatorVariants> {}

export function TimelineIndicator({ className, variant, ...props }: TimelineIndicatorProps) {
  return (
    <div
      data-slot="timeline-indicator"
      className={cn(timelineIndicatorVariants({ variant, className }))}
      {...props}
    />
  );
}

export function TimelineConnector({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-connector"
      aria-hidden="true"
      className={cn(
        'my-1 w-px flex-1 bg-black/15 dark:bg-white/15 group-last/item:hidden',
        className
      )}
      {...props}
    />
  );
}

export function TimelineContent({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-content"
      className={cn('min-w-0 flex-1 pb-5 pl-3.5 group-last/item:pb-0', className)}
      {...props}
    />
  );
}

export function TimelineHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="timeline-header"
      className={cn('flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1', className)}
      {...props}
    />
  );
}

export function TimelineTitle({ className, ...props }: React.ComponentProps<'h4'>) {
  return (
    <h4
      data-slot="timeline-title"
      className={cn(
        'text-sm font-medium leading-snug text-slate-900 dark:text-slate-100',
        className
      )}
      {...props}
    />
  );
}

export function TimelineTime({ className, ...props }: React.ComponentProps<'time'>) {
  return (
    <time
      data-slot="timeline-time"
      className={cn(
        'font-mono text-xs text-slate-500 dark:text-slate-400 tabular-nums shrink-0',
        className
      )}
      {...props}
    />
  );
}

export function TimelineDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="timeline-description"
      className={cn('mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400', className)}
      {...props}
    />
  );
}
