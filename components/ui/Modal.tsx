
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  icon?: React.ElementType;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | '7xl';
  footer?: React.ReactNode;
  className?: string;
  hideHeader?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  icon: Icon,
  maxWidth = '2xl',
  footer,
  className,
  hideHeader
}) => {
  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8 print:hidden no-print"
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? "modal-title" : undefined}
          aria-describedby={description ? "modal-description" : undefined}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md print:hidden no-print"
            aria-hidden="true"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "relative bg-white w-full rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20",
              maxWidthClasses[maxWidth],
              className
            )}
          >
            {/* Header */}
            {!hideHeader && (
              <div className="bg-slate-900 text-white p-6 sm:p-8 flex justify-between items-center relative overflow-hidden shrink-0">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-20 -mr-32 -mt-32" />
                 
                 <div className="flex items-center gap-4 relative z-10">
                    {Icon && (
                      <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20" aria-hidden="true">
                        <Icon size={24} />
                      </div>
                    )}
                    <div>
                      {title && <h3 id="modal-title" className="text-xl font-black tracking-tight">{title}</h3>}
                      {description && (
                        <p id="modal-description" className="text-xs text-slate-400 font-medium mt-0.5">{description}</p>
                      )}
                    </div>
                 </div>

                 <button 
                  onClick={onClose} 
                  className="p-2 hover:bg-white/10 rounded-xl transition-all active:scale-90 relative z-10"
                  aria-label="إغلاق النافذة"
                 >
                  <X size={24} />
                 </button>
              </div>
            )}

            {/* Content */}
            <div className="p-6 sm:p-10 overflow-y-auto no-scrollbar flex-1">
              {children}
            </div>

            {/* Footer */}
            {footer && (
              <div className="p-6 sm:px-10 sm:py-8 border-t border-slate-100 bg-slate-50/50 shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
