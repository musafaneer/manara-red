
import { AuthUser, UserRole, Permission, ABACResource, ABACContext } from '../types';
import { getRoleById } from './rbacService';

const STORAGE_KEY_SESSION = 'oracle_campus_session';
const STORAGE_KEY_EFFECTIVE_ROLE = 'oracle_campus_effective_role';

// Mock Users for Simulation with ABAC attributes
const MOCK_USERS: AuthUser[] = [
    { 
        id: '1', username: 'admin', name: 'Musa Faneer', role: UserRole.SUPER_ADMIN, 
        system_scope: 'global' 
    },
    { 
        id: '2', username: 'registrar', name: 'Ahmed Ali', role: UserRole.REGISTRATION_OFFICER,
        unit: 'registration', assigned_area: 'Engineering'
    },
    { 
        id: '3', username: 'finance', name: 'Sarah Hassan', role: UserRole.FINANCE_OFFICER,
        financial_scope: 'student_fees'
    },
    { 
        id: '4', username: 'faculty', name: 'Dr. Salim', role: UserRole.FACULTY,
        instructor_user_id: 'prof_salim', department: 'CS', faculty: 'IT'
    },
    { 
        id: 'STU-NEW-001', username: 'student', name: 'Omar Farouq Al-Libi', role: UserRole.STUDENT,
        student_id: 'STU-NEW-001', department: 'DEPT-01'
    },
    { 
        id: 'STF-001', username: 'faculty', name: 'Dr. Ali Al-Tawati', role: UserRole.FACULTY,
        instructor_user_id: 'STF-001', department: 'DEPT-03', faculty: 'COL-01'
    },
    { 
        id: 'STF-002', username: 'hr', name: 'Ms. Fatima Al-Zahra', role: UserRole.HR_OFFICER,
        department: 'HR'
    },
    { 
        id: 'STF-001', username: 'dept_head', name: 'Dr. Ali Al-Tawati', role: UserRole.DEPT_HEAD,
        department: 'DEPT-03', faculty: 'COL-01'
    },
    { 
        id: '8', username: 'dean', name: 'Dr. Omar', role: UserRole.DEAN,
        faculty: 'IT'
    },
    { 
        id: '9', username: 'graduate', name: 'Dr. Laila', role: UserRole.GRADUATE_OFFICER,
        assigned_area: 'IT'
    },
    { 
        id: '10', username: 'exams', name: 'Exam Dept', role: UserRole.EXAMS_OFFICER,
        assigned_area: 'General'
    },
    { 
        id: '11', username: 'appeals', name: 'Reviewer 1', role: UserRole.APPEALS_COMMITTEE,
        committee_id: 'COM_001'
    },
    { 
        id: '12', username: 'ta', name: 'Omar TA', role: UserRole.TA_ASSISTANT,
        instructor_user_id: 'ta_omar'
    },
    { 
        id: '13', username: 'records', name: 'Clerk 1', role: UserRole.ACADEMIC_REGISTRAR
    },
    { 
        id: '14', username: 'steward', name: 'Data Admin', role: UserRole.DATA_STEWARD,
        data_domain: 'curriculum'
    },
    { 
        id: '15', username: 'visitor', name: 'External 1', role: UserRole.VISITOR_EXAMINER,
        assignment_id: 'EXT_ENG_2024'
    }
];

/**
 * ABAC Authorization Engine (Implementation of 15 Core Roles Logic)
 */
