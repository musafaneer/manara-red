import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Clock, CheckCircle2, Lock, Unlock, ChevronRight, ChevronLeft, Info, AlertTriangle } from 'lucide-react';
import { getSystemSettings, saveSystemSettings } from '../services/storageService';
import { AcademicCalendarStage, CalendarStageKey } from '../types';
import { notifySuccess } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';

interface CalendarViewProps {
    language?: Language;
}

const CalendarView: React.FC<CalendarViewProps> = ({ language = 'ar' }) => {
    const [settings, setSettings] = useState(getSystemSettings());
    const [stages, setStages] = useState<AcademicCalendarStage[]>([]);

    useEffect(() => {
        setStages(settings.calendarStages || []);
    }, [settings]);

    const handleToggleLock = (stageId: string) => {
        const updatedStages = stages.map(s => 
            s.id === stageId ? { ...s, isUnlocked: !s.isUnlocked } : s
        );
        
        const newSettings = { ...settings, calendarStages: updatedStages };
        saveSystemSettings(newSettings);
        setSettings(newSettings);
        
        const stage = updatedStages.find(s => s.id === stageId);
        logAction(
            'Calendar Update', 
            `Stage "${stage?.name}" has been ${stage?.isUnlocked ? 'opened' : 'locked'}`, 
            'info'
        );
        notifySuccess(`Stage status updated: ${stage?.name}`);
    };

    const getStageColor = (key: CalendarStageKey) => {
        switch (key) {
            case CalendarStageKey.REGISTRATION: return 'bg-stone-600';
            case CalendarStageKey.LECTURES: return 'bg-brand-600';
            case CalendarStageKey.MIDTERMS: return 'bg-amber-600';
            case CalendarStageKey.FINALS: return 'bg-stone-900';
            case CalendarStageKey.GRADING: return 'bg-brand-800';
            default: return 'bg-stone-500';
        }
    };

    return (
        <div className="p-8 space-y-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">Timeline</span>
                        <h2 className="text-xl md:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-3">
                            Academic Calendar
                            <div className="p-2 bg-brand-600 rounded-2xl text-white shadow-lg shadow-brand-100">
                                <CalendarIcon size={20} />
                            </div>
                        </h2>
                    </div>
                    <p className="text-stone-500 font-medium text-sm max-w-2xl">Roadmap for the current semester: Management of deadlines and system access privileges.</p>
                </div>
            </div>

            {/* Current Semester Info */}
            <div className="bg-stone-900 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-stone-200">
                <div className="absolute top-0 right-0 w-96 h-96 bg-brand-600 rounded-full blur-[120px] opacity-20 -mr-48 -mt-48" />
                <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="space-y-2">
                        <p className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Academic Year</p>
                        <p className="text-xl md:text-2xl font-bold">{settings.academicYear}</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-stone-400 font-black text-[10px] uppercase tracking-widest">Semester</p>
                        <p className="text-xl md:text-2xl font-bold">{settings.currentSemester}</p>
                    </div>
                    <div className="flex items-center gap-4 bg-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                        <div className="p-3 bg-brand-500 rounded-2xl">
                            <Clock className="text-white" />
                        </div>
                        <div>
                            <p className="text-stone-300 font-black text-[10px] uppercase tracking-widest">Today's Date</p>
                            <p className="text-lg font-black">{new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline View */}
            <div className="relative">
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-stone-100 -translate-y-1/2 hidden lg:block" />
                <div className="grid grid-cols-1 lg:grid-cols-6 gap-8 relative z-10">
                    {stages.map((stage, idx) => (
                        <motion.div 
                            key={stage.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="bg-white border-2 border-stone-100 rounded-[3rem] p-8 flex flex-col items-center text-center space-y-6 hover:shadow-xl transition-all group"
                        >
                            <div className={cn(
                                "w-20 h-20 rounded-[2.5rem] flex items-center justify-center text-white shadow-xl relative",
                                getStageColor(stage.key)
                            )}>
                                <CalendarIcon size={32} />
                                {stage.isUnlocked ? (
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-500 rounded-full border-4 border-white flex items-center justify-center">
                                        <Unlock size={14} className="text-white" />
                                    </div>
                                ) : (
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-stone-900 rounded-full border-4 border-white flex items-center justify-center">
                                        <Lock size={14} className="text-white" />
                                    </div>
                                )}
                            </div>

                            <div>
                                <h4 className="font-black text-stone-900 text-lg">{stage.name}</h4>
                                <p className="text-[10px] text-stone-400 font-black mt-1 uppercase tracking-tighter">
                                    {new Date(stage.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} 
                                    {' - '} 
                                    {new Date(stage.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </p>
                            </div>

                            <button 
                                onClick={() => handleToggleLock(stage.id)}
                                className={cn(
                                    "w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95",
                                    stage.isUnlocked 
                                        ? "bg-stone-100 text-stone-600 hover:bg-stone-200" 
                                        : "bg-brand-600 text-white shadow-lg shadow-brand-100 hover:bg-brand-700"
                                )}
                            >
                                {stage.isUnlocked ? 'Lock Phase' : 'Unlock Phase'}
                            </button>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Regulation Snippets */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                <div className="bg-amber-50 border-2 border-amber-100 rounded-[3rem] p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500 rounded-2xl text-white shadow-lg shadow-amber-200">
                            <AlertTriangle size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-amber-900">Regulation 501 Notes</h3>
                    </div>
                    <ul className="space-y-4 text-amber-800 font-medium">
                        <li className="flex items-start gap-3">
                            <CheckCircle2 size={18} className="shrink-0 mt-1" />
                            <span>Course enrollment is not permitted after two weeks from the start of the semester unless there is a valid force majeure.</span>
                        </li>
                        <li className="flex items-start gap-3">
                            <CheckCircle2 size={18} className="shrink-0 mt-1" />
                            <span>The Add/Drop period starts from the second week and ends by the end of the third week of the academic semester.</span>
                        </li>
                    </ul>
                </div>

                <div className="bg-stone-50 border-2 border-stone-100 rounded-[3rem] p-10 space-y-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-600 rounded-2xl text-white shadow-lg shadow-brand-100">
                            <Info size={24} />
                        </div>
                        <h3 className="text-2xl font-black text-stone-900">Intelligent Control System</h3>
                    </div>
                    <p className="text-stone-700 font-medium leading-relaxed">
                        The "Oracle Campus" system automatically closes registration, grading entry, and financial request permissions based on the lock status shown in the table above. Please review the calendar before making any administrative changes.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CalendarView;
