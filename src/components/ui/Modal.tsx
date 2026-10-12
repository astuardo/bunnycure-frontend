import React, { useEffect, createContext, useContext } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalContextType {
  onHide?: () => void;
}

const ModalContext = createContext<ModalContextType>({});

export interface ModalProps {
  show: boolean;
  onHide: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  centered?: boolean;
  backdrop?: boolean | 'static';
  keyboard?: boolean;
  className?: string;
  children: React.ReactNode;
}

export interface ModalHeaderProps {
  children?: React.ReactNode;
  closeButton?: boolean;
  className?: string;
}

export interface ModalTitleProps {
  children: React.ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
}

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
  full: 'max-w-4xl',
};

export const Modal: React.FC<ModalProps> & {
  Header: React.FC<ModalHeaderProps>;
  Title: React.FC<ModalTitleProps>;
  Body: React.FC<ModalBodyProps>;
  Footer: React.FC<ModalFooterProps>;
} = ({
  show,
  onHide,
  size = 'md',
  centered = true,
  backdrop = true,
  keyboard = true,
  className = '',
  children,
}) => {
  useEffect(() => {
    if (!show) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (keyboard && e.key === 'Escape') {
        onHide();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [show, keyboard, onHide]);

  if (!show) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && backdrop !== 'static') {
      onHide();
    }
  };

  return (
    <ModalContext.Provider value={{ onHide }}>
      <div
        className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        onClick={handleBackdropClick}
        role="dialog"
        aria-modal="true"
      >
        <div
          className={`relative w-full ${sizeClasses[size]} ${
            centered ? 'my-auto' : 'my-8'
          } rounded-2xl bg-white shadow-bunny-lg border border-bunny-border overflow-hidden transition-all duration-200 transform scale-100 ${className}`}
        >
          {children}
        </div>
      </div>
    </ModalContext.Provider>
  );
};

const ModalHeader: React.FC<ModalHeaderProps> = ({ children, closeButton = false, className = '' }) => {
  const { onHide } = useContext(ModalContext);

  return (
    <div
      className={`flex items-center justify-between border-b border-bunny-border/60 px-5 py-4 bg-bunny-paper/50 ${className}`}
    >
      <div className="flex-1">{children}</div>
      {closeButton && onHide && (
        <button
          type="button"
          onClick={onHide}
          className="ml-3 rounded-lg p-1.5 text-bunny-text-muted hover:text-bunny-cocoa hover:bg-bunny-blush/60 transition-colors focus:outline-none focus:ring-2 focus:ring-bunny-primary/30"
          aria-label="Cerrar"
        >
          <FiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

const ModalTitle: React.FC<ModalTitleProps> = ({ children, className = '', as: Tag = 'h3' }) => {
  return (
    <Tag className={`text-base font-semibold text-bunny-cocoa m-0 ${className}`}>
      {children}
    </Tag>
  );
};

const ModalBody: React.FC<ModalBodyProps> = ({ children, className = '' }) => {
  return <div className={`px-5 py-4 text-bunny-text ${className}`}>{children}</div>;
};

const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-end gap-2.5 border-t border-bunny-border/60 px-5 py-3.5 bg-bunny-paper/30 ${className}`}
    >
      {children}
    </div>
  );
};

Modal.Header = ModalHeader;
Modal.Title = ModalTitle;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;