export const can = (
    user: AuthUser | null, 
    action: string, 
    resource: ABACResource, 
    context: ABACContext = {}
): boolean => {
    if (!user) return false;
    const role = user.effectiveRole || user.role;

    // 1. Student (طالب)
    if (role === UserRole.STUDENT) {
        if (resource.type === 'personal_info' || resource.type === 'grades' || resource.type === 'transcript' || resource.type === 'service_request') {
            return resource.owner_student_id === user.student_id;
        }
        if (resource.type === 'course_enrollment') {
            const isMyEnrollment = resource.owner_student_id === user.student_id;
            const isTermActive = context.current_term?.active === true;
            return isMyEnrollment && isTermActive;
        }
    }

    // 2. Faculty (عضو هيئة تدريس)
    if (role === UserRole.FACULTY) {
        const isInstructor = resource.course_instructor_id === user.instructor_user_id;
        const isDeptMember = resource.department === user.department;
        
        if (action === 'grade_entry') {
            return isInstructor && context.current_term?.grade_entry_window === true;
        }
        if (action === 'view_students' || action === 'manage_content') {
            return isInstructor || isDeptMember;
        }
    }

    // 3. Department Head (رئيس قسم)
    if (role === UserRole.DEPT_HEAD) {
        const isMyDept = resource.department === user.department;
        const isWorkflowInScope = resource.workflow_stage !== undefined && resource.workflow_stage <= 2; // Assuming 2 is dept_head_stage
        
        if (action === 'approve' || action === 'view_reports') {
            return isMyDept && isWorkflowInScope;
        }
    }

    // 4. Dean (عميد)
    if (role === UserRole.DEAN) {
       const isMyFaculty = resource.faculty === user.faculty;
       const isWorkflowInScope = resource.workflow_stage !== undefined && resource.workflow_stage <= 4; // Assuming 4 is dean_stage
       
       if (action === 'approve' || action === 'manage_faculty_settings') {
           return isMyFaculty && isWorkflowInScope;
       }
    }

    // 5. Registration Officer (موظف تسجيل)
    if (role === UserRole.REGISTRATION_OFFICER) {
        const isRegistrationUnit = user.unit === 'registration';
        const isInScope = resource.faculty === user.assigned_area || resource.department === user.assigned_area || user.assigned_area === 'General';
        
        if (action === 'process_enrollment' || action === 'update_status') {
            return isRegistrationUnit && isInScope;
        }
    }

    // 6. Graduate Officer (دراسات عليا)
    if (role === UserRole.GRADUATE_OFFICER) {
        const isGraduateLevel = resource.program_level === 'graduate';
        const isInScope = resource.faculty === user.assigned_area || resource.department === user.assigned_area || user.assigned_area === 'General';
        
        if (action === 'process_grad_request' || action === 'manage_grad_enrollment') {
            return isGraduateLevel && isInScope;
        }
    }

    // 7. Exams Officer (شؤون الامتحانات)
    if (role === UserRole.EXAMS_OFFICER) {
        const isExamPhase = ['setup', 'running', 'results_processing'].includes(context.current_term?.exams_status || '');
        const isInScope = user.assigned_area === 'General' || resource.faculty === user.assigned_area;
        
        if (action === 'manage_schedule' || action === 'release_results') {
            return isExamPhase && isInScope;
        }
    }

    // 8. Appeals Committee (لجنة تظلمات)
    if (role === UserRole.APPEALS_COMMITTEE) {
        const isAppeal = context.request?.type === 'appeal';
        const isAssigned = context.request?.assigned_to_committee_id === user.committee_id;
        const isPending = context.request?.status === 'pending_review';
        
        if (action === 'review' || action === 'decision') {
            return isAppeal && isAssigned && isPending;
        }
    }

    // 9. TA Assistant (معيد/مساعد)
    if (role === UserRole.TA_ASSISTANT) {
        const isAssigned = resource.course_assistant_id === user.instructor_user_id;
        const isWindowOpen = context.current_term?.assessment_window === true;
        
        if (action === 'entry_work_grades' || action === 'manage_assignments') {
            return isAssigned && isWindowOpen;
        }
    }

    // 10. Finance Officer (موظف مالية)
    if (role === UserRole.FINANCE_OFFICER) {
        const isSameScope = resource.financial_scope === user.financial_scope || user.financial_scope === 'all';
        const isPendingState = ['PENDING', 'PARTIAL'].includes(resource.status || '');
        
        if (action === 'settle_fees' || action === 'view_debts') {
            return isSameScope && isPendingState;
        }
    }

    // 11. HR Officer (موظف HR)
    if (role === UserRole.HR_OFFICER) {
        if (action === 'manage_employee') {
            return resource.employee_department === user.department || user.department === 'HR';
        }
    }

    // 12. IT Admin (IT Admin)
    if (role === UserRole.IT_ADMIN) {
        if (user.system_scope === 'global') return true;
        
        if (action === 'manage_rbac' || action === 'view_logs') {
            return true;
        }
    }

    // 13. Academic Registrar (أمناء سجل)
    if (role === UserRole.ACADEMIC_REGISTRAR) {
        const allowedTypes = ['transcript', 'enrollment_cert', 'graduation_doc'];
        if (action === 'issue_doc' || action === 'print_official') {
            return allowedTypes.includes(resource.record_type || '');
        }
    }

    // 14. Data Steward (مراقب بيانات)
    if (role === UserRole.DATA_STEWARD) {
        const isMyDomain = resource.data_domain === user.data_domain;
        const isApprovedForChange = resource.status === 'approved_for_change';
        
        if (action === 'modify_reference' || action === 'audit_quality') {
            return isMyDomain && isApprovedForChange;
        }
    }

    // 15. Visitor Examiner (ممتحن زائر)
    if (role === UserRole.VISITOR_EXAMINER) {
        const isMyAssignment = resource.assignment_id === user.assignment_id;
        const isExamRunning = context.current_term?.exams_running === true;
        const isVisible = (resource.visibility_level || 0) <= (user.visibility_level || 1);
        
        if (action === 'view_exam_work' || action === 'review_scores') {
            return isMyAssignment && isExamRunning && isVisible;
        }
    }

    return false;
};

