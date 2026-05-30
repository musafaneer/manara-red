import React from 'react';
import { Cpu, Activity, ShieldCheck } from 'lucide-react';
import { Language } from '../../services/i18nService';

interface SystemPulseProps {
    language: Language;
}

const SystemPulse: React.FC<SystemPulseProps> = ({ language }) => (
    <div className="bg-slate-900 rounded-[3.5rem] p-10 text-white h-full border border-slate-800 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-[0.05] pointer-events-none group-hover:scale-125 transition-transform duration-[3s]">
            <NetworkIcon size={180} />
        </div>
        
        <div className="flex items-center justify-between mb-10 relative z-10">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] italic">
                {language === 'ar' ? 'نبض النظام' : 'Nexus System Pulse'}
            </h4>
            <div className="flex items-center gap-2.5 bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Active Node</span>
            </div>
        </div>
        
        <div className="space-y-10 relative z-10">
            <div className="flex items-center justify-between group/item cursor-help">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl group-hover/item:bg-indigo-500/20 group-hover/item:border-indigo-500/40 transition-colors">
                        <Cpu size={20} className="text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                            {language === 'ar' ? 'زمن الاستجابة' : 'Processing Latency'}
                        </p>
                        <p className="text-lg font-black font-mono">24.5<span className="text-[10px] text-slate-400 ml-1">ms</span></p>
                    </div>
                </div>
                <Activity size={20} className="text-slate-800 animate-pulse" />
            </div>

            <div className="flex items-center justify-between group/item cursor-visibility">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/5 border border-white/10 rounded-2xl group-hover/item:bg-emerald-500/20 group-hover/item:border-emerald-500/40 transition-colors">
                        <ShieldCheck size={20} className="text-emerald-400" />
                    </div>
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1 italic">
                            {language === 'ar' ? 'تشفير البروتوكول' : 'Encryption Standard'}
                        </p>
                        <p className="text-lg font-black font-mono tracking-tighter">TLS 1.3 <span className="text-[9px] text-slate-400 ml-1">(AES-256)</span></p>
                    </div>
                </div>
            </div>

            <div className="pt-10 mt-10 border-t border-white/5">
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 italic">
                            {language === 'ar' ? 'الجلسات النشطة' : 'Active Socket Load'}
                        </p>
                        <p className="text-4xl font-black italic tracking-tighter">1,240</p>
                    </div>
                    <div className="h-16 w-32 flex items-end gap-1.5 px-2">
                        {[30, 60, 40, 85, 55, 75, 50, 95].map((h, i) => (
                            <div 
                                key={i} 
                                className="flex-1 bg-emerald-500/30 rounded-t-lg hover:bg-emerald-500/60 transition-colors" 
                                style={{ height: `${h}%` }} 
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

const NetworkIcon = ({ size, className }: { size?: number, className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size || 24} 
        height={size || 24} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/>
    </svg>
);

export default SystemPulse;
