
import { getStudents, getAcademicPrograms, getDepartments, getColleges } from './storageService';
import { StudentStatus, ProgramType } from '../types';

export interface UniversityKPIs {
  totalStudents: number;
  activeStudents: number;
  graduatedCount: number;
  atWariningCount: number;
  averageGPA: number;
  genderRatio: { male: number; female: number }; // Mocking for now as gender is not in type yet
  programDistribution: { name: string; count: number }[];
  performanceByDept: { name: string; avgGPA: number }[];
}

export const reportingService = {
  /**
   * Generates a high-level summary of university performance.
   */
  getUniversityKPIs: (): UniversityKPIs => {
    const students = getStudents();
    const programs = getAcademicPrograms();
    const depts = getDepartments();

    const activeStudents = students.filter(s => s.status === StudentStatus.ACTIVE);
    const graduatedCount = students.filter(s => s.status === StudentStatus.GRADUATED).length;
    const atWariningCount = students.filter(s => s.status === StudentStatus.WARNING).length;
    
    const totalGPA = students.reduce((acc, s) => acc + (s.gpa || 0), 0);
    const avgGPA = students.length > 0 ? totalGPA / students.length : 0;

    // Distribution by program
    const programDist = programs.map(p => ({
      name: p.name,
      count: students.filter(s => {
        // This is a bit complex since student doesn't have programId directly sometimes
        // Usually they have departmentId. Let's map via department.
        return s.departmentId === p.deptId;
      }).length
    }));

    // Performance by department
    const deptPerf = depts.map(d => {
      const deptStudents = students.filter(s => s.departmentId === d.id);
      const avg = deptStudents.length > 0 
        ? deptStudents.reduce((acc, s) => acc + (s.gpa || 0), 0) / deptStudents.length 
        : 0;
      return { name: d.name, avgGPA: parseFloat(avg.toFixed(2)) };
    });

    return {
      totalStudents: students.length,
      activeStudents: activeStudents.length,
      graduatedCount,
      atWariningCount,
      averageGPA: parseFloat(avgGPA.toFixed(2)),
      genderRatio: { male: 55, female: 45 }, // Placeholders
      programDistribution: programDist.slice(0, 5),
      performanceByDept: deptPerf
    };
  },

  /**
   * Generates a "Risk Map" identifying departments with high warning rates.
   */
  getRiskAnalysis: () => {
    const students = getStudents();
    const depts = getDepartments();

    return depts.map(d => {
      const deptStudents = students.filter(s => s.departmentId === d.id);
      const warningCount = deptStudents.filter(s => s.status === StudentStatus.WARNING).length;
      const riskLevel = deptStudents.length > 0 ? (warningCount / deptStudents.length) * 100 : 0;
      
      return {
        deptName: d.name,
        riskScore: parseFloat(riskLevel.toFixed(1)),
        studentCount: deptStudents.length,
        status: riskLevel > 20 ? 'HIGH' : riskLevel > 10 ? 'MEDIUM' : 'LOW'
      };
    }).sort((a, b) => b.riskScore - a.riskScore);
  }
};
