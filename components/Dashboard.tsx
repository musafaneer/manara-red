import React from 'react';
import { motion } from 'motion/react';
import { 
    CheckCircle2, ArrowRight
} from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { UserRole, AuthUser } from '../types';
import { Language } from '../services/i18nService';

// Import Modularized Dashboards
import AcademicDashboard from './dashboards/AcademicDashboard';
import FinanceDashboard from './dashboards/FinanceDashboard';
import FacultyDashboard from './dashboards/FacultyDashboard';
import StrategicDashboard from './dashboards/StrategicDashboard';
import DepartmentDashboard from './dashboards/DepartmentDashboard';
import StudentDashboard from './dashboards/StudentDashboard';

// Import Fragments
import NotificationCenter from './dashboard-fragments/NotificationCenter';
import StrategicAudit from './dashboard-fragments/StrategicAudit';
import SystemPulse from './dashboard-fragments/SystemPulse';
import QuickActions from './dashboard-fragments/QuickActions';
import { reportingService } from '../services/reportingService';

const Dashboard: React.FC<{ setActiveTab?: (tab: string) => void; language: Language }> = ({ setActiveTab, language }) => {
    const currentUser = getCurrentUser();
    const kpis = reportingService.getUniversityKPIs();

    if (!currentUser) return null;

    const role = (currentUser.effectiveRole || currentUser.role) as UserRole;

    const renderHeader = () => {
        let title = '';
        let subtitle = '';

        switch (role) {
            case UserRole.IT_ADMIN:
                title = language !== 'en' ? 'مركز التحكم التقني' : 'IT Command Center';
                subtitle = language !== 'en' ? 'إدارة الهويات، تدقيق العمليات، وسلامة النظام' : 'Identity Governance, Audit Tracing & Infrastructure Integrity';
                break;
            case UserRole.REGISTRATION_OFFICER:
            case UserRole.ACADEMIC_REGISTRAR:
                title = language !== 'en' ? 'برج التحكم الأكاديمي' : 'Academic Control Tower';
                subtitle = language !== 'en' ? 'إدارة السجلات، الامتثال، ودورات حياة الطلاب' : 'Registries, Compliance Audits, and Learner Life-cycles';
                break;
            case UserRole.FINANCE_OFFICER:
                title = language !== 'en' ? 'مركز السيولة والتحصيل' : 'Liquidity & Recovery Hub';
                subtitle = language !== 'en' ? 'مراقبة التدفقات النقدية والضمانات المالية' : 'Cash-Flow Monitoring & Fiscal Safeguards';
                break;
            case UserRole.FACULTY:
            case UserRole.TA_ASSISTANT:
                title = language !== 'en' ? 'بوابة التميز الأكاديمي' : 'Instructional Executive Hub';
                subtitle = language !== 'en' ? 'إدارة الأجندة التعليمية ومخرجات التعلم' : 'Agenda Orchestration & Learning Outcomes';
                break;
            case UserRole.DEPT_HEAD:
            case UserRole.DATA_STEWARD:
                title = language !== 'en' ? 'بوابة رئاسة القسم' : 'Departmental Oversight';
                subtitle = language !== 'en' ? 'إدارة الخطط الدراسية وكفاءة الأقسام' : 'Curriculum Governance & Faculty Bandwidth';
                break;
            case UserRole.DEAN:
                title = language !== 'en' ? 'مكتب العميد الاستراتيجي' : 'Dean\'s Strategic Office';
                subtitle = language !== 'en' ? 'الإشراف على الكلية والنمو المؤسسي' : 'Faculty Oversight & Institutional Strategic Growth';
                break;
            case UserRole.GRADUATE_OFFICER:
                title = language !== 'en' ? 'مركز الدراسات العليا' : 'Graduate & Research Hub';
                subtitle = language !== 'en' ? 'إدارة الأبحاث والأطروحات المتقدمة' : 'Advanced Research, Dissertations & Postgrad Pathways';
                break;
            case UserRole.EXAMS_OFFICER:
            case UserRole.VISITOR_EXAMINER:
                title = language !== 'en' ? 'مركز الامتحانات والتقييم' : 'Exams & Assessment Center';
                subtitle = language !== 'en' ? 'إدارة الاختبارات والنزاهة الأكاديمية' : 'Test Orchestration & Academic Integrity Protocol';
                break;
            case UserRole.APPEALS_COMMITTEE:
                title = language !== 'en' ? 'بوابة مراجعة التظلمات' : 'Appeal Review Portal';
                subtitle = language !== 'en' ? 'تحقيق العدالة الأكاديمية والشفافية' : 'Academic Justice, Transparency & Fair Review';
                break;
            case UserRole.HR_OFFICER:
                title = language !== 'en' ? 'إدارة رأس المال البشري' : 'Human Capital Management';
                subtitle = language !== 'en' ? 'إدارة الكادر الوظيفي والمسار المهني' : 'Career Progression & Faculty Lifecycle Operations';
                break;
            case UserRole.STUDENT:
                title = language !== 'en' ? 'بوابة النجاح الأكاديمي' : 'Learner Achievement Portal';
                subtitle = language !== 'en' ? 'مسار التقدم والجدول الزمني الشخصي' : 'Personal Progression Vector & Synchronized Schedule';
                break;
            default:
                title = language !== 'en' ? 'لوحة المعلومات' : 'Global Operations';
                subtitle = language !== 'en' ? 'النظام المركزي للمعلومات' : 'Integrated Information System (Nexus)';
        }

        return (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 mb-16 group">
                <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                         <span className="px-4 py-1.5 bg-slate-100 text-slate-800 rounded-full text-[9px] font-black uppercase tracking-[0.3em] italic border border-slate-200 shadow-sm">
                            {role} Authority
                        </span>
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]"></div>
                    </div>
                    <motion.h2 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-xl md:text-2xl font-black text-slate-900 tracking-tight uppercase italic leading-none transition-transform group-hover:-translate-x-1 duration-700"
                    >
                        {title}
                    </motion.h2>
                    <motion.p 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-slate-400 font-bold italic text-[10px] tracking-wide uppercase flex items-center gap-4"
                    >
                        <span className="w-8 h-px bg-slate-200"></span>
                        {subtitle}
                    </motion.p>
                </div>

                <div className="flex flex-wrap items-center gap-6">
                    {/* Executive KPIs Mini-Summary */}
                    <div className="hidden lg:flex items-center gap-10 px-10 py-6 bg-slate-50 border border-slate-100 rounded-[2.5rem]">
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Success Rate</p>
                            <p className="text-xl font-black text-indigo-600 italic leading-none">{kpis.averageGPA}%</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Risk Population</p>
                            <p className="text-xl font-black text-rose-500 italic leading-none">{kpis.atWariningCount}</p>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Institutional Yield</p>
                            <p className="text-xl font-black text-emerald-600 italic leading-none">{kpis.totalStudents}</p>
                        </div>
                    </div>
                    
                    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-all hover:bg-indigo-50/10">
                        <div className="flex flex-col items-end">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Authenticated Node</p>
                             <p className="text-sm font-black text-slate-900 italic uppercase">{currentUser.name}</p>
                        </div>
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2.5xl flex items-center justify-center p-3">
                             <CheckCircle2 className="text-indigo-500" />
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderDashboardContent = () => {
        switch (role) {
            case UserRole.IT_ADMIN:
                return (
                    <div className="space-y-16">
                        <QuickActions setActiveTab={setActiveTab} language={language} role={role} />
                        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                            <div className="xl:col-span-8">
                                <StrategicAudit language={language} />
                            </div>
                            <div className="xl:col-span-4">
                                <SystemPulse language={language} />
                            </div>
                        </div>
                        <StrategicDashboard language={language} />
                    </div>
                );
            case UserRole.REGISTRATION_OFFICER:
            case UserRole.ACADEMIC_REGISTRAR:
                return (
                    <div className="space-y-16">
                        <QuickActions setActiveTab={setActiveTab} language={language} role={role} />
                        <AcademicDashboard language={language} />
                    </div>
                );
            case UserRole.FINANCE_OFFICER:
                return <FinanceDashboard language={language} />;
            case UserRole.FACULTY:
            case UserRole.TA_ASSISTANT:
                return <FacultyDashboard language={language} />;
            case UserRole.DEPT_HEAD:
            case UserRole.DEAN:
            case UserRole.DATA_STEWARD:
                return <DepartmentDashboard language={language} />;
            case UserRole.STUDENT:
                return <StudentDashboard language={language} currentUser={currentUser} setActiveTab={setActiveTab} />;
            default:
                return <AcademicDashboard language={language} />;
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFDFD] p-10 md:p-16 pb-32">
            <div className="max-w-[1600px] mx-auto space-y-16">
                {renderHeader()}
                
                <NotificationCenter role={role} studentId={currentUser.id} language={language} />
                
                {renderDashboardContent()}
            </div>
        </div>
    );
};

export default Dashboard;
