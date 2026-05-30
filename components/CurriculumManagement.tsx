
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Filter, Trash2, Edit2, Save, X, 
  ChevronRight, ChevronDown, List, Layers, PieChart, 
  Settings, Download, Trash, Copy, CheckCircle2, AlertCircle,
  FileText, Briefcase, GraduationCap, LayoutGrid, Sparkles, Wand2, Loader2
} from 'lucide-react';
import { 
  getAcademicPlans, saveAcademicPlan, deleteAcademicPlan 
} from '../services/curriculumService';
import { 
  getCourses, saveCourse, deleteCourse, getAcademicPrograms, getDepartments, getStudents 
} from '../services/storageService';
import { 
  Course, AcademicPlan, PlanSemester, AcademicProgram, Department, ProgramType, Student 
} from '../types';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { Permission } from '../types';
import Modal from './ui/Modal';
import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';
import { 
  BarChart3, Users, Award, TrendingUp, BookCopy, 
  CheckCircle, Globe, Building2, ShieldCheck, Shield
} from 'lucide-react';

interface CurriculumManagementProps {
    language: Language;
}

const CurriculumManagement: React.FC<CurriculumManagementProps> = ({ language }) => {
    const [activeTab, setActiveTab] = useState<'plans' | 'courses' | 'quality'>('plans');
    const [searchTerm, setSearchTerm] = useState('');
    const [plans, setPlans] = useState<AcademicPlan[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [programs, setPrograms] = useState<AcademicProgram[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    
    const [selectedPlan, setSelectedPlan] = useState<AcademicPlan | null>(null);
    const [selectedProgram, setSelectedProgram] = useState<AcademicProgram | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showQualityModal, setShowQualityModal] = useState(false);
    const [editCourse, setEditCourse] = useState<Course | null>(null);

    const currentUser = getCurrentUser();
    const canManage = hasPermission(currentUser, Permission.ACADEMICS_MANAGE);

    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    const [isAIModalOpen, setIsAIModalOpen] = useState(false);
    const [courseForAI, setCourseForAI] = useState<Course | null>(null);
    const [aiResponse, setAiResponse] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);

    const refreshData = () => {
        setPlans(getAcademicPlans());
        setCourses(getCourses());
        setPrograms(getAcademicPrograms());
        setDepartments(getDepartments());
        setStudents(getStudents());
    };

    useEffect(() => {
        refreshData();
    }, []);

    const generateSyllabus = async () => {
        if (!courseForAI) return;
        setIsAiLoading(true);
        try {
            const prompt = language === 'ar' ? 
            `قم بإنشاء مقترح توصيف مقرر (Syllabus) شامل للمقرر التالي:
            الاسم: ${courseForAI.name}
            الرمز: ${courseForAI.code}
            الوحدات: ${courseForAI.credits}
            الوصف: ${courseForAI.description || 'غير محدد'}
            
            يجب أن يتضمن التوصيف:
            1. أهداف المقرر (ILOs)
            2. المواضيع الأسبوعية (14 أسبوعاً)
            3. استراتيجيات التدريس والتعلم
            4. معايير التقييم والدرجات
            5. المراجع العلمية المقترحة.` :
            `Generate a comprehensive Course Syllabus for:
            Name: ${courseForAI.name}
            Code: ${courseForAI.code}
            Credits: ${courseForAI.credits}
            Description: ${courseForAI.description || 'Not specified'}
            
            Include:
            1. Learning Objectives (ILOs)
            2. Weekly Topics (14 weeks)
            3. Teaching & Learning Strategies
            4. Assessment Criteria & Grading
            5. Suggested Academic References.`;

            const { getSmartInsights } = await import('../services/geminiService');
            const response = await getSmartInsights(prompt);
            setAiResponse(response);
        } catch (error) {
            notifyError(language === 'ar' ? 'فشل المحرك في توليد التوصيف' : 'AI failed to generate syllabus');
        } finally {
            setIsAiLoading(false);
        }
    };

    const getCourseStats = (courseId: string) => {
        const enrolledStudents = students.filter(s => 
            s.grades?.some(g => g.courseId === courseId) || 
            s.enrollments?.some(e => e.courseId === courseId)
        );
        
        const grades = students.flatMap(s => s.grades || []).filter(g => g.courseId === courseId);
        const avgScore = grades.length > 0 
            ? Math.round(grades.reduce((acc, g) => acc + g.score, 0) / grades.length) 
            : 0;

        return {
            enrolledCount: enrolledStudents.length,
            avgScore,
            passRate: grades.length > 0 
                ? Math.round((grades.filter(g => g.score >= 50).length / grades.length) * 100) 
                : 0
        };
    };

    const globalStats = {
        totalCredits: courses.reduce((acc, c) => acc + c.credits, 0),
        avgEnrollment: Math.round(courses.reduce((acc, c) => acc + getCourseStats(c.id).enrolledCount, 0) / (courses.length || 1)),
        avgPerformance: Math.round(courses.reduce((acc, c) => acc + getCourseStats(c.id).avgScore, 0) / (courses.length || 1))
    };

    const handleSavePlan = (plan: AcademicPlan) => {
        saveAcademicPlan(plan);
        setPlans(getAcademicPlans());
        notifySuccess(language === 'ar' ? 'تم حفظ الخطة الدراسية بنجاح' : 'Academic plan saved successfully');
        setShowPlanModal(false);
    };

    const handleSaveCourse = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        const newCourse: Course = {
            id: editCourse?.id || `CRS-${Date.now()}`,
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            credits: parseInt(formData.get('credits') as string),
            semester: parseInt(formData.get('semester') as string),
            category: formData.get('category') as any,
            fee: parseFloat(formData.get('fee') as string || '0'),
            description: formData.get('description') as string,
            prerequisites: (formData.get('prerequisites') as string || '').split(',').map(s => s.trim()).filter(Boolean),
            qualityStandards: {
                ilos: (formData.get('clos') as string || '').split(',').map(s => s.trim()).filter(Boolean),
                assessmentMethods: (formData.get('assessments') as string || '').split(',').map(s => s.trim()).filter(Boolean),
                resourcesRequired: [],
                benchmarkPassRate: 50
            }
        };

        saveCourse(newCourse);
        setCourses(getCourses());
        notifySuccess(language === 'ar' ? 'تم حفظ المقرر بنجاح' : 'Course saved successfully');
        setShowCourseModal(false);
        setEditCourse(null);
    };

    const filteredPlans = plans.filter(p => {
        const program = programs.find(pr => pr.id === p.programId);
        return program?.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.version.includes(searchTerm);
    });

    const filteredCourses = courses.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.code.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                                <BookOpen size={32} className="text-indigo-400" />
                            </div>
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                                {language === 'ar' ? 'بنية المناهج' : 'Curriculum Architecture'}
                            </h1>
                        </div>
                        <p className="text-indigo-200/60 text-xs font-black uppercase tracking-[0.2em]">
                            {language === 'ar' ? 'إدارة المناهج والخطط الدراسية - معايير الجودة الأكاديمية' : 'Academic Curriculum & Quality Standards Management'}
                        </p>
                    </div>
                    
                    <div className="flex gap-3 bg-white/5 p-2 rounded-2xl backdrop-blur-md border border-white/5">
                        <button 
                            onClick={() => setActiveTab('plans')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'plans' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white"
                            )}
                        >
                            {language === 'ar' ? 'الخطط والمسارات' : 'Plans & Pathways'}
                        </button>
                        <button 
                            onClick={() => setActiveTab('courses')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'courses' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white"
                            )}
                        >
                            {language === 'ar' ? 'سجل المقررات' : 'Course Registry'}
                        </button>
                        <button 
                            onClick={() => setActiveTab('quality')}
                            className={cn(
                                "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                activeTab === 'quality' ? "bg-white text-slate-900 shadow-xl" : "text-white/40 hover:text-white"
                            )}
                        >
                            {language === 'ar' ? 'معايير الجودة' : 'Quality Standards'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 gap-6">
                {/* Filters and Search */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", language === 'ar' ? 'right-4' : 'left-4')} size={18} />
                        <input 
                            type="text" 
                            placeholder={activeTab === 'plans' 
                                ? (language === 'ar' ? "البحث في الخطط..." : "Search Plans...") 
                                : (language === 'ar' ? "البحث في المقررات..." : "Search Courses...")}
                            className={cn(
                                "w-full py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-black text-slate-700 italic placeholder:text-slate-300",
                                language === 'ar' ? "pr-12 pl-4" : "pl-12 pr-4"
                            )}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="flex bg-slate-100 p-1 rounded-[1.3rem] border border-slate-200">
                            <button 
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all",
                                    viewMode === 'grid' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <LayoutGrid size={18} />
                            </button>
                            <button 
                                onClick={() => setViewMode('table')}
                                className={cn(
                                    "p-2.5 rounded-xl transition-all",
                                    viewMode === 'table' ? "bg-white shadow-sm text-indigo-600" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <List size={18} />
                            </button>
                        </div>

                        {canManage && (
                            <button 
                                onClick={() => activeTab === 'plans' ? setShowPlanModal(true) : setShowCourseModal(true)}
                                className="flex-1 md:w-auto px-8 py-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 font-black text-[10px] uppercase tracking-widest"
                            >
                                <Plus size={18} className="text-indigo-400" />
                                {activeTab === 'plans' 
                                    ? (language === 'ar' ? "إنشاء خطة جديدة" : "Create New Plan") 
                                    : (language === 'ar' ? "تسجيل مقرر جديد" : "Register New Course")}
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'plans' ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {filteredPlans.map(plan => {
                            const program = programs.find(p => p.id === plan.programId);
                            const dept = departments.find(d => d.id === program?.deptId);
                            return (
                                <motion.div 
                                    layout
                                    key={plan.id}
                                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all flex flex-col justify-between group"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="flex items-center gap-4">
                                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:rotate-6 transition-transform">
                                                <Layers size={24} />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-slate-900 italic uppercase leading-none mb-1">{program?.name || (language === 'ar' ? 'برنامج غير معروف' : 'Unknown Program')}</h3>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{dept?.name || (language === 'ar' ? 'القسم' : 'Department')}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn(
                                                "px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                                                plan.isActive ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-50 text-slate-400 border-slate-100"
                                            )}>
                                                {plan.isActive ? (language === 'ar' ? 'خطة نشطة' : 'Active Plan') : (language === 'ar' ? 'مسودة' : 'Draft')}
                                            </span>
                                            {canManage && (
                                                <button className="p-2.5 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all">
                                                    <Edit2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-8">
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي الوحدات' : 'Total Credits'}</p>
                                            <p className="text-xl font-black text-slate-900 italic">{plan.totalCredits}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'الفصول الدراسية' : 'Semesters'}</p>
                                            <p className="text-xl font-black text-slate-900 italic">{plan.semesters.length}</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'الإصدار' : 'Version'}</p>
                                            <p className="text-xl font-black text-slate-900 italic">{plan.version}</p>
                                        </div>
                                    </div>

                                    <button 
                                        onClick={() => setSelectedPlan(plan)}
                                        className="w-full py-4 bg-slate-50 text-slate-900 hover:bg-slate-900 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all border border-slate-100 flex items-center justify-center gap-3"
                                    >
                                        <PieChart size={14} />
                                        {language === 'ar' ? 'عرض خارطة الطريق الأكاديمية' : 'Visualize Academic Roadmap'}
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>
                ) : activeTab === 'courses' ? (
                    <div className="space-y-6">
                        {/* Course Stats Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <BookCopy size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'إجمالي المقررات' : 'Total Courses'}</p>
                                    <p className="text-2xl font-black text-slate-900 italic leading-none mt-1">{courses.length}</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                                    <Users size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'متوسط التسجيل' : 'Avg Enrollment'}</p>
                                    <p className="text-2xl font-black text-slate-900 italic leading-none mt-1">{globalStats.avgEnrollment}</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                                    <Award size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'متوسط الأداء' : 'Avg Performance'}</p>
                                    <p className="text-2xl font-black text-slate-900 italic leading-none mt-1">{globalStats.avgPerformance}%</p>
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-5">
                                <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                                    <CheckCircle size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'نسبة النجاح العامة' : 'Global Pass Rate'}</p>
                                    <p className="text-2xl font-black text-slate-900 italic leading-none mt-1">92%</p>
                                </div>
                            </div>
                        </div>

                        {viewMode === 'grid' ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredCourses.map(course => {
                                    const stats = getCourseStats(course.id);
                                    return (
                                        <motion.div 
                                            layout
                                            key={course.id}
                                            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden"
                                        >
                                            <div className={cn("absolute top-0 w-16 h-16 bg-slate-50 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity", language === 'ar' ? "left-0 rounded-br-3xl -ml-8" : "right-0 rounded-bl-3xl -mr-8")} />
                                            <div className="flex justify-between items-start mb-4 relative z-10">
                                                <div className="bg-indigo-50 text-indigo-600 p-3 rounded-xl group-hover:scale-110 transition-transform">
                                                    <BookOpen size={20} />
                                                </div>
                                                <div className="flex gap-1">
                                                    <button 
                                                        onClick={() => { setCourseForAI(course); setIsAIModalOpen(true); setAiResponse(''); }}
                                                        className="p-2 text-slate-200 hover:text-brand-600 transition-colors"
                                                        title="AI Syllabus"
                                                    >
                                                        <Sparkles size={14} />
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button 
                                                                onClick={() => { setEditCourse(course); setShowCourseModal(true); }}
                                                                className="p-2 text-slate-200 hover:text-indigo-600 transition-colors"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { if(confirm(language === 'ar' ? 'هل أنت متأكد؟' : 'Are you sure?')) { deleteCourse(course.id); setCourses(getCourses()); } }}
                                                                className="p-2 text-slate-200 hover:text-red-500 transition-colors"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="mb-4">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="px-2 py-0.5 bg-slate-900 text-white text-[8px] font-black rounded uppercase tracking-tighter">{course.code}</span>
                                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black rounded uppercase tracking-widest leading-none">{course.credits} {language === 'ar' ? 'وحدة' : 'Credits'}</span>
                                                </div>
                                                <h4 className="text-sm font-black text-slate-900 uppercase italic truncate">{course.name}</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <Users size={10} className="text-slate-400" />
                                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الطلاب' : 'Students'}</span>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-900 italic">{stats.enrolledCount}</p>
                                                </div>
                                                <div className="p-2 bg-slate-50 rounded-xl border border-slate-100/50">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <TrendingUp size={10} className="text-slate-400" />
                                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الأداء' : 'Avg Score'}</span>
                                                    </div>
                                                    <p className="text-xs font-black text-slate-900 italic">{stats.avgScore}%</p>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-4 border-t border-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                                <span>{language === 'ar' ? 'الفصل' : 'Semester'} {course.semester}</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full rounded-full transition-all duration-1000",
                                                                stats.passRate > 80 ? "bg-emerald-500" : stats.passRate > 60 ? "bg-amber-500" : "bg-red-500"
                                                            )}
                                                            style={{ width: `${stats.passRate}%` }}
                                                        />
                                                    </div>
                                                    <span>{stats.passRate}%</span>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                                <table className="w-full text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                                    <thead className="bg-slate-50 border-b border-slate-100">
                                        <tr>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المقرر' : 'Course'}</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الوحدات' : 'Credits'}</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الفصل' : 'Semester'}</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'التسجيل' : 'Enrollment'}</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'متوسط الدرجات' : 'Avg Score'}</th>
                                            <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredCourses.map(course => {
                                            const stats = getCourseStats(course.id);
                                            return (
                                                <tr key={course.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-[9px]">{course.code}</div>
                                                            <span className="font-bold text-slate-700">{course.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 font-black text-slate-900">{course.credits}</td>
                                                    <td className="px-8 py-5 font-black text-slate-600">{course.semester}</td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <Users size={14} className="text-slate-300" />
                                                            <span className="font-black text-slate-900">{stats.enrolledCount}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                                <div className="h-full bg-indigo-500" style={{ width: `${stats.avgScore}%` }} />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-900">{stats.avgScore}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-2">
                                                            <button 
                                                                onClick={() => { setCourseForAI(course); setIsAIModalOpen(true); setAiResponse(''); }}
                                                                className="p-2 text-brand-500 hover:bg-brand-50 rounded-lg transition-all"
                                                            >
                                                                <Sparkles size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { setEditCourse(course); setShowCourseModal(true); }}
                                                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-all"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => { if(confirm('Are you sure?')) { deleteCourse(course.id); setCourses(getCourses()); } }}
                                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Quality Standards View */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {programs.map(program => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                key={program.id}
                                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600">
                                        <GraduationCap size={24} />
                                    </div>
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border",
                                        program.qualityMetrics?.accreditationStatus === 'NATIONAL' 
                                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                            : "bg-amber-50 text-amber-600 border-amber-100"
                                    )}>
                                        {program.qualityMetrics?.accreditationStatus || 'NOT_ACCREDITED'}
                                    </span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">{program.name}</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-1">
                                    {departments.find(d => d.id === program.deptId)?.name}
                                </p>

                                <div className="space-y-4 mb-8">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={14} className="text-emerald-500" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{language === 'ar' ? 'مخرجات التعلم PLOs' : 'Learning Outcomes PLOs'}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 italic">{program.qualityMetrics?.intendedLearningOutcomes.length || 0}</span>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <div className="flex items-center gap-2">
                                            <PieChart size={14} className="text-indigo-400" />
                                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{language === 'ar' ? 'معدل التخرج المستهدف' : 'Target grad. Rate'}</span>
                                        </div>
                                        <span className="text-sm font-black text-slate-900 italic">{program.qualityMetrics?.targetGraduateRate || 0}%</span>
                                    </div>
                                </div>

                                <div className="mt-auto flex gap-3">
                                    <button 
                                        onClick={() => { setSelectedProgram(program); setShowQualityModal(true); }}
                                        className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 hover:indigo-500"
                                    >
                                        <Settings size={14} className="text-indigo-400" />
                                        {language === 'ar' ? 'مصفوفة الجودة' : 'Quality Matrix'}
                                    </button>
                                    <button className="p-4 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-100">
                                        <Download size={16} />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            {/* Plan Visualization Modal */}
            {selectedPlan && (
                <Modal 
                    isOpen={!!selectedPlan} 
                    onClose={() => setSelectedPlan(null)}
                    title={(language === 'ar' ? 'خارطة طريق الخطة الأكاديمية: ' : 'Academic Plan Roadmap: ') + (programs.find(p => p.id === selectedPlan.programId)?.name)}
                    maxWidth="4xl"
                >
                    <div className="space-y-8 p-4">
                        <div className="flex items-center gap-6 p-6 bg-slate-50 rounded-3xl border border-slate-100 italic">
                           <AlertCircle size={24} className="text-indigo-400 shrink-0" />
                           <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                               {language === 'ar' 
                                ? 'توضح هذه الوثيقة التسلسل الزمني للوحدات الدراسية عبر الزمن الأكاديمي للمؤسسة. يجب استيفاء جميع المتطلبات السابقة قبل تسجيل الوحدات المتقدمة.'
                                : 'This document outlines the sequential mapping of curricular units across the institutional timeline. All prerequisites must be satisfied prior to advanced unit registration.'}
                           </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {selectedPlan.semesters.map(semester => (
                                <div key={semester.semesterNumber} className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black uppercase italic">S{semester.semesterNumber}</div>
                                            <h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest">{language === 'ar' ? 'الفصل' : 'Semester'} {semester.semesterNumber}</h4>
                                        </div>
                                        <span className="text-[9px] font-black text-slate-400">{semester.courses.length} {language === 'ar' ? 'مقررات' : 'UNITS'}</span>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {semester.courses.map(courseId => {
                                            const course = courses.find(c => c.id === courseId || c.code === courseId);
                                            return (
                                                <div key={courseId} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors cursor-pointer group">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-1.5 h-6 bg-indigo-500/20 group-hover:bg-indigo-500 rounded-full transition-colors" />
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-900 italic uppercase leading-none">{course?.name || courseId}</p>
                                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{course?.code || '---'} • {course?.credits || 0} CR</p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight size={14} className={cn("text-slate-200 group-hover:text-indigo-400 transition-colors", language === 'ar' && 'rotate-180')} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Course Edit Modal */}
            {showCourseModal && (
                <Modal
                    isOpen={showCourseModal}
                    onClose={() => setShowCourseModal(false)}
                    title={editCourse 
                        ? (language === 'ar' ? 'تعديل وحدة دراسية' : 'Modify Curricular Unit') 
                        : (language === 'ar' ? 'تهيئة وحدة دراسية جديدة' : 'Initialize Curricular Unit')}
                    footer={
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowCourseModal(false)} className="px-6 py-2 text-slate-500 font-bold">
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button form="course-form" type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">
                                {language === 'ar' ? 'حفظ المقرر' : 'Save Course'}
                            </button>
                        </div>
                    }
                >
                    <form id="course-form" onSubmit={handleSaveCourse} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'رمز المقرر' : 'Course Code'}
                                </label>
                                <input name="code" defaultValue={editCourse?.code} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'اسم المقرر' : 'Course Name'}
                                </label>
                                <input name="name" defaultValue={editCourse?.name} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'تصنيف المقرر' : 'Category'}
                                </label>
                                <select name="category" defaultValue={editCourse?.category || 'CORE'} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm">
                                    <option value="CORE">{language === 'ar' ? 'إجباري' : 'CORE'}</option>
                                    <option value="ELECTIVE">{language === 'ar' ? 'اختياري' : 'ELECTIVE'}</option>
                                    <option value="GENERAL">{language === 'ar' ? 'عام' : 'GENERAL'}</option>
                                </select>
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'رسوم المقرر (إضافية)' : 'Course Fee (Extra)'}
                                </label>
                                <input name="fee" type="number" defaultValue={editCourse?.fee || 0} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" />
                            </div>
                        </div>
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {language === 'ar' ? 'وصف المقرر' : 'Course Description'}
                            </label>
                            <textarea name="description" defaultValue={editCourse?.description} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm min-h-[100px]" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'عدد الوحدات' : 'Credits'}
                                </label>
                                <input name="credits" type="number" defaultValue={editCourse?.credits} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'الفصل الافتراضي' : 'Default Semester'}
                                </label>
                                <input name="semester" type="number" defaultValue={editCourse?.semester} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                        </div>
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {language === 'ar' ? 'المتطلبات السابقة (فصل بالفاصلة)' : 'Prerequisites (comma-separated)'}
                            </label>
                            <input name="prerequisites" defaultValue={editCourse?.prerequisites?.join(', ')} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" />
                        </div>
                        <div className="space-y-4 pt-4 border-t border-slate-100">
                            <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">{language === 'ar' ? 'معايير الجودة (QA)' : 'Quality Standards (QA)'}</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-right">
                                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                                        {language === 'ar' ? 'مخرجات التعلم (CLOs)' : 'Learning Outcomes (CLOs)'}
                                    </label>
                                    <input name="clos" defaultValue={editCourse?.qualityStandards?.ilos?.join(', ')} placeholder="CLO1, CLO2..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" />
                                </div>
                                <div className="space-y-2 text-right">
                                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest ml-1">
                                        {language === 'ar' ? 'طرق التقييم' : 'Assessment Methods'}
                                    </label>
                                    <input name="assessments" defaultValue={editCourse?.qualityStandards?.assessmentMethods?.join(', ')} placeholder="Exam, Project, Quiz..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" />
                                </div>
                            </div>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Quality Management Modal */}
            {selectedProgram && (
                <Modal
                    isOpen={showQualityModal}
                    onClose={() => setShowQualityModal(null)}
                    title={(language === 'ar' ? 'مصفوفة ضبط الجودة: ' : 'Quality Control Matrix: ') + selectedProgram.name}
                    maxWidth="4xl"
                >
                    <div className="space-y-10 p-6">
                        {/* ILOS Section */}
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic">{language === 'ar' ? 'مخرجات التعلم المستهدفة (PLOs)' : 'Target Learning Outcomes (PLOs)'}</h4>
                                {canManage && (
                                    <button className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors">
                                        <Plus size={14} className="inline mr-2" />
                                        {language === 'ar' ? 'إضافة مخرج' : 'Add Outcome'}
                                    </button>
                                )}
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                {selectedProgram.qualityMetrics?.intendedLearningOutcomes.map(ilo => (
                                    <div key={ilo.id} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-start gap-4 group">
                                        <div className={cn(
                                            "p-3 rounded-xl text-[10px] font-black shrink-0",
                                            ilo.category === 'KNOWLEDGE' ? "bg-blue-100 text-blue-600" :
                                            ilo.category === 'SKILLS' ? "bg-purple-100 text-purple-600" :
                                            "bg-emerald-100 text-emerald-600"
                                        )}>
                                            {ilo.id}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-slate-700 leading-relaxed mb-2">{ilo.description}</p>
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{ilo.category}</span>
                                        </div>
                                        {canManage && (
                                            <button className="p-2 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all">
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Accreditation Status */}
                        <div className="p-8 bg-slate-900 rounded-[2rem] text-white overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                            <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                                <div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'حالة الاعتماد المؤسسي' : 'Institutional Accreditation Status'}</h4>
                                    <p className="text-2xl font-black italic uppercase italic">{selectedProgram.qualityMetrics?.accreditationStatus}</p>
                                </div>
                                <div className="text-center md:text-right">
                                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">{language === 'ar' ? 'تاريخ المراجعة القادم' : 'Next Quality Review'}</p>
                                    <p className="text-sm font-black text-indigo-200">{selectedProgram.qualityMetrics?.nextReviewDate}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Modal>
            )}

            {/* AI Syllabus Modal */}
            {isAIModalOpen && courseForAI && (
                <Modal
                    isOpen={isAIModalOpen}
                    onClose={() => setIsAIModalOpen(false)}
                    title={language === 'ar' ? 'توليد توصيف المقرر بالذكاء الاصطناعي' : 'AI Curriculum Synthesis'}
                    icon={Sparkles}
                    maxWidth="3xl"
                >
                    <div className="space-y-6">
                        {!aiResponse ? (
                            <div className="p-12 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
                                <div className="w-20 h-20 bg-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20">
                                    <Wand2 size={32} className="text-indigo-200" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">
                                    {language === 'ar' ? 'مهندس المناهج الذكي' : 'Smart Curriculum Architect'}
                                </h3>
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest max-w-sm mx-auto mb-8">
                                    {language === 'ar' ? 'سيقوم الذكاء الاصطناعي بتحليل المقرر وتوليد توصيف أكاديمي شامل وفق المعايير العالمية.' : 'AI will analyze the module to synthesize a comprehensive academic syllabus based on global standards.'}
                                </p>
                                <button 
                                    onClick={generateSyllabus}
                                    disabled={isAiLoading}
                                    className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-3 mx-auto hover:bg-black transition-all disabled:opacity-50"
                                >
                                    {isAiLoading ? <Loader2 size={18} className="animate-spin text-indigo-400" /> : <Sparkles size={18} className="text-indigo-400" />}
                                    {isAiLoading ? (language === 'ar' ? 'جاري التوليد...' : 'Generating...') : (language === 'ar' ? 'بدء التوليد الذكي' : 'Initialize Synthesis')}
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-8 bg-slate-900 text-slate-100 rounded-[2.5rem] shadow-2xl border border-slate-800 font-bold whitespace-pre-wrap text-sm leading-relaxed max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    {aiResponse}
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => { navigator.clipboard.writeText(aiResponse); notifySuccess(language === 'ar' ? 'تم النسخ' : 'Copied'); }}
                                        className="flex-1 py-4 bg-slate-100 text-slate-900 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all"
                                    >
                                        {language === 'ar' ? 'نسخ النص' : 'Copy Syllabus'}
                                    </button>
                                    <button 
                                        onClick={() => setAiResponse('')}
                                        className="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all"
                                    >
                                        {language === 'ar' ? 'إعادة توليد' : 'Regenerate'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* Plan Creation/Edit Modal */}
            {showPlanModal && (
                <Modal
                    isOpen={showPlanModal}
                    onClose={() => setShowPlanModal(false)}
                    title={language === 'ar' ? 'تهيئة خطة دراسية معيارية' : 'Initialize Standard Academic Plan'}
                    footer={
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowPlanModal(false)} className="px-6 py-2 text-slate-500 font-bold">
                                {language === 'ar' ? 'إلغاء' : 'Cancel'}
                            </button>
                            <button form="plan-form" type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">
                                {language === 'ar' ? 'إنشاء الخطة' : 'Create Plan'}
                            </button>
                        </div>
                    }
                >
                    <form id="plan-form" onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.target as HTMLFormElement;
                        const formData = new FormData(form);
                        const newPlan: AcademicPlan = {
                            id: `PLAN-${Date.now()}`,
                            programId: formData.get('programId') as string,
                            version: formData.get('version') as string,
                            isActive: true,
                            totalCredits: parseInt(formData.get('totalCredits') as string),
                            semesters: Array.from({ length: 8 }).map((_, i) => ({ semesterNumber: i + 1, courses: [] }))
                        };
                        handleSavePlan(newPlan);
                    }} className="space-y-6">
                        <div className="space-y-2 text-right">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                {language === 'ar' ? 'البرنامج الأكاديمي' : 'Academic Program'}
                            </label>
                            <select name="programId" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required>
                                {programs.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'إصدار الخطة' : 'Plan Version'}
                                </label>
                                <input name="version" placeholder="2024.1" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                            <div className="space-y-2 text-right">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">
                                    {language === 'ar' ? 'عدد وحدات التخرج' : 'Total Credits to Graduate'}
                                </label>
                                <input name="totalCredits" type="number" defaultValue={132} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm" required />
                            </div>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default CurriculumManagement;
