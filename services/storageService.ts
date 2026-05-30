
import { Student, Course, Building, Room, Branch, College, Department, AcademicProgram, Section, ProgramType, StaffMember, SystemSettings as ISystemSettings, CalendarStageKey, SystemNotification, NotificationType, UserRole, CouncilDecision, Transaction, RegistrationWindow, ExamSession } from '../types';
import { MOCK_STUDENTS, MOCK_COURSES } from '../constants';

const STORAGE_KEY_STUDENTS = 'oracle_campus_students';
const STORAGE_KEY_COURSES = 'oracle_campus_courses';
const STORAGE_KEY_SETTINGS = 'oracle_campus_settings';
const STORAGE_KEY_BUILDINGS = 'oracle_campus_buildings';
const STORAGE_KEY_ROOMS = 'oracle_campus_rooms';
const STORAGE_KEY_STAFF = 'oracle_campus_staff';

// Organization Keys
const STORAGE_KEY_BRANCHES = 'oracle_campus_branches';
const STORAGE_KEY_COLLEGES = 'oracle_campus_colleges';
const STORAGE_KEY_DEPTS = 'oracle_campus_depts';
const STORAGE_KEY_PROGRAMS = 'oracle_campus_programs';
const STORAGE_KEY_SECTIONS = 'oracle_campus_sections';
const STORAGE_KEY_NOTIFICATIONS = 'oracle_campus_notifications';
const STORAGE_KEY_COUNCIL_DECISIONS = 'oracle_campus_council_decisions';
const STORAGE_KEY_TRANSACTIONS = 'oracle_campus_transactions';
const STORAGE_KEY_REG_WINDOWS = 'oracle_campus_reg_windows';
const STORAGE_KEY_EXAM_SESSIONS = 'oracle_campus_exam_sessions';

const DEFAULT_SETTINGS: ISystemSettings = {
  universityName: 'Oracle Campus SIS',
  institutionName: 'Oracle Campus',
  currentSemester: 'FALL 2024',
  academicYear: '2024-2025',
  registrationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  paymentDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  regulation: {
    minGpaGood: 3.0,
    minGpaExcellent: 3.5,
    minGpaWarning: 2.0,
    maxCreditsPerSemester: 18,
    minCreditsPerSemester: 12,
    passingScore: 2.0,
    attendanceWarningThreshold: 25
  },
  finance: {
    undergraduateRatePerCredit: 30,
    postgraduateRatePerCredit: 150,
    registrationFee: 200, // Updated for Libyan institution
    lateFee: 50,
    transcriptFee: 25,
    idCardFee: 20,
    maxDebtLimit: 2000,
    iban: 'LY89 0000 0001 2345 6789 012',
    bankName: 'مصرف ليبيا المركزي - Tripoli',
    accountName: 'نظام أوراكل كامبس التعليمي - المحاسبات'
  },
  calendarStages: [
    { id: '1', name: 'Early Registration Cycle', key: CalendarStageKey.REGISTRATION, startDate: '2024-09-01', endDate: '2024-09-15', isUnlocked: true },
    { id: '2', name: 'Add/Drop Curricular Phase', key: CalendarStageKey.ADD_DROP, startDate: '2024-09-16', endDate: '2024-09-22', isUnlocked: false },
    { id: '3', name: 'Instructional Period - Lectures', key: CalendarStageKey.LECTURES, startDate: '2024-09-23', endDate: '2024-12-30', isUnlocked: false },
    { id: '4', name: 'Midterm Assessment Cycle', key: CalendarStageKey.MIDTERMS, startDate: '2024-11-01', endDate: '2024-11-15', isUnlocked: false },
    { id: '5', name: 'Final Examination Series', key: CalendarStageKey.FINALS, startDate: '2025-01-05', endDate: '2025-01-20', isUnlocked: false },
    { id: '6', name: 'Grading & Registry Validation', key: CalendarStageKey.GRADING, startDate: '2025-01-21', endDate: '2025-01-30', isUnlocked: false }
  ],
  accessibility: {
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    screenReaderOptimized: false
  },
  superadmin: {
    maintenanceMode: false,
    enableSelfRegistration: true,
    enableAiInsights: true,
    allowGradeOverride: true,
    enableGraduation501Validation: true,
    sessionTimeoutMinutes: 30,
    securityLevel: 'STANDARD',
    logRetentionDays: 90
  }
};

