
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, Users, AlertTriangle, Award, 
  BarChart3, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
  Target, GraduationCap, BookOpen, Search
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Student, Course, StudentStatus } from '../types';
import { getDepartmentMetrics, getDepartmentCoursePerformance } from '../services/performanceService';
import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';

interface Props {
    students: Student[];
    courses: Course[];
    language: Language;
}

const DepartmentStudentPerformance: React.FC<Props> = ({ students, courses, language }) => {
    const metrics = useMemo(() => getDepartmentMetrics(students), [students]);
    const courseStats = useMemo(() => getDepartmentCoursePerformance(students, courses), [students, courses]);

    const gpaChartData = Object.entries(metrics.gpaRange).map(([name, value]) => ({ name, value }));
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#64748b', '#ef4444'];

    const topPerformers = [...students].sort((a, b) => b.gpa - a.gpa).slice(0, 5);
    const atRiskStudents = students.filter(s => s.gpa < 2.0 || s.status === StudentStatus.WARNING).sort((a, b) => a.gpa - b.gpa).slice(0, 5);

    return (
        <div className="space-y-8 min-h-screen">
            {/* Header / Quality Badge */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-blue-600 rounded-3xl text-white shadow-xl shadow-blue-100 italic">
                            <Target size={32} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 tracking-tight italic uppercase">
                                {language === 'ar' ? 'تحليلات الأداء الأكاديمي' : 'Academic Performance Analytics'}
                            </h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
                                {language === 'ar' 
                                    ? 'نظام تحليل أداء الطلاب وفق معايير الجودة الدولية (ACBSP / AACSB)'
                                    : 'Student performance analysis system according to international quality standards (ACBSP / AACSB)'}
                            </p>
                        </div>
                    </div>
                    <div className="flex bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="px-6 py-3 text-center border-l border-slate-200 last:border-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'درجة الجودة' : 'Quality Score'}</p>
                            <p className="text-xl font-black text-emerald-600 italic">A+</p>
                        </div>
                        <div className="px-6 py-3 text-center border-l border-slate-200 last:border-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'الوحدات المقيمة' : 'Assessed Units'}</p>
                            <p className="text-xl font-black text-slate-900 italic">{courseStats.length}</p>
                        </div>
                        <div className="px-6 py-3 text-center last:border-0">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'المعايير المرجعية' : 'Benchmarks'}</p>
                            <p className="text-xl font-black text-indigo-600 italic">94%</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Performance KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { 
                        label: language === 'ar' ? 'متوسط المعدل التراكمي (GPA)' : 'Average Cumulative GPA', 
                        value: metrics.averageGpa.toFixed(2), 
                        icon: Award, 
                        color: 'blue', 
                        change: '+0.12', 
                        trend: 'up' 
                    },
                    { 
                        label: language === 'ar' ? 'طلاب تحت الإنذار' : 'Students Under Warning', 
                        value: metrics.warningStudents, 
                        icon: AlertTriangle, 
                        color: 'red', 
                        change: '-4', 
                        trend: 'down' 
                    },
                    { 
                        label: language === 'ar' ? 'نسبة الإنجاز الأكاديمي' : 'Academic Achievement Rate', 
                        value: '88.5%', 
                        icon: TrendingUp, 
                        color: 'emerald', 
                        change: '+2.1%', 
                        trend: 'up' 
                    },
                    { 
                        label: language === 'ar' ? 'إجمالي الخريجين (المتوقع)' : 'Total Graduates (Expected)', 
                        value: metrics.graduationRate.toFixed(0) + '%', 
                        icon: GraduationCap, 
                        color: 'indigo', 
                        change: language === 'ar' ? 'مستقر' : 'Stable', 
                        trend: 'neutral' 
                    }
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div className={cn(
                                "p-4 rounded-2xl group-hover:scale-110 transition-transform",
                                stat.color === 'blue' ? "bg-blue-50 text-blue-600" :
                                stat.color === 'red' ? "bg-red-50 text-red-600" :
                                stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                                "bg-indigo-50 text-indigo-600"
                            )}>
                                <stat.icon size={22} />
                            </div>
                            {stat.trend !== 'neutral' && (
                                <div className={cn(
                                    "flex items-center gap-1 text-[10px] font-black px-2 py-1 rounded-lg",
                                    stat.trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                                )}>
                                    {stat.trend === 'up' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                                    {stat.change}
                                </div>
                            )}
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                        <h4 className="text-3xl font-black text-slate-900 italic tracking-tighter">{stat.value}</h4>
                    </div>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* GPA Distribution */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase">{language === 'ar' ? 'توزيع المعدل التراكمي' : 'GPA Distribution'}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {language === 'ar' ? 'تحليل توزيع المعدل التراكمي لطلاب القسم' : 'Analysis of GPA distribution for department students'}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl">
                            <PieChartIcon size={20} className="text-blue-600" />
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={gpaChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={120}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {gpaChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-6">
                        {gpaChartData.map((entry, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{entry.name}: {entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Course Success Rates */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase">{language === 'ar' ? 'نسب النجاح في المقررات' : 'Course Pass Rates'}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {language === 'ar' ? 'نسب النجاح في المقررات الدراسية الأساسية' : 'Success rates in core academic courses'}
                            </p>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-2xl">
                            <BarChart3 size={20} className="text-emerald-600" />
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={courseStats.slice(0, 6)} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="courseCode" 
                                    type="category" 
                                    width={80} 
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                                />
                                <Tooltip 
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                                />
                                <Bar dataKey="passRate" fill="#3b82f6" radius={[0, 10, 10, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                        <Award className="text-emerald-600" size={24} />
                        <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest italic">
                            {language === 'ar' 
                                ? 'التقدم الأكاديمي المؤسسي العام ضمن النطاق المستهدف 85٪ - 95٪.'
                                : 'Overall Institutional Academic Progress is within the target range of 85% - 95%.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Tables Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Performers */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase">{language === 'ar' ? 'الطلاب المتميزون' : 'Elite Scholars'}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {language === 'ar' ? 'قائمة الطلاب المتميزين أكاديمياً - لوحة الشرف' : 'List of academically distinguished students - Honor Roll'}
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                            <Award size={20} className="text-indigo-600" />
                        </div>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {topPerformers.map((student, i) => (
                            <div key={student.id} className="p-6 bg-white border border-slate-50 rounded-3xl flex items-center justify-between hover:border-indigo-100 hover:shadow-lg transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-sm italic group-hover:scale-110 transition-transform">
                                        #{i+1}
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none">{student.name}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">ID: {student.id} • {student.program}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black text-indigo-600 italic">{student.gpa.toFixed(2)}</p>
                                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{language === 'ar' ? 'المعدل التراكمي' : 'CUMULATIVE GPA'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* At Risk Students */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-red-50/20">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 italic uppercase">{language === 'ar' ? 'تتطلب تدخلاً' : 'Intervention Required'}</h3>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {language === 'ar' ? 'الطلاب المعرضين للتعثر الأكاديمي (تحت المراقبة)' : 'Students at risk of academic failure (Under Observation)'}
                            </p>
                        </div>
                        <div className="p-3 bg-white rounded-2xl shadow-sm">
                            <AlertTriangle size={20} className="text-red-600" />
                        </div>
                    </div>
                    <div className="p-4 space-y-3 flex-1">
                        {atRiskStudents.map((student) => (
                            <div key={student.id} className="p-6 bg-white border border-slate-50 rounded-3xl flex items-center justify-between hover:border-red-100 hover:shadow-lg transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black text-sm italic group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase italic leading-none">{student.name}</h4>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">{student.status} • GPA: {student.gpa.toFixed(2)}</p>
                                    </div>
                                </div>
                                <button className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest shadow-lg shadow-red-100 hover:scale-105 transition-transform">
                                    {language === 'ar' ? 'تقييم الحالة' : 'Assess Crisis'}
                                </button>
                            </div>
                        ))}
                        {atRiskStudents.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                                <Award size={64} className="mb-4 text-slate-100" />
                                <p className="font-black italic uppercase tracking-tighter">
                                    {language === 'ar' ? 'لا توجد حالات حرجة مكتشفة' : 'Zero Priority Interventions Detected'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DepartmentStudentPerformance;
