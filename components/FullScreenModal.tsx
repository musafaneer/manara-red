import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronLeft } from 'lucide-react';
import { Language } from '../services/i18nService';

interface FullScreenModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    title?: string;
    language: Language;
}

const FullScreenModal: React.FC<FullScreenModalProps> = ({ isOpen, onClose, children, title, language }) => {
    // Prevent scrolling when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex flex-col bg-white overflow-hidden"
                    style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                >
                    {/* Header bar */}
                    <div className="flex items-center justify-between px-8 py-6 h-20 border-b border-slate-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={onClose}
                                className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all flex items-center gap-2 group"
                            >
                                <ChevronLeft className={language === 'ar' ? 'rotate-180' : ''} />
                                <span className="text-[10px] font-black uppercase tracking-widest group-hover:px-2 transition-all">
                                    {language === 'ar' ? 'الرجوع' : 'Back'}
                                </span>
                            </button>
                            {title && (
                                <h2 className="text-xl font-black italic uppercase tracking-tighter text-slate-800">
                                    {title}
                                </h2>
                            )}
                        </div>
                        
                        <div className="flex items-center gap-4">
                            {/* Optional: Add more top-bar actions like Print/Export here */}
                            <button 
                                onClick={onClose}
                                className="p-3 bg-slate-900 text-white rounded-2xl hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-slate-200"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content area */}
                    <div className="flex-1 overflow-y-auto p-8 lg:p-16 scroll-smooth">
                        <div className="max-w-7xl mx-auto w-full">
                            {children}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FullScreenModal;
