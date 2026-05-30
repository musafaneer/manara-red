import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
    Users, BookOpen, Clock, AlertTriangle, 
    ArrowRight, Star, FileText, CheckCircle2
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, PieChart, Pie } from 'recharts';
import { getStudents, getDepartments } from '../../services/storageService';
import { getInstructorSchedule } from '../../services/scheduleService';
import { StudentStatus, UserRole } from '../../types';
import { Language } from '../../services/i18nService';
import StatCard from '../StatCard';
import { cn } from '../../lib/utils';

interface DepartmentDashboardProps {
    language: Language;
    departmentId?: string;
}

const DepartmentDashboard: React.FC<DepartmentDashboardProps> = ({ language, departmentId = 'DEPT001' }) => {
    const allStudents = getStudents();
    const deptStudents = allStudents.filter(s => s.departmentId === departmentId);
    const deptName = getDepartments().find(d => d.id === departmentId)?.name || 'Scientific Department';

    const performanceLevels = [
        { name: language === 'ar' ? 'نموذجي (A)' : 'Exemplary (A)', value: deptStudents.filter(s => s.gpa >= 85).length, color: '#10b981' },
        { name: language === 'ar' ? 'جيد جداً (B)' : 'Superior (B)', value: deptStudents.filter(s => s.gpa < 85 && s.gpa >= 75).length, color: '#3b82f6' },
        { name: language === 'ar' ? 'جيد (C)' : 'Standard (C)', value: deptStudents.filter(s => s.gpa < 75 && s.gpa >= 60).length, color: '#6366f1' },
        { name: language === 'ar' ? 'متعثر (D/F)' : 'At Risk (D/F)', value: deptStudents.filter(s => s.gpa < 60).length, color: '#f43f5e' },
    ];

    const criticalStudents = deptStudents.filter(s => s.warningsCount >= 2).slice(0, 4);

    return (
        <div className="space-y-12">
            {/* Dept Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8 group">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
                        {language === 'ar' ? `قسم ${deptName}` : `${deptName} Operations`}
                    </h2>
                    <p className="text-slate-500 font-bold italic tracking-wide uppercase text-xs flex items-center gap-2">
                        <Star size={14} className="text-amber-500" />
                        {language === 'ar' ? 'إجمالي طلاب القسم: ' : 'Total Departmental Cohort: '} 
                        <span className="text-slate-900">{deptStudents.length}</span>
                    </p>
                </div>
                <div className="flex gap-4">
                    <button className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95 transition-all flex items-center gap-3">
                        <FileText size={16} className="text-blue-400" />
                        {language === 'ar' ? 'تحميل التقرير الفصلي' : 'Export Modular Audit'}
                    </button>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label={language === 'ar' ? 'نشطين بالدراسة' : 'Active Learners'} value={deptStudents.filter(s => s.status === StudentStatus.ACTIVE).length} icon={Users} color="indigo" delay={0.1} />
                <StatCard label={language === 'ar' ? 'تجاوزات أكاديمية' : 'Academic Red-Flags'} value={deptStudents.filter(s => s.warningsCount > 0).length} icon={AlertTriangle} color="red" delay={0.2} />
                <StatCard label={language === 'ar' ? 'المقررات المطروحة' : 'Active Syllabi'} value={12} icon={BookOpen} color="emerald" delay={0.3} />
                <StatCard label={language === 'ar' ? 'كفاءة التدريس' : 'Instructional Efficacy'} value="92%" icon={CheckCircle2} color="purple" delay={0.4} />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Performance Cohort Analysis */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="xl:col-span-2 bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
                        <Users size={160} />
                    </div>
                    <h3 className="text-xl font-black mb-10 text-slate-800 flex items-center gap-3 italic uppercase">
                        <Users className="text-indigo-600" />
                        {language === 'ar' ? 'تحليل مستويات الطلاب' : 'Cohort Performance Stratification'}
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={performanceLevels}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 900, fill: '#64748b'}} reversed={language === 'ar'} />
                                <YAxis hide />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.1)'}} />
                                <Bar dataKey="value" radius={[12, 12, 12, 12]} barSize={60}>
                                    {performanceLevels.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* Intervention List */}
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-slate-900 p-10 rounded-[3.5rem] text-white shadow-2xl flex flex-col"
                >
                    <h3 className="text-xl font-black mb-8 flex items-center gap-3 italic uppercase">
                        <AlertTriangle className="text-rose-500" />
                        {language === 'ar' ? 'قائمة التدخل السريع' : 'High-Priority Interventions'}
                    </h3>
                    <div className="flex-1 space-y-6">
                        {criticalStudents.length > 0 ? criticalStudents.map((s, idx) => (
                            <div key={s.id} className="p-5 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 transition-colors group cursor-pointer">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm font-black italic tracking-tight">{s.name}</p>
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">{s.warningsCount} {language === 'ar' ? 'إنذارات' : 'Warnings'}</span>
                                </div>
                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    <span>{s.id}</span>
                                    <ArrowRight size={14} className="text-slate-700 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 opacity-40">
                                <p className="font-black italic uppercase tracking-[0.2em]">{language === 'ar' ? 'لا يوجد حالات حرجة' : 'No Critical Deviations'}</p>
                            </div>
                        )}
                    </div>
                    <button className="w-full mt-10 py-5 bg-rose-600 hover:bg-rose-700 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-[0_15px_30px_rgba(225,29,72,0.3)] transition-all active:scale-95 italic">
                        {language === 'ar' ? 'استدعاء ولي الأمر' : 'Initiate Institutional Review'}
                    </button>
                </motion.div>
            </div>
        </div>
    );
};

export default DepartmentDashboard;
