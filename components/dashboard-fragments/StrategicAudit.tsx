import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, ShieldCheck, Cpu, AlertTriangle, Info, ChevronLeft } from 'lucide-react';
import { runRegulationAudit } from '../../services/aiInsightService';
import { Language } from '../../services/i18nService';
import { cn } from '../../lib/utils';

interface StrategicAuditProps {
    language: Language;
}

const StrategicAudit: React.FC<StrategicAuditProps> = ({ language }) => {
    const insights = runRegulationAudit().slice(0, 4);
    
    return (
        <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl shadow-slate-100 overflow-hidden relative group">
            <div className={`absolute top-0 ${language === 'ar' ? 'right-0' : 'left-0'} p-12 opacity-[0.02] group-hover:scale-110 transition-transform duration-[2s]`}>
                <ShieldAlert size={200} />
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-12">
                <div>
                    <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white border border-white/20 shadow-lg">
                            <Cpu size={22} />
                        </div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter italic uppercase">
                            {language === 'ar' ? 'التدقق الذكي للامتثال (Reg 501)' : 'AI Strategic Compliance (Reg 501)'}
                        </h3>
                    </div>
                    <p className="text-slate-500 font-bold italic text-sm">
                        {language === 'ar' 
                            ? 'معالج الذكاء الاصطناعي يراقب الامتثال التنظيمي لحظياً.' 
                            : 'AI analytical processor active: Autonomous compliance monitoring in progress.'}
                    </p>
                </div>
                <div className="bg-emerald-50 px-8 py-4 rounded-[1.5rem] border border-emerald-100 flex items-center gap-4">
                    <CheckCircle2 size={18} className="text-emerald-500" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest italic">
                        {language === 'ar' ? 'تحليل لحظي نشط' : 'Active Live Analytics'}
                    </span>
                </div>
            </div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {insights.map((insight, idx) => (
                    <motion.div 
                        key={insight.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className={cn(
                            "p-8 rounded-[2.5rem] border transition-all hover:scale-[1.03] flex flex-col cursor-pointer",
                            insight.type === 'VIOLATION' ? "bg-rose-50/50 border-rose-100" :
                            insight.type === 'WARNING' ? "bg-amber-50/50 border-amber-100" :
                            "bg-blue-50/50 border-blue-100"
                        )}
                    >
                         <div className="flex items-center justify-between mb-6">
                            <div className={cn(
                                "p-2 rounded-xl",
                                insight.type === 'VIOLATION' ? "bg-rose-100 text-rose-600" :
                                insight.type === 'WARNING' ? "bg-amber-100 text-amber-600" :
                                "bg-blue-100 text-blue-600"
                            )}>
                                {insight.type === 'VIOLATION' ? <ShieldAlert size={18} /> :
                                 insight.type === 'WARNING' ? <AlertTriangle size={18} /> :
                                 <Info size={18} />}
                            </div>
                            <span className="text-[9px] font-black text-slate-400 font-mono uppercase tracking-[0.2em]">{insight.category}</span>
                         </div>
                         <h4 className="font-black text-slate-900 text-base mb-3 leading-tight italic">{insight.title}</h4>
                         <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6 line-clamp-3">{insight.description}</p>
                         <div className="mt-auto pt-6 border-t border-slate-200/50 flex items-center justify-between">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {language === 'ar' ? 'مستوى الأثر: ' : 'Impact Vector: '}
                                <span className={cn(
                                    insight.impact === 'HIGH' ? "text-rose-500" : "text-amber-600"
                                )}>{insight.impact}</span>
                            </span>
                            <ChevronLeft size={16} className={cn("text-slate-300", language === 'en' && 'rotate-180')} />
                         </div>
                    </motion.div>
                ))}
                {insights.length === 0 && (
                    <div className="col-span-full py-20 flex flex-col items-center gap-6 text-slate-400 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                        <ShieldCheck size={64} className="opacity-10" />
                        <p className="font-black italic uppercase tracking-[0.3em]">
                            {language === 'ar' ? 'لا يوجد ثغرات التزام حالية' : 'Governance Integrity: Optimized'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

// Helper for CheckCircle2 missing import in this snippet context
const CheckCircle2 = ({ className, size }: { className?: string, size?: number }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
    </svg>
);

export default StrategicAudit;
