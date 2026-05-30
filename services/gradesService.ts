import { Student, Grade, UniversityRegulation } from '../types';

export const calculateGPA = (student: Student, regulation: UniversityRegulation): number => {
    if (!student.grades || student.grades.length === 0) return 0;
    
    let totalPoints = 0;
    let totalCredits = 0;

    student.grades.forEach(grade => {
        // Assuming every course has a fixed credit weight for now if not specified in Course
        // In a real app we would join with Course to get credits
        const credits = 3; 
        const points = getPointsFromScore(grade.totalScore || grade.score);
        
        totalPoints += (points * credits);
        totalCredits += credits;
    });

    return totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;
};

export const getPointsFromScore = (score: number): number => {
    // If score is already a GPA point value (1.0 - 4.0)
    if (score <= 4.0 && score > 0) return score;
    
    // If score is percentage (0 - 100)
    if (score >= 85) return 4.0;
    if (score >= 75) return 3.0;
    if (score >= 65) return 2.0;
    if (score >= 50) return 1.0;
    return 0;
};

export const getGradeFromScore = (score: number, lang: 'ar' | 'en' = 'ar'): string => {
    const points = getPointsFromScore(score);
    if (points >= 3.5) return lang === 'ar' ? 'ممتاز (A)' : 'Excellent (A)';
    if (points >= 3.0) return lang === 'ar' ? 'جيد جداً (B)' : 'Very Good (B)';
    if (points >= 2.5) return lang === 'ar' ? 'جيد مرتفع (+C)' : 'Good High (C+)';
    if (points >= 2.0) return lang === 'ar' ? 'جيد (C)' : 'Pass (C)';
    if (points >= 1.0) return lang === 'ar' ? 'مقبول (D)' : 'Weak Pass (D)';
    return lang === 'ar' ? 'راسب (F)' : 'Failure (F)';
};

export const getStudentAuditLogs = (studentId: string): any[] => {
    // In a real app we'd fetch from persistent storage
    return [
        { id: '1', action: 'رصد درجات (إدخال أول)', timestamp: '2024-11-15 10:22', user: 'د. محمود سعيد', details: 'تم رصد درجات أعمال السنة' },
        { id: '2', action: 'تعديل درجة (اعتماد مجلس)', timestamp: '2025-01-05 14:15', user: 'أ. ليلى إبراهيم', details: 'تعديل درجة مادة CS-102 بناءً على تظلم رقم 45' },
    ];
};

export const getStudentGrades = (studentId: string): Grade[] => {
    // In a real app we'd fetch from persistent storage
    // Mocking some for specific student IDs
    return [
        { courseId: 'CS-101', courseName: 'Fundamentals of Computing', score: 88, semester: 'FALL 2024' },
        { courseId: 'CS-102', courseName: 'Advanced Programming', score: 72, semester: 'FALL 2024' },
        { courseId: 'MAT-105', courseName: 'Discrete Mathematics', score: 91, semester: 'SPRING 2025' },
        { courseId: 'ENG-201', courseName: 'Technical Writing', score: 85, semester: 'SPRING 2025' },
    ];
};
