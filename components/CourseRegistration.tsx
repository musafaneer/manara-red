import React, { useState, useEffect } from 'react';
import { getCourses, getStudents, getActiveRegistrationWindow, saveStudent } from '../services/storageService';
import { Course, Student, RegistrationWindow, UserRole } from '../types';
import { BookOpen, CheckCircle, Clock, AlertCircle, ShoppingCart, Search, Trash2, Info, ArrowRight } from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { getCurrentUser } from '../services/authService';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

interface CourseRegistrationProps {
    language: Language;
}

const CourseRegistration: React.FC<CourseRegistrationProps> = ({ language }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [student, setStudent] = useState<Student | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [regWindow, setRegWindow] = useState<RegistrationWindow | undefined>();
    const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [studentSearchTerm, setStudentSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState<'ALL' | 'CORE' | 'ELECTIVE' | 'GENERAL'>('ALL');
    
    const currentUser = getCurrentUser();
    const isAdmin = currentUser && (
        currentUser.role === UserRole.SUPER_ADMIN || 
        currentUser.role === UserRole.REGISTRATION_OFFICER ||
        currentUser.role === UserRole.DEAN ||
        currentUser.role === UserRole.DEPT_HEAD
    );

    const t = {
        title: language === 'ar' ? 'بوابة التسجيل الذاتي' : 'Self-Enrollment Portal',
        studentLabel: language === 'ar' ? 'الطالب' : 'Student',
        selectMsg: language === 'ar' ? 'اختيار المواد الدراسية للفصل الدراسي' : 'Select Academic Courses for the Term',
        noActiveWindow: language === 'ar' ? 'فترة التسجيل غير مفعلة حالياً' : 'Registration Window is currently closed',
        searchStudent: language === 'ar' ? 'بحث عن طالب...' : 'Search student...',
        closeDate: language === 'ar' ? 'تاريخ الإغلاق' : 'Closing Date',
        searchPlaceholder: language === 'ar' ? 'ابحث عن مادة برمزها أو اسمها...' : 'Search course by name or code...',
        all: language === 'ar' ? 'الكل' : 'All',
        core: language === 'ar' ? 'تخصص' : 'Core',
        elective: language === 'ar' ? 'اختياري' : 'Elective',
        hours: language === 'ar' ? 'ساعات' : 'Credits',
        noDesc: language === 'ar' ? 'لم يتم إدراج وصف لهذه المادة' : 'No description listed for this course',
        cartTitle: language === 'ar' ? 'سلة التسجيل' : 'Academic Cart',
        selectedCredits: language === 'ar' ? 'المجموع المختار' : 'Selected Credits',
        creditsLabel: language === 'ar' ? 'ساعة' : 'Credits',
        minCredits: language === 'ar' ? 'الحد الأدنى' : 'Minimum',
        maxCredits: language === 'ar' ? 'الحد الأقصى' : 'Maximum',
        cartEmpty: language === 'ar' ? 'السلة فارغة' : 'Your cart is empty',
        submitBtn: language === 'ar' ? 'اعتماد التسجيل' : 'Confirm & Submit Registration',
        notesTitle: language === 'ar' ? 'ملاحظات هامة للطلاب' : 'Important Student Guidelines',
        note1: language === 'ar' ? 'يجب الالتزام بالخطة الدراسية والقسم العلمي.' : 'Adhere to your department curriculum and study plan.',
        note2: language === 'ar' ? 'لا يمكن التسجيل في مادة بدون اجتياز متطلباتها السابقة.' : 'Prerequisites must be passed prior to core course enrollment.',
        note3: language === 'ar' ? 'التسجيل يعتبر أولياً حتى يتم اعتماده من المرشد الأكاديمي.' : 'Registrations are provisional pending Academic Advisor formal sign-off.',
        exceedMax: language === 'ar' ? 'لا يمكنك تجاوز الحد الأقصى للساعات المسموح بها' : 'You cannot exceed the maximum allowed credit hours',
        belowMin: language === 'ar' ? 'يجب تسجيل ساعات تفي بالحد الأدنى للوائح' : 'You must satisfy the minimum credit criteria under decree',
        submitSuccess: language === 'ar' ? 'تم إرسال المواد للتسجيل بنجاح. قيد المراجعة الإدارية.' : 'Requested courses submitted successfully. Awaiting advisor audit.',
        alreadyEnrolled: language === 'ar' ? 'أنت مسجل بالفعل في هذه المواد' : 'You are already registered for these courses',
        studentNotFound: language === 'ar' ? 'لم يتم العثور على بيانات الطالب' : 'Student profile not discovered',
        semesterLabel: language === 'ar' ? 'غير محدد' : 'Not Defined',
    };

    useEffect(() => {
        const allCourses = getCourses();
        const allStudents = getStudents();
        const activeWindow = getActiveRegistrationWindow();
        setRegWindow(activeWindow);
        setCourses(allCourses);
        setStudents(allStudents);

        if (currentUser?.role === UserRole.STUDENT) {
            const studentData = allStudents.find(s => s.id === currentUser.id);
            if (studentData) {
                setStudent(studentData);
            }
        }
    }, [currentUser]);

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) || s.id.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             course.code.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'ALL' || course.category === filterCategory;
        const isNotEnrolled = !student?.enrollments?.some(e => e.courseId === course.id);
        return matchesSearch && matchesCategory && isNotEnrolled;
    });

    const handleSelectCourse = (course: Course) => {
        if (selectedCourses.some(c => c.id === course.id)) {
            setSelectedCourses(selectedCourses.filter(c => c.id !== course.id));
        } else {
            const totalCredits = selectedCourses.reduce((acc, c) => acc + c.credits, 0) + course.credits;
            if (regWindow && totalCredits > regWindow.maxCredits) {
                notifyError(`${t.exceedMax} (${regWindow.maxCredits})`);
                return;
            }
            setSelectedCourses([...selectedCourses, course]);
        }
    };

    const handleSubmitRegistration = () => {
        if (!student) {
            notifyError(t.studentNotFound);
            return;
        }
        if (!regWindow) {
            notifyError(t.noActiveWindow);
            return;
        }
        
        const totalCredits = selectedCourses.reduce((acc, c) => acc + c.credits, 0);
        if (totalCredits < regWindow.minCredits) {
            notifyError(`${t.belowMin} (${regWindow.minCredits} ${t.creditsLabel})`);
            return;
        }

        const studentEnrollments = [...(student.enrollments || [])];
        let addedCount = 0;

        selectedCourses.forEach(course => {
            if (!studentEnrollments.some(e => e.courseId === course.id && e.semester === regWindow.semester)) {
                studentEnrollments.push({
                    courseId: course.id,
                    courseName: course.name,
                    semester: regWindow.semester,
                    status: 'PENDING_APPROVAL',
                    enrollmentDate: new Date().toISOString().split('T')[0],
                    paymentStatus: 'UNPAID'
                });
                addedCount++;
            }
        });

        if (addedCount > 0) {
            const updatedStudent = { ...student, enrollments: studentEnrollments };
            saveStudent(updatedStudent);
            setStudent(updatedStudent);
            
            notifySuccess(`${t.submitSuccess} Nom: ${addedCount}`);
            setSelectedCourses([]);
        } else {
            notifyInfo(t.alreadyEnrolled);
        }
    };

    const totalSelectedCredits = selectedCourses.reduce((acc, c) => acc + c.credits, 0);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex justify-between items-end bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t.title}</h1>
                    <p className="text-slate-500 mt-1">
                        {student ? `${t.studentLabel}: ${student.name} (${student.id})` : t.selectMsg} : {regWindow?.semester || t.semesterLabel}
                    </p>
                </div>
                <div className="flex gap-4">
                    {isAdmin && (
                         <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold" size={14} />
                            <input 
                                type="text"
                                placeholder={t.searchStudent}
                                className="pr-9 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none w-64"
                                value={studentSearchTerm}
                                onChange={e => setStudentSearchTerm(e.target.value)}
                            />
                            {studentSearchTerm && (
                                <div className="absolute top-full right-0 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-auto">
                                    {filteredStudents.map(s => (
                                        <button
                                            key={s.id}
                                            onClick={() => {
                                                setStudent(s);
                                                setStudentSearchTerm('');
                                            }}
                                            className="w-full text-right px-4 py-2 hover:bg-slate-50 text-xs font-bold border-b last:border-0"
                                        >
                                            {s.name} ({s.id})
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {regWindow && (
                        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 items-center flex gap-3">
                            <Clock className="text-blue-600" size={20} />
                            <div>
                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{t.closeDate}</p>
                                <p className="text-sm font-black text-blue-900">{new Date(regWindow.endDate).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}</p>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Courses Selection */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex gap-4 no-print">
                        <div className="relative flex-1">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder={t.searchPlaceholder}
                                className="w-full pr-10 pl-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all text-sm font-bold"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                            {['ALL', 'CORE', 'ELECTIVE'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCategory(cat as any)}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                        filterCategory === cat ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    {cat === 'ALL' ? t.all : cat === 'CORE' ? t.core : t.elective}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence>
                            {filteredCourses.map(course => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={course.id}
                                    onClick={() => handleSelectCourse(course)}
                                    className={cn(
                                        "p-5 rounded-[32px] border transition-all cursor-pointer relative overflow-hidden group",
                                        selectedCourses.some(c => c.id === course.id)
                                            ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-[1.02]"
                                            : "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
                                    )}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className={cn(
                                            "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                            selectedCourses.some(c => c.id === course.id) ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {course.code}
                                        </div>
                                        <div className="flex items-center gap-1 font-black text-xs">
                                            <Clock size={12} />
                                            {course.credits} {t.hours}
                                        </div>
                                    </div>
                                    <h3 className="font-black text-lg mb-1 leading-tight">{course.name}</h3>
                                    <p className={cn(
                                        "text-xs font-bold line-clamp-2",
                                        selectedCourses.some(c => c.id === course.id) ? "text-blue-100" : "text-slate-400"
                                    )}>
                                        {course.description || t.noDesc}
                                    </p>
                                    
                                    {selectedCourses.some(c => c.id === course.id) && (
                                        <div className="absolute -bottom-2 -left-2 opacity-10">
                                            <CheckCircle size={80} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Right: Registration Summary / Cart */}
                <div className="space-y-6">
                    <div className="sticky top-6 bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-6 bg-slate-900 border-b border-slate-800 text-white">
                            <div className="flex items-center gap-3">
                                <ShoppingCart size={24} className="text-blue-400" />
                                <h2 className="font-black text-xl tracking-tight">{t.cartTitle}</h2>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-3xl border border-dashed border-slate-200 space-y-3">
                                <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                                    <span>{t.selectedCredits}</span>
                                    <span className={cn(
                                        totalSelectedCredits > (regWindow?.maxCredits || 0) ? "text-rose-600" : "text-blue-600"
                                    )}>
                                        {totalSelectedCredits} / {regWindow?.maxCredits || 21} {t.creditsLabel}
                                    </span>
                                </div>
                                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <motion.div 
                                        className={cn(
                                            "h-full rounded-full transition-all duration-500",
                                            totalSelectedCredits > (regWindow?.maxCredits || 0) ? "bg-rose-500" : "bg-blue-600"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min((totalSelectedCredits / (regWindow?.maxCredits || 21)) * 100, 100)}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>{t.minCredits}: {regWindow?.minCredits || 12}</span>
                                    <span>{t.maxCredits}: {regWindow?.maxCredits || 21}</span>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {selectedCourses.length === 0 ? (
                                    <div className="text-center py-10 text-slate-300">
                                        <AlertCircle size={32} className="mx-auto mb-2 opacity-20" />
                                        <p className="text-xs font-black uppercase tracking-widest">{t.cartEmpty}</p>
                                    </div>
                                ) : (
                                    selectedCourses.map(course => (
                                        <motion.div 
                                            key={course.id}
                                            layout
                                            initial={{ x: 20, opacity: 0 }}
                                            animate={{ x: 0, opacity: 1 }}
                                            className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all shadow-sm"
                                        >
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 truncate max-w-[150px]">{course.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">{course.code} • {course.credits} {t.creditsLabel}</span>
                                            </div>
                                            <button 
                                                onClick={() => handleSelectCourse(course)}
                                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </motion.div>
                                    ))
                                )}
                            </div>

                            <button
                                onClick={handleSubmitRegistration}
                                disabled={selectedCourses.length === 0}
                                className={cn(
                                    "w-full py-4 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3",
                                    selectedCourses.length > 0
                                        ? "bg-slate-900 text-white hover:bg-black shadow-xl"
                                        : "bg-slate-100 text-slate-400 cursor-not-allowed"
                                )}
                            >
                                {t.submitBtn}
                                <ArrowRight size={18} className={language === 'ar' ? 'rotate-180' : ''} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100">
                        <div className="flex gap-4">
                            <Info className="text-rose-600 shrink-0" size={24} />
                            <div className="space-y-2">
                                <h4 className="font-black text-rose-900 text-sm">{t.notesTitle}</h4>
                                <ul className="text-xs font-bold text-rose-700/80 space-y-2 list-disc list-inside">
                                    <li>{t.note1}</li>
                                    <li>{t.note2}</li>
                                    <li>{t.note3}</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CourseRegistration;
