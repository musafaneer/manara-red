
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { getCourses, getRooms, getStudents, getSystemSettings, getStaff, saveSystemSettings, saveRoom, getDepartments } from '../services/storageService';
import { getExams, saveExam, deleteExam, checkExamConflict, generateSeatingPlan, findAvailableInvigilators, autoSuggestExamSlot } from '../services/scheduleService';
import { ExamSession, Course, Permission, Room, Student, SeatingAssignment, StaffMember, UserRole, Department } from '../types';
import { Calendar, Plus, Trash2, Clock, MapPin, AlertCircle, Save, X, Printer, LayoutGrid, Award, Search, Users, ShieldCheck, Info, Edit2, Building2, ChevronRight, ChevronLeft, Sparkles, Package as Box, Filter, ChevronDown } from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { getCurrentUser, hasPermission } from '../services/authService';
import SecurePrintWrapper from './ui/SecurePrintWrapper';
import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';

interface ExamScheduleProps {
    language?: Language;
}

const ExamSchedule: React.FC<ExamScheduleProps> = ({ language = 'ar' }) => {
    const [exams, setExams] = useState<ExamSession[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [academicStaff, setAcademicStaff] = useState<StaffMember[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterInvigilator, setFilterInvigilator] = useState<string>('ALL');
    const [filterDate, setFilterDate] = useState<string>('');
    const [filterDept, setFilterDept] = useState<string>('ALL');
    const [filterEnrollmentYear, setFilterEnrollmentYear] = useState<string>('ALL');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [courseSearch, setCourseSearch] = useState('');
    const [programFilter, setProgramFilter] = useState<'ALL' | 'UNDERGRADUATE' | 'POSTGRADUATE'>('ALL');
    const [semesterFilter, setSemesterFilter] = useState<number | 'ALL'>('ALL');
    const currentUser = getCurrentUser();
    const canManageExams = hasPermission(currentUser, Permission.EXAMS_MANAGE);
    const isStudent = currentUser?.role === UserRole.STUDENT;
    
    // UI State
    const [activeTab, setActiveTab] = useState<'SCHEDULE' | 'ROOMS' | 'STAFF' | 'CONFLICTS'>('SCHEDULE');
    const [viewType, setViewType] = useState<'LIST' | 'WEEKLY'>('LIST');
    const [weekStart, setWeekStart] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        // Start from Saturday
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 6 ? 0 : -day - 1); 
        return new Date(d.setDate(diff));
    });
    const [showModal, setShowModal] = useState(false);
    const [showSeatingModal, setShowSeatingModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState<ExamSession | null>(null);
    const [currentExam, setCurrentExam] = useState<Partial<ExamSession>>({
        sessionName: 'امتحانات الدور الأول - خريف 2024',
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        durationMinutes: 120,
        room: '',
        invigilators: []
    });

    const [conflictWarning, setConflictWarning] = useState<string | null>(null);

    useEffect(() => {
        refreshData();
    }, []);

    useEffect(() => {
        // Real-time conflict check
        if (showModal && currentExam.courseId && currentExam.room && currentExam.date && currentExam.startTime) {
            const course = courses.find(c => c.id === currentExam.courseId);
            const room = rooms.find(r => r.name === currentExam.room);
            const enrolled = getEnrolledStudents(currentExam.courseId);
            
            const tempExam: ExamSession = {
                id: currentExam.id || 'TEMP',
                courseId: currentExam.courseId,
                courseName: course?.name || '',
                date: currentExam.date,
                startTime: currentExam.startTime,
                durationMinutes: Number(currentExam.durationMinutes) || 120,
                room: currentExam.room,
                invigilators: currentExam.invigilators || [],
                seatingPlan: currentExam.seatingPlan || generateSeatingPlan(enrolled)
            };

            const conflict = checkExamConflict(tempExam, room?.capacity, enrolled.length, currentExam.id);
            if (conflict.hasConflict) {
                setConflictWarning(conflict.message || 'يوجد تعارض');
            } else {
                setConflictWarning(null);
            }
        } else {
            setConflictWarning(null);
        }
    }, [currentExam.date, currentExam.startTime, currentExam.room, currentExam.courseId, currentExam.invigilators, showModal]);

    const refreshData = () => {
        setExams(getExams());
        setCourses(getCourses());
        setAcademicStaff(getStaff().filter(s => s.type === 'ACADEMIC'));
        setRooms(getRooms());
        setDepartments(getDepartments());
    };

    const getEnrolledStudents = (courseId: string) => {
        const settings = getSystemSettings();
        return getStudents().filter(s => 
            s.enrollments?.some(e => e.courseId === courseId && e.semester === settings.currentSemester)
        );
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentExam.courseId || !currentExam.room || !currentExam.date) {
            notifyError('الرجاء تعبئة كافة الحقول المطلوبة');
            return;
        }

        const course = courses.find(c => c.id === currentExam.courseId);
        const room = rooms.find(r => r.name === currentExam.room);
        const enrolled = getEnrolledStudents(currentExam.courseId);

        // Auto-generate seating if it's a new exam or course changed
        let seating: SeatingAssignment[] = (currentExam as any).seatingPlan || generateSeatingPlan(enrolled);

        const newExam: ExamSession = {
            id: currentExam.id || `EXAM-${Date.now()}`,
            courseId: currentExam.courseId,
            courseName: course?.name || '',
            date: currentExam.date,
            startTime: currentExam.startTime || '09:00',
            durationMinutes: Number(currentExam.durationMinutes) || 120,
            room: currentExam.room,
            invigilators: currentExam.invigilators || [],
            seatingPlan: seating
        };

        const conflict = checkExamConflict(newExam, room?.capacity, enrolled.length, currentExam.id);
        if (conflict.hasConflict) {
            if (conflict.conflictingType === 'CAPACITY') {
                if (!confirm(`${conflict.message}\n\nهل تريد المتابعة وتجاهل تحذير السعة؟`)) return;
            } else {
                notifyError(conflict.message || 'يوجد تعارض في الجدول');
                return;
            }
        }

        saveExam(newExam);
        logAction('جدول الامتحانات', `تم ${currentExam.id ? 'تعديل' : 'جدولة'} امتحان مقرر "${newExam.courseName}"`, 'info', currentUser?.name);
        notifySuccess('تم حفظ موعد الامتحان بنجاح وتوزيع المقاعد آلياً');
        setShowModal(false);
        refreshData();
        resetForm();
    };

    const handleEdit = (exam: ExamSession) => {
        if (!canManageExams) return;
        setCurrentExam({
            id: exam.id,
            courseId: exam.courseId,
            date: exam.date,
            startTime: exam.startTime,
            durationMinutes: exam.durationMinutes,
            room: exam.room,
            invigilators: exam.invigilators,
            courseName: exam.courseName,
            seatingPlan: exam.seatingPlan
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setCurrentExam({ 
            date: new Date().toISOString().split('T')[0], 
            startTime: '09:00', 
            durationMinutes: 120, 
            room: '', 
            invigilators: [] 
        });
    };

    const handleDelete = (id: string) => {
        if (!canManageExams) return;
        if (confirm('هل أنت متأكد من حذف هذا الامتحان؟')) {
            const exam = exams.find(e => e.id === id);
            deleteExam(id);
            logAction('حذف امتحان', `تم حذف امتحان مقرر "${exam?.courseName}"`, 'danger', currentUser?.name);
            refreshData();
            notifyInfo('تم حذف الموعد');
        }
    };

    const filteredExams = exams.filter(e => {
        if (currentUser?.role === UserRole.STUDENT) {
            const student = getStudents().find(s => s.id === currentUser.id);
            return student?.enrollments?.some(en => en.courseId === e.courseId && en.semester === getSystemSettings().currentSemester);
        }
        
        const matchesSearch = e.courseName.includes(searchTerm) || 
                             e.courseId.includes(searchTerm) || 
                             e.room.includes(searchTerm);
        
        const matchesDate = !filterDate || e.date === filterDate;
        const matchesInvigilator = filterInvigilator === 'ALL' || e.invigilators.includes(filterInvigilator);
        
        const course = courses.find(c => c.id === e.courseId);
        const matchesDept = filterDept === 'ALL' || course?.deptId === filterDept;

        const matchesYear = filterEnrollmentYear === 'ALL' || (e.seatingPlan?.some(seat => {
            const student = getStudents().find(s => s.id === seat.studentId);
            return student?.enrollmentYear?.toString() === filterEnrollmentYear;
        }) || false);

        return matchesSearch && matchesDate && matchesInvigilator && matchesDept && matchesYear;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const enrollmentYears = Array.from(new Set(getStudents().map(s => s.enrollmentYear?.toString()))).filter(Boolean).sort();

    const groupedExams: Record<string, ExamSession[]> = {};
    filteredExams.forEach(exam => {
        if (!groupedExams[exam.date]) groupedExams[exam.date] = [];
        groupedExams[exam.date].push(exam);
    });

    if (currentUser?.role === UserRole.STUDENT) {
        return (
            <div className="p-8 space-y-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-2 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                            <Award size={28} />
                        </div>
                        جدول امتحاناتي
                    </h2>
                    <p className="text-slate-500 font-medium">مواعيد الامتحانات النهائية وتوزيع المقاعد (لائحة 501)</p>
                </div>

                <div className="bg-white rounded-[40px] shadow-sm border border-slate-200 overflow-hidden">
                    {Object.keys(groupedExams).length > 0 ? (
                        Object.entries(groupedExams).map(([date, dateExams]) => (
                            <div key={date} className="border-b border-slate-100 last:border-0">
                                <div className="bg-slate-50 px-8 py-4 font-black text-slate-800 flex items-center gap-3 border-b border-slate-100">
                                    <Calendar size={20} className="text-blue-600"/>
                                    <span>
                                        {new Date(date).toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {dateExams.map(exam => {
                                        const seatInfo = exam.seatingPlan?.find(s => s.studentId === currentUser.id);
                                        return (
                                            <div key={exam.id} className="p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                                <div className="flex items-center gap-8">
                                                    <div className="w-24 shrink-0 text-center border-l border-slate-100 ps-4">
                                                        <p className="text-2xl font-black text-slate-900 font-mono">{exam.startTime}</p>
                                                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">وقت البدء</p>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-xl font-black text-slate-900 mb-2">{exam.courseName}</h3>
                                                        <div className="flex flex-wrap gap-4">
                                                            <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-bold">
                                                                <Clock size={14}/>
                                                                <span>{exam.durationMinutes} دقيقة</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 bg-slate-50 text-slate-600 px-3 py-1 rounded-xl text-xs font-bold">
                                                                <MapPin size={14}/>
                                                                <span>{exam.room}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                
                                                {seatInfo && (
                                                    <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl flex items-center gap-6 min-w-[200px]">
                                                        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-black backdrop-blur-md">
                                                            {seatInfo.seatNumber}
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">رقم المقعد</p>
                                                            <p className="text-lg font-black">توزيع آلي</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="p-24 text-center text-slate-400">
                            <AlertCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p className="text-xl font-black">لا توجد امتحانات مجدولة لموادك حالياً</p>
                        </div>
                    )}
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-[32px] p-6 flex items-start gap-4">
                    <Info className="text-amber-600 shrink-0 mt-1" size={24} />
                    <div className="space-y-2">
                        <h4 className="font-black text-amber-900">تعليمات هامة للامتحانات (لائحة 501)</h4>
                        <ul className="text-sm text-amber-800 space-y-1 font-medium list-disc list-inside">
                            <li>يجب التواجد قبل موعد الامتحان بـ 15 دقيقة على الأقل.</li>
                            <li>يمنع منعاً باتاً إدخال الهواتف المحمولة أو الساعات الذكية إلى قاعة الامتحان.</li>
                            <li>يجب إبراز البطاقة الجامعية سارية المفعول عند الدخول.</li>
                            <li>الالتزام برقم المقعد المخصص لك والموضح في الجدول أعلاه.</li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    const filteredCourses = courses.filter(c => {
        const matchesSearch = c.name.includes(courseSearch) || c.code.toLowerCase().includes(courseSearch.toLowerCase());
        const matchesProgram = programFilter === 'ALL' || 
                             (programFilter === 'UNDERGRADUATE' && c.programType === 'جامعي') ||
                             (programFilter === 'POSTGRADUATE' && c.programType === 'دراسات عليا');
        const matchesSemester = semesterFilter === 'ALL' || c.semester === semesterFilter;
        return matchesSearch && matchesProgram && matchesSemester;
    }).sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="p-8">
            <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
                <div>
                    <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        <Award className="text-blue-600" size={20} />
                        إدارة الامتحانات واللجان
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold">تنظيم الفصائل، توزيع المقاعد، وتكليف المراقبين (لائحة 501)</p>
                </div>
                <div className="flex gap-4 items-center no-print">
                    <button 
                        onClick={() => {
                            const printEvent = new CustomEvent('trigger-secure-print-exam-schedule');
                            window.dispatchEvent(printEvent);
                        }}
                        className="bg-white text-slate-600 px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm font-bold text-sm border border-slate-200"
                    >
                        <Printer size={18} />
                        <span>طباعة الجدول</span>
                    </button>
                    {canManageExams && activeTab === 'SCHEDULE' && (
                        <button 
                            onClick={() => { resetForm(); setShowModal(true); }}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all shadow-sm font-bold text-sm"
                        >
                            <Plus size={18} />
                            <span>جدولة امتحان</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-1 mb-8 bg-slate-100 p-1.5 rounded-2xl w-fit no-print">
                <button 
                    onClick={() => setActiveTab('SCHEDULE')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                        activeTab === 'SCHEDULE' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Calendar size={18} />
                    جدول الامتحانات
                </button>
                <button 
                    onClick={() => setActiveTab('ROOMS')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                        activeTab === 'ROOMS' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <MapPin size={18} />
                    إدارة القاعات
                </button>
                <button 
                    onClick={() => setActiveTab('STAFF')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                        activeTab === 'STAFF' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Users size={18} />
                    مهام المراقبين
                </button>
                <button 
                    onClick={() => setActiveTab('CONFLICTS')}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2",
                        activeTab === 'CONFLICTS' ? "bg-white text-rose-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    <AlertCircle size={18} />
                    التعارضات المكتشفة
                </button>
            </div>

            {activeTab === 'SCHEDULE' && (
                <div className="space-y-6">
                    <div className="flex flex-col gap-4 no-print">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-3 flex-1 md:w-96">
                                <div className="relative flex-1">
                                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="بحث عن مقرر، كود، أو قاعة..."
                                        className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button 
                                    onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm font-bold",
                                        showAdvancedFilters ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                    )}
                                >
                                    <Filter size={18} />
                                    <span>تصفية متقدمة</span>
                                    <ChevronDown size={16} className={cn("transition-transform", showAdvancedFilters && "rotate-180")} />
                                </button>
                            </div>
                            
                            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 self-end md:self-auto">
                                <button 
                                    onClick={() => setViewType('LIST')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewType === 'LIST' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    عرض كجدول
                                </button>
                                <button 
                                    onClick={() => setViewType('WEEKLY')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                                        viewType === 'WEEKLY' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    عرض أسبوعي
                                </button>
                            </div>
                        </div>

                        {/* Enhanced Filter Panel */}
                        <AnimatePresence>
                            {showAdvancedFilters && (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="overflow-hidden bg-white border border-slate-200 rounded-2xl shadow-sm"
                                >
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">تصفية بالتاريخ</label>
                                            <input 
                                                type="date" 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={filterDate}
                                                onChange={e => setFilterDate(e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">تصفية بالمراقب</label>
                                            <select 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={filterInvigilator}
                                                onChange={e => setFilterInvigilator(e.target.value)}
                                            >
                                                <option value="ALL">جميع المراقبين</option>
                                                {academicStaff.map(staff => (
                                                    <option key={staff.id} value={staff.id}>{staff.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">تصفية بالقسم</label>
                                            <select 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={filterDept}
                                                onChange={e => setFilterDept(e.target.value)}
                                            >
                                                <option value="ALL">جميع الأقسام</option>
                                                {departments.map(dept => (
                                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">سنة الدفعة</label>
                                            <select 
                                                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={filterEnrollmentYear}
                                                onChange={e => setFilterEnrollmentYear(e.target.value)}
                                            >
                                                <option value="ALL">جميع الدفعات</option>
                                                {enrollmentYears.map(year => (
                                                    <option key={year} value={year}>{year}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                        <p className="text-[10px] font-bold text-slate-400">
                                            تم العثور على {filteredExams.length} امتحان مطابق للتصفية
                                        </p>
                                        <button 
                                            onClick={() => {
                                                setFilterDate('');
                                                setFilterInvigilator('ALL');
                                                setFilterDept('ALL');
                                                setFilterEnrollmentYear('ALL');
                                                setSearchTerm('');
                                            }}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                        >
                                            إعادة ضبط التصفية
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {viewType === 'WEEKLY' ? (
                        <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-300">
                            <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => {
                                            const d = new Date(weekStart);
                                            d.setDate(d.getDate() - 7);
                                            setWeekStart(d);
                                        }}
                                        className="p-2 hover:bg-slate-200 rounded-xl transition-all"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                    <div className="text-center min-w-[200px]">
                                        <p className="text-sm font-black text-slate-900">
                                            {weekStart.toLocaleDateString('ar-LY', { month: 'long', day: 'numeric' })} - {(() => {
                                                const end = new Date(weekStart);
                                                end.setDate(end.getDate() + 6);
                                                return end.toLocaleDateString('ar-LY', { month: 'long', day: 'numeric', year: 'numeric' });
                                            })()}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const d = new Date(weekStart);
                                            d.setDate(d.getDate() + 7);
                                            setWeekStart(d);
                                        }}
                                        className="p-2 hover:bg-slate-200 rounded-xl transition-all"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                </div>
                                <button 
                                    onClick={() => {
                                        const d = new Date();
                                        d.setHours(0,0,0,0);
                                        const day = d.getDay();
                                        const diff = d.getDate() - day + (day === 6 ? 0 : -day - 1); 
                                        setWeekStart(new Date(d.setDate(diff)));
                                    }}
                                    className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
                                >
                                    العودة لليوم
                                </button>
                            </div>

                            <div className="grid grid-cols-7 border-b border-slate-100 divide-x divide-x-reverse divide-slate-100">
                                {['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'].map((day, i) => {
                                    const d = new Date(weekStart);
                                    d.setDate(d.getDate() + i);
                                    const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                                    return (
                                        <div key={day} className={cn("p-4 text-center space-y-1", isToday && "bg-blue-50/30")}>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</p>
                                            <p className={cn("text-lg font-black", isToday ? "text-blue-600" : "text-slate-800")}>{d.getDate()}</p>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-7 divide-x divide-x-reverse divide-slate-100 min-h-[600px] bg-slate-50/30">
                                {[0, 1, 2, 3, 4, 5, 6].map(dayOffset => {
                                    const currentDate = new Date(weekStart);
                                    currentDate.setDate(currentDate.getDate() + dayOffset);
                                    const dateStr = currentDate.toISOString().split('T')[0];
                                    const dayExams = filteredExams.filter(e => e.date === dateStr);

                                    return (
                                        <div key={dayOffset} className="p-2 space-y-3 min-h-[200px]">
                                             {dayExams.map(exam => {
                                                 const roomInfo = rooms.find(r => r.name === exam.room);
                                                 const enrolledCount = exam.seatingPlan?.length || 0;
                                                 const conflict = checkExamConflict(exam, roomInfo?.capacity, enrolledCount, exam.id);
                                                 
                                                 return (
                                                     <motion.div 
                                                         layoutId={exam.id}
                                                         key={exam.id}
                                                         onClick={() => handleEdit(exam)}
                                                         className={cn(
                                                             "bg-white border-2 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden",
                                                             conflict.hasConflict ? "border-rose-400 bg-rose-50/20" : "border-slate-100"
                                                         )}
                                                     >
                                                         {conflict.hasConflict && (
                                                             <div className="absolute top-0 right-0 w-6 h-6 bg-rose-500 text-white flex items-center justify-center rounded-bl-xl shadow-sm z-10" title={conflict.message}>
                                                                 <AlertCircle size={12} className="animate-pulse" />
                                                             </div>
                                                         )}
                                                         <div className="flex justify-between items-start mb-2">
                                                             <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-600 uppercase tracking-tighter">
                                                                 <Clock size={10} />
                                                                 {exam.startTime}
                                                             </div>
                                                             <Edit2 size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                         </div>
                                                         <h4 className="text-xs font-black text-slate-800 leading-tight mb-2 line-clamp-2">{exam.courseName}</h4>
                                                         <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                                                             <MapPin size={10} className="text-rose-400" />
                                                             <span className="truncate">{exam.room}</span>
                                                         </div>
                                                         {conflict.hasConflict && (
                                                             <p className="mt-2 text-[8px] font-black text-rose-600 truncate uppercase tracking-tighter">
                                                                 {conflict.conflictingType === 'INVIGILATOR' ? 'Minding Conflict' : conflict.conflictingType === 'ROOM' ? 'Room Clash' : 'Conflict'}
                                                             </p>
                                                         )}
                                                     </motion.div>
                                                 );
                                             })}
                                            {dayExams.length === 0 && (
                                                <div className="h-full flex items-center justify-center border-2 border-dashed border-slate-100 rounded-[2rem] opacity-40">
                                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest -rotate-45">خالي</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <SecurePrintWrapper
                        documentId="exam-schedule-full"
                        documentType={language === 'ar' ? 'الجدول الزمني المعتمد للامتحانات' : 'Official Approved Exam Schedule'}
                        language={language}
                        triggerId="trigger-secure-print-exam-schedule"
                    >
                        <div className="bg-white rounded-[32px] shadow-sm border border-slate-200 overflow-hidden">
                            <div className="hidden print:block text-center border-b-4 border-double border-slate-800 pb-6 mb-8 pt-8 px-8">
                                <h1 className="text-3xl font-extrabold mb-2 underline underline-offset-8">الجدول الزمني المعتمد للامتحانات</h1>
                                <p className="text-lg font-bold">الفصل الدراسي: {getSystemSettings().currentSemester}</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">بيانات المقرر</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الزمان (تاريخ/وقت)</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">المكان</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">المقاعد</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">المراقبون</th>
                                            <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider no-print text-left">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredExams.map(exam => {
                                            const roomInfo = rooms.find(r => r.name === exam.room);
                                            const enrolledCount = exam.seatingPlan?.length || 0;
                                            const isOverCap = roomInfo && enrolledCount > roomInfo.capacity;
                                            const conflict = checkExamConflict(exam, roomInfo?.capacity, enrolledCount, exam.id);

                                            return (
                                                <tr key={exam.id} className={cn(
                                                    "hover:bg-slate-50/50 transition-colors group",
                                                    conflict.hasConflict && "bg-rose-50/30"
                                                )}>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-3">
                                                            {conflict.hasConflict && (
                                                                <div title={conflict.message}>
                                                                    <AlertCircle size={16} className="text-rose-500 animate-pulse" />
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col">
                                                                <span className="font-black text-slate-800">{exam.courseName}</span>
                                                                <span className="text-[10px] font-bold text-slate-400 font-mono">{exam.courseId}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                                                <Calendar size={14} className="text-blue-500" />
                                                                {new Date(exam.date).toLocaleDateString('ar-LY', { weekday: 'short', day: 'numeric', month: 'numeric' })}
                                                            </div>
                                                            <div className="flex items-center gap-2 text-xs font-black text-slate-900 font-mono">
                                                                <Clock size={14} className="text-amber-500" />
                                                                {exam.startTime} <span className="text-[10px] text-slate-400">({exam.durationMinutes} د)</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 font-bold">
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={14} className="text-rose-500" />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm">{exam.room}</span>
                                                                {roomInfo && (
                                                                    <span className={cn("text-[9px] px-1 rounded", isOverCap ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600")}>
                                                                        سعة: {roomInfo.capacity} طلاب
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                        <span className={cn(
                                                            "inline-flex items-center justify-center min-w-[2rem] h-8 px-2 rounded-full text-xs font-black border transition-all",
                                                            isOverCap 
                                                              ? "bg-rose-50 text-rose-600 border-rose-200 animate-bounce" 
                                                              : "bg-blue-50 text-blue-600 border-blue-100"
                                                        )}>
                                                            {enrolledCount}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-5 text-center">
                                                         <div className="flex justify-center -space-x-2">
                                                            {exam.invigilators.map((id, idx) => (
                                                                <div 
                                                                    key={id} 
                                                                    className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] font-black uppercase overflow-hidden"
                                                                    title={academicStaff.find(s => s.id === id)?.name || id}
                                                                >
                                                                    {academicStaff.find(s => s.id === id)?.name.substring(0, 2) || id.substring(0, 2)}
                                                                </div>
                                                            ))}
                                                            {exam.invigilators.length === 0 && <span className="text-[10px] text-slate-300 italic font-bold">لم يعين</span>}
                                                         </div>
                                                    </td>
                                                    <td className="px-6 py-5 no-print text-left">
                                                        <div className="flex items-center gap-1 justify-end">
                                                            {canManageExams && (
                                                                <button onClick={() => handleEdit(exam)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="تعديل">
                                                                    <Edit2 size={16} />
                                                                </button>
                                                            )}
                                                            <button onClick={() => { setSelectedExam(exam); setShowSeatingModal(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="المقاعد">
                                                                <LayoutGrid size={16} />
                                                            </button>
                                                            <button onClick={() => { setSelectedExam(exam); setShowTicketModal(true); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-all" title="التذاكر">
                                                                <Printer size={16} />
                                                            </button>
                                                            {canManageExams && (
                                                                <button onClick={() => handleDelete(exam.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="حذف">
                                                                    <Trash2 size={16} />
                                                                </button>
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
                    </SecurePrintWrapper>
                    )}
                </div>
            )}

            {activeTab === 'ROOMS' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    <div className="flex justify-between items-center bg-slate-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full -mr-32 -mt-32 opacity-10 blur-3xl" />
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between w-full gap-6">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                                    <Box size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black">{language === 'ar' ? 'إدارة الموارد المكانية' : 'Facility Asset Management'}</h3>
                                    <p className="text-white/60 font-bold text-sm">{language === 'ar' ? 'متابعة جاهزية القاعات وسعتها الاستيعابية للامتحانات' : 'Monitor hall readiness and cubic capacity for examinations'}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    const name = prompt(language === 'ar' ? 'اسم القاعة الجديدة:' : 'New Room Name:');
                                    if (!name) return;
                                    const capacity = prompt(language === 'ar' ? 'السعة الاستيعابية:' : 'Capacity:', '50');
                                    if (!capacity) return;
                                    
                                    const newRoom: Room = {
                                        id: `RM-${Date.now()}`,
                                        buildingId: 'BLD001', // Default building
                                        name: name,
                                        type: 'EXAM_HALL',
                                        capacity: parseInt(capacity) || 30,
                                        isAvailable: true,
                                        hasProjector: true,
                                        hasAC: true
                                    };
                                    saveRoom(newRoom);
                                    refreshData();
                                }}
                                className="bg-white text-slate-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all shadow-xl flex items-center gap-3"
                            >
                                <Plus size={18} />
                                {language === 'ar' ? 'إضافة قاعة' : 'Add Room'}
                            </button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.filter(r => r.type === 'EXAM_HALL' || r.type === 'LECTURE_HALL').map(room => {
                            const roomExams = exams.filter(e => e.room === room.name);
                            const currentDayExams = roomExams.filter(e => e.date === new Date().toISOString().split('T')[0]);
                            
                            return (
                                <div key={room.id} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[4rem] -mr-8 -mt-8 opacity-40 group-hover:bg-blue-100 transition-colors" />
                                    <div className="relative">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-white border border-slate-100 rounded-2xl shadow-sm text-blue-600">
                                                <MapPin size={24} />
                                            </div>
                                            <div className="flex flex-col items-end gap-2">
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest",
                                                    room.isAvailable ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                                                )}>
                                                    {room.isAvailable ? (language === 'ar' ? 'متاحة' : 'Available') : (language === 'ar' ? 'صيانة' : 'Maintenance')}
                                                </span>
                                                <button 
                                                    onClick={() => {
                                                        const updatedRoom = { ...room, isAvailable: !room.isAvailable };
                                                        saveRoom(updatedRoom);
                                                        refreshData();
                                                    }}
                                                    className="text-[9px] font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest"
                                                >
                                                    {language === 'ar' ? 'تغيير الحالة' : 'Toggle Status'}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-end mb-1">
                                            <h3 className="text-xl font-black text-slate-800">{room.name}</h3>
                                            <button 
                                                onClick={() => {
                                                    const newName = prompt(language === 'ar' ? 'الاسم الجديد للمكان:' : 'New Room Name:', room.name);
                                                    if (newName) {
                                                        const updatedRoom = { ...room, name: newName };
                                                        saveRoom(updatedRoom);
                                                        refreshData();
                                                    }
                                                }}
                                                className="text-slate-300 hover:text-slate-600 p-1"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-2 mb-6">
                                            <p className="text-xs text-slate-400 font-bold">{language === 'ar' ? 'السعة الاستيعابية:' : 'Cubic Capacity:'} {room.capacity} {language === 'ar' ? 'طالب' : 'Students'}</p>
                                            <button 
                                                onClick={() => {
                                                    const newCap = prompt(language === 'ar' ? 'السعة الاستيعابية الجديدة:' : 'New Cubic Capacity:', room.capacity.toString());
                                                    if (newCap) {
                                                        const updatedRoom = { ...room, capacity: parseInt(newCap) };
                                                        saveRoom(updatedRoom);
                                                        refreshData();
                                                    }
                                                }}
                                                className="text-slate-300 hover:text-slate-600 p-1"
                                            >
                                                <Edit2 size={14} />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="bg-slate-50 p-4 rounded-2xl">
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">{language === 'ar' ? 'إحصائيات الاستخدام' : 'Utilization Metrics'}</p>
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-2xl font-black text-slate-800">{roomExams.length}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'إجمالي الامتحانات' : 'Cumulative Exams'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-2xl font-black text-blue-600">{currentDayExams.length}</p>
                                                        <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'امتحانات اليوم' : 'Daily Load'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {roomExams.length > 0 && (
                                                <div>
                                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3">{language === 'ar' ? 'أقرب موعد' : 'Upcoming Instance'}</p>
                                                    <div className="text-xs font-bold text-slate-700 bg-white border border-slate-100 p-3 rounded-xl flex justify-between items-center group/item">
                                                        <span className="truncate max-w-[120px]">{roomExams[0].courseName}</span>
                                                        <span className="font-mono text-blue-600">{roomExams[0].date}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {activeTab === 'STAFF' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">المراقب</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">إجمالي الامتحانات</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">الجدول الزمني</th>
                                    <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-center">مؤشر الضغط</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {academicStaff.map(staff => {
                                    const staffExams = exams.filter(e => e.invigilators.includes(staff.id));
                                    const loadPercentage = Math.min((staffExams.length / 10) * 100, 100);
                                    
                                    return (
                                        <tr key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-bold">
                                                        {staff.name.substring(0, 1)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800">{staff.name}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{staff.deptId || 'بدون قسم'}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-xl font-black text-slate-900">{staffExams.length}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-wrap gap-1 max-w-sm">
                                                    {staffExams.slice(0, 3).map(e => (
                                                        <span key={e.id} className="text-[9px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg font-bold border border-blue-100">
                                                            {e.courseName} ({e.date})
                                                        </span>
                                                    ))}
                                                    {staffExams.length > 3 && <span className="text-[9px] text-slate-400 font-bold">+{staffExams.length - 3} أخرى</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 w-48">
                                                <div className="flex flex-col gap-2">
                                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                                        <div 
                                                            className={cn(
                                                                "h-full transition-all duration-1000",
                                                                loadPercentage > 80 ? "bg-rose-500" : loadPercentage > 50 ? "bg-amber-500" : "bg-emerald-500"
                                                            )}
                                                            style={{ width: `${loadPercentage}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest">
                                                        {loadPercentage > 80 ? 'ضغط مرتفع' : loadPercentage > 50 ? 'متوسط' : 'طبيعي'}
                                                    </span>
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

            {activeTab === 'CONFLICTS' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">تقرير تعارضات الجدول</h3>
                            <p className="text-sm text-slate-500 font-bold">فحص شامل لكافة التضاربات في القاعات، المراقبين، ومواعيد المقررات</p>
                        </div>
                        <div className="bg-rose-50 text-rose-600 px-6 py-2 rounded-2xl font-black text-sm border border-rose-100 flex items-center gap-2">
                            <AlertCircle size={18} />
                            <span>نظام التدقيق النشط</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {exams.map(exam => {
                            const room = rooms.find(r => r.name === exam.room);
                            const enrolled = getEnrolledStudents(exam.courseId);
                            const conflict = checkExamConflict(exam, room?.capacity, enrolled.length, exam.id);

                            if (!conflict.hasConflict) return null;

                            return (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={exam.id} 
                                    className="bg-white border-r-4 border-r-rose-500 border border-slate-200 p-6 rounded-2xl shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 group hover:shadow-md transition-all"
                                >
                                    <div className="flex items-start gap-6">
                                        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
                                            <AlertCircle size={32} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-black text-slate-900">{exam.courseName}</h4>
                                                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono font-bold tracking-tighter uppercase">{exam.id}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-4 text-xs font-bold text-slate-500">
                                                <span className="flex items-center gap-1"><Calendar size={14}/> {exam.date}</span>
                                                <span className="flex items-center gap-1"><Clock size={14}/> {exam.startTime}</span>
                                                <span className="flex items-center gap-1"><MapPin size={14}/> {exam.room}</span>
                                            </div>
                                            <p className="mt-3 text-sm font-black text-rose-600 bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">
                                                {conflict.message}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex flex-col md:flex-row gap-2 w-full md:w-auto">
                                        <button 
                                            onClick={() => {
                                                const suggestion = autoSuggestExamSlot(exam.id);
                                                if (suggestion) {
                                                    if (confirm(language === 'ar' 
                                                        ? `نقترح نقل الامتحان إلى يوم ${suggestion.date} الساعة ${suggestion.startTime} في ${suggestion.room}. هل ترغب في التطبيق؟`
                                                        : `Suggested: Move exam to ${suggestion.date} at ${suggestion.startTime} in ${suggestion.room}. Apply?`)) {
                                                        const updated = { ...exam, ...suggestion };
                                                        saveExam(updated);
                                                        setExams(getExams());
                                                        notifySuccess(language === 'ar' ? 'تم حل التعارض بنجاح' : 'Conflict resolved successfully');
                                                    }
                                                } else {
                                                    alert(language === 'ar' ? 'لم نجد حلاً للمقترح حالياً' : 'No suggestions found currently');
                                                }
                                            }}
                                            className="flex-1 md:flex-none border-2 border-brand-200 text-brand-700 px-6 py-3 rounded-xl font-black text-xs hover:bg-brand-50 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Sparkles size={16} />
                                            <span>{language === 'ar' ? 'مقترح الحل الذكي' : 'Smart Suggestion'}</span>
                                        </button>
                                        <button 
                                            onClick={() => handleEdit(exam)}
                                            className="flex-1 md:flex-none bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Edit2 size={16} />
                                            <span>تعديل الموعد</span>
                                        </button>
                                    </div>
                                </motion.div>
                            );
                        })}

                        {(() => {
                            const hasAnyConflict = exams.some(exam => {
                                const room = rooms.find(r => r.name === exam.room);
                                const enrolled = getEnrolledStudents(exam.courseId);
                                return checkExamConflict(exam, room?.capacity, enrolled.length, exam.id).hasConflict;
                            });

                            if (!hasAnyConflict) {
                                return (
                                    <div className="bg-white border border-slate-200 p-20 rounded-[40px] text-center space-y-4">
                                        <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <ShieldCheck size={48} />
                                        </div>
                                        <h4 className="text-2xl font-black text-slate-900">الجدول خالٍ من التعارضات</h4>
                                        <p className="text-slate-500 font-bold max-w-sm mx-auto">تم فحص كافة مواعيد الامتحانات، القاعات، والمراقبين ولم يتم العثور على أي تضاربات حالياً.</p>
                                    </div>
                                );
                            }
                            return null;
                        })()}
                    </div>
                </div>
            )}

            {/* Seating Plan Modal */}
            <AnimatePresence>
            {showSeatingModal && selectedExam && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden no-print"
                >
                    <div className="bg-white border-b border-slate-100 p-6 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <LayoutGrid size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">كشف توزيع الطلاب</h3>
                                <p className="text-[11px] text-slate-500 font-bold">{selectedExam.courseName}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowSeatingModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-50/50 p-8">
                        <div className="max-w-5xl mx-auto">
                            <SecurePrintWrapper
                                documentType={language === 'ar' ? 'كشف توزيع مقاعد الطلاب' : 'Student Seating Assignment'}
                                documentId={`SEAT-${selectedExam.id}`}
                                language={language}
                            >
                                <div className="py-10 space-y-10">
                                    <div className="bg-white rounded-[40px] border border-slate-200 p-10 shadow-sm">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 pb-10 border-b border-slate-100">
                                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{language === 'ar' ? 'القاعة' : 'Hall/Room'}</p><p className="font-black text-slate-900 text-lg">{selectedExam.room}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{language === 'ar' ? 'التاريخ' : 'Date'}</p><p className="font-black text-slate-900 text-lg">{selectedExam.date}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{language === 'ar' ? 'المادة' : 'Course'}</p><p className="font-black text-slate-900 text-lg truncate">{selectedExam.courseName}</p></div>
                                            <div><p className="text-[10px] text-slate-400 font-black uppercase mb-1 tracking-widest">{language === 'ar' ? 'إجمالي الطلاب' : 'Total Students'}</p><p className="font-black text-slate-900 text-lg">{selectedExam.seatingPlan?.length || 0}</p></div>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                            {selectedExam.seatingPlan?.map(seat => (
                                                <div key={seat.studentId} className="flex items-center gap-4 p-5 bg-white rounded-3xl border border-slate-100 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/5 transition-all group">
                                                    <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-xl font-black shadow-lg group-hover:scale-110 transition-transform">
                                                        {seat.seatNumber}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <p className="text-sm font-black text-slate-900 truncate leading-tight mb-1">{seat.studentName}</p>
                                                        <p className="text-[10px] text-slate-400 font-black font-mono tracking-tighter uppercase">{seat.studentId}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100 flex gap-4">
                                        <Info className="text-amber-600 shrink-0" size={24} />
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Instructions for Invigilators:</p>
                                            <p className="text-sm text-amber-800 leading-relaxed font-bold italic">
                                                Please verify student identities against the seating plan above. Any discrepancies must be reported to the Exam Control Office immediately. Ensure students sit according to their assigned seat numbers.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </SecurePrintWrapper>
                        </div>
                    </div>
                    <div className="p-6 bg-white border-t border-slate-100 flex justify-end gap-4 shrink-0">
                         <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10">
                            <Printer size={18}/> 
                            <span>طباعة الكشوفات</span>
                         </button>
                         <button onClick={() => setShowSeatingModal(false)} className="px-8 py-3 bg-slate-100 text-slate-600 rounded-2xl font-black hover:bg-slate-200 transition-all">إغلاق</button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Hall Ticket Modal */}
            <AnimatePresence>
            {showTicketModal && selectedExam && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-white z-[100] flex flex-col overflow-hidden no-print"
                >
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <Printer size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">كروت تكليف المراقبة</h3>
                                <p className="text-[11px] text-slate-500 font-bold">Hall Tickets Generation</p>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => window.print()} className="bg-blue-600 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-blue-700 transition-all font-black shadow-lg shadow-blue-500/20">
                                <Printer size={18} /> طباعة الكل
                            </button>
                            <button onClick={() => setShowTicketModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                                <X size={24} className="text-slate-400" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8 print-area">
                        <div className="max-w-4xl mx-auto space-y-8">
                            {selectedExam.invigilators.map(staffId => {
                                const staff = academicStaff.find(s => s.id === staffId);
                                return (
                                    <div key={staffId} className="break-after-page last:break-after-auto">
                                        <SecurePrintWrapper
                                            documentType={language === 'ar' ? 'بطاقة تكليف بمهمة مراقبة' : 'Exam Invigilation Order'}
                                            documentId={`INV-${staffId}-${selectedExam.id}`}
                                            language={language}
                                        >
                                            <div className="bg-white rounded-[40px] border border-slate-200 p-12 shadow-sm relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                                                
                                                <div className="relative space-y-12">
                                                    <div className="flex justify-between items-start">
                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{language === 'ar' ? 'اسم المراقب' : 'Invigilator Name'}</p>
                                                                <p className="text-3xl font-black text-slate-900 italic">{staff?.name || staffId}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{language === 'ar' ? 'القسم الأكاديمي' : 'Department'}</p>
                                                                <p className="text-lg font-bold text-slate-600">{staff?.deptId || 'Academic Faculty'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="bg-slate-900 text-white p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-1 min-w-[140px]">
                                                            <div className="text-[9px] font-black uppercase opacity-60 tracking-[0.3em]">Committee</div>
                                                            <div className="text-4xl font-black italic tracking-tighter">#{selectedExam.id.split('-')[1] || '72'}</div>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-10 bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                                                        <div className="space-y-6">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{language === 'ar' ? 'المقرر الدراسي' : 'Examination Course'}</p>
                                                                <p className="text-xl font-black text-slate-800">{selectedExam.courseName}</p>
                                                                <p className="text-[11px] font-mono font-bold text-slate-400 mt-1 uppercase tracking-tighter">{selectedExam.courseId}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{language === 'ar' ? 'مكان الامتحان' : 'Examination Hall'}</p>
                                                                <p className="text-2xl font-black text-blue-600">{selectedExam.room}</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-6 text-left">
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{language === 'ar' ? 'تاريخ الامتحان' : 'Schedule Date'}</p>
                                                                <p className="text-xl font-black text-slate-800 font-mono italic">{selectedExam.date}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{language === 'ar' ? 'وقت البدء' : 'Call Time'}</p>
                                                                <p className="text-2xl font-black text-rose-600 font-mono italic">{selectedExam.startTime}</p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <ShieldCheck size={16} className="text-blue-600" />
                                                            {language === 'ar' ? 'إقرار ومسؤولية' : 'Assignment Declaration'}
                                                        </h4>
                                                        <p className="text-xs text-slate-600 leading-relaxed font-bold italic bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm">
                                                            {language === 'ar' 
                                                                ? 'بموجب هذا التكليف، يقر المراقب المذكور أعلاه بمسؤوليته الكاملة عن سير عملية الامتحانات في القاعة المحددة والالتزام التام بكافة اللوائح والضوابط المعمول بها في جامعة أوراكل كامبس.'
                                                                : 'By this assignment, the aforementioned invigilator acknowledges full responsibility for the conduct of the examination in the specified hall and strict adherence to all regulations and controls in force at Oracle Campus University.'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </SecurePrintWrapper>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>

            {/* Add Exam Modal - Full Screen Style */}
            <AnimatePresence>
            {showModal && (
                <motion.div 
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed inset-0 bg-white z-[120] flex flex-col overflow-hidden no-print"
                >
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900">
                                    {currentExam.id ? 'تعديل بيانات الامتحان' : 'جدولة امتحان جديد'}
                                </h3>
                                <p className="text-[11px] text-slate-500 font-bold">Exam Session Configuration</p>
                            </div>
                        </div>
                        <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors">
                            <X size={24} className="text-slate-400" />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-12 bg-slate-50/50 text-right" dir="rtl">
                        <form onSubmit={handleSave} className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-6">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <Info size={14} className="text-blue-500" />
                                        المعلومات الأساسية
                                    </h4>
                                    
                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">اسم الجلسة</label>
                                        <input 
                                            type="text"
                                            className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold text-slate-800"
                                            placeholder="مثلاً: امتحانات خريف 2024"
                                            value={currentExam.sessionName || ''}
                                            onChange={e => setCurrentExam({...currentExam, sessionName: e.target.value})}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">المقرر الدراسي</label>
                                        <div className="space-y-4">
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="بحث بالكود أو الاسم..."
                                                        className="w-full pr-12 pl-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold"
                                                        value={courseSearch}
                                                        onChange={e => setCourseSearch(e.target.value)}
                                                    />
                                                </div>
                                            </div>

                                            <div className="max-h-56 overflow-y-auto border-2 border-slate-100 rounded-[2.5rem] bg-white p-3 space-y-1.5 no-scrollbar">
                                                {filteredCourses.length > 0 ? (
                                                    filteredCourses.map(c => (
                                                        <div 
                                                            key={c.id}
                                                            onClick={() => setCurrentExam({...currentExam, courseId: c.id})}
                                                            className={cn(
                                                                "p-4 rounded-[1.8rem] cursor-pointer transition-all border-2 flex items-center justify-between",
                                                                currentExam.courseId === c.id 
                                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                                                                    : 'bg-white border-transparent hover:bg-slate-50 text-slate-700'
                                                            )}
                                                        >
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black">{c.name}</span>
                                                                <span className={cn("text-[10px] font-bold mt-0.5", currentExam.courseId === c.id ? 'text-blue-100' : 'text-slate-400')}>
                                                                    {c.code} | {c.programType}
                                                                </span>
                                                            </div>
                                                            {currentExam.courseId === c.id && <ShieldCheck size={18} />}
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-12 text-center text-slate-300 font-bold text-xs italic">لا توجد نتائج</div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {conflictWarning && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-rose-50 border border-rose-100 p-6 rounded-[32px] flex items-start gap-4 shadow-sm"
                                    >
                                        <AlertCircle className="text-rose-500 shrink-0 mt-1" size={24} />
                                        <div className="space-y-1">
                                            <p className="text-[11px] font-black text-rose-900 uppercase tracking-widest">تنبيه تعارض محتمل</p>
                                            <p className="text-sm text-rose-700 font-bold leading-relaxed">{conflictWarning}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            <div className="space-y-8">
                                <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm space-y-8">
                                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                                        <Clock size={14} className="text-amber-500" />
                                        الزمان والمكان
                                    </h4>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">تاريخ الامتحان</label>
                                            <input 
                                                required
                                                type="date"
                                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold"
                                                value={currentExam.date}
                                                onChange={e => setCurrentExam({...currentExam, date: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">وقت البدء</label>
                                            <input 
                                                required
                                                type="time"
                                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-mono font-bold"
                                                value={currentExam.startTime}
                                                onChange={e => setCurrentExam({...currentExam, startTime: e.target.value})}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">المدة (بالدقيقة)</label>
                                            <input 
                                                required
                                                type="number"
                                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                                value={currentExam.durationMinutes}
                                                onChange={e => setCurrentExam({...currentExam, durationMinutes: parseInt(e.target.value)})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2">القاعة الامتحانية</label>
                                            <select 
                                                required
                                                className="w-full border-2 border-slate-100 bg-slate-50 rounded-2xl px-5 py-4 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all font-bold"
                                                value={currentExam.room}
                                                onChange={e => setCurrentExam({...currentExam, room: e.target.value})}
                                            >
                                                <option value="">اختر القاعة...</option>
                                                {rooms.map(r => (
                                                    <option key={r.id} value={r.name} disabled={!r.isAvailable}>
                                                        {r.name} ({r.isAvailable ? `سعة ${r.capacity}` : 'صيانة'})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-[11px] font-black text-slate-500 uppercase tracking-widest">تكليف المراقبين</label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    if (!currentExam.date || !currentExam.startTime) {
                                                        notifyError('الرجاء اختيار التاريخ والوقت أولاً');
                                                        return;
                                                    }
                                                    const suggested = findAvailableInvigilators(
                                                        currentExam.date, 
                                                        currentExam.startTime, 
                                                        Number(currentExam.durationMinutes) || 120, 
                                                        2
                                                    );
                                                    if (suggested.length > 0) {
                                                        setCurrentExam({...currentExam, invigilators: suggested});
                                                        notifySuccess(`تم اقتراح ${suggested.length} من المراقبين المتاحين`);
                                                    } else {
                                                        notifyInfo('لا يوجد مراقبين متاحين في هذا الوقت');
                                                    }
                                                }}
                                                className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline"
                                            >
                                                <Sparkles size={12} />
                                                اقتراح مراقبين متاحين
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto p-2 border-2 border-slate-50 rounded-3xl no-scrollbar">
                                            {academicStaff.map(s => {
                                                const isSelected = currentExam.invigilators?.includes(s.id);
                                                return (
                                                    <div 
                                                        key={s.id}
                                                        onClick={() => {
                                                            const current = currentExam.invigilators || [];
                                                            const next = isSelected ? current.filter(id => id !== s.id) : [...current, s.id];
                                                            setCurrentExam({...currentExam, invigilators: next});
                                                        }}
                                                        className={cn(
                                                            "p-4 rounded-2xl cursor-pointer transition-all border flex items-center justify-between",
                                                            isSelected 
                                                                ? "bg-slate-900 border-slate-900 text-white" 
                                                                : "bg-white border-slate-100 hover:border-slate-300 text-slate-700"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px]", isSelected ? "bg-white/20" : "bg-slate-100")}>
                                                                {s.name.substring(0, 2)}
                                                            </div>
                                                            <span className="text-xs font-black">{s.name}</span>
                                                        </div>
                                                        {isSelected && <ShieldCheck size={16} />}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button 
                                        type="submit" 
                                        className="flex-1 py-5 bg-blue-600 text-white rounded-[32px] font-black text-lg hover:bg-blue-700 shadow-2xl shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                                    >
                                        <Save size={24} />
                                        <span>حفظ ومزامنة الجدول</span>
                                    </button>

                                    {currentExam.id && canManageExams && (
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                if (currentExam.id) {
                                                    handleDelete(currentExam.id);
                                                    setShowModal(false);
                                                }
                                            }}
                                            className="px-6 py-5 bg-red-50 text-red-600 rounded-[32px] font-black hover:bg-red-100 transition-all flex items-center gap-2"
                                            title="حذف الامتحان"
                                        >
                                            <Trash2 size={24} />
                                        </button>
                                    )}

                                    <button 
                                        type="button" 
                                        onClick={() => setShowModal(false)}
                                        className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[32px] font-black hover:bg-slate-200 transition-all"
                                    >
                                        إلغاء
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
};

export default ExamSchedule;
