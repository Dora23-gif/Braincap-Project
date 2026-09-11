import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
  maxWidthClass?: string;
}

export const ModalPortal: React.FC<ModalPortalProps> = ({
  children,
  isOpen = true,
  onClose,
  className = '',
  maxWidthClass = 'max-w-2xl',
}) => {
  useEffect(() => {
    if (!isOpen) return;

    // Prevent background scrolling while modal is active
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Handle Escape key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto p-3 sm:p-6 ${className}`}
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
      role="dialog"
      aria-modal="true"
    >
      {/* Universal frosted glass backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/75 backdrop-blur-md transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Container */}
      <div className="relative z-10 w-full max-h-[92vh] flex flex-col justify-center items-center pointer-events-none my-auto">
        <div className={`w-full ${maxWidthClass} max-h-[88vh] flex flex-col pointer-events-auto`}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

