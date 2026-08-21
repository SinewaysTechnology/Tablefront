import React, { useState, useEffect, useRef, useContext, createContext, MutableRefObject, useCallback, useLayoutEffect, useMemo } from 'react';
import { cn } from './utils';
import { createPortal } from 'react-dom';

// Smart button wrapper that automatically handles sizing based on content
export const SmartButton = React.forwardRef<HTMLButtonElement, {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>(({ children, className, disabled, ...props }, ref) => {
  
  // Check if button contains text content (not just icons)
  const hasTextContent = React.useMemo(() => {
    const checkForText = (node: React.ReactNode): boolean => {
      if (typeof node === 'string' && node.trim()) return true;
      if (typeof node === 'number') return true;
      if (React.isValidElement(node)) {
        // Check if it's a span/text element or has text children
        if (node.type === 'span' || typeof node.type === 'string') {
          return checkForText((node.props as { children?: React.ReactNode })?.children);
        }
      }
      if (Array.isArray(node)) {
        return node.some(checkForText);
      }
      return false;
    };
    return checkForText(children);
  }, [children]);

  // Smart className handling for size classes with text
  const smartClassName = React.useMemo(() => {
    if (!className) return '';
    
    // If button has text and className contains square size classes, convert to height-only
    if (hasTextContent) {
      return className
        .replace(/\bsize-(\d+)\b/g, 'h-$1') // Convert size-X to h-X only
        .replace(/\bw-(\d+)\b/g, '') // Remove any width constraints
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();
    }
    
    return className;
  }, [className, hasTextContent]);

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        'hover:bg-foreground/5 hover:text-accent-foreground',
        '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0',
        'gap-2 px-2',
        smartClassName
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
});
SmartButton.displayName = 'SmartButton';

// Common SimpleButton with ghost variant only
export const SimpleButton = React.forwardRef<HTMLButtonElement, {
  children?: React.ReactNode;
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs' | 'auto';
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>>(({ children, className, disabled, size = 'default', ...props }, ref) => {
  
  // Check if button contains text content (not just icons)
  const hasTextContent = React.useMemo(() => {
    const checkForText = (node: React.ReactNode): boolean => {
      if (typeof node === 'string' && node.trim()) return true;
      if (typeof node === 'number') return true;
      if (React.isValidElement(node)) {
        // Check if it's a span/text element or has text children
        if (node.type === 'span' || typeof node.type === 'string') {
          return checkForText((node.props as { children?: React.ReactNode })?.children);
        }
      }
      if (Array.isArray(node)) {
        return node.some(checkForText);
      }
      return false;
    };
    return checkForText(children);
  }, [children]);

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return hasTextContent ? 'h-8' : 'h-8 w-8'
      case 'default':
        return hasTextContent ? 'h-9 py-2' : 'h-10 w-10'
      case 'sm':
        return hasTextContent ? 'h-9 rounded-md' : 'h-9 w-9 rounded-md'
      case 'lg':
        return hasTextContent ? 'h-11 rounded-md' : 'h-11 w-11 rounded-md'
      case 'icon':
        return hasTextContent ? 'h-10' : 'h-10 w-10'
      case 'auto':
        return '' // No size classes, let className handle all sizing
      default:
        return hasTextContent ? 'h-10 py-2' : 'h-10 w-10'
    }
  }
  
  // Smart className handling for size classes with text
  const smartClassName = React.useMemo(() => {
    if (!className) return '';
    
    // If button has text and className contains square size classes, convert to height-only
    if (hasTextContent) {
      return className
        .replace(/\bsize-(\d+)\b/g, 'h-$1') // Convert size-X to h-X only
        .replace(/\bw-(\d+)\b/g, '') // Remove any width constraints
        .replace(/\s+/g, ' ') // Clean up extra spaces
        .trim();
    }
    
    return className;
  }, [className, hasTextContent]);

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        'hover:bg-foreground/5 hover:text-accent-foreground',
        '[&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 [&_svg]:shrink-0',
        'gap-2 px-2',
        getSizeClasses(),
        smartClassName
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
});
SimpleButton.displayName = 'SimpleButton';

// SimpleScrollArea
export const SimpleScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & {
  scrollHideDelay?: number;
  type?: 'scroll' | 'hover' | 'always' | 'never';
}>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={cn('relative', className)} {...props}>
    {children}
  </div>
));
SimpleScrollArea.displayName = 'SimpleScrollArea';

// Popover Context
type PopoverContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
};

const PopoverContext = createContext<PopoverContextType | null>(null);