// Mock Organization Data
const MOCK_BRANCHES: Branch[] = [
  { id: 'BR-01', name: 'Primary Campus - Tripoli', location: 'Tripoli, Al-Nasser st.', managerName: 'Dr. Mahmoud Al-Fasher', contactNumber: '021-3600001', establishedDate: '2010-01-01', status: 'ACTIVE', capacity: 5000 },
  { id: 'BR-02', name: 'Misrata Regional Office', location: 'Misrata, City Center', managerName: 'Eng. Salem Al-Gammoudi', contactNumber: '051-2600002', establishedDate: '2015-05-12', status: 'ACTIVE', capacity: 2500 },
  { id: 'BR-03', name: 'Benghazi Strategic Branch', location: 'Benghazi, Al-Fuwaihat', managerName: 'Dr. Khaled Al-Warfalli', contactNumber: '061-4600003', establishedDate: '2018-09-20', status: 'ACTIVE', capacity: 3000 },
  { id: 'BR-04', name: 'Sebha South Campus', location: 'Sebha, Al-Qarda district', managerName: 'Mr. Ali Al-Hasnawi', contactNumber: '071-5600004', establishedDate: '2020-02-15', status: 'ACTIVE', capacity: 1500 }
];

const MOCK_COLLEGES: College[] = [
  { id: 'COL-01', branchId: 'BR-01', name: 'College of Information Technology', deanName: 'Dr. Jamal Ayad' },
  { id: 'COL-02', branchId: 'BR-01', name: 'College of Engineering & Applied Sciences', deanName: 'Dr. Salah Al-Mahdi' },
  { id: 'COL-03', branchId: 'BR-01', name: 'College of Medicine', deanName: 'Dr. Adel Mohammed' },
  { id: 'COL-04', branchId: 'BR-01', name: 'College of Economics & Political Science', deanName: 'Dr. Leila Ali' },
  { id: 'COL-05', branchId: 'BR-02', name: 'College of Technical Sciences - Misrata', deanName: 'Dr. Ahmed Salem' },
  { id: 'COL-06', branchId: 'BR-03', name: 'College of Arts & Humanities - Benghazi', deanName: 'Dr. Mona Masoud' }
];

const MOCK_DEPTS: Department[] = [
  { id: 'DEPT-01', collegeId: 'COL-01', name: 'Department of Computer Science', headName: 'Dr. Mohammed Abdullah', headId: '7' },
  { id: 'DEPT-02', collegeId: 'COL-01', name: 'Department of Software Engineering', headName: 'Dr. Mona Khaled' },
  { id: 'DEPT-03', collegeId: 'COL-01', name: 'Department of Artificial Intelligence', headName: 'Dr. Rami Said' },
  { id: 'DEPT-04', collegeId: 'COL-01', name: 'Department of Networks & Cybersecurity', headName: 'Mr. Jalal Mansour' },
  { id: 'DEPT-05', collegeId: 'COL-02', name: 'Department of Civil Engineering', headName: 'Dr. Nadia Hassan' },
  { id: 'DEPT-06', collegeId: 'COL-02', name: 'Department of Architecture', headName: 'Mr. Mahmoud Jibril' },
  { id: 'DEPT-07', collegeId: 'COL-03', name: 'Department of Clinical Medicine', headName: 'Dr. Salem Al-Wafi' },
  { id: 'DEPT-08', collegeId: 'COL-04', name: 'Department of Accounting & Finance', headName: 'Mr. Fawzi Al-Gammoudi' },
  { id: 'DEPT-09', collegeId: 'COL-04', name: 'Department of Public Administration', headName: 'Dr. Khadija Mahmoud' }
];

