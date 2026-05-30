
import { ProgramType, StudentStatus, Student, Course, GraduateDegreeLevel, PostgraduatePathway, VerificationStatus } from './types';

export const LIBYAN_REGULATION_501_SUMMARY = `
You are an intelligent Academic Advisor for the Oracle Campus Management System (SIS). You must provide guidance based on the Libyan Higher Education Regulations (Unit 4).

Key Academic Policies (Unit 4):
1. **Academic Framework**:
   - Undergraduate programs operate on a 4.0 GPA scale. The minimum pass threshold per module is 2.0 (Grade C).
   - Postgraduate programs (Master's/PhD) use a 4.0 scale. The minimum pass threshold per module is 2.0 (Grade C).
   - Semester System: Fall (Sep-Jan) and Spring (Feb-Jun) only. No summer semesters.
2. **Admission Criteria**:
   - GSSC minimum 65% for Literary track and 70% for Scientific track.
   - Bachelor's ≥ 75% for Master's admission.
   - Master's ≥ 75% for PhD admission.
3. **Credit Limits**:
   - Undergraduate: Minimum 12, Maximum 18 credit hours per semester.
   - Postgraduate: Minimum 6, Maximum 9 units per semester.
4. **Residency & Duration**:
   - Undergraduate: Maximum 4 years standard duration.
   - Master's: Maximum 42 months.
   - PhD: Maximum 54 months.
5. **Academic Probation (Warnings)**:
   - A student is placed on probation if their GPA/CGPA falls below 2.0.
   - Automatic dismissal occurs after 3 consecutive warnings.
6. **Performance Classification (4.0 Scale)**:
   - Excellent (A): 3.5 - 4.0
   - Very Good (B): 3.0 - 3.49
   - Good (C+): 2.5 - 2.99
   - Pass (C): 2.0 - 2.49
   - Failure (F): Below 2.0
`;

export const MOCK_COURSES: Course[] = [
  // Semester 1
  { id: 'CS101', code: 'CS101', name: 'Introduction to Programming', credits: 3, semester: 1, programType: ProgramType.UNDERGRADUATE },
  { id: 'MATH101', code: 'MATH101', name: 'Mathematics I', credits: 3, semester: 1, programType: ProgramType.UNDERGRADUATE },
  { id: 'ENG101', code: 'ENG101', name: 'English Composition I', credits: 2, semester: 1, programType: ProgramType.UNDERGRADUATE },
  
  // Semester 2
  { id: 'CS102', code: 'CS102', name: 'Object-Oriented Programming', credits: 4, semester: 2, programType: ProgramType.UNDERGRADUATE, prerequisites: ['CS101'] },
  { id: 'MATH102', code: 'MATH102', name: 'Mathematics II', credits: 3, semester: 2, programType: ProgramType.UNDERGRADUATE, prerequisites: ['MATH101'] },
  
  // Semester 3
  { id: 'CS201', code: 'CS201', name: 'Data Structures', credits: 4, semester: 3, programType: ProgramType.UNDERGRADUATE, prerequisites: ['CS102'] },
  { id: 'CE201', code: 'CE201', name: 'Structural Mechanics', credits: 3, semester: 3, programType: ProgramType.UNDERGRADUATE },
  
  // Semester 4
  { id: 'CS202', code: 'CS202', name: 'Database Systems', credits: 3, semester: 4, programType: ProgramType.UNDERGRADUATE, prerequisites: ['CS201'] },
  
  // Semester 5
  { id: 'CS301', code: 'CS301', name: 'Software Engineering', credits: 3, semester: 5, programType: ProgramType.UNDERGRADUATE },
  
  // Semester 8 / Graduation
  { id: 'CS499', code: 'CS499', name: 'Graduation Project', credits: 6, semester: 8, programType: ProgramType.UNDERGRADUATE },
  
  // Medical
  { id: 'MED101', code: 'MED101', name: 'Human Anatomy I', credits: 5, semester: 1, programType: ProgramType.UNDERGRADUATE },
  
  // Postgraduate
  { id: 'AI501', code: 'AI501', name: 'Advanced Algorithms', credits: 3, semester: 1, programType: ProgramType.POSTGRADUATE },
  { id: 'AI502', code: 'AI502', name: 'Machine Learning', credits: 3, semester: 1, programType: ProgramType.POSTGRADUATE, prerequisites: ['AI501'] },
  { id: 'AI600', code: 'AI600', name: 'Thesis Research', credits: 9, semester: 4, programType: ProgramType.POSTGRADUATE },
];

