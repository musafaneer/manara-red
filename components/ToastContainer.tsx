import React, { useState, useEffect } from 'react';
import { subscribe } from '../services/notificationService';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribe((message, type) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type }]);
      
      // Auto dismiss
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 5000);
    });

    return unsubscribe;
  }, []);

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  };

  const borders = {
    success: 'border-green-500',
    error: 'border-red-500',
    info: 'border-blue-500'
  };

  return (
    <div className="fixed top-4 left-4 z-[9999] flex flex-col gap-3 w-80 pointer-events-none">
      {toasts.map(toast => (
        <div 
          key={toast.id}
          className={`pointer-events-auto bg-white border-r-4 ${borders[toast.type]} shadow-lg rounded-lg p-4 flex items-start gap-3 animate-in slide-in-from-left fade-in duration-300`}
        >
          <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
          <p className="text-slate-700 text-sm font-medium flex-1 leading-relaxed">{toast.message}</p>
          <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-600">
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;