const MOCK_PROGRAMS: AcademicProgram[] = [
  { 
    id: 'PRG-01', 
    deptId: 'DEPT-01', 
    name: 'B.Sc. in Computer Science', 
    type: ProgramType.UNDERGRADUATE, 
    durationSemesters: 8,
    qualityMetrics: {
      accreditationStatus: 'NATIONAL',
      nextReviewDate: '2025-12-01',
      targetGraduateRate: 85,
      intendedLearningOutcomes: [
        { id: 'PLO-01', category: 'KNOWLEDGE', description: 'Apply knowledge of computing and mathematics appropriate to the discipline.' },
        { id: 'PLO-02', category: 'SKILLS', description: 'Analyze a problem, and identify and define the computing requirements appropriate to its solution.' },
        { id: 'PLO-03', category: 'COMPETENCIES', description: 'Design, implement, and evaluate a computer-based system, process, component, or program.' }
      ]
    }
  },
  { 
    id: 'PRG-02', 
    deptId: 'DEPT-02', 
    name: 'B.Sc. in Software Engineering', 
    type: ProgramType.UNDERGRADUATE, 
    durationSemesters: 8,
    qualityMetrics: {
      accreditationStatus: 'PENDING',
      nextReviewDate: '2026-06-15',
      targetGraduateRate: 80,
      intendedLearningOutcomes: [
        { id: 'PLO-SE-01', category: 'KNOWLEDGE', description: 'Demonstrate proficiency in software development lifecycle models.' },
        { id: 'PLO-SE-02', category: 'SKILLS', description: 'Apply engineering principles to develop complex software systems.' }
      ]
    }
  },
  { id: 'PRG-03', deptId: 'DEPT-03', name: 'B.Sc. in Artificial Intelligence', type: ProgramType.UNDERGRADUATE, durationSemesters: 8 },
  { id: 'PRG-04', deptId: 'DEPT-03', name: 'M.Sc. in Data Science & AI', type: ProgramType.POSTGRADUATE, durationSemesters: 4 },
  { id: 'PRG-05', deptId: 'DEPT-04', name: 'B.Sc. in Cybersecurity', type: ProgramType.UNDERGRADUATE, durationSemesters: 8 },
  { id: 'PRG-06', deptId: 'DEPT-08', name: 'B.Sc. in Accounting', type: ProgramType.UNDERGRADUATE, durationSemesters: 8 },
  { id: 'PRG-07', deptId: 'DEPT-08', name: 'M.Sc. in International Accounting', type: ProgramType.POSTGRADUATE, durationSemesters: 4 }
];

const MOCK_SECTIONS: Section[] = [
  { id: 'SEC-01', programId: 'PRG-01', name: 'General Stream' },
  { id: 'SEC-02', programId: 'PRG-01', name: 'Advanced Software Stream' },
  { id: 'SEC-03', programId: 'PRG-02', name: 'Systems Engineering Stream' },
  { id: 'SEC-04', programId: 'PRG-03', name: 'Robotics Stream' },
  { id: 'SEC-05', programId: 'PRG-05', name: 'Network Security Stream' },
  { id: 'SEC-06', programId: 'PRG-06', name: 'Auditing Stream' }
];

// Mock Staff Data
const MOCK_STAFF: StaffMember[] = [
  {
    id: 'STF-001',
    name: 'Dr. Ali Al-Tawati',
    nationalId: '119800022331',
    type: 'ACADEMIC',
    degree: 'PhD',
    email: 'ali.t@oraclecampus.edu',
    phone: '0910000001',
    branchId: 'BR-01',
    collegeId: 'COL-01',
    deptId: 'DEPT-03',
    position: 'Associate Professor',
    status: 'ACTIVE',
    joinDate: '2015-09-01',
    specialization: 'Artificial Intelligence'
  },
  {
    id: 'STF-002',
    name: 'Ms. Fatima Al-Zahra',
    nationalId: '219850022334',
    type: 'ADMINISTRATIVE',
    degree: 'Bachelor',
    email: 'fatima.admin@oraclecampus.edu',
    phone: '0910000002',
    branchId: 'BR-01',
    collegeId: 'COL-01',
    position: 'Head of Administrative Affairs',
    status: 'ACTIVE',
    joinDate: '2018-01-15'
  },
  {
      id: 'STF-003',
      name: 'Eng. Khaled Mahmoud',
      nationalId: '119900022335',
      type: 'TECHNICAL',
      degree: 'Bachelor',
      email: 'khaled.m@oraclecampus.edu',
      phone: '0910000003',
      branchId: 'BR-01',
      collegeId: 'COL-01',
      deptId: 'DEPT-01',
      position: 'Lab Engineer',
      status: 'ACTIVE',
      joinDate: '2020-10-10',
      specialization: 'Computer Networks'
  },
  {
      id: 'STF-004',
      name: 'Ms. Zeinab Omar',
      nationalId: '219920022336',
      type: 'ACADEMIC',
      degree: 'Master',
      email: 'zeinab.o@oraclecampus.edu',
      phone: '0910000004',
      branchId: 'BR-01',
      collegeId: 'COL-01',
      deptId: 'DEPT-02',
      position: 'Assistant Lecturer',
      status: 'ACTIVE',
      joinDate: '2021-02-01',
      specialization: 'Software Engineering'
  }
];

