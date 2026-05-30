
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Plus, Search, Filter, Trash2, Edit2, Save, X, 
  ChevronRight, ChevronDown, List, Layers, PieChart, 
  Settings, Download, Trash, Copy, CheckCircle2, AlertCircle,
  FileText, Briefcase, GraduationCap, LayoutGrid, Sparkles, Wand2, Loader2,
  Users, Award, TrendingUp, BookCopy, BarChart3, Clock, MoreVertical,
  ArrowUpRight, ArrowDownRight, FilterX, Boxes, Calendar, MapPin, AlertTriangle
} from 'lucide-react';
import { 
  getCourses, saveCourse, deleteCourse, getDepartments, getStudents, getAcademicPrograms, getRooms 
} from '../services/storageService';
import { getInstructors } from '../services/facultyService';
import { getSchedule, saveClassSession, deleteClassSession, checkScheduleConflict, getDayLabel } from '../services/scheduleService';
import { Course, Department, Student, AcademicProgram, ProgramType, ClassSession, Room, Instructor, DayOfWeek, Permission } from '../types';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import Modal from './ui/Modal';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

interface CourseManagementProps {
    language: Language;
}

const CourseManagement: React.FC<CourseManagementProps> = ({ language }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [programs, setPrograms] = useState<AcademicProgram[]>([]);
    
    const [schedule, setSchedule] = useState<ClassSession[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
    const [editingSession, setEditingSession] = useState<Partial<ClassSession> | null>(null);
    const [sessionDuration, setSessionDuration] = useState<number>(120);

    const [searchTerm, setSearchTerm] = useState('');
    const [filterDept, setFilterDept] = useState<string>('all');
    const [filterSemester, setFilterSemester] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
    
    const [showModal, setShowModal] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

    const currentUser = getCurrentUser();
    const canManage = hasPermission(currentUser, Permission.ACADEMICS_MANAGE);

    useEffect(() => {
        refreshData();
    }, []);

    const refreshData = () => {
        setCourses(getCourses());
        setDepartments(getDepartments());
        setStudents(getStudents());
        setPrograms(getAcademicPrograms());
        setSchedule(getSchedule());
        setRooms(getRooms());
        setInstructors(getInstructors());
    };

    const getCourseStats = (courseId: string) => {
        const enrolledCount = students.filter(s => 
            s.grades?.some(g => g.courseId === courseId) || 
            s.enrollments?.some(e => e.courseId === courseId)
        ).length;
        
        const grades = students.flatMap(s => s.grades || []).filter(g => g.courseId === courseId);
        const avgScore = grades.length > 0 
            ? Math.round(grades.reduce((acc, g) => acc + g.score, 0) / grades.length) 
            : 0;
            
        const passRate = grades.length > 0
            ? Math.round((grades.filter(g => g.score >= 50).length / grades.length) * 100)
            : 0;

        return { enrolledCount, avgScore, passRate };
    };

    const filteredCourses = useMemo(() => {
        return courses.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                c.code.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDept = filterDept === 'all' || c.deptId === filterDept;
            const matchesSemester = filterSemester === 'all' || c.semester === parseInt(filterSemester);
            return matchesSearch && matchesDept && matchesSemester;
        });
    }, [courses, searchTerm, filterDept, filterSemester]);

    const stats = useMemo(() => {
        const totalCourses = courses.length;
        const totalEnrollments = courses.reduce((acc, c) => acc + getCourseStats(c.id).enrolledCount, 0);
        const avgEnrollment = totalCourses > 0 ? Math.round(totalEnrollments / totalCourses) : 0;
        const avgScore = totalCourses > 0 ? Math.round(courses.reduce((acc, c) => acc + getCourseStats(c.id).avgScore, 0) / totalCourses) : 0;
        const topCourse = [...courses].sort((a, b) => getCourseStats(b.id).avgScore - getCourseStats(a.id).avgScore)[0];

        return { totalCourses, avgEnrollment, avgScore, topCourse };
    }, [courses, students]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        
        const courseData: Course = {
            id: editingCourse?.id || `CRS-${Date.now()}`,
            code: formData.get('code') as string,
            name: formData.get('name') as string,
            credits: parseInt(formData.get('credits') as string),
            semester: parseInt(formData.get('semester') as string),
            deptId: formData.get('deptId') as string,
            category: formData.get('category') as any,
            description: formData.get('description') as string,
            prerequisites: (formData.get('prerequisites') as string || '').split(',').map(s => s.trim()).filter(Boolean),
        };

        saveCourse(courseData);
        refreshData();
        notifySuccess(language === 'ar' ? 'تم حفظ المقرر بنجاح' : 'Course saved successfully');
        setShowModal(false);
        setEditingCourse(null);
    };

    const handleDelete = (id: string) => {
        if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا المقرر؟' : 'Are you sure you want to delete this course?')) {
            deleteCourse(id);
            refreshData();
            notifySuccess(language === 'ar' ? 'تم حذف المقرر' : 'Course deleted');
        }
    };

    const getSessionDuration = (session: Partial<ClassSession>) => {
        if (!session.startTime || !session.endTime) return 120;
        const [startH, startM] = session.startTime.split(':').map(Number);
        const [endH, endM] = session.endTime.split(':').map(Number);
        const diff = (endH * 60 + endM) - (startH * 60 + startM);
        return diff > 0 ? diff : 120;
    };

    const handleSaveSession = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingSession || !selectedCourse) return;

        if (!editingSession.instructorId || !editingSession.room || !editingSession.day || !editingSession.startTime) {
            notifyError(language === 'ar' ? 'الرجاء ملء كل الحقول المطلوبة' : 'Please fill all required fields');
            return;
        }

        const [h, m] = editingSession.startTime.split(':').map(Number);
        const totalMin = h * 60 + m + sessionDuration;
        const endH = Math.floor(totalMin / 60) % 24;
        const endM = totalMin % 60;
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

        const instructor = instructors.find(i => i.id === editingSession.instructorId);

        const sessionData: ClassSession = {
            id: editingSession.id || `SES-${Date.now()}`,
            courseId: selectedCourse.id,
            courseName: selectedCourse.name,
            instructorId: editingSession.instructorId,
            instructorName: instructor?.name || '',
            day: editingSession.day as DayOfWeek,
            startTime: editingSession.startTime,
            endTime: endTimeStr,
            room: editingSession.room
        };

        const conflict = checkScheduleConflict(sessionData, editingSession.id, rooms);
        if (conflict.hasConflict && conflict.conflictingType !== 'CAPACITY') {
            notifyError(conflict.message || (language === 'ar' ? 'يوجد تعارض في الجدول' : 'Scheduling conflict detected'));
            return;
        }

        if (conflict.hasConflict && conflict.conflictingType === 'CAPACITY') {
            if (!confirm(`${conflict.message}\n\n${language === 'ar' ? 'هل تريد الاستمرار على أي حال؟' : 'Do you want to proceed anyway?'}`)) {
                return;
            }
        }

        saveClassSession(sessionData);
        notifySuccess(language === 'ar' ? 'تم حفظ موعد المحاضرة بنجاح' : 'Lecture session saved successfully');
        setEditingSession(null);
        refreshData();
    };

    return (
        <div className="p-8 max-w-[1600px] mx-auto space-y-8" dir={language === 'ar' ? 'rtl' : 'ltr'}>
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full -mr-32 -mt-32 blur-3xl" />
                <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-200">
                            <BookCopy size={24} />
                        </div>
                        <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
                            {language === 'ar' ? 'إدارة المقررات الدراسية' : 'Curricular Management'}
                        </h1>
                    </div>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] px-1">
                        {language === 'ar' ? 'التحكم الكامل في السجل الأكاديمي والوحدات' : 'Terminal Control for Academic Units & Registry'}
                    </p>
                </div>
                
                {canManage && (
                    <button 
                        onClick={() => { setEditingCourse(null); setShowModal(true); }}
                        className="relative z-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl shadow-slate-900/20 active:scale-95 group"
                    >
                        <Plus size={18} className="group-hover:rotate-90 transition-transform duration-300" />
                        {language === 'ar' ? 'إضافة مقرر جديد' : 'Initialize New Unit'}
                    </button>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: language === 'ar' ? 'إجمالي المقررات' : 'Total Units', value: stats.totalCourses, icon: Boxes, color: 'indigo' },
                    { label: language === 'ar' ? 'متوسط التسجيل' : 'Avg Enrollment', value: stats.avgEnrollment, icon: Users, color: 'emerald', sub: language === 'ar' ? 'لكل مقرر' : 'Per Course' },
                    { label: language === 'ar' ? 'متوسط الأداء' : 'Global Avg', value: `${stats.avgScore}%`, icon: TrendingUp, color: 'amber', sub: language === 'ar' ? 'نسبة النجاح' : 'Success Index' },
                    { label: language === 'ar' ? 'أفضل مقرر أداءً' : 'Peak Performance', value: stats.topCourse?.code || 'N/A', icon: Award, color: 'purple', sub: stats.topCourse?.name }
                ].map((stat, i) => (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={i}
                        className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5 group"
                    >
                        <div className={cn(
                            "p-4 rounded-2xl transition-all group-hover:scale-110",
                            stat.color === 'indigo' ? "bg-indigo-50 text-indigo-600" :
                            stat.color === 'emerald' ? "bg-emerald-50 text-emerald-600" :
                            stat.color === 'amber' ? "bg-amber-50 text-amber-600" :
                            "bg-purple-50 text-purple-600"
                        )}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                            <p className="text-2xl font-black text-slate-900 italic leading-none">{stat.value}</p>
                            {stat.sub && <p className="text-[9px] font-bold text-slate-400 truncate max-w-[120px] mt-1 uppercase tracking-tighter">{stat.sub}</p>}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col lg:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-300", language === 'ar' ? 'right-5' : 'left-5')} size={18} />
                    <input 
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={language === 'ar' ? 'البحث عن طريق اسم المقرر أو الرمز...' : 'Search by course name or code...'}
                        className={cn(
                            "w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all text-slate-700",
                            language === 'ar' ? 'pr-14 pl-6' : 'pl-14 pr-6'
                        )}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="relative">
                        <Filter className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? 'right-4' : 'left-4')} size={14} />
                        <select 
                            value={filterDept}
                            onChange={(e) => setFilterDept(e.target.value)}
                            className={cn(
                                "py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/5 appearance-none min-w-[160px] text-slate-600",
                                language === 'ar' ? 'pr-10 pl-8' : 'pl-10 pr-8'
                            )}
                        >
                            <option value="all">{language === 'ar' ? 'كل الأقسام' : 'All Departments'}</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div className="relative">
                        <Clock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? 'right-4' : 'left-4')} size={14} />
                        <select 
                            value={filterSemester}
                            onChange={(e) => setFilterSemester(e.target.value)}
                            className={cn(
                                "py-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-4 focus:ring-indigo-500/5 appearance-none min-w-[120px] text-slate-600",
                                language === 'ar' ? 'pr-10 pl-8' : 'pl-10 pr-8'
                            )}
                        >
                            <option value="all">{language === 'ar' ? 'كل الفصول' : 'All Semesters'}</option>
                            {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>{language === 'ar' ? `الفصل ${s}` : `Semester ${s}`}</option>)}
                        </select>
                    </div>
                    <div className="h-10 w-px bg-slate-100 hidden lg:block" />
                    <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'table' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                        >
                            <List size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Courses Display */}
            {filteredCourses.length === 0 ? (
                <div className="bg-white p-20 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-200">
                        <FilterX size={48} />
                    </div>
                    <h3 className="text-xl font-black text-slate-900 uppercase italic mb-2">{language === 'ar' ? 'لا توجد نتائج' : 'Null Results'}</h3>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'جرب تغيير مرشحات البحث' : 'Refine search parameters to discover records'}</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredCourses.map((course, idx) => {
                            const courseStats = getCourseStats(course.id);
                            return (
                                <motion.div 
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05 }}
                                    key={course.id}
                                    className="bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden flex flex-col"
                                >
                                    {/* Card Header & Actions */}
                                    <div className="p-6 pb-4 flex justify-between items-start">
                                        <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-lg ring-4 ring-slate-100 group-hover:rotate-6 transition-transform">
                                            <BookOpen size={20} />
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => { setSelectedCourse(course); setShowScheduleDrawer(true); }}
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                title={language === 'ar' ? 'الجدول الدراسي والتعارضات' : 'Timetable & Room conflicts'}
                                            >
                                                <Clock size={14} />
                                            </button>
                                            {canManage && (
                                                <>
                                                    <button 
                                                        onClick={() => { setEditingCourse(course); setShowModal(true); }}
                                                        className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(course.id)}
                                                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Main Content */}
                                    <div className="px-6 flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-black rounded uppercase tracking-tighter">{course.code}</span>
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[8px] font-black rounded uppercase tracking-widest leading-none">
                                                {course.credits} {language === 'ar' ? 'وحدة' : 'Credits'}
                                            </span>
                                        </div>
                                        <h4 className="text-base font-black text-slate-900 uppercase italic mb-1 group-hover:text-indigo-600 transition-colors leading-tight">
                                            {course.name}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
                                            {departments.find(d => d.id === course.deptId)?.name || 'N/A'}
                                        </p>

                                        {/* Unit Stats */}
                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Users size={12} className="text-slate-400" />
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'التسجيل' : 'Enrollment'}</span>
                                                </div>
                                                <p className="text-sm font-black text-slate-900 italic">{courseStats.enrolledCount}</p>
                                            </div>
                                            <div className="p-3 bg-slate-50 border border-slate-100/50 rounded-2xl">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <TrendingUp size={12} className="text-slate-400" />
                                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الأداء' : 'Avg Score'}</span>
                                                </div>
                                                <p className="text-sm font-black text-slate-900 italic">{courseStats.avgScore}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer / Pass Rate Bar */}
                                    <div className="p-6 pt-4 mt-auto bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                <motion.div 
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${courseStats.passRate}%` }}
                                                    className={cn(
                                                        "h-full rounded-full transition-all duration-1000",
                                                        courseStats.passRate > 80 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : 
                                                        courseStats.passRate > 60 ? "bg-amber-500" : "bg-red-500"
                                                    )}
                                                />
                                            </div>
                                            <span className="text-[10px] font-black text-slate-900">{courseStats.passRate}%</span>
                                        </div>
                                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                                            {language === 'ar' ? 'الفصل' : 'SEM'} {course.semester}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            ) : (
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المقرر الفني' : 'TECHNICAL UNIT'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'القسم' : 'FACULTY/DEPT'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الوحدات' : 'CREDITS'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الفصل' : 'SEM'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'التسجيل' : 'REGISTRY'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مؤشر الأداء' : 'PERFORMANCE'}</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الإجراءات' : 'ACTIONS'}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filteredCourses.map(course => {
                                    const courseStats = getCourseStats(course.id);
                                    return (
                                        <tr key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] group-hover:rotate-6 transition-transform">{course.code}</div>
                                                    <div>
                                                        <span className="block font-black text-slate-900 uppercase italic text-sm">{course.name}</span>
                                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{course.category || 'CORE'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                                    {departments.find(d => d.id === course.deptId)?.name || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 font-black text-slate-900 text-sm italic">{course.credits}</td>
                                            <td className="px-8 py-5 font-black text-slate-600 text-sm italic">{course.semester}</td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2">
                                                    <Users size={14} className="text-slate-300" />
                                                    <span className="font-black text-slate-900 text-sm italic">{courseStats.enrolledCount}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn("h-full rounded-full transition-all duration-1000", courseStats.avgScore > 75 ? "bg-emerald-500" : courseStats.avgScore > 50 ? "bg-amber-500" : "bg-red-500")} 
                                                            style={{ width: `${courseStats.avgScore}%` }} 
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-900 italic">{courseStats.avgScore}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => { setSelectedCourse(course); setShowScheduleDrawer(true); }}
                                                        className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-all"
                                                        title={language === 'ar' ? 'الجدول الدراسي والتعارضات' : 'Timetable & Room conflicts'}
                                                    >
                                                        <Clock size={16} />
                                                    </button>
                                                    {canManage && (
                                                        <>
                                                            <button 
                                                                onClick={() => { setEditingCourse(course); setShowModal(true); }}
                                                                className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDelete(course.id)}
                                                                className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <Modal
                    isOpen={showModal}
                    onClose={() => setShowModal(false)}
                    title={editingCourse ? (language === 'ar' ? 'تعديل المقرر' : 'Modify Curricular Unit') : (language === 'ar' ? 'إضافة مقرر جديد' : 'Initialize Curricular Unit')}
                    maxWidth="2xl"
                    footer={
                        <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100 rounded-b-[2rem]">
                            <button onClick={() => setShowModal(false)} className="px-6 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">
                                {language === 'ar' ? 'إلغاء' : 'Abort'}
                            </button>
                            <button form="course-form" type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl shadow-slate-900/10">
                                <Save size={16} className="inline mr-2" />
                                {language === 'ar' ? 'حفظ الحالت' : 'Commit Changes'}
                            </button>
                        </div>
                    }
                >
                    <form id="course-form" onSubmit={handleSave} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'رمز المقرر' : 'Technical Code'}</label>
                                <input name="code" defaultValue={editingCourse?.code} placeholder="CS101" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم المقرر' : 'Course Designation'}</label>
                                <input name="name" defaultValue={editingCourse?.name} placeholder="Introduction to Computer Science" className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none" required />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'القسم الأكاديمي' : 'Department/Faculty'}</label>
                                <select name="deptId" defaultValue={editingCourse?.deptId} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none" required>
                                    <option value="">{language === 'ar' ? 'اختر القسم' : 'Select Department'}</option>
                                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'التصنيف' : 'Registry Category'}</label>
                                <select name="category" defaultValue={editingCourse?.category || 'CORE'} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none">
                                    <option value="CORE">{language === 'ar' ? 'إلزامي' : 'Core Module'}</option>
                                    <option value="ELECTIVE">{language === 'ar' ? 'اختياري' : 'Elective Module'}</option>
                                    <option value="GENERAL">{language === 'ar' ? 'عام' : 'General Education'}</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'عدد الوحدات' : 'Credit Hours'}</label>
                                <input name="credits" type="number" defaultValue={editingCourse?.credits} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none" required />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الفصل الدراسي' : 'Recommended Semester'}</label>
                                <input name="semester" type="number" defaultValue={editingCourse?.semester} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none" required />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'وصف المقرر' : 'Technical Description'}</label>
                            <textarea name="description" defaultValue={editingCourse?.description} rows={4} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none resize-none" />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المتطلبات السابقة' : 'Prerequisites (Technical Codes)'}</label>
                            <input name="prerequisites" defaultValue={editingCourse?.prerequisites?.join(', ')} placeholder="CS101, CS202..." className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl italic font-black text-sm outline-none" />
                            <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest ml-1">{language === 'ar' ? 'أدخل رموز المقررات مفصولة بفاصلة' : 'Comma-separated academic identifiers'}</p>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Timetable Management & Real-time Conflict Drawer */}
            {showScheduleDrawer && selectedCourse && (() => {
                const courseSessions = schedule.filter(s => s.courseId === selectedCourse.id);
                const courseStats = getCourseStats(selectedCourse.id);
                
                const sessionsWithConflicts = courseSessions.map(session => {
                    const roomObj = rooms.find(r => r.name === session.room);
                    const conflict = checkScheduleConflict(session, session.id, rooms);
                    return { session, conflict, roomObj };
                });
                
                const hasAnyConflicts = sessionsWithConflicts.some(item => item.conflict.hasConflict);
                
                return (
                    <div className="fixed inset-0 z-50 flex justify-end" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                        {/* Backdrop */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                            onClick={() => { setShowScheduleDrawer(false); setEditingSession(null); }}
                        />
                        
                        {/* Drawer body */}
                        <motion.div 
                            initial={{ x: language === 'ar' ? '-100%' : '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: language === 'ar' ? '-100%' : '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col z-10"
                        >
                            {/* Drawer Header */}
                            <div className="p-6 bg-slate-900 text-white flex justify-between items-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full -mr-16 -mt-16 blur-2xl" />
                                <div className="relative z-10 border-none">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                            <Calendar size={18} />
                                        </div>
                                        <h3 className="text-lg font-black uppercase italic tracking-tight">{language === 'ar' ? 'جدول المقرر والتعارضات' : 'Timetable & Conflicts'}</h3>
                                    </div>
                                    <p className="text-xs text-indigo-200 mt-1 font-bold uppercase tracking-wider">{selectedCourse.name} ({selectedCourse.code})</p>
                                </div>
                                <button 
                                    onClick={() => { setShowScheduleDrawer(false); setEditingSession(null); }}
                                    className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors relative z-10"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Drawer Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                
                                {/* Course Stats Banner */}
                                <div className="grid grid-cols-3 gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{language === 'ar' ? 'السجل الفني' : 'Code'}</p>
                                        <p className="text-sm font-black text-slate-800">{selectedCourse.code}</p>
                                    </div>
                                    <div className="border-x border-slate-100">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{language === 'ar' ? 'الوحدات الدراسية' : 'Credits'}</p>
                                        <p className="text-sm font-black text-slate-800">{selectedCourse.credits}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{language === 'ar' ? 'الطلاب المقيدون' : 'Enrolled'}</p>
                                        <p className="text-sm font-black text-indigo-600">{courseStats.enrolledCount}</p>
                                    </div>
                                </div>

                                {/* Real-time Compliance Status Card */}
                                <div className="relative">
                                    {courseSessions.length === 0 ? (
                                        <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl text-center space-y-2">
                                            <AlertCircle className="mx-auto text-slate-400" size={24} />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                                {language === 'ar' ? 'لا يوجد محاضرات مجدولة لهذا المقرر بعد.' : 'No lectures scheduled yet for this unit.'}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400">
                                                {language === 'ar' ? 'استخدم منصة الجدولة لترتيب المواعيد والتحكم بالأخطاء.' : 'Use scheduling tools to construct lecture timelines.'}
                                            </p>
                                        </div>
                                    ) : hasAnyConflicts ? (
                                        <div className="bg-rose-50 border border-rose-200/50 p-4 rounded-2xl flex gap-3.5 items-start shadow-sm">
                                            <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">
                                                    {language === 'ar' ? 'تم كشف تعارضات في المواعيد / السعة' : 'Timetable Violations Caught'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-rose-600 mt-1 leading-relaxed">
                                                    {language === 'ar' 
                                                        ? 'الرجاء فحص الحصص الحمراء في الأسفل؛ يتجاوز عدد الطلاب المسجلين سعة القاعات المختارة، أو هناك تعارض لمواعيد المدرسين.' 
                                                        : 'Please inspect reddish sessions below. Active conflicts on rooms, instructors, or classroom capacity overloads need immediate resolution.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex gap-4 items-start shadow-sm">
                                            <CheckCircle2 className="text-emerald-600 shrink-0 mt-0.5" size={20} />
                                            <div>
                                                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide">
                                                    {language === 'ar' ? 'جدول المقرر الدراسي ممتاز ومتوافق' : 'Timetable Analytics Approved'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-emerald-600 mt-1 leading-relaxed">
                                                    {language === 'ar'
                                                        ? 'كل القاعات والصفوف المختارة تمتثل للشروط الأكاديمية بنسبة 100%. لا يوجد تعارض في أوقات المدرسين أو عجز في استيعاب الطلاب.'
                                                        : 'All scheduled sessions comply 100% with room specs, instructor availability timers, and seat counts.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Active Schedule list */}
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center px-1">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">{language === 'ar' ? 'مواعيد المحاضرات الحالية' : 'Scheduled Lectures'}</h4>
                                        {canManage && !editingSession && (
                                            <button 
                                                onClick={() => {
                                                    setEditingSession({
                                                        day: 'SUNDAY',
                                                        startTime: '08:00',
                                                        room: rooms[0]?.name || '',
                                                        instructorId: instructors[0]?.id || ''
                                                    });
                                                    setSessionDuration(120);
                                                }}
                                                className="px-4 py-1.5 bg-indigo-600 hover:bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                                            >
                                                <Plus size={12} />
                                                {language === 'ar' ? 'إضافة موعد' : 'Schedule Lecture'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Lectures Cards */}
                                    <div className="space-y-3.5">
                                        {sessionsWithConflicts.map(({ session, conflict, roomObj }) => {
                                            const capacityPercentage = roomObj ? Math.round((courseStats.enrolledCount / roomObj.capacity) * 100) : 0;
                                            const isCapacityOver = roomObj && courseStats.enrolledCount > roomObj.capacity;
                                            
                                            return (
                                                <div 
                                                    key={session.id} 
                                                    className={cn(
                                                        "bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 relative overflow-hidden group",
                                                        conflict.hasConflict 
                                                            ? "border-rose-200 bg-rose-50/10 hover:border-rose-300" 
                                                            : "border-slate-100 hover:border-slate-200"
                                                    )}
                                                >
                                                    {/* Glow accent for conflict */}
                                                    {conflict.hasConflict && (
                                                        <div className="absolute top-0 bottom-0 left-0 w-1 bg-rose-500" />
                                                    )}

                                                    {/* Title & Actions */}
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[9px] font-black uppercase tracking-wider">
                                                                <Calendar size={10} />
                                                                {getDayLabel(session.day)} | {session.startTime} - {session.endTime}
                                                            </span>
                                                        </div>
                                                        {canManage && (
                                                            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingSession(session);
                                                                        const dur = getSessionDuration(session);
                                                                        setSessionDuration(dur);
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                >
                                                                    <Edit2 size={12} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا الموعد؟' : 'Are you sure you want to delete this lecture?')) {
                                                                            deleteClassSession(session.id);
                                                                            notifySuccess(language === 'ar' ? 'تم حذف موعد المحاضرة' : 'Lecture schedule cleared successfully');
                                                                            refreshData();
                                                                        }
                                                                    }}
                                                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all"
                                                                >
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Key details */}
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                                                                <Users size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'المدرس' : 'Instructor'}</p>
                                                                <p className="text-xs font-bold text-slate-700">{session.instructorName}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="p-2 bg-slate-50 text-slate-500 rounded-lg border border-slate-100">
                                                                <MapPin size={12} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'القاعة' : 'Room'}</p>
                                                                <p className="text-xs font-bold text-slate-700">{session.room}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Real-time occupied space indicator */}
                                                    {roomObj && (
                                                        <div className="border-t border-slate-50 pt-3">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'إشغال المقاعد للقاعة' : 'Seat Fill Analytics'}</span>
                                                                <span className={cn(
                                                                    "text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded",
                                                                    isCapacityOver ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                                                )}>
                                                                    {courseStats.enrolledCount} / {roomObj.capacity} {language === 'ar' ? 'مقعد' : 'Seats'} ({capacityPercentage}%)
                                                                </span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${Math.min(capacityPercentage, 100)}%` }}
                                                                    className={cn(
                                                                        "h-full rounded-full transition-all duration-500",
                                                                        isCapacityOver 
                                                                            ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" 
                                                                            : capacityPercentage > 85 ? "bg-amber-500" : "bg-emerald-500"
                                                                    )}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Specific real-time errors list */}
                                                    {conflict.hasConflict && (
                                                        <div className="flex gap-2 p-2.5 rounded-xl border border-red-100 bg-red-50/50 text-[10px] font-bold text-red-800 items-start mt-1">
                                                            <AlertCircle size={14} className="shrink-0 text-red-600 mt-0.5" />
                                                            <p className="leading-normal">{conflict.message}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Form Section (Composing/Scheduling) */}
                                {canManage && editingSession && (() => {
                                    const liveConflict = (() => {
                                        if (!editingSession || !editingSession.room || !editingSession.day || !editingSession.startTime || !editingSession.instructorId) return null;
                                        
                                        const [h, m] = editingSession.startTime.split(':').map(Number);
                                        const totalMin = h * 60 + m + sessionDuration;
                                        const endH = Math.floor(totalMin / 60) % 24;
                                        const endM = totalMin % 60;
                                        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

                                        const sessionToVerify: ClassSession = {
                                            id: editingSession.id || 'NEW',
                                            courseId: selectedCourse.id,
                                            courseName: selectedCourse.name,
                                            instructorId: editingSession.instructorId,
                                            instructorName: instructors.find(i => i.id === editingSession.instructorId)?.name || '',
                                            day: editingSession.day as DayOfWeek,
                                            startTime: editingSession.startTime,
                                            endTime: endTimeStr,
                                            room: editingSession.room
                                        };

                                        return checkScheduleConflict(sessionToVerify, editingSession.id, rooms);
                                    })();

                                    // Calc End Time helper
                                    let simulatedEndTime = '--:--';
                                    if (editingSession.startTime) {
                                        const [h, m] = editingSession.startTime.split(':').map(Number);
                                        const totalMin = h * 60 + m + sessionDuration;
                                        const endH = Math.floor(totalMin / 60) % 24;
                                        const endM = totalMin % 60;
                                        simulatedEndTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                                    }

                                    return (
                                        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xl space-y-4 relative overflow-hidden ring-4 ring-indigo-500/5">
                                            {/* Glowing header accent */}
                                            <div className="h-1 bg-gradient-to-r from-indigo-500 to-purple-500 absolute top-0 left-0 right-0 animate-pulse" />
                                            
                                            <div className="flex justify-between items-center pb-2 border-b border-slate-50">
                                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                                    <Sparkles size={14} className="text-indigo-500" />
                                                    {editingSession.id ? (language === 'ar' ? 'تعديل موعد محاضرة' : 'Modify Lecture Block') : (language === 'ar' ? 'جدولة محاضرة جديدة' : 'Configure New Lecture')}
                                                </h4>
                                                <button 
                                                    onClick={() => setEditingSession(null)}
                                                    className="p-1 px-2.5 text-slate-400 hover:text-slate-600 rounded bg-slate-50 hover:bg-slate-100 text-[9px] font-black transition-colors"
                                                >
                                                    {language === 'ar' ? 'إغلاق المجدول' : 'Collapse Scheduler'}
                                                </button>
                                            </div>

                                            <form onSubmit={handleSaveSession} className="space-y-4">
                                                {/* Instructor Dropdown */}
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">{language === 'ar' ? 'مدرس المقرر الدراسي' : 'Academic Instructor'}</label>
                                                    <select 
                                                        required
                                                        className="w-full border border-slate-100 rounded-xl px-3.5 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 transition-all cursor-pointer"
                                                        value={editingSession.instructorId}
                                                        onChange={e => setEditingSession({...editingSession, instructorId: e.target.value})}
                                                    >
                                                        <option value="">{language === 'ar' ? 'اختر المحاضر...' : 'Choose Instructor...'}</option>
                                                        {instructors.map(inst => (
                                                            <option key={inst.id} value={inst.id}>{inst.name} ({inst.departmentId})</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Room/Room capacity selector */}
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">{language === 'ar' ? 'القاعة الدراسية والمسرح' : 'Classroom / Lecture Hall'}</label>
                                                    <select 
                                                        required
                                                        className="w-full border border-slate-100 rounded-xl px-3.5 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 transition-all cursor-pointer"
                                                        value={editingSession.room}
                                                        onChange={e => setEditingSession({...editingSession, room: e.target.value})}
                                                    >
                                                        <option value="">{language === 'ar' ? 'اختر القاعة الأكاديمية...' : 'Select Room...'}</option>
                                                        {rooms.map(r => (
                                                            <option key={r.id} value={r.name} disabled={!r.isAvailable}>
                                                                {r.name} ({language === 'ar' ? `سعة: ${r.capacity} مقعد` : `Cap: ${r.capacity} seats`}{!r.isAvailable ? ` | ${language === 'ar' ? 'صيانة ومغلق' : 'Maintenance/Unavailable'}` : ''})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Weekday Indicator */}
                                                <div>
                                                    <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">{language === 'ar' ? 'الأيام الدراسية' : 'Lecture Weekday'}</label>
                                                    <select 
                                                        required
                                                        className="w-full border border-slate-100 rounded-xl px-3.5 py-2.5 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 transition-all cursor-pointer"
                                                        value={editingSession.day}
                                                        onChange={e => setEditingSession({...editingSession, day: e.target.value as DayOfWeek})}
                                                    >
                                                        {([ 'SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY' ] as DayOfWeek[]).map(dayVal => (
                                                            <option key={dayVal} value={dayVal}>{getDayLabel(dayVal)}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {/* Timestamps */}
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">{language === 'ar' ? 'البدء' : 'Start Time'}</label>
                                                        <input 
                                                            required
                                                            type="time" 
                                                            className="w-full border border-slate-100 rounded-xl px-3.5 py-2 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 transition-all"
                                                            value={editingSession.startTime || ''}
                                                            onChange={e => setEditingSession({...editingSession, startTime: e.target.value})}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">{language === 'ar' ? 'المدة' : 'Duration'}</label>
                                                        <select 
                                                            className="w-full border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 transition-all cursor-pointer"
                                                            value={sessionDuration}
                                                            onChange={e => setSessionDuration(Number(e.target.value))}
                                                        >
                                                            <option value={60}>{language === 'ar' ? 'ساعة' : '60 Min'}</option>
                                                            <option value={90}>{language === 'ar' ? 'ساعة ونصف' : '90 Min'}</option>
                                                            <option value={120}>{language === 'ar' ? 'ساعتان' : '120 Min'}</option>
                                                            <option value={150}>{language === 'ar' ? 'ساعتان ونصف' : '150 Min'}</option>
                                                            <option value={180}>{language === 'ar' ? '3 ساعات' : '180 Min'}</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[8px] font-black text-slate-400 uppercase mb-2 tracking-widest">{language === 'ar' ? 'الانتهاء المقدر' : 'End Time'}</label>
                                                        <div className="w-full border border-slate-100 rounded-xl px-3 py-2 text-[11px] font-black bg-slate-100 text-slate-400 text-center">
                                                            {simulatedEndTime}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Live real-time analysis alert badge */}
                                                {liveConflict && (
                                                    <div className={cn(
                                                        "p-4 rounded-2xl border flex gap-3 items-start shadow-inner transition-all duration-300",
                                                        !liveConflict.hasConflict 
                                                            ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                                                            : liveConflict.conflictingType === 'CAPACITY' 
                                                                ? "bg-amber-50 text-amber-800 border-amber-100" 
                                                                : "bg-red-50 text-red-800 border-red-100"
                                                    )}>
                                                        {(!liveConflict.hasConflict) ? (
                                                            <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                                                        ) : (
                                                            <AlertCircle size={16} className={cn("shrink-0 mt-0.5", liveConflict.conflictingType === 'CAPACITY' ? 'text-amber-600' : 'text-red-500')} />
                                                        )}
                                                        <div className="text-[10px] font-bold leading-normal">
                                                            <p className="font-extrabold mb-0.5">
                                                                {(!liveConflict.hasConflict) 
                                                                    ? (language === 'ar' ? '✓ الموعد متاح بالكامل' : '✓ Slot Available') 
                                                                    : liveConflict.conflictingType === 'CAPACITY' 
                                                                        ? (language === 'ar' ? '⚠️ تنبيه السعة الاستيعابية' : '⚠️ Capacity Alert') 
                                                                        : (language === 'ar' ? '🚫 تعارض في الجدولة مكتشف' : '🚫 Schedule Conflict Detected')}
                                                            </p>
                                                            <p className="opacity-90">{liveConflict.message || (language === 'ar' ? 'القاعة والمدرس جاهزان للربط بالموعد المختار.' : 'Room and lecturer are fully clear for schedule mapping.')}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Call to action */}
                                                <div className="flex justify-end gap-2 pt-3 border-t border-slate-50">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditingSession(null)} 
                                                        className="px-5 py-2.5 text-[9px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                                                    >
                                                        {language === 'ar' ? 'إلغاء' : 'Abort'}
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        className="px-6 py-2.5 bg-slate-900 text-white hover:bg-indigo-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-1.5"
                                                    >
                                                        <Save size={12} />
                                                        {editingSession.id ? (language === 'ar' ? 'تعديل الجدول' : 'Commit Change') : (language === 'ar' ? 'حفظ الحصة' : 'Confirm Lecture')}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Drawer Footer */}
                            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button 
                                    onClick={() => { setShowScheduleDrawer(false); setEditingSession(null); }}
                                    className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-md"
                                >
                                    {language === 'ar' ? 'إغلاق نافذة التدقيق' : 'Dismiss Registry Panel'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                );
            })()}
        </div>
    );
};

export default CourseManagement;
