
import React, { useState, useEffect } from 'react';
import { getStudents, getCourses, getSystemSettings, getRooms } from '../services/storageService';
import { getSchedule } from '../services/scheduleService';
import { Student, Course, Room, ClassSession, UserRole, Permission } from '../types';
import { Search, Trash2, ClipboardCheck, BookOpen, Calendar, Info, Users, Plus, CheckCircle } from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { registerCourse, dropCourse, approveRegistration, getEnrolledCount } from '../services/registrationService';

import { Language } from '../services/i18nService';
import { cn } from '../lib/utils';

const Registration: React.FC<{ language: Language }> = ({ language }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [schedule, setSchedule] = useState<ClassSession[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const settings = getSystemSettings();
    const currentUser = getCurrentUser();

    const canManage = hasPermission(currentUser, Permission.REGISTRATION_MANAGE);
    const canApprove = hasPermission(currentUser, Permission.ACADEMICS_APPROVE);

    const registrationStage = settings.calendarStages?.find(s => s.key === 'REGISTRATION');
    const isStageLocked = registrationStage && !registrationStage.isUnlocked;
    const isPastDeadline = (new Date() > new Date(settings.registrationDeadline)) || isStageLocked;

    useEffect(() => {
        refresh();
    }, []);

    useEffect(() => {
        if (currentUser?.role === UserRole.STUDENT) {
            const student = getStudents().find(s => s.id === currentUser.id);
            if (student) {
                setSelectedStudent(student);
            }
        }
    }, [currentUser]);

    const refresh = () => {
        setStudents(getStudents());
        setCourses(getCourses());
        setRooms(getRooms());
        setSchedule(getSchedule());
    };

    const getCourseRoomInfo = (courseId: string) => {
        const session = schedule.find(s => s.courseId === courseId);
        if (!session) return null;
        const room = rooms.find(r => r.name === session.room);
        return { room, session };
    };

    const handleRegisterCourse = (courseId: string) => {
        if (!selectedStudent) return;
        
        const result = registerCourse(selectedStudent.id, courseId, currentUser?.name || 'Unknown');
        
        if (result.success && result.student) {
            setSelectedStudent(result.student);
            refresh();
            notifySuccess(result.message);
        } else {
            notifyError(result.message);
        }
    };

    const handleRemoveEnrollment = (courseId: string) => {
        if (!selectedStudent) return;
        
        const result = dropCourse(selectedStudent.id, courseId, currentUser?.name || 'Unknown');
        
        if (result.success && result.student) {
            setSelectedStudent(result.student);
            refresh();
            notifySuccess(result.message);
        } else {
            notifyError(result.message);
        }
    };

    const handleApproveEnrollment = (courseId: string) => {
        if (!selectedStudent) return;
        
        const result = approveRegistration(selectedStudent.id, courseId, settings.currentSemester, currentUser?.name || 'Unknown');
        
        if (result.success && result.student) {
            setSelectedStudent(result.student);
            refresh();
            notifySuccess(result.message);
        } else {
            notifyError(result.message);
        }
    };

    const handleApproveAll = () => {
        if (!selectedStudent) return;
        
        const pendingEnrollments = selectedStudent.enrollments?.filter(
            e => e.semester === settings.currentSemester && e.status === 'PENDING_APPROVAL'
        ) || [];

        if (pendingEnrollments.length === 0) {
            notifyInfo('لا توجد مواد معلقة للاعتماد');
            return;
        }

        let successCount = 0;
        let lastStudent = selectedStudent;

        pendingEnrollments.forEach(e => {
            const result = approveRegistration(selectedStudent.id, e.courseId, settings.currentSemester, currentUser?.name || 'Unknown');
            if (result.success && result.student) {
                successCount++;
                lastStudent = result.student;
            }
        });

        if (successCount > 0) {
            setSelectedStudent(lastStudent);
            refresh();
            notifySuccess(`تم اعتماد ${successCount} مواد بنجاح`);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.includes(searchTerm) || s.id.includes(searchTerm)
    );

    return (
        <div className={cn("p-8 h-screen flex flex-col", language === 'ar' ? 'text-right' : 'text-left')} dir={language === 'ar' ? 'rtl' : 'ltr'}>
            <div className="mb-8 flex justify-between items-start">
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <ClipboardCheck className="text-blue-600" />
                        {language === 'ar' ? 'تنزيل المواد (التسجيل الفصلي)' : 'Course Enrollment'}
                    </h2>
                    <p className="text-slate-500 mt-1">
                        {language === 'ar' ? `إدارة تسجيل الطلاب في المقررات للفصل الحالي: ${settings.currentSemester}` : `Current semester course registration: ${settings.currentSemester}`}
                    </p>
                </div>
                <div className={`p-4 rounded-xl border flex items-center gap-3 ${isPastDeadline ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                    <Calendar size={20} />
                    <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                        <p className="text-[10px] font-bold uppercase opacity-60">
                            {language === 'ar' ? 'الموعد النهائي' : 'Deadline'}
                        </p>
                        <p className="font-bold">{settings.registrationDeadline}</p>
                    </div>
                    {isPastDeadline && <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase">
                        {language === 'ar' ? 'مغلق' : 'Closed'}
                    </span>}
                </div>
            </div>

            <div className="flex gap-6 flex-1 overflow-hidden">
                {currentUser?.role !== UserRole.STUDENT && (
                    <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                        <div className="p-4 border-b border-slate-200">
                            <div className="relative">
                                <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-3" : "left-3")} size={18} />
                                <input 
                                    type="text" 
                                    placeholder={language === 'ar' ? "بحث عن طالب..." : "Search student..."}
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className={cn("w-full py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none", language === 'ar' ? "pr-10 pl-4" : "pl-10 pr-4")}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto">
                            {filteredStudents.map(s => (
                                <div 
                                    key={s.id}
                                    onClick={() => setSelectedStudent(s)}
                                    className={cn("p-4 border-b cursor-pointer transition-colors", language === 'ar' ? "text-right" : "text-left", selectedStudent?.id === s.id ? 'bg-blue-50' : 'hover:bg-slate-50')}
                                >
                                    <p className="font-bold text-slate-800">{s.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{s.id} | {s.departmentId}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className={`${currentUser?.role === UserRole.STUDENT ? 'w-full' : 'w-2/3'} flex flex-col gap-6 overflow-hidden`}>
                    {selectedStudent ? (
                        <>
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-lg text-slate-800">
                                            {language === 'ar' ? 'المقررات المسجلة حالياً' : 'Currently Registered Courses'}
                                        </h3>
                                        {selectedStudent.enrollments?.some(e => e.semester === settings.currentSemester && e.status === 'PENDING_APPROVAL') && canApprove && (
                                            <button 
                                                onClick={handleApproveAll}
                                                className="bg-green-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase hover:bg-green-700 transition-colors flex items-center gap-1"
                                            >
                                                <CheckCircle size={12} />
                                                {language === 'ar' ? 'اعتماد الكل' : 'Approve All'}
                                            </button>
                                        )}
                                    </div>
                                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold">
                                        {selectedStudent.enrollments?.filter(e => e.semester === settings.currentSemester).length || 0} {language === 'ar' ? 'مواد' : 'Courses'}
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {selectedStudent.enrollments?.filter(e => e.semester === settings.currentSemester).map(e => {
                                        const course = courses.find(c => c.id === e.courseId);
                                        return (
                                            <div key={e.courseId} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white p-2 rounded border"><BookOpen size={16} className="text-blue-500"/></div>
                                                    <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                                                        <div className="flex items-center gap-2">
                                                            <p className="text-sm font-bold">{course?.name || e.courseId}</p>
                                                            {e.status === 'PENDING_APPROVAL' ? (
                                                                <span className="bg-amber-100 text-amber-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">قيد المراجعة</span>
                                                            ) : (
                                                                <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">معتمد</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-mono">{e.courseId}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {e.status === 'PENDING_APPROVAL' && canApprove && (
                                                        <button 
                                                            onClick={() => handleApproveEnrollment(e.courseId)}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors"
                                                            title={language === 'ar' ? 'اعتماد' : 'Approve'}
                                                        >
                                                            <CheckCircle size={16} />
                                                        </button>
                                                    )}
                                                    {(canManage || currentUser?.role === UserRole.STUDENT) && (
                                                        <button 
                                                            onClick={() => handleRemoveEnrollment(e.courseId)}
                                                            disabled={isPastDeadline}
                                                            className={`p-1.5 rounded-md transition-colors ${isPastDeadline ? 'text-slate-300 cursor-not-allowed' : 'text-red-400 hover:text-red-600 hover:bg-red-50'}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!selectedStudent.enrollments || selectedStudent.enrollments.filter(e => e.semester === settings.currentSemester).length === 0) && (
                                        <p className="text-center py-4 text-slate-400 text-sm italic">
                                            {language === 'ar' ? 'لا يوجد مواد مسجلة لهذا الفصل' : 'No courses registered for this semester'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
                                <h3 className="font-bold text-lg text-slate-800 mb-4">
                                    {language === 'ar' ? 'المقررات المتاحة للتسجيل' : 'Available Courses for Registration'}
                                </h3>
                                <div className="flex-1 overflow-auto space-y-2">
                                    {courses
                                        .filter(course => {
                                            // 1. Hide if registered in current semester
                                            const isRegisteredNow = selectedStudent.enrollments?.some(e => e.courseId === course.id && e.semester === settings.currentSemester);
                                            // 2. Hide if already has a grade (means passed or attempted and should be handled by repeat/transcript logic depending on policy)
                                            // According to Regulation 501, if they passed, they don't re-register.
                                            const hasGrade = selectedStudent.grades?.some(g => g.courseId === course.id && g.score >= settings.regulation.passingScore);
                                            
                                            return !isRegisteredNow && !hasGrade;
                                        })
                                        .map(course => {
                                            const enrolledCount = getEnrolledCount(course.id, settings.currentSemester);
                                        const roomInfo = getCourseRoomInfo(course.id);
                                        const isFull = roomInfo && roomInfo.room && enrolledCount >= roomInfo.room.capacity;

                                        return (
                                            <div key={course.id} className="flex justify-between items-center p-3 border border-slate-100 rounded-lg hover:border-blue-200 transition-colors group">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="text-sm font-bold text-slate-700">{course.name}</p>
                                                        {isFull && <span className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded font-bold">
                                                            {language === 'ar' ? 'مكتمل' : 'Full'}
                                                        </span>}
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-1 flex-wrap">
                                                        <span className="text-xs text-slate-400 font-mono">{course.code}</span>
                                                        <span className="text-xs text-slate-400 border-x px-4">
                                                            {course.credits} {language === 'ar' ? 'وحدات' : 'Credits'}
                                                        </span>
                                                        {course.prerequisites && course.prerequisites.length > 0 && (
                                                            <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-100">
                                                                <Info size={10} />
                                                                {language === 'ar' ? 'متطلب: ' : 'Prereq: '} {course.prerequisites.join(', ')}
                                                            </div>
                                                        )}
                                                        {roomInfo && (
                                                            <span className={`text-[10px] flex items-center gap-1 font-bold ${isFull ? 'text-red-500' : 'text-slate-400'}`}>
                                                                <Users size={12} /> {enrolledCount} / {roomInfo.room?.capacity || '∞'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleRegisterCourse(course.id)}
                                                    disabled={isPastDeadline || isFull || (!canManage && currentUser?.role !== UserRole.STUDENT)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${isPastDeadline || isFull || (!canManage && currentUser?.role !== UserRole.STUDENT) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200'}`}
                                                >
                                                    <Plus size={14} /> {language === 'ar' ? 'تسجيل' : 'Register'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 bg-white rounded-xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-400">
                            <ClipboardCheck size={64} className="mb-4 opacity-20" />
                            <p>{language === 'ar' ? 'اختر طالباً من القائمة للبدء في عملية التسجيل' : 'Select a student from the list to start enrollment'}</p>
                            <div className="mt-4 bg-slate-50 p-4 rounded-xl text-xs flex items-start gap-2 max-w-sm text-slate-500">
                                <Info size={16} className="shrink-0 text-blue-500" />
                                <p>
                                    {language === 'ar' ? 'يتم التحقق تلقائياً من توفر السعة الاستيعابية في القاعات المخصصة للمقررات قبل السماح بالتسجيل.' : 'Room capacity is automatically verified before allowing enrollment.'}
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Registration;
