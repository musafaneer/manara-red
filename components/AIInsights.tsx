
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Sparkles, Send, X, Bot, User, Loader2, MessageSquareText,
    ShieldAlert, AlertTriangle, Info, TrendingUp, ChevronLeft,
    CheckCircle2, Search, Cpu
} from 'lucide-react';
import { getSmartInsights } from '../services/geminiService';
import { runRegulationAudit, AcademicInsight } from '../services/aiInsightService';
import { cn } from '../lib/utils';

type PanelTab = 'CHAT' | 'AUDIT';

const AIInsights: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>('AUDIT');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [insights, setInsights] = useState<AcademicInsight[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
        setInsights(runRegulationAudit());
    }
  }, [isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;

    const userMsg = query;
    setQuery('');
    setActiveTab('CHAT');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    const response = await getSmartInsights(userMsg);
    setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    setIsLoading(false);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
        case 'VIOLATION': return <ShieldAlert size={18} className="text-rose-500" />;
        case 'WARNING': return <AlertTriangle size={18} className="text-amber-500" />;
        case 'OPPORTUNITY': return <TrendingUp size={18} className="text-emerald-500" />;
        default: return <Info size={18} className="text-blue-500" />;
    }
  };

  return (
    <div className="fixed bottom-12 left-12 z-[60]" dir="rtl">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40, x: -40, rotate: -2 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40, x: -40, rotate: -2 }}
            className="absolute bottom-28 left-0 w-[500px] bg-white rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2)] border border-stone-100 overflow-hidden flex flex-col h-[750px] relative"
          >
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
            
            {/* Header */}
            <div className="bg-slate-900 p-10 text-white relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full blur-[120px] opacity-20 -mr-40 -mt-40" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500 rounded-full blur-[80px] opacity-10 -ml-20 -mb-20" />
                
                <div className="relative z-10 flex justify-between items-center mb-10">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-[2rem] flex items-center justify-center shadow-2xl border border-white/10 group overflow-hidden relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Cpu size={32} className="text-indigo-400 relative z-10" />
                        </div>
                        <div>
                            <h4 className="font-black text-2xl tracking-tight text-white italic uppercase leading-none mb-1">Oracle Intel Core</h4>
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] opacity-60">Cognitive Audit & Neural Assistant</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2.5xl transition-all border border-white/5 group">
                        <X size={24} className="opacity-40 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                <div className="relative z-10 flex p-1.5 bg-white/5 rounded-2.5xl backdrop-blur-xl border border-white/5">
                    <button 
                        onClick={() => setActiveTab('AUDIT')}
                        className={cn(
                            "flex-1 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3",
                            activeTab === 'AUDIT' ? "bg-white text-slate-900 shadow-2xl" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        <ShieldAlert size={16} className={activeTab === 'AUDIT' ? "text-indigo-600" : ""} /> System Audit
                        {insights.length > 0 && (
                            <span className="px-2 py-0.5 bg-rose-500 text-white rounded-lg flex items-center justify-center text-[8px] animate-pulse font-mono tracking-tighter">
                                {insights.length} ERR
                            </span>
                        )}
                    </button>
                    <button 
                        onClick={() => setActiveTab('CHAT')}
                        className={cn(
                            "flex-1 py-3.5 rounded-2xl transition-all font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3",
                            activeTab === 'CHAT' ? "bg-white text-slate-900 shadow-2xl" : "text-white/40 hover:text-white/70"
                        )}
                    >
                        <Bot size={16} className={activeTab === 'CHAT' ? "text-indigo-600" : ""} /> Neural Link
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-10">
                {activeTab === 'AUDIT' ? (
                    <div className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar no-scrollbar">
                        <div className="flex items-end justify-between border-b border-stone-50 pb-6">
                            <div className="space-y-1">
                                <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em]">Compliance Registry</h5>
                                <p className="text-xs font-black text-slate-900 uppercase italic opacity-60">Regulation 501 / Automated Scan</p>
                            </div>
                            <button 
                                onClick={() => setInsights(runRegulationAudit())}
                                className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-4 py-2 rounded-xl transition-all"
                            >
                                Re-Index
                            </button>
                        </div>
                        
                        <div className="space-y-6">
                            {insights.map((insight) => (
                                <motion.div 
                                    key={insight.id}
                                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    className={cn(
                                        "p-8 rounded-[2.5rem] border transition-all group relative overflow-hidden",
                                        insight.type === 'VIOLATION' ? "bg-rose-50/50 border-rose-100 hover:border-rose-200" :
                                        insight.type === 'WARNING' ? "bg-amber-50/50 border-amber-100 hover:border-amber-200" :
                                        "bg-indigo-50/50 border-indigo-100 hover:border-indigo-200"
                                    )}
                                >
                                    <div className="absolute top-0 left-0 w-2 h-full bg-current opacity-10" />
                                    <div className="flex items-start gap-5">
                                        <div className="mt-1 shadow-lg p-2 bg-white rounded-xl">{getInsightIcon(insight.type)}</div>
                                        <div className="space-y-2 flex-1">
                                            <h6 className="font-black text-slate-900 leading-tight text-lg italic uppercase tracking-tight">{insight.title}</h6>
                                            <p className="text-xs text-stone-500 font-bold leading-relaxed">{insight.description}</p>
                                        </div>
                                    </div>
                                    {insight.actionLabel && (
                                        <button className="mt-6 w-full py-4 bg-white border border-stone-100 rounded-2xl text-[9px] font-black text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm uppercase tracking-widest">
                                            {insight.actionLabel}
                                        </button>
                                    )}
                                </motion.div>
                            ))}
                            {insights.length === 0 && (
                                <div className="py-24 text-center space-y-6 bg-stone-50/50 rounded-[4rem] border-2 border-dashed border-stone-100">
                                    <div className="w-24 h-24 bg-white border border-stone-100 rounded-[2.5rem] flex items-center justify-center mx-auto text-emerald-500 shadow-xl">
                                        <CheckCircle2 size={48} />
                                    </div>
                                    <div className="space-y-2">
                                        <p className="font-black text-xl text-slate-900 uppercase italic">System Integrity Optimal</p>
                                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest opacity-60">No relational violations detected in current epoch</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        <div 
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar no-scrollbar"
                        >
                            {messages.length === 0 && (
                                <div className="py-12 text-center space-y-10">
                                    <div className="w-24 h-24 bg-white border border-stone-100 rounded-[3rem] flex items-center justify-center mx-auto text-indigo-500 shadow-2xl relative">
                                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur-3xl opacity-10 animate-pulse" />
                                        <MessageSquareText size={48} className="relative z-10" />
                                    </div>
                                    <div className="space-y-3">
                                        <p className="text-2xl font-black text-slate-900 uppercase italic tracking-tight">Node Query Protocol</p>
                                        <p className="text-[10px] font-black text-stone-400 max-w-[300px] mx-auto leading-loose uppercase tracking-widest opacity-60">
                                            Engage neural sub-routine for data analysis, regulatory interpretation, or scholarly auditing.
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center px-4">
                                        {['Underperformance Audit', 'IT Department Analytics', 'Cumulative GPA Sigma'].map(q => (
                                            <button 
                                                key={q} 
                                                onClick={() => { setQuery(q); }}
                                                className="px-6 py-3 bg-white border border-stone-100 rounded-2xl text-[10px] font-black text-stone-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {messages.map((msg, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    className={cn(
                                        "flex gap-5",
                                        msg.role === 'user' ? "flex-row-reverse" : "flex-row"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border",
                                        msg.role === 'user' ? "bg-slate-900 text-white border-slate-700" : "bg-white text-indigo-600 border-indigo-100"
                                    )}>
                                        {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
                                    </div>
                                    <div className={cn(
                                        "max-w-[80%] p-8 rounded-[2.5rem] text-sm leading-relaxed relative border",
                                        msg.role === 'user' ? "bg-stone-50 border-stone-100 text-slate-900 rounded-tr-none" : "bg-slate-900 text-white border-slate-800 rounded-tl-none font-bold shadow-2xl"
                                    )}>
                                        <div className="relative z-10">{msg.content}</div>
                                        {msg.role === 'assistant' && (
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-10 pointer-events-none" />
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-5">
                                    <div className="w-12 h-12 bg-white border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl">
                                        <Bot size={20} />
                                    </div>
                                    <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] rounded-tl-none flex items-center gap-5 shadow-2xl text-white">
                                        <div className="relative">
                                            <Loader2 size={24} className="text-indigo-400 animate-spin" />
                                            <div className="absolute inset-0 bg-indigo-400 rounded-full blur-lg opacity-20 animate-pulse" />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-300 uppercase tracking-[0.25em] flex items-center gap-2">
                                            Neural Synthesis in Progress <span className="animate-pulse">...</span>
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-10 bg-white border-t border-stone-50 shrink-0">
                            <form 
                                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                                className="flex gap-4"
                            >
                                <div className="relative flex-1">
                                    <input 
                                        type="text" 
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Transmit instructions to core..."
                                        className="w-full bg-stone-50 border border-stone-100 focus:border-stone-200 focus:ring-4 focus:ring-indigo-500/5 rounded-2.5xl px-8 py-5 text-sm focus:outline-none transition-all font-black italic uppercase tracking-tight pr-16 text-slate-800"
                                    />
                                    <Sparkles className="absolute right-6 top-1/2 -translate-y-1/2 text-indigo-400 opacity-60" size={20} />
                                </div>
                                <button 
                                    type="submit"
                                    disabled={isLoading || !query.trim()}
                                    className="w-16 h-16 bg-slate-900 text-white rounded-2.5xl flex items-center justify-center hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-30 shadow-2xl shadow-indigo-500/10 group"
                                >
                                    <Send size={28} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                                </button>
                            </form>
                        </div>
                    </>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
            "w-24 h-24 rounded-[3rem] flex items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.2)] transition-all relative z-[61] group overflow-hidden border border-stone-100",
            isOpen ? "bg-rose-500 text-white" : "bg-slate-900 hover:bg-slate-800 text-white"
        )}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <AnimatePresence mode="wait">
            {isOpen ? (
                <motion.div key="close" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
                    <X size={36} />
                </motion.div>
            ) : (
                <motion.div key="open" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }} className="relative">
                    <Sparkles size={36} className="text-indigo-400" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-indigo-400 rounded-full blur-2xl opacity-20 animate-pulse" />
                </motion.div>
            )}
        </AnimatePresence>
        
        {!isOpen && (
            <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-4 right-4 w-8 h-8 bg-indigo-500 rounded-xl border-4 border-slate-900 flex items-center justify-center shadow-lg"
            >
                <span className="text-[10px] font-black italic">AI</span>
            </motion.div>
        )}
      </motion.button>
    </div>
  );
};

export default AIInsights;
