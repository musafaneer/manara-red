
import { Student, PostgraduateMilestone, GraduateThesis, ThesisStatus, UserRole } from '../types';
import { getStudents, saveStudent } from './storageService';
import { getTheses, saveThesis } from './graduateService';
import { logAction } from './auditService';
import { notifySuccess, notifyError } from './notificationService';

export const scheduleComprehensiveExam = (studentId: string, date: string, performerName: string) => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return { success: false, message: 'الطالب غير موجود' };

    const milestone: PostgraduateMilestone = {
        id: `M-COMP-${Date.now()}`,
        type: 'COMPREHENSIVE_EXAM',
        date,
        status: 'PENDING'
    };

    const updatedStudent: Student = {
        ...student,
        postgraduateDetails: {
            ...student.postgraduateDetails,
            comprehensiveExamStatus: 'PENDING',
            comprehensiveExamDate: date,
            milestones: [...(student.postgraduateDetails?.milestones || []), milestone]
        }
    };

    saveStudent(updatedStudent);
    logAction('جدولة امتحان شامل', `تمت جدولة الامتحان الشامل للطالب ${student.name} بتاريخ ${date}`, 'info', performerName);
    return { success: true, message: 'تمت جدولة الامتحان الشامل بنجاح' };
};

export const recordComprehensiveExamResult = (studentId: string, status: 'PASSED' | 'FAILED', score: number, performerName: string) => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return { success: false, message: 'الطالب غير موجود' };

    const updatedMilestones = student.postgraduateDetails?.milestones?.map(m => 
        m.type === 'COMPREHENSIVE_EXAM' && m.status === 'PENDING' 
        ? { ...m, status, score } 
        : m
    );

    const updatedStudent: Student = {
        ...student,
        postgraduateDetails: {
            ...student.postgraduateDetails,
            comprehensiveExamStatus: status,
            milestones: updatedMilestones
        }
    };

    saveStudent(updatedStudent);
    logAction('رصد نتيجة امتحان شامل', `تم رصد نتيجة (${status === 'PASSED' ? 'ناجح' : 'راسب'}) في الامتحان الشامل للطالب ${student.name}`, status === 'PASSED' ? 'info' : 'danger', performerName);
    return { success: true, message: 'تم رصد النتيجة بنجاح' };
};

export const setupDefenseCommittee = (thesisId: string, committee: { chair: string, internal: string, external: string, supervisor: string }, performerName: string) => {
    const theses = getTheses();
    const thesis = theses.find(t => t.id === thesisId);
    if (!thesis) return { success: false, message: 'الأطروحة غير موجودة' };

    const updatedThesis: GraduateThesis = {
        ...thesis,
        status: ThesisStatus.PRE_DEFENSE
    };

    // Also update student data
    const student = getStudents().find(s => s.id === thesis.studentId);
    if (student) {
        const updatedStudent: Student = {
            ...student,
            postgraduateDetails: {
                ...student.postgraduateDetails,
                defenseCommittee: {
                    chair: committee.chair,
                    internalExaminer: committee.internal,
                    externalExaminer: committee.external,
                    supervisorObserver: committee.supervisor
                }
            }
        };
        saveStudent(updatedStudent);
    }

    saveThesis(updatedThesis);
    logAction('تشكيل لجنة مناقشة', `تم تشكيل لجنة المناقشة للأطروحة: ${thesis.title}`, 'info', performerName);
    return { success: true, message: 'تم تشكيل اللجنة وتحديد حالة ما قبل المناقشة' };
};

export const recordDefenseResult = (thesisId: string, result: ThesisStatus, comments: string, performerName: string) => {
    const theses = getTheses();
    const thesis = theses.find(t => t.id === thesisId);
    if (!thesis) return { success: false, message: 'الأطروحة غير موجودة' };

    const updatedThesis: GraduateThesis = {
        ...thesis,
        status: result
    };

    saveThesis(updatedThesis);
    logAction('رصد نتيجة مناقشة', `تم رصد نتيجة المناقشة للأطروحة: ${thesis.title}`, 'info', performerName);
    return { success: true, message: 'تم رصد نتيجة المناقشة بنجاح' };
};
