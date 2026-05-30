import React, { useState, useEffect } from 'react';
import { getCourses, getStudents, saveStudent } from '../services/storageService';
import { Course, Student, Grade, UserRole } from '../types';
import { BookOpen, Save, CheckCircle, Search, ArrowRight, ShieldCheck, Clock, AlertCircle, Users } from 'lucide-react';
import { notifySuccess, notifyError } from '../services/notificationService';
import { getCurrentUser } from '../services/authService';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { Language } from '../services/i18nService';

interface FacultyGradingProps {
    language: Language;
}

const FacultyGrading: React.FC<FacultyGradingProps> = ({ language }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [courseScores, setCourseScores] = useState<Record<string, { midterm?: number; final?: number }>>({});
    const [isSaving, setIsSaving] = useState(false);

    const currentUser = getCurrentUser();

    useEffect(() => {
        const allCourses = getCourses();
        if (currentUser?.role === UserRole.FACULTY) {
            setCourses(allCourses.filter(c => c.lecturerId === currentUser.id));
        } else if (currentUser?.role === UserRole.DEPT_HEAD || currentUser?.role === UserRole.REGISTRATION_OFFICER) {
            setCourses(allCourses);
        }
    }, [currentUser]);

    useEffect(() => {
        if (selectedCourse) {
            const enrolledStudents = getStudents().filter(s => 
                s.enrollments?.some(e => e.courseId === selectedCourse.id && e.status === 'REGISTERED')
            );
            setStudents(enrolledStudents);
            
            const initialScores: Record<string, { midterm?: number; final?: number }> = {};
            enrolledStudents.forEach(s => {
                const grade = s.grades?.find(g => g.courseId === selectedCourse.id);
                if (grade) {
                    initialScores[s.id] = {
                        midterm: grade.midtermScore,
                        final: grade.finalScore
                    };
                }
            });
            setCourseScores(initialScores);
        }
    }, [selectedCourse]);

    const handleScoreChange = (studentId: string, type: 'midterm' | 'final', value: string) => {
        const numValue = value === '' ? undefined : parseFloat(value);
        if (numValue !== undefined && (numValue < 0 || numValue > 100)) return;
        
        setCourseScores(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [type]: numValue
            }
        }));
    };

    const handleSaveGrades = async () => {
        if (!selectedCourse) return;
        setIsSaving(true);
        
        try {
            const allStudents = getStudents();
            students.forEach(student => {
                const scores = courseScores[student.id];
                if (!scores) return;

                const dbStudent = allStudents.find(s => s.id === student.id);
                if (!dbStudent) return;

                const grades = dbStudent.grades || [];
                const existingGradeIdx = grades.findIndex(g => g.courseId === selectedCourse.id);
                
                const total = (scores.midterm || 0) + (scores.final || 0);
                
                const newGrade: Grade = {
                    courseId: selectedCourse.id,
                    courseCode: selectedCourse.code,
                    courseName: selectedCourse.name,
                    score: total,
                    midtermScore: scores.midterm,
                    finalScore: scores.final,
                    totalScore: total,
                    semester: 'FALL 2024'
                };

                if (existingGradeIdx >= 0) {
                    grades[existingGradeIdx] = newGrade;
                } else {
                    grades.push(newGrade);
                }

                dbStudent.grades = grades;
                saveStudent(dbStudent);
            });

            notifySuccess(language === 'ar' ? 'تم حفظ الدرجات وتحديث السجلات الأكاديمية بنجاح' : 'Academic grades updated and saved successfully.');
        } catch (error) {
            notifyError(language === 'ar' ? 'حدث خطأ أثناء حفظ الدرجات' : 'Error occurred while saving grades.');
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredStudents = students.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.nationalId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const t = {
        portalTitle: language === 'ar' ? 'بوابة رصد الدرجات' : 'Faculty Grading Portal',
        portalSubtitle: language === 'ar' ? 'يرجى اختيار المادة لبدء إدخال النتائج والمعدلات' : 'Select an academic registry course to input term marks and assess scores',
        studentsCountLabel: language === 'ar' ? 'طالب مسجل' : 'Students Enrolled',
        noAssignedCourses: language === 'ar' ? 'لا توجد مواد مسندة إلي لك حالياً' : 'No courses currently assigned to your profile',
        backToCourses: language === 'ar' ? 'العودة لقائمة المواد' : 'Return to Course Roster',
        gradesRecordingDesc: language === 'ar' ? 'رصد درجات الفصل الدراسي الأول 2024' : 'Grade entry for Academic Semester Fall 2024',
        tempSave: language === 'ar' ? 'حفظ النتائج مؤقتاً' : 'Save Draft Marks',
        submitPublish: language === 'ar' ? 'اعتماد ونشر' : 'Authorize & Publish',
        searchPlaceholder: language === 'ar' ? 'بحث بالاسم أو الرقم الدراسي...' : 'Search by name or student ID...',
        activeAuditSystem: language === 'ar' ? 'نظام التدقيق النشط مفعل' : 'Active Registry Audit Logger Secure',
        studentCol: language === 'ar' ? 'الطالب' : 'Student Name',
        midtermCol: language === 'ar' ? 'أعمال الفصل (40)' : 'Classwork / Midterm (40)',
        finalCol: language === 'ar' ? 'الامتحان النهائي (60)' : 'Final Assessment (60)',
        totalCol: language === 'ar' ? 'المجموع (100)' : 'Total Score (100)',
        estimateStatusCol: language === 'ar' ? 'الحالة التقديرية' : 'Letter & Standing',
        excellent: language === 'ar' ? 'ممتاز' : 'Excellent (A)',
        veryGood: language === 'ar' ? 'جيد جداً' : 'Very Good (B)',
        pass: language === 'ar' ? 'ناجح' : 'Passed (C)',
        fail: language === 'ar' ? 'راسب' : 'Failed (F)',
        policyTitle: language === 'ar' ? 'سياسة رصد الدرجات والتعديل' : 'Academic Registry Revision Regulations',
        policyDesc: language === 'ar' ? 'بمجرد "الاعتماد والنشر"، سيتم إغلاق التعديل المباشر. أي تغيير لاحق في الدرجة يتطلب "محضر تعديل درجة" معتمد من مجلس القسم وإدارة الكلية، وسيتم تسجيل محاولات الدخول والتعديل ضمن سجل التدقيق الرقمي.' : 'Once authorized and published, database edits are final. Subsequent corrections require formal Academic Board decree sign-off. All modifications are strictly logged in the sovereign digital audit ledger.',
    };

    if (!selectedCourse) {
        return (
            <div className="max-w-7xl mx-auto space-y-8">
                <header>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.portalTitle}</h1>
                    <p className="text-slate-500 mt-1">{t.portalSubtitle}</p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {courses.map(course => {
                        const count = getStudents().filter(s => s.enrollments?.some(e => e.courseId === course.id && e.status === 'REGISTERED')).length;
                        return (
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                key={course.id}
                                onClick={() => setSelectedCourse(course)}
                                className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:border-blue-400 cursor-pointer group transition-all"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">{course.code}</span>
                                    <BookOpen size={20} className="text-blue-200 group-hover:text-blue-500 transition-colors" />
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-2">{course.name}</h3>
                                <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                    <Users size={14} />
                                    <span>{count} {t.studentsCountLabel}</span>
                                </div>
                            </motion.div>
                        );
                    })}
                    {courses.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-200">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t.noAssignedCourses}</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm gap-4">
                <div>
                    <button 
                        onClick={() => setSelectedCourse(null)}
                        className="flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest mb-4 hover:underline"
                    >
                        <ArrowRight size={16} className={language === 'ar' ? '' : 'rotate-180'} />
                        {t.backToCourses}
                    </button>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">{selectedCourse.name}</h1>
                    <div className="flex items-center gap-3 mt-1 text-slate-500">
                        <span className="font-bold">{selectedCourse.code}</span>
                        <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                        <span className="font-bold">{t.gradesRecordingDesc}</span>
                    </div>
                </div>
                <div className="flex gap-4 w-full md:w-auto">
                    <button 
                        onClick={handleSaveGrades}
                        disabled={isSaving}
                        className="flex-1 md:flex-none px-10 py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                        {isSaving ? <Clock className="animate-spin" size={20} /> : <Save size={20} />}
                        {t.tempSave}
                    </button>
                    <button className="flex-1 md:flex-none px-6 py-5 bg-green-50 text-green-600 rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-green-100 transition-all flex items-center justify-center gap-3 ring-1 ring-green-100">
                        <CheckCircle size={20} />
                        {t.submitPublish}
                    </button>
                </div>
            </header>

            <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <div className="p-6 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text"
                            placeholder={t.searchPlaceholder}
                            className="w-full pr-12 pl-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100 flex items-center gap-3">
                        <ShieldCheck className="text-blue-600" size={20} />
                        <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">{t.activeAuditSystem}</p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.studentCol}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.midtermCol}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.finalCol}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalCol}</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.estimateStatusCol}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredStudents.map(student => {
                                const scores = courseScores[student.id] || {};
                                const total = (scores.midterm || 0) + (scores.final || 0);
                                
                                return (
                                    <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-slate-900">{student.name}</span>
                                                <span className="text-[10px] font-bold text-slate-400">ID: {student.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <input 
                                                type="number"
                                                min="0"
                                                max="40"
                                                className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                                                value={scores.midterm ?? ''}
                                                onChange={e => handleScoreChange(student.id, 'midterm', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <input 
                                                type="number"
                                                min="0"
                                                max="60"
                                                className="w-24 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-center text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                                                value={scores.final ?? ''}
                                                onChange={e => handleScoreChange(student.id, 'final', e.target.value)}
                                                placeholder="0"
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className={cn(
                                                "w-20 h-10 flex items-center justify-center rounded-xl font-black text-lg",
                                                total >= 50 ? "bg-green-50 text-green-600" : "bg-rose-50 text-rose-600"
                                            )}>
                                                {total}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={cn(
                                                "text-[10px] font-black uppercase tracking-widest",
                                                total >= 85 ? "text-amber-500" : total >= 75 ? "text-blue-500" : total >= 50 ? "text-green-500" : "text-rose-500"
                                            )}>
                                                {total >= 85 ? t.excellent : total >= 75 ? t.veryGood : total >= 50 ? t.pass : t.fail}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-[32px] border border-amber-100 flex gap-4">
                <AlertCircle className="text-amber-600 shrink-0" size={24} />
                <div className="space-y-2">
                    <h4 className="font-black text-amber-900 text-sm">{t.policyTitle}</h4>
                    <p className="text-xs font-bold text-amber-800/70 leading-relaxed">
                        {t.policyDesc}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default FacultyGrading;
