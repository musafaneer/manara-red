
import { Course, AcademicPlan, PlanSemester } from '../types';

const COURSES_KEY = 'oracle_campus_courses';
const PLANS_KEY = 'oracle_campus_plans';

// Initial Mock Plans
const MOCK_PLANS: AcademicPlan[] = [
  {
    id: 'PLAN-CS-2024',
    programId: 'PRG-01',
    version: '2024.1',
    isActive: true,
    totalCredits: 132,
    semesters: [
      { semesterNumber: 1, courses: ['CS101', 'MA101', 'EN101'] },
      { semesterNumber: 2, courses: ['CS102', 'MA102', 'PH101'] }
    ]
  }
];

export const getAcademicPlans = (): AcademicPlan[] => {
  const data = localStorage.getItem(PLANS_KEY);
  if (!data) {
    localStorage.setItem(PLANS_KEY, JSON.stringify(MOCK_PLANS));
    return MOCK_PLANS;
  }
  return JSON.parse(data);
};

export const saveAcademicPlan = (plan: AcademicPlan): void => {
  const plans = getAcademicPlans();
  const index = plans.findIndex(p => p.id === plan.id);
  if (index >= 0) plans[index] = plan;
  else plans.push(plan);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
};

export const deleteAcademicPlan = (id: string): void => {
  const plans = getAcademicPlans().filter(p => p.id !== id);
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
};

export const getPlanByProgramId = (programId: string): AcademicPlan | undefined => {
  return getAcademicPlans().find(p => p.programId === programId && p.isActive);
};
