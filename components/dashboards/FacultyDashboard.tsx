import React from 'react';
import { 
    Calendar, BookOpen, Clock, ArrowRight 
} from 'lucide-react';
import { getInstructorSchedule } from '../../services/scheduleService';
import { DayOfWeek } from '../../types';
import { Language } from '../../services/i18nService';
import StatCard from '../StatCard';
import { cn } from '../../lib/utils';

interface FacultyDashboardProps {
    language: Language;
}

const FacultyDashboard: React.FC<FacultyDashboardProps> = ({ language }) => {
    const instructorId = 'INS001'; 
    const schedule = getInstructorSchedule(instructorId);
    const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'SATURDAY'];
    const todayIndex = new Date().getDay(); 
    const todayLabel = days[todayIndex] || 'FRIDAY'; 
    const todayClasses = schedule.filter(s => s.day === todayLabel).sort((a,b) => a.startTime.localeCompare(b.startTime));

    return (
        <div className="space-y-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard label={language === 'ar' ? 'محاضرات اليوم' : "Today's Lectures"} value={todayClasses.length} icon={Calendar} color="blue" delay={0.1} />
                <StatCard label={language === 'ar' ? 'إجمالي المقررات' : 'Total Courses'} value={new Set(schedule.map(s => s.courseId)).size} icon={BookOpen} color="purple" delay={0.2} />
                <StatCard label={language === 'ar' ? 'ساعات التدريس' : 'Teaching Hours'} value={schedule.length * 2} icon={Clock} color="yellow" delay={0.3} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                       <Calendar size={120} />
                    </div>
                    <h3 className="font-black text-xl mb-8 text-slate-800 relative z-10">
                        {language === 'ar' ? 'جدول محاضرات اليوم' : "Today's Lecture Agenda"}
                    </h3>
                    {todayClasses.length > 0 ? (
                        <div className="space-y-4 relative z-10">
                            {todayClasses.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-[2rem] border border-slate-100 group hover:border-blue-200 hover:bg-white transition-all shadow-sm">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 bg-white rounded-2xl flex flex-col items-center justify-center shadow-sm text-blue-600 border border-slate-100 group-hover:scale-105 transition-transform">
                                            <span className="text-[10px] font-black uppercase opacity-40 leading-none mb-1">Start</span>
                                            <span className="text-sm font-black italic">{c.startTime}</span>
                                        </div>
                                        <div>
                                            <p className="text-lg font-black text-slate-800 italic uppercase leading-tight mb-1">{c.courseName}</p>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{c.room} • {c.courseId}</p>
                                        </div>
                                    </div>
                                    <div className="p-3 bg-white rounded-full text-slate-300 group-hover:text-blue-500 transition-colors shadow-sm border border-slate-50">
                                        <ArrowRight size={20} className={cn(language === 'ar' ? 'rotate-180' : '')} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50/30 rounded-[3rem] border-2 border-dashed border-slate-100">
                            <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
                            <p className="text-lg font-black text-slate-400 italic uppercase">
                                {language === 'ar' ? 'لا يوجد محاضرات مبرمجة لليوم' : 'No academic duties scheduled for today'}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-purple-700/20 opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-white/10 rounded-2.5xl flex items-center justify-center mb-8 border border-white/10 group-hover:rotate-6 transition-transform">
                             <BookOpen size={28} className="text-indigo-400" />
                        </div>
                        <h3 className="font-black text-2xl mb-4 italic tracking-tight uppercase">
                            {language === 'ar' ? 'نظام رصد الدرجات النهائي' : 'Terminal Grading System'}
                        </h3>
                        <p className="text-indigo-100/60 text-sm leading-relaxed font-medium">
                            {language === 'ar' 
                                ? 'يرجى التأكد من رصد درجات أعمال الفصل قبل نهاية الأسبوع القادم حسب المواعيد المقررة لضمان دقة السجلات.' 
                                : 'Please ensure all semester performance indicators are documented before the next cyclical deadline to maintain ledger integrity.'}
                        </p>
                    </div>
                    <button className="relative z-10 mt-12 bg-white text-indigo-600 px-8 py-5 rounded-[1.5rem] text-xs font-black uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-xl shadow-black/20 italic">
                        {language === 'ar' ? 'فتح منظومة الدرجات الأكاديمية' : 'Authorize Grading Portal'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FacultyDashboard;