export const login = async (username: string, password: string): Promise<AuthUser> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 600));

    if (password === username) {
        const user = MOCK_USERS.find(u => u.username === username);
        if (user) {
            localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
            // Clear any previous switched role on new login
            localStorage.removeItem(STORAGE_KEY_EFFECTIVE_ROLE);
            clearAuthCache();
            return user;
        }
    }
    throw new Error('Invalid credentials');
};

export const logout = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    localStorage.removeItem(STORAGE_KEY_EFFECTIVE_ROLE);
    clearAuthCache();
};

export const switchRole = (role: string | null) => {
    if (!role) {
        localStorage.removeItem(STORAGE_KEY_EFFECTIVE_ROLE);
    } else {
        localStorage.setItem(STORAGE_KEY_EFFECTIVE_ROLE, role);
    }
    // Refresh page to apply changes throughout the app
    window.location.reload();
};

let cachedUser: AuthUser | null = null;
let lastSessionData: string | null = null;
let lastEffectiveRole: string | null = null;

export const getCurrentUser = (): AuthUser | null => {
    const data = localStorage.getItem(STORAGE_KEY_SESSION);
    const effectiveRole = localStorage.getItem(STORAGE_KEY_EFFECTIVE_ROLE);

    if (data === lastSessionData && effectiveRole === lastEffectiveRole && cachedUser) {
        return cachedUser;
    }

    lastSessionData = data;
    lastEffectiveRole = effectiveRole;
    if (data) {
        try {
            const user: AuthUser = JSON.parse(data);
            
            // Apply effective role if the user is a super admin or IT admin
            if ((user.role === UserRole.SUPER_ADMIN || user.role === UserRole.IT_ADMIN) && effectiveRole) {
                cachedUser = { ...user, effectiveRole };
            } else {
                cachedUser = user;
            }
            
            return cachedUser;
        } catch (e) {
            cachedUser = null;
            return null;
        }
    }
    cachedUser = null;
    return null;
};

const clearAuthCache = () => {
    cachedUser = null;
    lastSessionData = null;
    lastEffectiveRole = null;
};

