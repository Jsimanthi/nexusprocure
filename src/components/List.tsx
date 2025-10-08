import React from 'react';
import { cn } from '@/lib/utils';

export const List = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn('space-y-2', className)}
      {...props}
    />
  );
});
List.displayName = 'List';

export const ListItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn(
        'p-2 rounded-md transition-colors border-b border-gray-100 last:border-b-0',
        'hover:bg-gray-50',
        className
      )}
      {...props}
    />
  );
});
ListItem.displayName = 'ListItem';