const MOCK_BUILDINGS: Building[] = [
    { id: 'BLD001', name: 'Engineering College Building', code: 'ENG-01', floors: 3, description: 'Main building for the College of Engineering housing computer labs' },
    { id: 'BLD002', name: 'Central Auditoriums Complex', code: 'AUD-B', floors: 2, description: 'Dedicated to general lectures, examinations, and scientific seminars' },
    { id: 'BLD003', name: 'Main Administration & Registry', code: 'ADM-G', floors: 4, description: 'Houses registration, finance, and human resources offices' }
];

const MOCK_ROOMS: Room[] = [
    { id: 'RM101', buildingId: 'BLD001', name: 'Hall 101', type: 'LECTURE_HALL', capacity: 60, hasProjector: true, hasAC: true, hasSmartBoard: true, isAvailable: true },
    { id: 'LAB201', buildingId: 'BLD001', name: 'Computer Lab 1', type: 'LAB', capacity: 30, hasProjector: true, hasAC: true, hasPC: true, isAvailable: true },
    { id: 'RM301', buildingId: 'BLD001', name: 'Seminar Room Higher', type: 'SEMINAR_ROOM', capacity: 20, hasProjector: true, hasAC: true, hasSmartBoard: true, isAvailable: true },
    { id: 'AUD-A', buildingId: 'BLD002', name: 'Auditorium (A)', type: 'EXAM_HALL', capacity: 200, hasProjector: true, hasAC: true, isAvailable: true },
    { id: 'AUD-B', buildingId: 'BLD002', name: 'Auditorium (B)', type: 'EXAM_HALL', capacity: 150, hasProjector: true, hasAC: true, isAvailable: true },
    { id: 'OFF-10', buildingId: 'BLD003', name: 'Student Affairs Office', type: 'OFFICE', capacity: 5, hasProjector: false, hasAC: true, isAvailable: true }
];

// Moving helper for Drag and Drop
const moveInArray = (arr: any[], sourceId: string, targetId: string) => {
    const sourceIdx = arr.findIndex(i => i.id === sourceId);
    const targetIdx = arr.findIndex(i => i.id === targetId);
    if (sourceIdx < 0 || targetIdx < 0) return arr;
    
    const newArr = [...arr];
    const [movedItem] = newArr.splice(sourceIdx, 1);
    newArr.splice(targetIdx, 0, movedItem);
    return newArr;
};

// --- Staff Management ---

export const getStaff = (): StaffMember[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_STAFF);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(MOCK_STAFF));
      return MOCK_STAFF;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_STAFF;
  } catch (e) {
    console.error("Error fetching staff:", e);
    return MOCK_STAFF;
  }
};

export const saveStaffMember = (staff: StaffMember) => {
  const data = getStaff();
  const index = data.findIndex(s => s.id === staff.id);
  if (index >= 0) data[index] = staff; else data.push(staff);
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(data));
};

export const deleteStaffMember = (id: string) => {
  const data = getStaff().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(data));
};

// --- Organization structure ---

export const getBranches = (): Branch[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BRANCHES);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(MOCK_BRANCHES));
      return MOCK_BRANCHES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_BRANCHES;
  } catch (e) {
    console.error("Error fetching branches:", e);
    return MOCK_BRANCHES;
  }
};

