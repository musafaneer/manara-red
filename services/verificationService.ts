
import { Student } from '../types';
import { saveStudent, getStudents } from './storageService';
import { logAction } from './auditService';

/**
 * Service to manage digital integrity and verification of academic records.
 */
export const verificationService = {
  /**
   * Generates a unique verification fingerprint for a student record.
   * In a real system, this would be a cryptographic hash of the student's grades and critical info.
   */
  generateVerificationHash: (student: Student): string => {
    const dataString = `${student.id}-${student.gpa}-${student.grades.length}-${student.status}`;
    // Simple mock hash for demonstration (resembling a real UUID/Hash)
    return 'ORACLE-' + btoa(dataString).substring(0, 12).toUpperCase();
  },

  /**
   * Refreshes the security hash and logs the integrity check.
   */
  refreshRecordIntegrity: (studentId: string) => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return;

    const newHash = verificationService.generateVerificationHash(student);
    const updatedStudent: Student = {
      ...student,
      verificationHash: newHash
    };

    saveStudent(updatedStudent);
    logAction('SECURITY_AUDIT', `Record integrity refreshed for ${student.name}. New hash: ${newHash}`, 'info');
    return newHash;
  },

  /**
   * Verifies if the provided hash matches the current record state.
   */
  verifyRecord: (studentId: string, hash: string): boolean => {
    const student = getStudents().find(s => s.id === studentId);
    if (!student) return false;
    return student.verificationHash === hash;
  }
};
