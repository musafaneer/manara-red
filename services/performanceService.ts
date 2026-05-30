
import { Student, Course, Grade, StudentStatus, StudentGrade } from '../types';

export interface PerformanceMetrics {
    averageGpa: number;
    gpaRange: {
        'Excellent (3.5-4.0)': number;
        'Very Good (3.0-3.49)': number;
        'Good (2.5-2.99)': number;
        'Pass (2.0-2.49)': number;
        'Warning (< 2.0)': number;
    };
    totalStudents: number;
    activeStudents: number;
    warningStudents: number;
    graduationRate: number;
}

export interface CoursePerformance {
    courseId: string;
    courseCode: string;
    courseName: string;
    averageScore: number;
    passRate: number; // percentage
    failureRate: number; // percentage
    totalStudents: number;
}

export const getDepartmentMetrics = (students: Student[]): PerformanceMetrics => {
    if (students.length === 0) {
        return {
            averageGpa: 0,
            gpaRange: {
                'Excellent (3.5-4.0)': 0,
                'Very Good (3.0-3.49)': 0,
                'Good (2.5-2.99)': 0,
                'Pass (2.0-2.49)': 0,
                'Warning (< 2.0)': 0,
            },
            totalStudents: 0,
            activeStudents: 0,
            warningStudents: 0,
            graduationRate: 0
        };
    }

    const totalGpa = students.reduce((acc, s) => acc + s.gpa, 0);
    const averageGpa = totalGpa / students.length;

    const gpaRange = {
        'Excellent (3.5-4.0)': students.filter(s => s.gpa >= 3.5).length,
        'Very Good (3.0-3.49)': students.filter(s => s.gpa >= 3.0 && s.gpa < 3.5).length,
        'Good (2.5-2.99)': students.filter(s => s.gpa >= 2.5 && s.gpa < 3.0).length,
        'Pass (2.0-2.49)': students.filter(s => s.gpa >= 2.0 && s.gpa < 2.5).length,
        'Warning (< 2.0)': students.filter(s => s.gpa < 2.0).length,
    };

    const activeStudents = students.filter(s => s.status === StudentStatus.ACTIVE).length;
    const warningStudents = students.filter(s => s.status === StudentStatus.WARNING || s.gpa < 2.0).length;
    const graduatedStudents = students.filter(s => s.status === StudentStatus.GRADUATED).length;

    return {
        averageGpa,
        gpaRange,
        totalStudents: students.length,
        activeStudents,
        warningStudents,
        graduationRate: (graduatedStudents / students.length) * 100
    };
};

export const getDepartmentCoursePerformance = (students: Student[], courses: Course[]): CoursePerformance[] => {
    const courseStats: Record<string, { totalScore: number; passCount: number; studentCount: number }> = {};

    students.forEach(student => {
        student.grades.forEach(grade => {
            if (!courseStats[grade.courseId]) {
                courseStats[grade.courseId] = { totalScore: 0, passCount: 0, studentCount: 0 };
            }
            courseStats[grade.courseId].totalScore += grade.score;
            courseStats[grade.courseId].studentCount += 1;
            if (grade.score >= 50) { // Passing score assumption
                courseStats[grade.courseId].passCount += 1;
            }
        });
    });

    return Object.entries(courseStats).map(([courseId, stats]) => {
        const course = courses.find(c => c.id === courseId);
        return {
            courseId,
            courseCode: course?.code || 'Unknown',
            courseName: course?.name || 'Unknown',
            averageScore: stats.totalScore / stats.studentCount,
            passRate: (stats.passCount / stats.studentCount) * 100,
            failureRate: ((stats.studentCount - stats.passCount) / stats.studentCount) * 100,
            totalStudents: stats.studentCount
        };
    }).sort((a, b) => b.averageScore - a.averageScore);
};