export const saveBranch = (branch: Branch) => {
  const data = getBranches();
  const index = data.findIndex(b => b.id === branch.id);
  if (index >= 0) data[index] = branch; else data.push(branch);
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(data));
};

export const moveBranch = (sourceId: string, targetId: string) => {
    const data = moveInArray(getBranches(), sourceId, targetId);
    localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(data));
};

export const deleteBranch = (id: string) => {
  const data = getBranches().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(data));
};

export const getBranchById = (id: string): Branch | undefined => {
  return getBranches().find(b => b.id === id);
};

export const getBranchName = (id: string): string => {
  const branch = getBranchById(id);
  return branch ? branch.name : 'Unknown Branch';
};

export const getColleges = (): College[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COLLEGES);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_COLLEGES, JSON.stringify(MOCK_COLLEGES));
      return MOCK_COLLEGES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_COLLEGES;
  } catch (e) {
    console.error("Error fetching colleges:", e);
    return MOCK_COLLEGES;
  }
};

export const saveCollege = (college: College) => {
  const data = getColleges();
  const index = data.findIndex(c => c.id === college.id);
  if (index >= 0) data[index] = college; else data.push(college);
  localStorage.setItem(STORAGE_KEY_COLLEGES, JSON.stringify(data));
};

export const deleteCollege = (id: string) => {
  const data = getColleges().filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY_COLLEGES, JSON.stringify(data));
};

export const moveCollege = (sourceId: string, targetId: string) => {
    const data = moveInArray(getColleges(), sourceId, targetId);
    localStorage.setItem(STORAGE_KEY_COLLEGES, JSON.stringify(data));
};

export const getCollegeById = (id: string): College | undefined => {
  return getColleges().find(c => c.id === id);
};

export const getCollegeName = (id: string): string => {
  const college = getCollegeById(id);
  return college ? college.name : 'Unknown College';
};

export const getDepartments = (): Department[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DEPTS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(MOCK_DEPTS));
      return MOCK_DEPTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_DEPTS;
  } catch (e) {
    console.error("Error fetching departments:", e);
    return MOCK_DEPTS;
  }
};

export const saveDepartment = (dept: Department) => {
  const data = getDepartments();
  const index = data.findIndex(d => d.id === dept.id);
  if (index >= 0) data[index] = dept; else data.push(dept);
  localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(data));
};

export const deleteDepartment = (id: string) => {
  const data = getDepartments().filter(d => d.id !== id);
  localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(data));
};

export const moveDepartment = (sourceId: string, targetId: string) => {
    const data = moveInArray(getDepartments(), sourceId, targetId);
    localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(data));
};

export const getDepartmentById = (id: string): Department | undefined => {
  return getDepartments().find(d => d.id === id);
};

export const getDepartmentName = (id: string): string => {
  const dept = getDepartmentById(id);
  return dept ? dept.name : 'Unknown Department';
};

export const getAcademicPrograms = (): AcademicProgram[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_PROGRAMS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(MOCK_PROGRAMS));
      return MOCK_PROGRAMS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_PROGRAMS;
  } catch (e) {
    console.error("Error fetching programs:", e);
    return MOCK_PROGRAMS;
  }
};

export const saveAcademicProgram = (prog: AcademicProgram) => {
  const data = getAcademicPrograms();
  const index = data.findIndex(p => p.id === prog.id);
  if (index >= 0) data[index] = prog; else data.push(prog);
  localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(data));
};

export const deleteAcademicProgram = (id: string) => {
  const data = getAcademicPrograms().filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(data));
};

export const moveProgram = (sourceId: string, targetId: string) => {
    const data = moveInArray(getAcademicPrograms(), sourceId, targetId);
    localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(data));
};

export const getAcademicProgramById = (id: string): AcademicProgram | undefined => {
  return getAcademicPrograms().find(p => p.id === id);
};

export const getAcademicProgramName = (id: string): string => {
  const prog = getAcademicProgramById(id);
  return prog ? prog.name : 'Unknown Program';
};

export const getSections = (): Section[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SECTIONS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(MOCK_SECTIONS));
      return MOCK_SECTIONS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_SECTIONS;
  } catch (e) {
    console.error("Error fetching sections:", e);
    return MOCK_SECTIONS;
  }
};