export const SimplePopover = React.memo<{
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}>(({
  children,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const effectiveOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;
  
  // Memoize the setOpen function to prevent recreation
  const effectiveSetOpen = useCallback((b: boolean) => {
    onOpenChange?.(b);
    if (onOpenChange === undefined) setInternalOpen(b);
  }, [onOpenChange]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  // Memoize the click outside handler to prevent recreation
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (
      effectiveOpen &&
      !triggerRef.current?.contains(e.target as Node) &&
      !contentRef.current?.contains(e.target as Node)
    ) {
      effectiveSetOpen(false);
    }
  }, [effectiveOpen, effectiveSetOpen]);

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [handleClickOutside]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({ 
    open: effectiveOpen, 
    setOpen: effectiveSetOpen, 
    triggerRef, 
    contentRef 
  }), [effectiveOpen, effectiveSetOpen]);

  return (
    <PopoverContext.Provider value={contextValue}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  );
});

SimplePopover.displayName = 'SimplePopover';

export const SimplePopoverTrigger = React.memo<{
  children: React.ReactNode;
  asChild?: boolean;
}>(({
  children,
  asChild = false,
}) => {
  const context = useContext(PopoverContext);
  if (!context) return <>{children}</>;

  const { setOpen, triggerRef, open } = context;

  // Memoize the click handler to prevent recreation
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(!open);
  }, [setOpen, open]);

  // Memoize the ref handler to prevent recreation
  const handleRef = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el;
    if (React.isValidElement<any>(children)) {
      const childProps = children.props as { ref?: React.Ref<any> };
      if (typeof childProps.ref === 'function') {
        childProps.ref(el);
      } else if (childProps.ref) {
        (childProps.ref as MutableRefObject<HTMLElement | null>).current = el;
      }
    }
  }, [triggerRef, children]);

  if (asChild && React.isValidElement<any>(children)) {
    const childProps = children.props as { onClick?: (e: React.MouseEvent) => void; ref?: React.Ref<any> };
    
    // Memoize the merged click handler
    const mergedClickHandler = useCallback((e: React.MouseEvent) => {
      handleClick(e);
      childProps.onClick?.(e);
    }, [handleClick, childProps.onClick]);
    
    return React.cloneElement<any>(
      children,
      {
        onClick: mergedClickHandler,
        ref: handleRef,
      }
    );
  }

  return (
    <div onClick={handleClick} ref={handleRef}>
      {children}
    </div>
  );
});

SimplePopoverTrigger.displayName = 'SimplePopoverTrigger';

export const SimplePopoverContent = React.memo<{
  children: React.ReactNode;
  className?: string;
  align?: 'center' | 'start' | 'end';
  sideOffset?: number;
}>(({
  children,
  className,
  align = 'center',
  sideOffset = 8,
}) => {
  const context = useContext(PopoverContext);

  const [position, setPosition] = useState({ top: -9999, left: -9999 });
  const [measured, setMeasured] = useState(false);
  const [side, setSide] = useState<'top' | 'bottom'>('bottom');
  const innerRef = useRef<HTMLDivElement>(null);

  // Memoize the updatePosition function to prevent recreation
  const updatePosition = useCallback(() => {
    if (!context || !context.triggerRef.current || !context.contentRef.current) return;

    const triggerRect = context.triggerRef.current.getBoundingClientRect();
    const contentRef = context.contentRef.current;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const edgeMargin = 8;

    // Reset styles for measurement, then cap width so the popover always fits.
    if (innerRef.current) {
      innerRef.current.style.maxHeight = '';
      innerRef.current.style.overflowY = '';
    }
    contentRef.style.visibility = 'hidden';
    contentRef.style.maxWidth = `${Math.max(0, viewportWidth - edgeMargin * 2)}px`;
    contentRef.style.boxSizing = 'border-box';

    const contentRect = contentRef.getBoundingClientRect();

    const style = window.getComputedStyle(contentRef);
    const paddingTop = parseFloat(style.paddingTop);
    const paddingBottom = parseFloat(style.paddingBottom);
    const borderTop = parseFloat(style.borderTopWidth);
    const borderBottom = parseFloat(style.borderBottomWidth);
    const extraVertical = paddingTop + paddingBottom + borderTop + borderBottom;

    const spaceBelow = viewportHeight - triggerRect.bottom - sideOffset - edgeMargin;
    const spaceAbove = triggerRect.top - sideOffset - edgeMargin;

    let chosenSide: 'top' | 'bottom' = 'bottom';
    const fullHeight = contentRect.height;
    if (spaceBelow < fullHeight && spaceAbove >= fullHeight) {
      chosenSide = 'top';
    } else if (spaceBelow < fullHeight && spaceAbove < fullHeight) {
      chosenSide = spaceBelow > spaceAbove ? 'bottom' : 'top';
    }
    setSide(chosenSide);

    let top: number;
    let maxHeight: number | undefined;

    if (chosenSide === 'bottom') {
      top = triggerRect.bottom + sideOffset;
      const available = viewportHeight - top - edgeMargin;
      if (available < fullHeight) {
        maxHeight = available - extraVertical;
      }
    } else {
      top = triggerRect.top - fullHeight - sideOffset;
      const available = triggerRect.top - sideOffset - edgeMargin;
      if (top < edgeMargin) {
        top = edgeMargin;
        maxHeight = (triggerRect.top - sideOffset - edgeMargin) - extraVertical;
      }
    }

    let left = triggerRect.left;
    if (align === 'center') {
      left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
    } else if (align === 'end') {
      left = triggerRect.right - contentRect.width;
    }

    if (left < edgeMargin) left = edgeMargin;
    if (left + contentRect.width > viewportWidth - edgeMargin) {
      left = viewportWidth - contentRect.width - edgeMargin;
    }

    setPosition({ top, left });
    setMeasured(true);

    if (maxHeight !== undefined && innerRef.current) {
      innerRef.current.style.maxHeight = `${Math.max(0, maxHeight)}px`;
      innerRef.current.style.overflowY = 'auto';
    }

    contentRef.style.visibility = '';
  }, [align, sideOffset, context]);

  useLayoutEffect(() => {
    if (context?.open) {
      updatePosition();
    }
  }, [context?.open, updatePosition]);

  // Memoize the event handlers to prevent recreation
  const handleResize = useCallback(() => updatePosition(), [updatePosition]);
  const handleScroll = useCallback(() => updatePosition(), [updatePosition]);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [handleResize, handleScroll]);

  // Memoize the style object to prevent recreation - must be before any conditional returns
  const style = useMemo(() => ({
    position: 'fixed' as const,
    top: `${position.top}px`,
    left: `${position.left}px`,
    visibility: measured ? 'visible' as const : 'hidden' as const,
  }), [position.top, position.left, measured]);

  if (!context || !context.open) return null;

  return createPortal(
    <div
      data-tablefront-root
      ref={context.contentRef}
      style={style}
      className={cn(
        'z-50 rounded-md border bg-white p-1 shadow-md',
        className
      )}
    >
      <div ref={innerRef} className="min-w-0 max-w-full overflow-x-hidden">
        {children}
      </div>
    </div>,
    document.body
  );
});

