
import React, { useState, useEffect } from 'react';
import { getStudents, getCourses, getDepartments } from '../services/storageService';
import { getCurrentUser } from '../services/authService';
import { Student, Course, Department, UserRole } from '../types';
import DepartmentStudentPerformance from './DepartmentStudentPerformance';
import { AlertCircle } from 'lucide-react';

import { Language } from '../services/i18nService';

interface Props {
    language: Language;
}

const DepartmentPerformancePage: React.FC<Props> = ({ language }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [department, setDepartment] = useState<Department | null>(null);
    const currentUser = getCurrentUser();

    useEffect(() => {
        const allStudents = getStudents();
        const allCourses = getCourses();
        const allDepts = getDepartments();

        // Find the department where the user is the head
        const myDept = allDepts.find(d => d.headId === currentUser?.id || d.headName === currentUser?.name);
        
        if (myDept) {
            setDepartment(myDept);
            setStudents(allStudents.filter(s => s.departmentId === myDept.id));
            setCourses(allCourses);
        } else if (currentUser?.role === UserRole.IT_ADMIN) {
            const firstDept = allDepts[0];
            setDepartment(firstDept);
            setStudents(allStudents.filter(s => s.departmentId === firstDept.id));
            setCourses(allCourses);
        }
    }, [currentUser]);

    if (!department) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={48} className="mb-4" />
                <h2 className="text-xl font-bold">
                    {language === 'ar' ? 'لم يتم العثور على بيانات القسم' : 'Department Data Not Found'}
                </h2>
                <p>
                    {language === 'ar' 
                        ? 'يرجى التأكد من تعيينك رئيساً لقسم علمي في النظام للوصول إلى تحليلات الأداء.' 
                        : 'Please ensure you are assigned as a department head in the system to access performance analytics.'}
                </p>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="mb-8 p-6 bg-slate-900 rounded-3xl text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
                <div>
                    <h1 className="text-2xl font-black italic uppercase">
                        {language === 'ar' ? 'سجل أداء القسم العلمي' : 'Departmental Performance Ledger'}
                    </h1>
                    <p className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mt-1">
                        {language === 'ar' ? 'مراقبة الجودة الأكاديمية لـ: ' : 'Monitoring Academic Quality for: '} {department.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase">
                        {language === 'ar' ? 'الدفعة: 2024' : 'Cohort: 2024'}
                    </span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black uppercase">
                        {language === 'ar' ? 'بيانات مؤكدة' : 'Verified Data'}
                    </span>
                </div>
            </div>
            <DepartmentStudentPerformance students={students} courses={courses} language={language} />
        </div>
    );
};

export default DepartmentPerformancePage;