// --- Council Decisions ---
export const getCouncilDecisions = (): CouncilDecision[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COUNCIL_DECISIONS);
    if (!data || data === 'undefined' || data === 'null') return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error fetching council decisions:", e);
    return [];
  }
};

export const saveCouncilDecision = (decision: CouncilDecision) => {
    const data = getCouncilDecisions();
    const index = data.findIndex(d => d.id === decision.id);
    if (index >= 0) data[index] = decision; else data.push(decision);
    localStorage.setItem(STORAGE_KEY_COUNCIL_DECISIONS, JSON.stringify(data));
};

export const deleteCouncilDecision = (id: string) => {
    const data = getCouncilDecisions().filter(d => d.id !== id);
    localStorage.setItem(STORAGE_KEY_COUNCIL_DECISIONS, JSON.stringify(data));
};

export const saveSection = (sec: Section) => {
  const data = getSections();
  const index = data.findIndex(s => s.id === sec.id);
  if (index >= 0) data[index] = sec; else data.push(sec);
  localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(data));
};

export const deleteSection = (id: string) => {
  const data = getSections().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(data));
};

export const moveSection = (sourceId: string, targetId: string) => {
    const data = moveInArray(getSections(), sourceId, targetId);
    localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(data));
};

// --- Facilities ---
export const getBuildings = (): Building[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_BUILDINGS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(MOCK_BUILDINGS));
      return MOCK_BUILDINGS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_BUILDINGS;
  } catch (e) {
    console.error("Error fetching buildings:", e);
    return MOCK_BUILDINGS;
  }
};

export const saveBuilding = (building: Building): void => {
  const buildings = getBuildings();
  const index = buildings.findIndex(b => b.id === building.id);
  if (index >= 0) buildings[index] = building;
  else buildings.push(building);
  localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(buildings));
};

export const deleteBuilding = (id: string): void => {
  const buildings = getBuildings().filter(b => b.id !== id);
  localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(buildings));
  const rooms = getRooms().filter(r => r.buildingId !== id);
  localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
};

export const getRooms = (): Room[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ROOMS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(MOCK_ROOMS));
      return MOCK_ROOMS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_ROOMS;
  } catch (e) {
    console.error("Error fetching rooms:", e);
    return MOCK_ROOMS;
  }
};

export const saveRoom = (room: Room): void => {
  const rooms = getRooms();
  const index = rooms.findIndex(r => r.id === room.id);
  if (index >= 0) rooms[index] = room;
  else rooms.push(room);
  localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
};

export const deleteRoom = (id: string): void => {
  const rooms = getRooms().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(rooms));
};

// --- Students ---
export const getStudents = (): Student[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_STUDENTS);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(MOCK_STUDENTS));
      return MOCK_STUDENTS;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_STUDENTS;
  } catch (e) {
    console.error("Error fetching students:", e);
    return MOCK_STUDENTS;
  }
};

export const getStudentById = (id: string): Student | undefined => {
  return getStudents().find(s => s.id === id);
};

export const saveStudent = (student: Student): void => {
  const students = getStudents();
  const index = students.findIndex(s => s.id === student.id);
  if (index >= 0) students[index] = student; else students.push(student);
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(students));
};

export const bulkSaveStudents = (newStudents: Student[]): void => {
    const currentStudents = getStudents();
    const merged = [...currentStudents, ...newStudents];
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(merged));
};

export const deleteStudent = (id: string): void => {
  const students = getStudents();
  const filtered = students.filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(filtered));
};

export const checkNationalIdExists = (nid: string, excludeId?: string): boolean => {
    const students = getStudents();
    const staff = getStaff();
    return students.some(s => s.nationalId === nid && s.id !== excludeId) || 
           staff.some(st => st.nationalId === nid && st.id !== excludeId);
};

export const checkBuildingCodeExists = (code: string, excludeId?: string): boolean => {
    const buildings = getBuildings();
    return buildings.some(b => b.code.toLowerCase() === code.toLowerCase() && b.id !== excludeId);
};

