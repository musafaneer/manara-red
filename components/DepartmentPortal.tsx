
import React, { useState, useEffect } from 'react';
import { 
  Users, BookOpen, Clock, FileText, CheckCircle, AlertCircle, 
  ChevronLeft, MessageSquare, Calendar, Building2, UserCircle2,
  TrendingUp, Download, PieChart, Info, ShieldCheck, Mail, MapPin,
  MoreVertical, Search, Plus, Filter, LayoutGrid, List, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getStudents, 
  getCourses, 
  getDepartments,
  getRooms,
  getCouncilDecisions,
  saveCouncilDecision,
  deleteCouncilDecision
} from '../services/storageService';
import { getRequests } from '../services/requestService';
import { getInstructors } from '../services/facultyService';
import { 
  Student, Course, Instructor, Department, ServiceRequest, 
  Permission, UserRole, RequestStatus, CouncilDecision 
} from '../types';
import { getCurrentUser, hasPermission } from '../services/authService';
import StatCard from './StatCard';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import DepartmentStudentPerformance from './DepartmentStudentPerformance';
import { cn } from '../lib/utils';

import { Language } from '../services/i18nService';

interface DepartmentPortalProps {
    language?: Language;
}

const DepartmentPortal: React.FC<DepartmentPortalProps> = ({ language = 'ar' }) => {
    const [students, setStudents] = useState<Student[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [instructors, setInstructors] = useState<Instructor[]>([]);
    const [requests, setRequests] = useState<ServiceRequest[]>([]);
    const [department, setDepartment] = useState<Department | null>(null);
    const [activeSubTab, setActiveSubTab] = useState<'overview' | 'faculty' | 'curriculum' | 'students' | 'council'>('overview');
    const [councilDecisions, setCouncilDecisions] = useState<CouncilDecision[]>([]);
    const [showCouncilModal, setShowCouncilModal] = useState(false);
    const [newDecision, setNewDecision] = useState<Partial<CouncilDecision>>({
        title: '',
        description: '',
        status: 'PROPOSED',
        meetingNumber: ''
    });
    
    const currentUser = getCurrentUser();
    const activeRole = currentUser?.effectiveRole || currentUser?.role;

    useEffect(() => {
        const allStudents = getStudents();
        const allCourses = getCourses();
        const allInstructors = getInstructors();
        const allDepts = getDepartments();
        const allRequests = getRequests();

        // Find the department where the user is the head
        const myDept = allDepts.find(d => d.headId === currentUser?.id || d.headName === currentUser?.name);
        
        if (myDept) {
            setDepartment(myDept);
            setStudents(allStudents.filter(s => s.departmentId === myDept.id));
            setInstructors(allInstructors.filter(i => i.departmentId === myDept.id));
            setRequests(allRequests.filter(r => {
                const s = allStudents.find(st => st.id === r.studentId);
                return s?.departmentId === myDept.id;
            }));
            // Typically courses might be linked via specialized mapping, assume all for simplicity or use a prefix
            setCourses(allCourses.filter(c => !c.deptId || c.deptId === myDept.id));
            setCouncilDecisions(getCouncilDecisions().filter(d => d.deptId === myDept.id));
        } else if (currentUser?.role === UserRole.IT_ADMIN) {
            // Admin sees the first dept as default for testing
            const firstDept = allDepts[0];
            setDepartment(firstDept);
            setStudents(allStudents.filter(s => s.departmentId === firstDept.id));
            setInstructors(allInstructors.filter(i => i.departmentId === firstDept.id));
            setRequests(allRequests.filter(r => {
                const s = allStudents.find(st => st.id === r.studentId);
                return s?.departmentId === firstDept.id;
            }));
            setCourses(allCourses.filter(c => !c.deptId || c.deptId === firstDept.id));
            setCouncilDecisions(getCouncilDecisions().filter(d => d.deptId === firstDept.id));
        }
    }, [currentUser]);

    const handleSaveDecision = (e: React.FormEvent) => {
        e.preventDefault();
        if (!department) return;

        const decision: CouncilDecision = {
            id: `DEC-${Date.now()}`,
            deptId: department.id,
            title: newDecision.title || '',
            description: newDecision.description || '',
            date: new Date().toISOString().split('T')[0],
            meetingNumber: newDecision.meetingNumber || '',
            status: newDecision.status as any || 'PROPOSED'
        };

        saveCouncilDecision(decision);
        setCouncilDecisions([decision, ...councilDecisions]);
        setShowCouncilModal(false);
        setNewDecision({ title: '', description: '', status: 'PROPOSED', meetingNumber: '' });
        notifySuccess(language === 'ar' ? 'تم حفظ قرار المجلس بنجاح' : 'Council decision saved successfully');
    };

    const handleDeleteDecision = (id: string) => {
        if (confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذا القرار؟' : 'Are you sure you want to delete this decision?')) {
            deleteCouncilDecision(id);
            setCouncilDecisions(councilDecisions.filter(d => d.id !== id));
            notifyInfo(language === 'ar' ? 'تم حذف القرار' : 'Decision deleted');
        }
    };

    const stats: { label: string; value: number; color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'emerald'; icon: any }[] = [
        { label: language === 'ar' ? 'طلاب القسم' : 'Department Students', value: students.length, color: 'blue', icon: Users },
        { label: language === 'ar' ? 'أعضاء هيئة التدريس' : 'Faculty Members', value: instructors.length, color: 'indigo', icon: UserCircle2 },
        { label: language === 'ar' ? 'المقررات الدراسية' : 'Curriculum Courses', value: courses.length, color: 'emerald', icon: BookOpen },
        { label: language === 'ar' ? 'طلبات قيد المراجعة' : 'Pending Requests', value: requests.filter(r => r.status === 'PENDING').length, color: 'yellow', icon: Clock },
    ];

    if (!department) {
        return (
            <div className="p-12 flex flex-col items-center justify-center text-slate-400">
                <AlertCircle size={48} className="mb-4" />
                <h2 className="text-xl font-bold">{language === 'ar' ? 'لم يتم العثور على بيانات القسم' : 'Department Data Not Found'}</h2>
                <p>{language === 'ar' ? 'يرجى التأكد من تعيينك رئيساً لقسم علمي في النظام.' : 'Please ensure you are assigned as a Department Head in the system.'}</p>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow">
                        <Building2 size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-slate-800 tracking-tight">{language === 'ar' ? 'بوابة القسم العلمي' : 'Scientific Department Portal'}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full uppercase">{language === 'ar' ? 'رئيس القسم' : 'Department Head'}</span>
                            <span className="text-slate-400 text-sm font-medium">{language === 'ar' ? 'قسم' : 'Dept.'} {department.name}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-black text-xs">
                        <Download size={16} />
                        {language === 'ar' ? 'تصدير التقارير' : 'Export Reports'}
                    </button>
                    <button 
                        onClick={() => setShowCouncilModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-black text-xs shadow-lg shadow-blue-200"
                    >
                        <Plus size={16} />
                        {language === 'ar' ? 'إضافة قرار مجلس القسم' : 'Add Council Decision'}
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, i) => (
                    <StatCard key={i} {...stat} />
                ))}
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-px">
                {[
                    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: LayoutGrid },
                    { id: 'faculty', label: language === 'ar' ? 'هيئة التدريس' : 'Faculty', icon: UserCircle2 },
                    { id: 'curriculum', label: language === 'ar' ? 'الخطط والمقررات' : 'Curriculum', icon: BookOpen },
                    { id: 'students', label: language === 'ar' ? 'شؤون الطلاب' : 'Students', icon: Users },
                    { id: 'council', label: language === 'ar' ? 'مجلس القسم الأكاديمي' : 'Department Council', icon: ShieldCheck },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 relative ${
                            activeSubTab === tab.id 
                            ? 'border-blue-600 text-blue-600' 
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {activeSubTab === tab.id && (
                            <motion.div layoutId="subtab-active" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeSubTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeSubTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Department Info & Head Mission */}
                            <div className="lg:col-span-2 space-y-6">
                                <section className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                                        <Info className="text-blue-600" />
                                        {language === 'ar' ? 'صلاحيات ومهام رئيس القسم' : 'Department Head Authorities & Tasks'}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {[
                                            language === 'ar' ? 'الإشراف على الشؤون العلمية والأكاديمية والإدارية والمالية في القسم.' : 'Supervision of scientific, academic, administrative, and financial affairs in the department.',
                                            language === 'ar' ? 'رئاسة مجلس القسم والدعوة لانعقاده واعتماد قراراته.' : 'Chairing the department council, calling for its meetings, and approving its decisions.',
                                            language === 'ar' ? 'اقتراح تعيين أعضاء هيئة التدريس والباحثين والمعيدين بالقسم.' : 'Proposing the appointment of faculty members, researchers, and teaching assistants in the department.',
                                            language === 'ar' ? 'توزيع الأعباء الدراسية على أعضاء هيئة التدريس.' : 'Distributing teaching loads to faculty members.',
                                            language === 'ar' ? 'متابعة مستوى الأداء العلمي للأكاديميين والطلاب بالقسم.' : 'Monitoring the scientific performance level of academics and students in the department.',
                                            language === 'ar' ? 'اعتماد الخطط الدراسية والمناهج المقترحة من قبل لجان القسم.' : 'Approving study plans and curricula proposed by department committees.'
                                        ].map((task, idx) => (
                                            <div key={idx} className="flex gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-start">
                                                <div className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0 text-xs font-black">
                                                    {idx + 1}
                                                </div>
                                                <p className="text-sm text-slate-700 leading-relaxed font-bold">{task}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-3xl text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                                        <div className="relative z-10">
                                            <h4 className="text-indigo-200 font-black text-xs uppercase tracking-widest mb-2">{language === 'ar' ? 'القادم' : 'Upcoming'}</h4>
                                            <p className="text-2xl font-black mb-4 leading-tight">{language === 'ar' ? 'اجتماع مجلس القسم الدوري #8' : 'Regular Dept. Council Meeting #8'}</p>
                                            <div className="flex items-center gap-2 text-sm text-indigo-100 font-bold bg-white/10 w-fit px-4 py-2 rounded-full">
                                                <Calendar size={14} />
                                                {language === 'ar' ? 'الثلاثاء، 12 مايو • 10:00 صباحاً' : 'Tuesday, May 12 • 10:00 AM'}
                                            </div>
                                        </div>
                                        <ShieldCheck size={120} className="absolute -bottom-6 -left-6 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                                    </div>
                                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                                <TrendingUp size={24} />
                                            </div>
                                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-black">{language === 'ar' ? 'نشط' : 'Active'}</span>
                                        </div>
                                        <h4 className="text-lg font-black text-slate-800 mb-2">{language === 'ar' ? 'أداء الطلاب العام' : 'Overall Student Performance'}</h4>
                                        <p className="text-sm text-slate-500 font-medium mb-4">{language === 'ar' ? 'متوسط المعدل التراكمي لطلاب القسم (GPA)' : 'Average Cumulative GPA for Dept. Students'}</p>
                                        <div className="flex items-end gap-2">
                                            <span className="text-3xl font-black text-slate-800">3.42</span>
                                            <span className="text-emerald-500 text-xs font-bold mb-1">{language === 'ar' ? '+0.12 من الفصل السابق' : '+0.12 from last semester'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recent Activity / Requests Sidebar */}
                            <div className="space-y-6">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                    <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                        <MessageSquare className="text-blue-600" />
                                        {language === 'ar' ? 'طلبات بانتظار الموافقة' : 'Requests Awaiting Approval'}
                                    </h3>
                                    <div className="space-y-3">
                                        {requests.filter(r => r.status === 'PENDING').slice(0, 4).map(req => (
                                            <div key={req.id} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl hover:border-blue-200 transition-all cursor-pointer group">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">{req.studentName}</span>
                                                    <span className="text-[9px] text-slate-400 font-medium">{req.submissionDate}</span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold truncate mb-3">{req.type}</p>
                                                <div className="flex gap-2">
                                                    <button className="flex-1 py-1.5 bg-blue-600 text-white text-[9px] font-black rounded-lg hover:bg-blue-700 transition-all shadow-sm">{language === 'ar' ? 'اعتماد' : 'Approve'}</button>
                                                    <button className="flex-1 py-1.5 bg-white text-slate-500 border border-slate-200 text-[9px] font-black rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all">{language === 'ar' ? 'رفض' : 'Reject'}</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full mt-4 py-3 text-blue-600 text-xs font-black hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200">
                                        {language === 'ar' ? 'عرض كافة الطلبات' : 'View All Requests'}
                                    </button>
                                </div>

                                <div className="bg-blue-900 p-6 rounded-3xl text-white">
                                    <div className="flex items-center gap-3 mb-4">
                                        <PieChart size={20} className="text-blue-400" />
                                        <h3 className="text-sm font-black">{language === 'ar' ? 'تحليل العبء الدراسي' : 'Academic Load Analysis'}</h3>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span>{language === 'ar' ? 'أكاديميين (PhD)' : 'PhD Academics'}</span>
                                                <span>75%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-blue-400" style={{ width: '75%' }} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-bold">
                                                <span>{language === 'ar' ? 'متعاونين' : 'Collaborators'}</span>
                                                <span>25%</span>
                                            </div>
                                            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-indigo-400" style={{ width: '25%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'faculty' && (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <div className="relative w-full md:w-96">
                                    <Search className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400", language === 'ar' ? "right-4" : "left-4")} size={18} />
                                    <input 
                                        type="text" 
                                        placeholder={language === 'ar' ? "البحث عن عضو هيئة تدريس..." : "Search for faculty member..."}
                                        className={cn(
                                            "w-full py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 font-bold transition-all",
                                            language === 'ar' ? "pr-12 pl-4" : "pl-12 pr-4"
                                        )}
                                    />
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-xl transition-all">
                                        <Filter size={20} />
                                    </button>
                                    <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-sm shadow-xl shadow-blue-100">
                                        <Plus size={18} />
                                        {language === 'ar' ? 'إضافة عضو هيئة تدريس' : 'Add Faculty Member'}
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50/50">
                                        <tr>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">{language === 'ar' ? 'الاسم' : 'Name'}</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">{language === 'ar' ? 'الدرجة العلمية' : 'Degree'}</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">{language === 'ar' ? 'التخصص الدقيق' : 'Specialization'}</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">{language === 'ar' ? 'العبء الدراسي' : 'Teaching Load'}</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {instructors.map(inst => (
                                            <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center font-black text-sm">
                                                            {inst.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-800">{inst.name}</p>
                                                            <p className={cn("text-[10px] text-slate-400 font-bold flex items-center gap-1", language === 'ar' ? "flex-row" : "flex-row-reverse")}>
                                                                <Mail size={10} />
                                                                {inst.email}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                                        inst.degree === 'PhD' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {inst.degree === 'PhD' ? (language === 'ar' ? 'دكتوراه' : 'PhD') : inst.degree}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-600">{inst.specialization}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-black text-slate-800">{inst.courseIds.length} {language === 'ar' ? 'مواد' : 'Courses'}</span>
                                                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-blue-500" style={{ width: `${Math.min(inst.courseIds.length * 20, 100)}%` }} />
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex gap-2">
                                                        <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                                            <FileText size={16} />
                                                        </button>
                                                        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
                                                            <MoreVertical size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'students' && (
                        <DepartmentStudentPerformance students={students} courses={courses} language={language} />
                    )}

                    {activeSubTab === 'curriculum' && (
                        <div className="space-y-6">
                            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-8">
                                    <div>
                                        <h3 className="text-xl font-black text-slate-800">{language === 'ar' ? 'المناهج والخطط الدراسية' : 'Curricula & Study Plans'}</h3>
                                        <p className="text-sm text-slate-500 font-medium">{language === 'ar' ? 'إدارة المقررات وتوزيع الفصول الدراسية' : 'Manage courses and semester distribution'}</p>
                                    </div>
                                    <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-xs shadow-lg shadow-blue-100">
                                        <Plus size={16} />
                                        {language === 'ar' ? 'إضافة مقرر جديد' : 'Add New Course'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(semester => {
                                        const semesterCourses = courses.filter(c => c.semester === semester);
                                        return (
                                            <div key={semester} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="font-black text-slate-800">{language === 'ar' ? 'الفصل الدراسي' : 'Semester'} {semester}</h4>
                                                    <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black">{semesterCourses.length} {language === 'ar' ? 'مقررات' : 'Courses'}</span>
                                                </div>
                                                <div className="space-y-2">
                                                    {semesterCourses.map(course => (
                                                        <div key={course.id} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center group hover:border-blue-300 transition-all">
                                                            <div className="overflow-hidden">
                                                                <p className="text-xs font-black text-slate-800 truncate">{course.name}</p>
                                                                <p className="text-[9px] text-slate-400 font-bold">{course.code} • {course.credits} {language === 'ar' ? 'وحدات' : 'Credits'}</p>
                                                            </div>
                                                            <button className="p-1.5 text-slate-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                                                                <List size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {semesterCourses.length === 0 && (
                                                        <p className="text-[10px] text-slate-400 text-center py-4 italic">{language === 'ar' ? 'لا توجد مقررات مضافة' : 'No courses added'}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'council' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-8">
                                            <h3 className="text-xl font-black text-slate-800">{language === 'ar' ? 'الأرشيف الرقمي لقرارات المجلس' : 'Digital Archive of Council Decisions'}</h3>
                                            <div className="flex gap-2">
                                                <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Search size={18} />
                                                </button>
                                                <button className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all">
                                                    <Filter size={18} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {councilDecisions.map(decision => (
                                                <div key={decision.id} className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row justify-between gap-6 hover:border-blue-200 transition-all">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase">#{decision.meetingNumber}</span>
                                                            <span className="text-[10px] text-slate-400 font-bold">{decision.date}</span>
                                                        </div>
                                                        <h4 className="text-lg font-black text-slate-800">{decision.title}</h4>
                                                        <p className="text-sm text-slate-500 font-medium leading-relaxed">{decision.description}</p>
                                                    </div>
                                                    <div className="flex md:flex-col items-center md:items-end justify-between shrink-0 gap-2">
                                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black ${
                                                            decision.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600' : 
                                                            decision.status === 'PROPOSED' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {decision.status === 'APPROVED' ? (language === 'ar' ? 'معتمد' : 'Approved') : 
                                                             decision.status === 'PROPOSED' ? (language === 'ar' ? 'قيد المراجعة' : 'Proposed') : (language === 'ar' ? 'مؤرشف' : 'Archived')}
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button className="p-2 text-slate-400 hover:text-blue-600 rounded-lg transition-all" title="تحميل الوثيقة">
                                                                <Download size={18} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleDeleteDecision(decision.id)}
                                                                className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-all" title="حذف"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {councilDecisions.length === 0 && (
                                                <div className="text-center py-16 text-slate-400">
                                                    <FileText size={48} className="mx-auto mb-4 opacity-20" />
                                                    <p className="font-bold">{language === 'ar' ? 'لا توجد قرارات مجلس مؤرشفة حالياً' : 'No archived council decisions currently'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                                        <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                                            <ShieldCheck className="text-blue-600" />
                                            {language === 'ar' ? 'أعضاء مجلس القسم' : 'Dept. Council Members'}
                                        </h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-2xl">
                                                <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center font-black text-sm">
                                                    {department.headName?.charAt(0) || 'D'}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-800">{department.headName}</p>
                                                    <p className="text-[10px] text-blue-600 font-bold">{language === 'ar' ? 'رئيس المجلس' : 'Council Head'}</p>
                                                </div>
                                            </div>
                                            {department.councilMembers?.map((member, idx) => (
                                                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-100 rounded-2xl">
                                                    <div className="w-10 h-10 bg-slate-200 text-slate-500 rounded-xl flex items-center justify-center font-black text-sm">
                                                        {member.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-800">{member}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'عضو مجلس' : 'Council Member'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            <button className="w-full py-3 text-blue-600 text-[10px] font-black hover:bg-blue-50 rounded-xl transition-all border border-dashed border-blue-200 mt-2">
                                                {language === 'ar' ? 'تعديل قائمة الأعضاء' : 'Edit Member List'}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl text-white shadow-xl">
                                        <h4 className="text-sm font-black mb-4 flex items-center gap-2">
                                            <Info size={16} className="text-blue-400" />
                                            {language === 'ar' ? 'إحصائيات اجتماعات المجلس' : 'Council Meeting Stats'}
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'إجمالي القرارات (2024)' : 'Total Decisions (2024)'}</span>
                                                <span className="text-xl font-black">24</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-400 font-bold">{language === 'ar' ? 'نسبة التنفيذ' : 'Execution Rate'}</span>
                                                <span className="text-xl font-black text-emerald-400">92%</span>
                                            </div>
                                            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-400" style={{ width: '92%' }} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modal for adding council decisions */}
                    {showCouncilModal && (
                        <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
                            >
                                <div className="bg-slate-900 text-white p-6 flex justify-between items-center">
                                    <h3 className="text-xl font-black flex items-center gap-3">
                                        <ShieldCheck className="text-blue-400" />
                                        {language === 'ar' ? 'قرار مجلس قسم جديد' : 'New Dept. Council Decision'}
                                    </h3>
                                    <button onClick={() => setShowCouncilModal(false)} className="p-2 hover:bg-slate-800 rounded-lg transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                                <form onSubmit={handleSaveDecision} className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">{language === 'ar' ? 'رقم المحضر' : 'Meeting #'}</label>
                                            <input 
                                                required
                                                type="text" 
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                                placeholder="e.g. 8-2024"
                                                value={newDecision.meetingNumber}
                                                onChange={e => setNewDecision({...newDecision, meetingNumber: e.target.value})}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">{language === 'ar' ? 'الحالة' : 'Status'}</label>
                                            <select 
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                                value={newDecision.status}
                                                onChange={e => setNewDecision({...newDecision, status: e.target.value as any})}
                                            >
                                                <option value="PROPOSED">{language === 'ar' ? 'مقترح' : 'Proposed'}</option>
                                                <option value="APPROVED">{language === 'ar' ? 'معتمد' : 'Approved'}</option>
                                                <option value="ARCHIVED">{language === 'ar' ? 'مؤرشف' : 'Archived'}</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">{language === 'ar' ? 'عنوان القرار' : 'Decision Title'}</label>
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                            value={newDecision.title}
                                            onChange={e => setNewDecision({...newDecision, title: e.target.value})}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-500 mb-2 uppercase tracking-widest">{language === 'ar' ? 'تفاصيل القرار' : 'Decision Details'}</label>
                                        <textarea 
                                            required
                                            rows={4}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all font-bold"
                                            value={newDecision.description}
                                            onChange={e => setNewDecision({...newDecision, description: e.target.value})}
                                        />
                                    </div>
                                    <div className="pt-4 flex gap-3">
                                        <button 
                                            type="button"
                                            onClick={() => setShowCouncilModal(false)}
                                            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-sm hover:bg-slate-200 transition-all"
                                        >
                                            {language === 'ar' ? 'إلغاء' : 'Cancel'}
                                        </button>
                                        <button 
                                            type="submit"
                                            className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                                        >
                                            {language === 'ar' ? 'حفظ القرار' : 'Save Decision'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default DepartmentPortal;