export const hasPermission = (user: AuthUser | null, required: Permission | Permission[]): boolean => {
    if (!user) return false;
    
    const activeRole = user.effectiveRole || user.role;
    const roleDef = getRoleById(activeRole);
    if (!roleDef) return false;
    
    // If real role is SUPER_ADMIN, but we are NOT switched or we switched TO SUPER_ADMIN
    if (user.role === UserRole.SUPER_ADMIN && (!user.effectiveRole || user.effectiveRole === UserRole.SUPER_ADMIN)) {
        return true;
    }

    // IT_ADMIN should be treated as a normal role now, governed by its specific permission set
    // unless they switch back to SUPER_ADMIN (if they had it)

    const permissions = Array.isArray(required) ? required : [required];
    return permissions.every(p => roleDef.permissions.includes(p));
};

export const getAccessibleTabs = (user: AuthUser | null): string[] => {
    if (!user) return ['dashboard', 'regulations'];
    
    const activeRole = user.effectiveRole || user.role;
    const isStudent = activeRole === UserRole.STUDENT;
    
    const tabs: { id: string, perms: Permission[] }[] = [
        { id: 'dashboard', perms: [] },
        { id: 'tasks', perms: [] },
        { id: 'department', perms: [Permission.DEPT_MANAGE] },
        { id: 'compliance', perms: [Permission.SETTINGS_MANAGE, Permission.REPORTS_VIEW] }, 
        { id: 'students', perms: [Permission.STUDENTS_VIEW] },
        { id: 'organization', perms: [Permission.ORGANIZATION_MANAGE] },
        { id: 'courses_mgmt', perms: [Permission.ACADEMICS_VIEW] },
        { id: 'curriculum', perms: [Permission.ACADEMICS_VIEW] },
        { id: 'dept_performance', perms: [Permission.REPORTS_VIEW, Permission.DEPT_MANAGE] },
        // Registration is accessible to staff with perms OR students themselves
        { id: 'registration', perms: isStudent ? [] : [Permission.ACADEMICS_VIEW] }, 
        { id: 'course_registration', perms: isStudent ? [] : [Permission.REGISTRATION_MANAGE] },
        { id: 'grading_portal', perms: [Permission.GRADES_EDIT] },
        { id: 'transcript', perms: [Permission.GRADES_VIEW] },
        { id: 'academics', perms: [Permission.ACADEMICS_VIEW] }, 
        { id: 'facilities', perms: [Permission.FACILITIES_MANAGE] },
        { id: 'schedule', perms: [] }, 
        { id: 'calendar', perms: [] }, 
        { id: 'exams', perms: [Permission.EXAMS_VIEW] }, 
        { id: 'faculty', perms: [Permission.FACULTY_MANAGE] },
        { id: 'staff', perms: [Permission.STAFF_MANAGE] },
        { id: 'attendance', perms: [Permission.ATTENDANCE_MANAGE] }, 
        { id: 'financials', perms: [Permission.FINANCE_VIEW] }, 
        { id: 'finance_portal', perms: isStudent ? [] : [Permission.FINANCE_VIEW] },
        { id: 'graduate_studies', perms: [Permission.GRADUATE_MANAGE] },
        { id: 'requests', perms: [Permission.REQUESTS_MANAGE] }, 
        { id: 'communications', perms: [Permission.COMMUNICATIONS_MANAGE] },
        { id: 'reports', perms: [Permission.REPORTS_VIEW] },
        { id: 'graduates', perms: [Permission.STUDENTS_VIEW] },
        { id: 'graduation_requirements', perms: isStudent ? [] : [Permission.ACADEMICS_VIEW] },
        { id: 'roles', perms: [Permission.ROLES_MANAGE] },
        { id: 'audit', perms: [Permission.AUDIT_VIEW] },
        { id: 'regulations', perms: [] },
        { id: 'wallet', perms: [] },
        { id: 'settings', perms: [Permission.SETTINGS_MANAGE] },
    ];

    // Filter by permissions based on the ACTIVE role
    return tabs
        .filter(tab => tab.perms.length === 0 || hasPermission(user, tab.perms))
        .map(tab => tab.id);
};