export const checkRoomNameExists = (buildingId: string, name: string, excludeId?: string): boolean => {
    const rooms = getRooms();
    return rooms.some(r => r.buildingId === buildingId && r.name.toLowerCase() === name.toLowerCase() && r.id !== excludeId);
};

// --- Courses ---
export const getCourses = (): Course[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_COURSES);
    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(MOCK_COURSES));
      return MOCK_COURSES;
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : MOCK_COURSES;
  } catch (e) {
    console.error("Error fetching courses:", e);
    return MOCK_COURSES;
  }
};

export const saveCourse = (course: Course): void => {
  const courses = getCourses();
  const index = courses.findIndex(c => c.id === course.id);
  if (index >= 0) courses[index] = course; else courses.push(course);
  localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(courses));
};

export const deleteCourse = (id: string): void => {
  const courses = getCourses();
  const filtered = courses.filter(c => c.id !== id);
  localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(filtered));
};

let cachedSettings: ISystemSettings | null = null;
let lastSettingsData: string | null = null;

// --- Settings ---
export const getSystemSettings = (): ISystemSettings => {
  const data = localStorage.getItem(STORAGE_KEY_SETTINGS);
  
  if (data === lastSettingsData && cachedSettings) {
    return cachedSettings;
  }
  
  lastSettingsData = data;
  
  if (!data) {
    cachedSettings = DEFAULT_SETTINGS;
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(data);
    // Ensure regulation exists and is merged with defaults for future-proofing
    cachedSettings = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      regulation: {
        ...DEFAULT_SETTINGS.regulation,
        ...(parsed.regulation || {})
      },
      finance: {
        ...DEFAULT_SETTINGS.finance,
        ...(parsed.finance || {})
      },
      superadmin: {
        ...DEFAULT_SETTINGS.superadmin!,
        ...(parsed.superadmin || {})
      },
      calendarStages: parsed.calendarStages || DEFAULT_SETTINGS.calendarStages
    };
    return cachedSettings!;
  } catch (e) {
    console.error("Failed to parse settings, falling back to defaults", e);
    cachedSettings = DEFAULT_SETTINGS;
    return DEFAULT_SETTINGS;
  }
};

export const saveSystemSettings = (settings: ISystemSettings): void => {
  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  cachedSettings = null;
  lastSettingsData = null;
};

export const resetToFactoryData = (): void => {
  localStorage.removeItem(STORAGE_KEY_STUDENTS);
  localStorage.removeItem(STORAGE_KEY_COURSES);
  localStorage.removeItem(STORAGE_KEY_SETTINGS);
  localStorage.removeItem(STORAGE_KEY_BUILDINGS);
  localStorage.removeItem(STORAGE_KEY_ROOMS);
  localStorage.removeItem(STORAGE_KEY_STAFF);
  localStorage.removeItem(STORAGE_KEY_BRANCHES);
  localStorage.removeItem(STORAGE_KEY_COLLEGES);
  localStorage.removeItem(STORAGE_KEY_DEPTS);
  localStorage.removeItem(STORAGE_KEY_PROGRAMS);
  localStorage.removeItem(STORAGE_KEY_SECTIONS);
  localStorage.removeItem(STORAGE_KEY_NOTIFICATIONS);
  localStorage.removeItem(STORAGE_KEY_COUNCIL_DECISIONS);
  
  // Re-initialize by calling get methods which trigger mock data loading
  getSystemSettings();
  getBranches();
  getColleges();
  getDepartments();
  getAcademicPrograms();
  getStaff();
  getStudents();
  getCourses();
  getBuildings();
  getRooms();
};

export const exportSystemData = (): string => {
  const data = {
    students: getStudents(),
    courses: getCourses(),
    settings: getSystemSettings(),
    buildings: getBuildings(),
    rooms: getRooms(),
    branches: getBranches(),
    colleges: getColleges(),
    departments: getDepartments(),
    programs: getAcademicPrograms(),
    sections: getSections(),
    staff: getStaff(),
    timestamp: new Date().toISOString(),
    version: '3.2'
  };
  return JSON.stringify(data, null, 2);
};

