
import { Student, Course, AttendanceRecord, StudentStatus, ProgramType } from '../types';
import { getStudents, getCourses, getSystemSettings, getStaff } from './storageService';
import { getAttendanceRecords } from './facultyService';
import { calculateWeightedGPA } from './gradingService';
import { academicService } from './academicService';

export interface AcademicInsight {
    id: string;
    type: 'VIOLATION' | 'WARNING' | 'OPPORTUNITY' | 'INFO';
    title: string;
    description: string;
    studentId?: string;
    studentName?: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    actionLabel?: string;
    category: 'GPA' | 'ATTENDANCE' | 'COMPLIANCE' | 'FINANCE';
}

export const runRegulationAudit = (): AcademicInsight[] => {
    const students = getStudents();
    const courses = getCourses();
    const attendance = getAttendanceRecords();
    const settings = getSystemSettings();
    const insights: AcademicInsight[] = [];

    students.forEach(student => {
        // 1. GPA Audit (Regulation 501 - Article 32)
        const gpa = calculateWeightedGPA(student.grades, courses);
        const minGpa = student.program === ProgramType.UNDERGRADUATE ? 50 : 65;

        if (gpa < minGpa && gpa > 0) {
            insights.push({
                id: `GPA-${student.id}`,
                type: 'VIOLATION',
                title: 'انخفاض المعدل التراكمي دون الحد الأدنى',
                description: `الطالب ${student.name} لديه معدل ${gpa}%، وهو أقل من الحد الأدنى (${minGpa}%). يتطلب وضع الطالب تحت الإنذار الأكاديمي وفق المادة 32.`,
                studentId: student.id,
                studentName: student.name,
                impact: 'HIGH',
                actionLabel: 'إصدار إنذار أكاديمي',
                category: 'GPA'
            });
        }

        // 2. Attendance Audit (Regulation 501 - Attendance rules)
        // Usually > 25% absences leads to exam barring
        const studentAbsences = attendance.filter(a => a.studentId === student.id && a.status === 'ABSENT');
        const courseAbsenceMap: Record<string, number> = {};
        studentAbsences.forEach(a => {
            courseAbsenceMap[a.courseId] = (courseAbsenceMap[a.courseId] || 0) + 1;
        });

        Object.entries(courseAbsenceMap).forEach(([courseId, count]) => {
            if (count >= 5) { // Threshold for warning
                const course = courses.find(c => c.id === courseId);
                insights.push({
                    id: `ATT-${student.id}-${courseId}`,
                    type: 'WARNING',
                    title: 'تجاوز نسبة الغياب المسموح بها',
                    description: `الطالب ${student.name} متغيب بواقع ${count} محاضرات في مقرر ${course?.name}. يقترب من الحرمان من دخول الامتحان.`,
                    studentId: student.id,
                    studentName: student.name,
                    impact: 'MEDIUM',
                    actionLabel: 'إرسال تنبيه غياب',
                    category: 'ATTENDANCE'
                });
            }
        });

        // 3. Status Check
        if (student.status === StudentStatus.WARNING) {
             insights.push({
                id: `STATUS-${student.id}`,
                type: 'INFO',
                title: 'طالب تحت الملاحظة الأكاديمية',
                description: `الطالب ${student.name} مسجل حالياً تحت الإنذار. يرجى متابعة أدائه في الفصل الحالي لضمان رفع المعدل.`,
                studentId: student.id,
                studentName: student.name,
                impact: 'LOW',
                category: 'COMPLIANCE'
            });
        }
    });

    // 4. Faculty Load Audit (Regulation 501 - Staff Load Caps)
    const staff = getStaff();
    staff.filter(s => s.type === 'ACADEMIC').forEach(member => {
        const check = academicService.canFacultyAcceptLoad(member.id, 0); // Check current load
        if (!check.allowed) {
            insights.push({
                id: `STAFF-LOAD-${member.id}`,
                type: 'VIOLATION',
                title: 'تجاوز النصاب التدريسي لعضو هيئة التدريس',
                description: `${member.name} (${member.position}) تجاوز الحد الأقصى للساعات المعتمدة المسموح بها وفق المادة 18 من اللائحة 501.`,
                impact: 'MEDIUM',
                actionLabel: 'تعديل الجدول الدراسي',
                category: 'COMPLIANCE'
            });
        }
    });

    // Global Financial Insights
    const totalOutstanding = students.reduce((sum, s) => sum + (s.financialBalance || 0), 0);
    if (totalOutstanding > 10000) {
        insights.push({
            id: 'FIN-GLOBAL',
            type: 'WARNING',
            title: 'إجمالي الذمم المالية المرتفعة',
            description: `إجمالي المستحقات المتأخرة على الطلاب يتجاوز 10,000 د.ل. قد يؤثر هذا على السيولة التشغيلية للفصل الحالي.`,
            impact: 'MEDIUM',
            actionLabel: 'مراجعة التقرير المالي',
            category: 'FINANCE'
        });
    }

    return insights;
};