SimplePopoverContent.displayName = 'SimplePopoverContent';

// SimpleTooltip - basic hover tooltip
export const SimpleTooltip = React.memo<{ children: React.ReactNode }>(({ children }) => (
  <div className="relative group">{children}</div>
));

SimpleTooltip.displayName = 'SimpleTooltip';

export const SimpleTooltipTrigger = React.memo<{ 
  children: React.ReactNode; 
  asChild?: boolean; 
}>(({ children, asChild }) => (
  <div className="inline-block">{children}</div>
));

SimpleTooltipTrigger.displayName = 'SimpleTooltipTrigger';

export const SimpleTooltipContent = React.memo<{ 
  children: React.ReactNode; 
  className?: string 
}>(({ children, className }) => (
  <div className={cn(
    'absolute bg-card text-card-foreground animate-in fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 z-50 max-w-md whitespace-nowrap rounded-sm px-3 py-3 text-xs duration-100 shadow-[0_0_0_1px_rgba(0,0,0,0.05),0_3px_6px_rgba(0,0,0,0.1),0_5px_15px_rgba(0,0,0,0.1)] hidden group-hover:block bottom-full left-1/2 -translate-x-1/2 mb-1',
    className
  )}>
    {children}
  </div>
));

SimpleTooltipContent.displayName = 'SimpleTooltipContent';

// SimpleSwitch
export const SimpleSwitch = React.memo<{
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  id?: string;
}>(({ checked, onCheckedChange, className, id }) => {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckedChange?.(e.target.checked);
  }, [onCheckedChange]);

  return (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={handleChange}
      className={cn('w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500', className)}
      suppressHydrationWarning
    />
  );
});

SimpleSwitch.displayName = 'SimpleSwitch';

// SimpleLabel
export const SimpleLabel = React.memo<{
  children?: React.ReactNode;
  htmlFor?: string;
  className?: string;
}>(({ children, htmlFor, className }) => (
  <label htmlFor={htmlFor} className={cn('text-sm font-medium leading-none', className)}>
    {children}
  </label>
));

SimpleLabel.displayName = 'SimpleLabel';

// SimpleSeparator
export const SimpleSeparator = React.memo<{ className?: string }>(({ className }) => (
  <hr className={cn('my-2 border-t border-gray-200', className)} />
));

SimpleSeparator.displayName = 'SimpleSeparator';

// SimpleSettingsIcon (using SVG)
export const SimpleSettings02Icon = React.memo<{ className?: string }>(({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className || 'size-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2v2m0 8v2m0-2v-2m6-6h2m-2 0h-2m-6 0H4m2 0h2m8 6h2m-2 0h-2m-6 0H4m2 0h2" />
  </svg>
));

SimpleSettings02Icon.displayName = 'SimpleSettings02Icon'; 