export const importSystemData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (!data.students || !data.courses || !data.settings) throw new Error("Invalid data");
    localStorage.setItem(STORAGE_KEY_STUDENTS, JSON.stringify(data.students));
    localStorage.setItem(STORAGE_KEY_COURSES, JSON.stringify(data.courses));
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(data.settings));
    if (data.buildings) localStorage.setItem(STORAGE_KEY_BUILDINGS, JSON.stringify(data.buildings));
    if (data.rooms) localStorage.setItem(STORAGE_KEY_ROOMS, JSON.stringify(data.rooms));
    if (data.branches) localStorage.setItem(STORAGE_KEY_BRANCHES, JSON.stringify(data.branches));
    if (data.colleges) localStorage.setItem(STORAGE_KEY_COLLEGES, JSON.stringify(data.colleges));
    if (data.departments) localStorage.setItem(STORAGE_KEY_DEPTS, JSON.stringify(data.departments));
    if (data.programs) localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(data.programs));
    if (data.sections) localStorage.setItem(STORAGE_KEY_SECTIONS, JSON.stringify(data.sections));
    if (data.staff) localStorage.setItem(STORAGE_KEY_STAFF, JSON.stringify(data.staff));
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

// --- Finance Transactions ---
export const getTransactions = (): Transaction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_TRANSACTIONS);
    if (!data || data === 'undefined' || data === 'null') return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error fetching transactions:", e);
    return [];
  }
};

export const getStudentTransactions = (studentId: string): Transaction[] => {
  return getTransactions().filter(t => t.studentId === studentId);
};

export const saveTransaction = (transaction: Transaction) => {
  const data = getTransactions();
  const index = data.findIndex(t => t.id === transaction.id);
  if (index >= 0) data[index] = transaction; else data.push(transaction);
  localStorage.setItem(STORAGE_KEY_TRANSACTIONS, JSON.stringify(data));
};

export const getStudentBalance = (studentId: string): number => {
  const txs = getStudentTransactions(studentId);
  return txs.reduce((acc, t) => {
    return t.type === 'CREDIT' ? acc + t.amount : acc - t.amount;
  }, 0);
};

// --- Course Registration ---
export const getRegistrationWindows = (): RegistrationWindow[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_REG_WINDOWS);
    const defaultWindow: RegistrationWindow = {
      id: 'RW-2024-FALL',
      semester: 'FALL 2024',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isActive: true,
      minCredits: 12,
      maxCredits: 21
    };

    if (!data || data === 'undefined' || data === 'null') {
      localStorage.setItem(STORAGE_KEY_REG_WINDOWS, JSON.stringify([defaultWindow]));
      return [defaultWindow];
    }
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [defaultWindow];
  } catch (e) {
    console.error("Error fetching registration windows:", e);
    return [];
  }
};

export const getActiveRegistrationWindow = (): RegistrationWindow | undefined => {
  return getRegistrationWindows().find(w => w.isActive);
};

export const enrollInCourse = (studentId: string, courseId: string, semester: string): void => {
  const students = getStudents();
  const student = students.find(s => s.id === studentId);
  const course = getCourses().find(c => c.id === courseId);
  
  if (!student || !course) return;
  
  const enrollment = {
    courseId,
    courseName: course.name,
    semester,
    status: 'PENDING_APPROVAL' as const,
    enrollmentDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'UNPAID' as const
  };
  
  const enrollments = student.enrollments || [];
  if (enrollments.some(e => e.courseId === courseId && e.semester === semester)) return;
  
  student.enrollments = [...enrollments, enrollment];
  saveStudent(student);
};

// --- Exam Scheduling ---
export const getExamSessions = (): ExamSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY_EXAM_SESSIONS);
    if (!data || data === 'undefined' || data === 'null') return [];
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Error fetching exam sessions:", e);
    return [];
  }
};

export const saveExamSession = (session: ExamSession) => {
  const sessions = getExamSessions();
  const index = sessions.findIndex(s => s.id === session.id);
  if (index >= 0) sessions[index] = session; else sessions.push(session);
  localStorage.setItem(STORAGE_KEY_EXAM_SESSIONS, JSON.stringify(sessions));
};

export const deleteExamSession = (id: string) => {
  const sessions = getExamSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY_EXAM_SESSIONS, JSON.stringify(sessions));
};

// --- End of storageService ---
