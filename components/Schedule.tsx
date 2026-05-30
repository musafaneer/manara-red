
import React, { useState, useEffect } from 'react';
import { getCourses, getRooms, getBuildings, getDepartmentName, getStudents } from '../services/storageService';
import { getInstructors } from '../services/facultyService';
import { getSchedule, saveClassSession, deleteClassSession, checkScheduleConflict, getDayLabel, getAllConflicts, ConflictResult, getExams, saveExamSession } from '../services/scheduleService';
import { ClassSession, Course, Instructor, DayOfWeek, Permission, Room, UserRole, ExamSession } from '../types';
import { Calendar, Plus, Trash2, Clock, MapPin, AlertCircle, Save, X, User, Info, Edit2, ChevronRight, ChevronLeft, ShieldCheck, UserCheck } from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { logAction } from '../services/auditService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { Language } from '../services/i18nService';

interface ScheduleProps {
    language?: Language;
}

const Schedule: React.FC<ScheduleProps> = ({ language = 'ar' }) => {
    const [schedule, setSchedule] = useState<ClassSession[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [exams, setExams] = useState<ExamSession[]>([]);
    const [showExams, setShowExams] = useState(true);
    const [weekStart, setWeekStart] = useState<Date>(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        // Start from Saturday
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 6 ? 0 : -day - 1); 
        return new Date(d.setDate(diff));
    });
    const [conflicts, setConflicts] = useState<Record<string, ConflictResult[]>>({});
    const [modalConflict, setModalConflict] = useState<ConflictResult | null>(null);
    const currentUser = getCurrentUser();
    const canManageAcademics = hasPermission(currentUser, Permission.ACADEMICS_MANAGE);
    const isStudent = currentUser?.role === UserRole.STUDENT;
    const isFaculty = currentUser?.role === UserRole.FACULTY;
    
    const [viewMode, setViewMode] = useState<'MY' | 'ALL'>(isFaculty ? 'MY' : 'ALL');
    const [showModal, setShowModal] = useState(false);
    const [showExamModal, setShowExamModal] = useState(false);
    const [duration, setDuration] = useState<number>(120);
    const [currentSession, setCurrentSession] = useState<Partial<ClassSession>>({
        day: 'SUNDAY',
        startTime: '08:00',
        endTime: '10:00',
        room: ''
    });
    const [currentExam, setCurrentExam] = useState<Partial<ExamSession>>({});

    useEffect(() => {
        refreshData();
    }, []);

    // Calculate end time when start time or duration changes
    useEffect(() => {
        if (currentSession.startTime && duration) {
            const [h, m] = currentSession.startTime.split(':').map(Number);
            const totalMinutes = h * 60 + m + duration;
            const endH = Math.floor(totalMinutes / 60) % 24;
            const endM = totalMinutes % 60;
            const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
            setCurrentSession(prev => ({ ...prev, endTime: endTimeStr }));
        }
    }, [currentSession.startTime, duration]);

    const refreshData = () => {
        let allSchedule = getSchedule();
        let allExams = getExams();
        
        if (isStudent) {
            const student = getStudents().find(s => s.id === currentUser?.id);
            if (student) {
                const enrolledCourseIds = student.enrollments?.map(e => e.courseId) || [];
                allSchedule = allSchedule.filter(s => enrolledCourseIds.includes(s.courseId));
                allExams = allExams.filter(e => enrolledCourseIds.includes(e.courseId));
            } else {
                allSchedule = [];
                allExams = [];
            }
        } else if (isFaculty && viewMode === 'MY') {
            allSchedule = allSchedule.filter(s => s.instructorId === currentUser?.id);
            allExams = allExams.filter(e => e.invigilators.includes(currentUser?.id || ''));
        }
        
        setSchedule(allSchedule);
        setExams(allExams);
        setCourses(getCourses());
        setInstructors(getInstructors());
        setRooms(getRooms());
    };

    useEffect(() => {
        refreshData();
    }, [viewMode]);

    // Check for global conflicts
    useEffect(() => {
        if (schedule.length > 0 && rooms.length > 0) {
            const allConflicts = getAllConflicts(schedule, rooms);
            setConflicts(allConflicts);
        }
    }, [schedule, rooms]);

    // Check for modal conflicts in real-time
    useEffect(() => {
        if (showModal && currentSession.startTime && currentSession.endTime && currentSession.room && currentSession.day) {
            const conflict = checkScheduleConflict(
                {
                    ...currentSession,
                    startTime: currentSession.startTime,
                    endTime: currentSession.endTime,
                    day: currentSession.day,
                    room: currentSession.room,
                    id: currentSession.id || 'NEW',
                    courseId: currentSession.courseId || '',
                    courseName: '',
                    instructorId: currentSession.instructorId || '',
                    instructorName: ''
                } as any,
                currentSession.id,
                rooms
            );
            setModalConflict(conflict.hasConflict ? conflict : null);
        } else {
            setModalConflict(null);
        }
    }, [currentSession.startTime, currentSession.endTime, currentSession.room, currentSession.day, currentSession.instructorId, showModal, rooms]);

    const canManageSession = (session?: Partial<ClassSession>) => {
        return canManageAcademics;
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!currentSession.courseId || !currentSession.instructorId || !currentSession.room) {
            notifyError('الرجاء تعبئة كافة الحقول المطلوبة');
            return;
        }

        if (!canManageSession(currentSession)) {
            notifyError('ليس لديك صلاحية لتعديل هذا الموعد');
            return;
        }

        const course = courses.find(c => c.id === currentSession.courseId);
        const instructor = instructors.find(i => i.id === currentSession.instructorId);

        const newSession: ClassSession = {
            id: currentSession.id || `SES-${Date.now()}`,
            courseId: currentSession.courseId,
            courseName: course?.name || '',
            instructorId: currentSession.instructorId,
            instructorName: instructor?.name || '',
            day: currentSession.day as DayOfWeek,
            startTime: currentSession.startTime!,
            endTime: currentSession.endTime!,
            room: currentSession.room
        };

        // Conflict Check
        const conflict = checkScheduleConflict(newSession, currentSession.id, rooms);
        if (conflict.hasConflict) {
            notifyError(conflict.message || 'يوجد تعارض في الجدول');
            return;
        }

        saveClassSession(newSession);
        logAction('تحديث الجدول', `تم إضافة/تعديل موعد للمقرر ${newSession.courseName}`, 'info');
        notifySuccess('تم حفظ الموعد بنجاح');
        setShowModal(false);
        refreshData();
        setCurrentSession({ ...currentSession, id: undefined, courseId: '', instructorId: '' });
    };

    const handleDelete = (id: string, instructorId?: string) => {
        if (!canManageSession({ id, instructorId })) {
            notifyError('ليس لديك صلاحية لحذف هذا الموعد');
            return;
        }
        if (confirm('هل أنت متأكد من حذف هذا الموعد؟')) {
            deleteClassSession(id);
            refreshData();
            notifySuccess('تم الحذف');
        }
    };

    const days: DayOfWeek[] = ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY'];

    return (
        <div className="p-8">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" />
                        الجدول الدراسي
                    </h2>
                    <p className="text-slate-500 mt-1">إدارة المواعيد، القاعات، وتوزيع المحاضرات</p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setShowExams(!showExams)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${showExams ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <ShieldCheck size={14} />
                            {showExams ? 'إخفاء الامتحانات' : 'عرض الامتحانات'}
                        </button>
                    </div>

                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 items-center">
                        <button 
                            onClick={() => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() - 7);
                                setWeekStart(d);
                            }}
                            className="p-1 hover:bg-white rounded-lg transition-all"
                        >
                            <ChevronRight size={16} />
                        </button>
                        <span className="px-2 text-[10px] font-black text-slate-600 uppercase tracking-widest min-w-[120px] text-center">
                            {weekStart.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' })} - {(() => {
                                const end = new Date(weekStart);
                                end.setDate(end.getDate() + 6);
                                return end.toLocaleDateString('ar-LY', { month: 'short', day: 'numeric' });
                            })()}
                        </span>
                        <button 
                            onClick={() => {
                                const d = new Date(weekStart);
                                d.setDate(d.getDate() + 7);
                                setWeekStart(d);
                            }}
                            className="p-1 hover:bg-white rounded-lg transition-all"
                        >
                            <ChevronLeft size={16} />
                        </button>
                    </div>

                    {isFaculty && canManageAcademics && (
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button 
                                onClick={() => setViewMode('MY')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'MY' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                جدولي الشخصي
                            </button>
                            <button 
                                onClick={() => setViewMode('ALL')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${viewMode === 'ALL' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                جدول الكلية بالكامل
                            </button>
                        </div>
                    )}
                    
                    {canManageAcademics && (
                        <button 
                            onClick={() => { 
                                const initialSession: Partial<ClassSession> = { 
                                    day: 'SUNDAY', 
                                    startTime: '08:00', 
                                    endTime: '10:00', 
                                    room: '' 
                                };
                                setCurrentSession(initialSession); 
                                setShowModal(true); 
                            }}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm font-bold"
                        >
                            <Plus size={20} />
                            <span>إضافة محاضرة</span>
                        </button>
                    )}
                </div>
                {isStudent && (
                    <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                        <Info className="text-blue-600" size={18} />
                        <p className="text-xs text-blue-800 font-medium">هذا هو جدولك الشخصي بناءً على المواد المسجلة للفصل الحالي.</p>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                    <div className="p-4 font-bold text-slate-700 text-center border-l">اليوم</div>
                    <div className="col-span-6 p-4 font-bold text-slate-500 text-center text-sm">
                        المحاضرات المجدولة (08:00 صباحاً - 06:00 مساءً)
                    </div>
                </div>

                {days.map((day, dayIndex) => {
                    const daySessions = schedule
                        .filter(s => s.day === day)
                        .sort((a, b) => a.startTime.localeCompare(b.startTime));

                    const currentDate = new Date(weekStart);
                    currentDate.setDate(currentDate.getDate() + dayIndex);
                    const dateStr = currentDate.toISOString().split('T')[0];
                    const dayExams = showExams ? exams.filter(e => e.date === dateStr) : [];

                    return (
                        <div key={day} className="grid grid-cols-7 border-b border-slate-100 min-h-[120px] hover:bg-slate-50 transition-colors">
                            <div className="p-4 font-bold text-slate-700 border-l bg-slate-50/50 flex flex-col items-center justify-center space-y-1">
                                <span className="text-xs text-slate-400 font-black uppercase tracking-widest">{getDayLabel(day)}</span>
                                <span className="text-xl font-black text-slate-800">{currentDate.getDate()}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{currentDate.toLocaleDateString('ar-LY', { month: 'short' })}</span>
                            </div>
                            <div className="col-span-6 p-2 flex flex-wrap gap-3 items-center">
                                {/* Regular Sessions */}
                                {daySessions.map(session => {
                                    const sessionConflicts = conflicts[session.id] || [];
                                    const hasError = sessionConflicts.some(c => c.conflictingType === 'ROOM' || c.conflictingType === 'INSTRUCTOR');
                                    const isMaint = sessionConflicts.some(c => c.conflictingType === 'ROOM_UNAVAILABLE');

                                    return (
                                        <div key={session.id} className={`bg-white border border-l-4 rounded-lg p-3 shadow-sm hover:shadow-md transition-all w-64 group relative ${
                                            hasError ? 'border-red-500 border-l-red-600' : 
                                            isMaint ? 'border-amber-500 border-l-amber-600' : 
                                            'border-slate-200 border-l-blue-500'
                                        }`}>
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={session.courseName}>
                                                        {session.courseName}
                                                    </span>
                                                    {sessionConflicts.length > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] font-bold text-red-500">
                                                            <AlertCircle size={10} />
                                                            <span>تعارض مكتشف</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {canManageSession(session) && (
                                                <div className="flex gap-2">
                                                    {isFaculty && (
                                                        <button 
                                                            onClick={() => {
                                                                // Redirect to attendance with session info
                                                                window.location.hash = `#/attendance?courseId=${session.courseId}&date=${dateStr}`;
                                                                notifyInfo(language === 'ar' ? 'جاري الانتقال لوحدة الحضور...' : 'Navigating to Attendance module...');
                                                            }}
                                                            className="text-slate-300 hover:text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            title={language === 'ar' ? 'رصد الحضور' : 'Mark Attendance'}
                                                        >
                                                            <UserCheck size={14} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => {
                                                            setCurrentSession(session);
                                                            // Calculate duration for the form
                                                            const startM = session.startTime.split(':').map(Number);
                                                            const endM = session.endTime.split(':').map(Number);
                                                            const dur = (endM[0] * 60 + endM[1]) - (startM[0] * 60 + startM[1]);
                                                            setDuration(dur);
                                                            setShowModal(true);
                                                        }}
                                                        className="text-slate-300 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(session.id, session.instructorId)}
                                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-blue-500" />
                                                <span className="font-mono">{session.startTime} - {session.endTime}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-red-500" />
                                                <span>{session.room}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <User size={12} className="text-purple-500" />
                                                <span className="truncate">{session.instructorName}</span>
                                            </div>
                                        </div>
                                        {sessionConflicts.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
                                                {sessionConflicts.map((c, idx) => (
                                                    <p key={idx} className="text-[9px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded flex items-center gap-1">
                                                        <AlertCircle size={8} />
                                                        {c.message}
                                                    </p>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )})}

                                {/* Exam Sessions */}
                                {dayExams.map(exam => (
                                    <div key={exam.id} className="bg-rose-50 border border-rose-200 border-l-4 border-l-rose-600 rounded-lg p-3 shadow-sm hover:shadow-md transition-all w-64 group relative">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">امتحان</span>
                                                <span className="font-bold text-slate-800 text-sm truncate max-w-[150px]" title={exam.courseName}>
                                                    {exam.courseName}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        setCurrentExam(exam);
                                                        setShowExamModal(true);
                                                    }}
                                                    className="text-rose-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-1 text-xs text-slate-500">
                                            <div className="flex items-center gap-1.5 font-bold">
                                                <Clock size={12} className="text-amber-600" />
                                                <span>{exam.startTime}</span>
                                                <span className="text-[10px] text-slate-400">({exam.durationMinutes} د)</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-rose-400" />
                                                <span>{exam.room}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {daySessions.length === 0 && dayExams.length === 0 && (
                                    <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm italic">
                                        لا توجد مواعيد مجدولة لهذا اليوم
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <Clock size={20} />
                                إضافة موعد جديد
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-5">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">المقرر الدراسي</label>
                                                <select 
                                                    required
                                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                                    value={currentSession.courseId}
                                                    onChange={e => setCurrentSession({...currentSession, courseId: e.target.value})}
                                                >
                                                    <option value="">اختر المقرر...</option>
                                                    {courses.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">عضو هيئة التدريس</label>
                                                <select 
                                                    required
                                                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                                    value={currentSession.instructorId}
                                                    onChange={e => setCurrentSession({...currentSession, instructorId: e.target.value})}
                                                >
                                                    <option value="">اختر المدرس...</option>
                                                    {instructors.map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} - {getDepartmentName(i.departmentId)}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
 
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">اليوم</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                        value={currentSession.day}
                                        onChange={e => setCurrentSession({...currentSession, day: e.target.value as DayOfWeek})}
                                    >
                                        {days.map(d => (
                                            <option key={d} value={d}>{getDayLabel(d)}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">القاعة / المعمل</label>
                                    <select 
                                        required
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                        value={currentSession.room}
                                        onChange={e => setCurrentSession({...currentSession, room: e.target.value})}
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
 
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">وقت البدء</label>
                                    <input 
                                        required
                                        type="time" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                        value={currentSession.startTime}
                                        onChange={e => setCurrentSession({...currentSession, startTime: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">المدة (دقيقة)</label>
                                    <select 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50 transition-all"
                                        value={duration}
                                        onChange={e => setDuration(Number(e.target.value))}
                                    >
                                        <option value={60}>60 دقيقة</option>
                                        <option value={90}>90 دقيقة</option>
                                        <option value={120}>120 دقيقة (ساعتان)</option>
                                        <option value={150}>150 دقيقة</option>
                                        <option value={180}>180 دقيقة (3 ساعات)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">وقت الانتهاء</label>
                                    <input 
                                        disabled
                                        type="time" 
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold bg-slate-100 text-slate-400 cursor-not-allowed"
                                        value={currentSession.endTime}
                                    />
                                </div>
                            </div>
 
                             {modalConflict && (
                                <div className={`p-4 rounded-2xl flex gap-3 items-start border ${
                                    modalConflict.conflictingType === 'ROOM_UNAVAILABLE' 
                                    ? 'bg-amber-50 text-amber-800 border-amber-100' 
                                    : 'bg-red-50 text-red-800 border-red-100'
                                }`}>
                                    <AlertCircle size={16} className={`shrink-0 ${
                                        modalConflict.conflictingType === 'ROOM_UNAVAILABLE' ? 'text-amber-600' : 'text-red-600'
                                    }`} />
                                    <div className="text-[10px] font-bold">
                                        <p className="mb-0.5">{modalConflict.message}</p>
                                        <p className="opacity-70">يرجى تعديل الوقت أو القاعة لتجنب التضارب.</p>
                                    </div>
                                </div>
                            )}

                            {!modalConflict && (
                                <div className="bg-blue-50 text-blue-800 text-[10px] font-bold p-4 rounded-2xl flex gap-3 items-start border border-blue-100">
                                    <AlertCircle size={16} className="shrink-0 text-blue-600" />
                                    سيقوم النظام بالتحقق الآلي من أي تضارب في مواعيد القاعة المختارة أو جدول المدرس قبل الاعتماد.
                                </div>
                            )}
 
                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-black text-slate-400 hover:text-slate-600">إلغاء</button>
                                <button type="submit" className="px-8 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                                    <Save size={18} /> {currentSession.id ? 'تحديث الموعد' : 'اعتماد وحفظ الموعد'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showExamModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="bg-rose-900 text-white p-4 flex justify-between items-center">
                            <h3 className="text-lg font-bold flex items-center gap-2">
                                <ShieldCheck size={20} />
                                تعديل بيانات الامتحان
                            </h3>
                            <button onClick={() => setShowExamModal(false)} className="text-rose-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (currentExam.id) {
                                    saveExamSession(currentExam as ExamSession);
                                    notifySuccess('تم تحديث موعد الامتحان بنجاح');
                                    setShowExamModal(false);
                                    refreshData();
                                }
                            }} 
                            className="p-6 space-y-5"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">المقرر الدراسي</label>
                                    <div className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500">
                                        {currentExam.courseName} ({currentExam.courseId})
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">التاريخ</label>
                                        <input 
                                            type="date"
                                            required
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 transition-all"
                                            value={currentExam.date}
                                            onChange={e => setCurrentExam({...currentExam, date: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">وقت البدء</label>
                                        <input 
                                            type="time"
                                            required
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 transition-all"
                                            value={currentExam.startTime}
                                            onChange={e => setCurrentExam({...currentExam, startTime: e.target.value})}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">المدة (دقيقة)</label>
                                        <input 
                                            type="number"
                                            required
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 transition-all"
                                            value={currentExam.durationMinutes}
                                            onChange={e => setCurrentExam({...currentExam, durationMinutes: Number(e.target.value)})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-rose-400 uppercase mb-2 tracking-widest">القاعة</label>
                                        <select 
                                            required
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none bg-slate-50 transition-all"
                                            value={currentExam.room}
                                            onChange={e => setCurrentExam({...currentExam, room: e.target.value})}
                                        >
                                            <option value="">اختر القاعة...</option>
                                            {rooms.map(r => (
                                                <option key={r.id} value={r.name}>{r.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t">
                                <button type="button" onClick={() => setShowExamModal(false)} className="px-5 py-2.5 text-sm font-black text-slate-400 hover:text-slate-600">إلغاء</button>
                                <button type="submit" className="px-8 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-black shadow-lg shadow-rose-200 hover:bg-rose-700 transition-all active:scale-95 flex items-center gap-2">
                                    <Save size={18} /> حفظ التعديلات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Schedule;
