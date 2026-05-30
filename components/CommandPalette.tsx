
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, User, CreditCard, BookOpen, Settings, Zap, History, 
  Bell, FileText, X, PlusCircle, Download, ShieldCheck, Mail, CheckCircle2
} from 'lucide-react';
import { getStudents, getDepartments } from '../services/storageService';
import { getAccessibleTabs } from '../services/authService';
import { getCurrentUser } from '../services/authService';
import { cn } from '../lib/utils';
import { Student } from '../types';

interface CommandPaletteProps {
  onClose: () => void;
  navigateToTab: (tab: string, subTab?: string) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose, navigateToTab }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ type: 'student' | 'module' | 'action'; id: string; label: string; details?: string; icon: any; subTab?: string }[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentUser = getCurrentUser();
  const allowedTabs = currentUser ? getAccessibleTabs(currentUser) : [];
  const students = getStudents();

  const modules = [
    { id: 'dashboard', label: 'Dashboard', icon: Zap },
    { id: 'tasks', label: 'Tasks & Productivity', icon: CheckCircle2 },
    { id: 'department', label: 'Department Portal', icon: ShieldCheck },
    { id: 'students', label: 'Student Management', icon: User },
    { id: 'financials', label: 'Financial Transactions', icon: CreditCard },
    { id: 'academics', label: 'Academic Records', icon: BookOpen },
    { id: 'settings', label: 'System Settings', icon: Settings },
    { id: 'communications', label: 'Communications Hub', icon: Bell },
    { id: 'reports', label: 'Reports & Analytics', icon: FileText },
  ].filter(m => allowedTabs.includes(m.id));

  const actions = [
    { id: 'add-student', label: 'Enroll New Student', icon: PlusCircle, category: 'Students', tab: 'students' },
    { id: 'finance-report', label: 'Export Financial Ledger', icon: Download, category: 'Finance', tab: 'financials' },
    { id: 'view-audit', label: 'Review System Audit Logs', icon: History, category: 'Admin', tab: 'settings', subTab: 'audit' },
    { id: 'verify-bulk', label: 'Batch Enrollment Validation', icon: ShieldCheck, category: 'Admin', tab: 'students' },
    { id: 'send-broadcast', label: 'Dispatch Global Circular', icon: Mail, category: 'Comms', tab: 'communications' },
  ].filter(a => allowedTabs.includes(a.tab));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (query.trim() === '') {
        setResults([]);
        return;
    }

    const filteredModules = modules.filter(m => 
        m.label.toLowerCase().includes(query.toLowerCase())
    ).map(m => ({ type: 'module' as const, ...m }));

    // Intent-based Matching Engine
    const queryLower = query.toLowerCase();
    const intents = [
        { keywords: ['new', 'add', 'enroll', 'register'], actionId: 'add-student' },
        { keywords: ['report', 'ledger', 'finance', 'export'], actionId: 'finance-report' },
        { keywords: ['audit', 'logs', 'history', 'system events'], actionId: 'view-audit' },
        { keywords: ['verify', 'validate', 'approve'], actionId: 'verify-bulk' },
        { keywords: ['message', 'circular', 'email', 'broadcast', 'send'], actionId: 'send-broadcast' }
    ];

    const matchedIntents = intents
        .filter(intent => intent.keywords.some(k => queryLower.includes(k)))
        .map(intent => actions.find(a => a.id === intent.actionId))
        .filter((a): a is any => !!a);

    const filteredActions = actions.filter(a => 
        a.label.toLowerCase().includes(queryLower) ||
        a.category.toLowerCase().includes(queryLower)
    ).map(a => ({ type: 'action' as const, ...a, details: a.category }));

    // Combine and Deduplicate
    const combinedActions = [
        ...matchedIntents.map(ia => ({ ...ia, type: 'action' as const, details: ia.category })), 
        ...filteredActions
    ];
    const uniqueActions = Array.from(new Map(combinedActions.map(item => [item.id, item])).values());

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(queryLower) || 
        s.id.toLowerCase().includes(queryLower)
    ).slice(0, 5).map(s => ({ 
        type: 'student' as const, 
        id: s.id, 
        label: s.name, 
        details: s.id,
        icon: User 
    }));

    setResults([...filteredModules, ...uniqueActions, ...filteredStudents]);
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      const selected = results[selectedIndex];
      if (selected) {
        if (selected.type === 'module') {
          navigateToTab(selected.id);
        } else if (selected.type === 'action') {
           const action = actions.find(a => a.id === selected.id);
           if (action) navigateToTab(action.tab, action.subTab);
        } else {
          navigateToTab('students');
        }
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-md"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-stone-200"
      >
        <div className="p-6 border-b border-stone-100 flex items-center gap-4 bg-stone-50/50">
            <Search className="text-stone-400" size={24} />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="Search students, modules, or system actions..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="flex-1 bg-transparent border-none text-xl font-bold text-stone-800 placeholder:text-stone-300 focus:ring-0 focus:outline-none"
            />
            <div className="flex items-center gap-2">
                <kbd className="px-2 py-1 bg-white border border-stone-200 rounded-lg text-[10px] font-black text-stone-400">ESC</kbd>
                <button onClick={onClose} className="p-2 hover:bg-stone-200 rounded-xl transition-all">
                    <X size={20} className="text-stone-500" />
                </button>
            </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
            {results.length > 0 ? (
                <div className="space-y-1">
                    {results.map((result, index) => (
                        <button
                            key={`${result.type}-${result.id}`}
                            onClick={() => {
                                if (result.type === 'module') navigateToTab(result.id);
                                else if (result.type === 'action') {
                                    const action = actions.find(a => a.id === result.id);
                                    if (action) navigateToTab(action.tab, action.subTab);
                                }
                                else navigateToTab('students');
                                onClose();
                            }}
                            onMouseEnter={() => setSelectedIndex(index)}
                            className={cn(
                                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left",
                                index === selectedIndex ? "bg-brand-600 text-white shadow-xl shadow-brand-100" : "hover:bg-stone-50 text-stone-600"
                            )}
                        >
                            <div className={cn(
                                "p-3 rounded-xl",
                                index === selectedIndex ? "bg-white/20 text-white" : "bg-stone-100 text-stone-500"
                            )}>
                                <result.icon size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-sm">{result.label}</p>
                                {result.details && <p className={cn("text-[10px] font-bold uppercase tracking-widest", index === selectedIndex ? "text-brand-100" : "text-stone-400")}>{result.details}</p>}
                            </div>
                            <div className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md", index === selectedIndex ? "bg-white/10" : "bg-stone-200/50 text-stone-400")}>
                                {result.type === 'module' ? 'Module' : result.type === 'action' ? 'Action' : 'Student'}
                            </div>
                        </button>
                    ))}
                </div>
            ) : query.trim() !== '' ? (
                <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-stone-50 rounded-full flex items-center justify-center mx-auto">
                        <Search size={40} className="text-stone-200" />
                    </div>
                    <p className="text-stone-400 font-bold">No results found for "{query}"</p>
                </div>
            ) : (
                <div className="py-8 px-4">
                    <h5 className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-6">Quick Suggestions</h5>
                    <div className="grid grid-cols-2 gap-4">
                        {modules.slice(0, 4).map(m => (
                            <button
                                key={m.id}
                                onClick={() => { navigateToTab(m.id); onClose(); }}
                                className="p-6 bg-stone-50 hover:bg-white hover:shadow-xl hover:shadow-stone-100 border border-transparent hover:border-stone-100 rounded-3xl transition-all group text-left"
                            >
                                <div className="p-3 bg-white w-fit rounded-xl mb-4 text-stone-600 group-hover:text-brand-600 shadow-sm">
                                    <m.icon size={24} />
                                </div>
                                <p className="font-black text-stone-700">{m.label}</p>
                                <p className="text-[10px] font-bold text-stone-400 uppercase mt-1">Modules</p>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-between items-center">
            <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-stone-400 uppercase">
                    <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded">ENTER</kbd> to Select
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-black text-stone-400 uppercase">
                    <kbd className="px-1.5 py-0.5 bg-white border border-stone-200 rounded">↑↓</kbd> to Navigate
                </div>
            </div>
            <p className="text-[9px] font-black text-brand-600 uppercase tracking-widest">Oracle Campus Analytics Engine v4.0</p>
        </div>
      </motion.div>
    </div>
  );
};

export default CommandPalette;
