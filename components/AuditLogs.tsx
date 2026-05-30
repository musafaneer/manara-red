
import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, Filter, Trash2, 
  Clock, User, Info, AlertTriangle, AlertCircle,
  Download, RefreshCcw, Shield, Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAuditLogs, clearAuditLogs } from '../services/auditService';
import { AuditLog } from '../types';
import { cn } from '../lib/utils';
import { notifySuccess, notifyInfo } from '../services/notificationService';
import SecurePrintWrapper from './ui/SecurePrintWrapper';

import { Language } from '../services/i18nService';

interface AuditLogsProps {
    language?: Language;
}

const AuditLogs: React.FC<AuditLogsProps> = ({ language = 'ar' }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    refreshLogs();
  }, []);

  const refreshLogs = () => {
    setIsLoading(true);
    setTimeout(() => {
      setLogs(getAuditLogs());
      setIsLoading(false);
    }, 400);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    if (confirm('تنبيه: هل أنت متأكد من مسح كافة سجلات النظام؟ هذا الإجراء لا يمكن التراجع عنه.')) {
      clearAuditLogs();
      setLogs([]);
      notifyInfo('تم مسح سجلات التدقيق');
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.action.includes(searchQuery) || 
      log.details.includes(searchQuery) || 
      log.user.includes(searchQuery);
    
    const matchesType = filterType === 'all' || log.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'danger': return <AlertCircle size={18} className="text-rose-600" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-600" />;
      default: return <Info size={18} className="text-blue-600" />;
    }
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-100">
            <ClipboardCheck size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">سجل التدقيق (Audit Logs)</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">مراقبة حركات النظام، تغييرات البيانات، والدخول المصرح به</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={refreshLogs}
            className="p-3 bg-slate-50 text-slate-500 rounded-xl hover:bg-slate-100 transition-all shadow-sm"
            title="تحديث"
          >
            <RefreshCcw size={20} className={isLoading ? "animate-spin" : ""} />
          </button>
          <button 
            onClick={handleClear}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-all font-black text-xs border border-rose-100 no-print"
          >
            <Trash2 size={16} />
            مسح السجل
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-black text-xs shadow-lg shadow-slate-200 no-print"
          >
            <Printer size={16} />
            تصدير PDF
          </button>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-800 rounded-xl hover:bg-slate-50 transition-all font-black text-xs no-print">
            <Download size={16} />
            تصدير (CSV)
          </button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="البحث في العمليات، التفاصيل، أو اسم المستخدم..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-12 pl-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-slate-500/20 font-bold transition-all"
          />
        </div>
        <div className="flex gap-2 bg-slate-100/50 p-1 rounded-2xl">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'info', label: 'معلومات' },
            { id: 'warning', label: 'تنبيهات' },
            { id: 'danger', label: 'خطيرة' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={cn(
                "px-6 py-2 rounded-xl text-xs font-black transition-all",
                filterType === tab.id 
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <SecurePrintWrapper
            documentType={language === 'ar' ? 'سجل تدقيق حركات النظام' : 'System Audit Log Registry'}
            documentId={`AUDIT-${Date.now()}`}
            language={language}
        >
            <div className="overflow-x-auto p-4">
              <table className="w-full text-right" dir="rtl">
            <thead className="bg-slate-50/50">
              <tr className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                <th className="px-8 py-5">الوقت والتاريخ</th>
                <th className="px-8 py-5">المستخدم</th>
                <th className="px-8 py-5">الإجراء</th>
                <th className="px-8 py-5">التفاصيل</th>
                <th className="px-8 py-5">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {filteredLogs.map((log) => (
                  <motion.tr 
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    key={log.id} 
                    className="hover:bg-slate-50/50 transition-colors group"
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <Clock size={14} className="text-slate-300" />
                        <span className="text-xs font-mono font-bold text-slate-500">
                          {new Date(log.timestamp).toLocaleString('ar-LY')}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
                          <User size={16} />
                        </div>
                        <span className="text-xs font-black text-slate-700">{log.user}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-indigo-600">{log.action}</span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-xs text-slate-500 font-medium max-w-md leading-relaxed">
                        {log.details}
                      </p>
                    </td>
                    <td className="px-8 py-5">
                      <div className={cn(
                        "inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                        log.type === 'danger' ? "bg-rose-50 text-rose-600" :
                        log.type === 'warning' ? "bg-amber-50 text-amber-600" :
                        "bg-blue-50 text-blue-600"
                      )}>
                        {getLogIcon(log.type)}
                        {log.type === 'danger' ? 'خطير' : log.type === 'warning' ? 'تنبيه' : 'معلومة'}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          
          {filteredLogs.length === 0 && (
            <div className="py-32 text-center space-y-4">
              <Shield size={64} className="mx-auto text-slate-100" />
              <p className="text-slate-400 font-black">لا توجد سجلات مطابقة للبحث</p>
            </div>
          )}
        </div>
      </SecurePrintWrapper>
    </div>
  </div>
  );
};

export default AuditLogs;