export const MOCK_STUDENTS: Student[] = [
  {
    id: 'STU-NEW-001',
    nationalId: '120060022331',
    name: 'Omar Farouq Al-Libi',
    program: ProgramType.UNDERGRADUATE,
    departmentId: 'DEPT-01', // Computer Science
    enrollmentYear: 2024,
    status: StudentStatus.ACTIVE,
    gpa: 0,
    warningsCount: 0,
    admissionScore: 82,
    admissionCertificateType: 'GSSC_SCIENCE',
    grades: [],
    financialBalance: 1500,
    verificationStatus: VerificationStatus.VERIFIED
  },
  {
    id: 'STU-MID-002',
    nationalId: '119990022331',
    name: 'Mohammed Abdullah Al-Warfalli',
    program: ProgramType.UNDERGRADUATE,
    departmentId: 'DEPT-02', // Software Engineering
    enrollmentYear: 2021,
    status: StudentStatus.ACTIVE,
    gpa: 3.2,
    warningsCount: 0,
    admissionScore: 78,
    admissionCertificateType: 'GSSC_ARTS',
    grades: [
      { courseId: 'CS101', courseName: 'Introduction to Programming', score: 3.5, semester: 'Fall 2021' },
      { courseId: 'MATH101', courseName: 'Mathematics I', score: 2.8, semester: 'Fall 2021' },
      { courseId: 'CS102', courseName: 'Object-Oriented Programming', score: 2.5, semester: 'Spring 2022' }
    ],
    financialBalance: 0
  },
  {
    id: 'STU-WRN-003',
    nationalId: '119988776655',
    name: 'Ahmed Salem Al-Magarief',
    program: ProgramType.UNDERGRADUATE,
    departmentId: 'DEPT-05', // Civil Engineering
    enrollmentYear: 2020,
    status: StudentStatus.WARNING,
    gpa: 1.8,
    warningsCount: 2,
    admissionScore: 68,
    admissionCertificateType: 'GSSC_SCIENCE',
    grades: [
      { courseId: 'CS101', courseName: 'Introduction to Programming', score: 1.5, semester: 'Fall 2020' },
      { courseId: 'CE201', courseName: 'Structural Mechanics', score: 2.1, semester: 'Fall 2022' },
      { courseId: 'MATH101', courseName: 'Mathematics I', score: 1.9, semester: 'Fall 2022' }
    ],
    financialBalance: 450
  },
  {
    id: 'STU-SUS-004',
    nationalId: '119977665500',
    name: 'Khalil Ibrahim Al-Fitouri',
    program: ProgramType.UNDERGRADUATE,
    departmentId: 'DEPT-04', // Networks
    enrollmentYear: 2018,
    status: StudentStatus.SUSPENDED,
    gpa: 1.2,
    warningsCount: 3,
    grades: [
      { courseId: 'CS101', courseName: 'Introduction to Programming', score: 1.5, semester: 'Fall 2018' }
    ],
    financialBalance: 2000
  },
  {
    id: 'STU-GRA-005',
    nationalId: '119977665544',
    name: 'Jamal Al-Din Al-Tarabulsi',
    program: ProgramType.UNDERGRADUATE,
    departmentId: 'DEPT-08', // Accounting
    enrollmentYear: 2019,
    status: StudentStatus.GRADUATED,
    gpa: 3.4,
    warningsCount: 0,
    grades: [
      { courseId: 'ACC101', courseName: 'Accounting Principles', score: 3.5, semester: 'Fall 2019' },
      { courseId: 'ACC404', courseName: 'Auditing', score: 3.2, semester: 'Spring 2023' }
    ],
    financialBalance: 0
  },
  {
    id: 'STU-PG-001',
    nationalId: '220001122334',
    name: 'Sarah Khaled Al-Misrati',
    program: ProgramType.POSTGRADUATE,
    graduateLevel: GraduateDegreeLevel.MASTER,
    pathway: PostgraduatePathway.COURSES_DISSERTATION,
    departmentId: 'DEPT-03', // Artificial Intelligence
    enrollmentYear: 2022,
    status: StudentStatus.ACTIVE,
    gpa: 3.1, 
    warningsCount: 0,
    thesisTitle: 'Applications of Deep Learning in Medical Diagnosis',
    advisorName: 'Dr. Ali Al-Tawati',
    grades: [
      { courseId: 'AI501', courseName: 'Advanced Algorithms', score: 3.0, semester: 'Fall 2022' }, 
      { courseId: 'AI502', courseName: 'Machine Learning', score: 3.2, semester: 'Fall 2022' }
    ],
    financialBalance: 0,
    postgraduateDetails: {
        supervisorId: 'STF-001',
        proposalDate: '2023-01-15',
        comprehensiveExamStatus: 'PASSED',
        milestones: [
            { id: 'M1', type: 'PROPOSAL', date: '2023-01-15', status: 'PASSED' },
            { id: 'M2', type: 'MID_TERM', date: '2023-06-10', status: 'PENDING' }
        ]
    }
  }
];
