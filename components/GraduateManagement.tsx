
import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, BookOpen, Microscope, ClipboardCheck, Users, 
  Search, Plus, Filter, MoreVertical, ExternalLink, 
  Calendar, Award, MessageSquare, TrendingUp, AlertCircle,
  FileText, ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getTheses, 
  getPublications, 
  getThesisStatusLabel,
  saveThesis,
  savePublication,
  getSupervisors
} from '../services/graduateService';
import { GraduateThesis, ResearchPublication, ThesisStatus, UserRole } from '../types';
import { cn } from '../lib/utils';
import StatCard from './StatCard';
import { notifySuccess, notifyError } from '../services/notificationService';

import { Language } from '../services/i18nService';

interface GraduateManagementProps {
    language?: Language;
}

const GraduateManagement: React.FC<GraduateManagementProps> = ({ language = 'ar' }) => {
  const [theses, setTheses] = useState<GraduateThesis[]>([]);
  const [publications, setPublications] = useState<ResearchPublication[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'theses' | 'research' | 'supervisors' | 'admissions'>('theses');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'thesis' | 'research' | 'detail'>('thesis');
  const [selectedThesis, setSelectedThesis] = useState<GraduateThesis | null>(null);

  const handleUpdateMilestone = (milestoneId: string) => {
    if (!selectedThesis) return;
    
    const updatedMilestones = selectedThesis.milestones?.map(m => 
      m.id === milestoneId 
        ? { ...m, status: m.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED' as any, completedDate: m.status === 'COMPLETED' ? undefined : new Date().toISOString().split('T')[0] }
        : m
    );

    const updatedThesis = { ...selectedThesis, milestones: updatedMilestones };
    setSelectedThesis(updatedThesis);
    
    // Update main list
    setTheses(prev => prev.map(t => t.id === selectedThesis.id ? updatedThesis : t));
    notifySuccess('تم تحديث حالة المرحلة البحثية');
  };

  const handleUpdateStatus = (newStatus: ThesisStatus) => {
    if (!selectedThesis) return;
    const updatedThesis = { ...selectedThesis, status: newStatus };
    setSelectedThesis(updatedThesis);
    setTheses(prev => prev.map(t => t.id === selectedThesis.id ? updatedThesis : t));
    notifySuccess(`تم تغيير الحالة إلى: ${getThesisStatusLabel(newStatus)}`);
  };
  
  // Form States
  const [newThesis, setNewThesis] = useState<Partial<GraduateThesis>>({
    status: ThesisStatus.PROPOSAL_SUBMITTED,
    progressPercentage: 0,
    startDate: new Date().toISOString().split('T')[0]
  });
  const [newPub, setNewPub] = useState<Partial<ResearchPublication>>({
    status: 'SUBMITTED',
    publicationDate: new Date().toISOString().split('T')[0]
  });

  const handleSaveItem = () => {
    if (modalType === 'thesis') {
      if (!newThesis.studentName || !newThesis.title || !newThesis.advisorName) {
        notifyError('يرجى ملء جميع الحقول الإلزامية');
        return;
      }
      const item: GraduateThesis = {
        ...newThesis,
        id: `TH-${Date.now()}`,
      } as GraduateThesis;
      saveThesis(item);
      setTheses(getTheses());
    } else {
      if (!newPub.title || !newPub.journalName || !newPub.studentId) {
        notifyError('يرجى ملء جميع الحقول الإلزامية');
        return;
      }
      const item: ResearchPublication = {
        ...newPub,
        id: `PUB-${Date.now()}`,
      } as ResearchPublication;
      savePublication(item);
      setPublications(getPublications());
    }
    setShowModal(false);
    notifySuccess('تم الحفظ بنجاح');
  };

  useEffect(() => {
    setTheses(getTheses());
    setPublications(getPublications());
    setSupervisors(getSupervisors());
  }, []);

  const stats = [
    { label: 'أطروحات قيد البحث', value: theses.filter(t => t.status === ThesisStatus.RESEARCH_IN_PROGRESS).length, color: 'blue', icon: Microscope },
    { label: 'أطروحات قيد الكتابة', value: theses.filter(t => t.status === ThesisStatus.THESIS_WRITING).length, color: 'indigo', icon: FileText },
    { label: 'أوراق بحثية منشورة', value: publications.filter(p => p.status === 'PUBLISHED').length, color: 'emerald', icon: Award },
    { label: 'طلبات تقديم جديدة', value: 12, color: 'amber', icon: Search },
  ];

  const filteredTheses = theses.filter(t => 
    t.studentName.includes(searchQuery) || 
    t.title.includes(searchQuery) ||
    t.advisorName.includes(searchQuery)
  );

  const filteredPubs = publications.filter(p => 
    p.title.includes(searchQuery) || 
    p.studentId.includes(searchQuery)
  );

  const filteredSupervisors = supervisors.filter(s => 
    s.name.includes(searchQuery) || 
    s.specialization.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const admissionsData = [
    { id: 'ADM-01', name: 'ياسين الفايد', program: 'PhD Computing', proposal: 'تحليل البيانات الجغرافية في الزراعة الذكية', gpa: '3.90/4.0', status: 'REVIEW', university: 'King Saud University', researchInterests: ['AI', 'Agri-Tech'] },
    { id: 'ADM-02', name: 'ليلى منصور', program: 'MSc Cybersecurity', proposal: 'أمن بروتوكولات إنترنت الأشياء في الرعاية الصحية', gpa: '3.75/4.0', status: 'PENDING', university: 'King Abdulaziz University', researchInterests: ['IoT', 'Security'] },
  ];

  const filteredAdmissions = admissionsData.filter(app => 
    app.name.includes(searchQuery) || 
    app.program.includes(searchQuery)
  );

  const getRiskLevel = (thesis: GraduateThesis) => {
    const elapsedMonths = (new Date().getTime() - new Date(thesis.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
    if (thesis.progressPercentage < (elapsedMonths * 3) && thesis.progressPercentage < 50) return 'HIGH';
    if (thesis.progressPercentage < (elapsedMonths * 5)) return 'MEDIUM';
    return 'LOW';
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
            <GraduationCap size={32} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">إدارة الدراسات العليا</h2>
            <p className="text-slate-400 text-sm font-medium mt-1">تنظيم ومتابعة البحث العلمي وبرامج الدراسات العليا</p>
          </div>
        </div>
        
        {/* Risk Alerts */}
        <div className="hidden lg:flex gap-4">
          {theses.filter(t => getRiskLevel(t) === 'HIGH').length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-100 rounded-2xl animate-pulse">
              <AlertCircle className="text-rose-600" size={20} />
              <div>
                <p className="text-[10px] font-black text-rose-600 uppercase tracking-wider">تنبيه حرج</p>
                <p className="text-xs font-bold text-rose-900">{theses.filter(t => getRiskLevel(t) === 'HIGH').length} أطروحات متأخرة جداً</p>
              </div>
            </div>
          )}
          {supervisors.filter(s => s.studentCount >= s.maxCapacity).length > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-100 rounded-2xl">
              <Users className="text-amber-600" size={20} />
              <div>
                <p className="text-[10px] font-black text-amber-600 uppercase tracking-wider">توزيع الأعباء</p>
                <p className="text-xs font-bold text-amber-900">{supervisors.filter(s => s.studentCount >= s.maxCapacity).length} مشرفين بكامل طاقتهم</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-all font-black text-xs">
            <TrendingUp size={16} />
            مصروفات البحث
          </button>
          <button 
            onClick={() => {
              setModalType('thesis');
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-black text-xs shadow-lg shadow-indigo-200"
          >
            <Plus size={16} />
            تسجيل أطروحة جديدة
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} label={stat.label} value={stat.value} color={stat.color as any} icon={stat.icon} />
        ))}
      </div>

      {/* Tabs Control */}
      <div className="flex gap-1 bg-slate-100/50 p-1 rounded-2xl w-fit">
        {[
          { id: 'theses', label: 'الأطروحات العلمية', icon: BookOpen },
          { id: 'research', label: 'الإنتاج البحثي', icon: Microscope },
          { id: 'supervisors', label: 'المشرفين', icon: Users },
          { id: 'admissions', label: 'القبول والتسجيل', icon: ClipboardCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-black transition-all",
              activeTab === tab.id 
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200" 
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {activeTab === 'theses' && (
          <>
            <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-96">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder="البحث عن طالب، مشرف، أو عنوان أطروحة..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-12 pl-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500/20 font-bold transition-all"
                />
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2 text-slate-500 hover:text-indigo-600 font-bold text-xs">
                  <Filter size={16} />
                  تصفية النتائج
                </button>
                <div className="h-4 w-px bg-slate-200 mx-2" />
                <span className="text-xs font-black text-slate-400">إجمالي: {filteredTheses.length} أطروحة</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">الطالب والعنوان</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">الإشراف العلمي</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">الحالة والمخاطر</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">الإنجاز</th>
                    <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest border-b border-slate-50">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredTheses.map(thesis => {
                    const risk = getRiskLevel(thesis);
                    return (
                      <tr 
                        key={thesis.id} 
                        onClick={() => {
                          setSelectedThesis(thesis);
                          setModalType('detail');
                          setShowModal(true);
                        }}
                        className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                      >
                        <td className="px-6 py-5">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                              {thesis.studentName.charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 mb-1">{thesis.studentName}</p>
                              <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-sm">{thesis.title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                            <Users size={16} className="text-slate-300" />
                            <span>{thesis.advisorName}</span>
                            {thesis.coAdvisorName && (
                              <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-400">+{thesis.coAdvisorName}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1 font-mono">تاريخ البدء: {thesis.startDate}</p>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col gap-2">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black tracking-tight border w-fit",
                              thesis.status === ThesisStatus.THESIS_WRITING ? "bg-amber-50 text-amber-600 border-amber-100" :
                              thesis.status === ThesisStatus.RESEARCH_IN_PROGRESS ? "bg-blue-50 text-blue-600 border-blue-100" :
                              "bg-slate-50 text-slate-500 border-slate-100"
                            )}>
                              {getThesisStatusLabel(thesis.status)}
                            </span>
                            {risk !== 'LOW' && (
                              <span className={cn(
                                "flex items-center gap-1 text-[9px] font-black uppercase tracking-tighter",
                                risk === 'HIGH' ? "text-rose-600" : "text-amber-600"
                              )}>
                                <AlertCircle size={12} />
                                {risk === 'HIGH' ? 'تأخر عالي' : 'تأخر متوسط'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="w-full max-w-[120px] space-y-1.5">
                            <div className="flex justify-between text-[10px] font-black">
                              <span className="text-indigo-600">{thesis.progressPercentage}%</span>
                              <span className="text-slate-400">مكتمل</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${thesis.progressPercentage}%` }}
                                className="h-full bg-indigo-600 rounded-full"
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="تعديل البيانات">
                              <ClipboardCheck size={18} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="التواصل">
                              <MessageSquare size={18} />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all" title="تحديد موعد مناقشة">
                              <Calendar size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'research' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">الإنتاج العلمي المنشور</h3>
              <button 
                onClick={() => {
                  setModalType('research');
                  setShowModal(true);
                }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-xs hover:bg-indigo-700 transition-all"
              >
                إضافة منشور بحثي
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredPubs.map(pub => (
                <div key={pub.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100 hover:border-indigo-200 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-indigo-600">
                      <Microscope size={24} />
                    </div>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-black",
                      pub.status === 'PUBLISHED' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                    )}>
                      {pub.status === 'PUBLISHED' ? 'تم النشر' : 'مقبول للنشر'}
                    </span>
                  </div>
                  <h4 className="font-black text-slate-800 mb-2 line-clamp-2">{pub.title}</h4>
                  <p className="text-xs text-slate-500 font-medium mb-4">{pub.journalName}</p>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-slate-200/60">
                    <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <Calendar size={14} />
                      {pub.publicationDate}
                    </span>
                    {pub.url && (
                      <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-700 text-xs font-black flex items-center gap-1">
                        رابط البحث
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'supervisors' && (
          <div className="p-8 space-y-8">
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-center">
              <div className="relative w-full md:w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  placeholder="بحث عن مشرف أو تخصص..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي المشرفين المتاحين: {filteredSupervisors.length}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">إجمالي المشرفين</p>
                  <p className="text-3xl font-black text-indigo-900">{supervisors.length}</p>
               </div>
               <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">إجمالي الطلاب</p>
                  <p className="text-3xl font-black text-emerald-900">{theses.length}</p>
               </div>
               <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">متوسط العبء الإشرافي</p>
                  <p className="text-3xl font-black text-slate-800">{(theses.length / (supervisors.length || 1)).toFixed(1)}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSupervisors.map(sup => (
                <div key={sup.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg">
                      {sup.name.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800">{sup.name}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sup.specialization}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الطلاب</p>
                      <p className="text-xl font-black text-indigo-600">{sup.studentCount}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الأبحاث</p>
                      <p className="text-xl font-black text-emerald-600">{sup.publications}</p>
                    </div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-wider">
                      <span className="text-slate-400">نسبة الإشغال</span>
                      <span className={cn(
                        sup.studentCount >= sup.maxCapacity ? "text-rose-600" : "text-indigo-600"
                      )}>{(sup.studentCount / sup.maxCapacity) * 100}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          sup.studentCount >= sup.maxCapacity ? "bg-rose-500" : "bg-indigo-500"
                        )}
                        style={{ width: `${(sup.studentCount / sup.maxCapacity) * 100}%` }}
                      />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 text-center">
                      {sup.studentCount >= sup.maxCapacity ? '⚠️ السعة مكتملة' : `متبقي ${sup.maxCapacity - sup.studentCount} مقاعد للإشراف`}
                    </p>
                  </div>
                  
                  <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                    <FileText size={16} />
                    عرض السيرة العلمية
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'admissions' && (
          <div className="p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">طلبات القبول والتسجيل</h3>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black border border-blue-100">
                  {2} بانتظار المراجعة
                </span>
                <button className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black hover:bg-slate-800 transition-colors">
                  تصدير تقرير القبول
                </button>
              </div>
            </div>
            <div className="bg-white border border-slate-50 rounded-3xl overflow-hidden shadow-sm">
              <table className="w-full text-right text-sm">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-xs">المتقدم</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-xs">البرنامج والمقترح</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-xs">المعدل السابق</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-xs">الحالة</th>
                    <th className="px-6 py-4 font-black text-slate-500 uppercase tracking-widest text-xs text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredAdmissions.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-500 font-black text-xs">
                              {app.name.charAt(0)}
                           </div>
                           <div>
                              <p className="font-black text-slate-800">{app.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{app.id}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs font-black text-indigo-600">{app.program}</p>
                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{app.proposal}</p>
                      </td>
                      <td className="px-6 py-5">
                         <div className="flex flex-col">
                            <span className="font-black text-slate-700">{app.gpa}</span>
                            <span className="text-[10px] text-slate-400">{app.university}</span>
                         </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={cn(
                          "px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider",
                          app.status === 'REVIEW' ? "bg-indigo-50 text-indigo-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {app.status === 'REVIEW' ? 'تحت المراجعة العلمية' : 'بانتظار تدقيق الوثائق'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex justify-center gap-2">
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               notifySuccess('تمت الموافقة على الملف');
                             }}
                             className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors" title="قبول الطلب"
                           >
                             <ShieldCheck size={16} />
                           </button>
                           <button 
                             onClick={(e) => {
                               e.stopPropagation();
                               notifyError('تم تحويل الطلب للمراجعة الإضافية');
                             }}
                             className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors" title="مراجعة مستفيضة"
                           >
                             <Search size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-8 p-6 bg-slate-900 rounded-[2rem] text-white">
               <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                     <h4 className="text-lg font-black mb-1">إعدادات نافذة القبول القادمة</h4>
                     <p className="text-slate-400 text-xs font-bold">الموعد المستهدف لفتح التقديم: 1 سبتمبر 2026</p>
                  </div>
                  <div className="flex gap-3">
                     <button className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-black text-xs transition-all">تعديل الشروط</button>
                     <button className="px-6 py-3 bg-indigo-500 hover:bg-indigo-400 rounded-xl font-black text-xs transition-all">بدء الحملة الترويجية</button>
                  </div>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center">
                    {modalType === 'thesis' ? <BookOpen size={20} /> : 
                     modalType === 'research' ? <Microscope size={20} /> : 
                     <GraduationCap size={20} />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">
                      {modalType === 'thesis' ? 'تسجيل أطروحة جديدة' : 
                       modalType === 'research' ? 'إضافة منشور بحثي' : 
                       'ملف متابعة الأطروحة العلمي'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold">
                      {modalType === 'detail' ? 'السجل الأكاديمي والبحثي للطالب' : 'يرجى إدخال البيانات بدقة للمكاتب الفنية'}
                    </p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                   <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                {modalType === 'detail' && selectedThesis ? (
                  <div className="space-y-8">
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 flex flex-col md:flex-row gap-6 items-center">
                      <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm font-black text-2xl">
                         {selectedThesis.studentName.charAt(0)}
                      </div>
                      <div className="text-center md:text-right">
                        <h4 className="text-xl font-black text-slate-800">{selectedThesis.studentName}</h4>
                        <p className="text-sm text-slate-500 font-bold mt-1">{selectedThesis.title}</p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                           <select 
                             className="px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg text-[10px] font-black text-indigo-600 uppercase focus:ring-0 focus:border-indigo-300 outline-none cursor-pointer"
                             value={selectedThesis.status}
                             onChange={(e) => handleUpdateStatus(e.target.value as ThesisStatus)}
                           >
                             {Object.values(ThesisStatus).map(status => (
                               <option key={status} value={status}>{getThesisStatusLabel(status)}</option>
                             ))}
                           </select>
                           <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-indigo-600 uppercase">
                             إنجاز: {selectedThesis.progressPercentage}%
                           </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="p-6 bg-white border border-slate-100 rounded-2xl space-y-4">
                          <h5 className="font-black text-slate-800 flex items-center gap-2">
                             <Users size={16} className="text-indigo-600" />
                             الفريق الأكاديمي
                          </h5>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold">المشرف الرئيسي:</span>
                                <span className="font-black text-slate-700">{selectedThesis.advisorName}</span>
                             </div>
                             {selectedThesis.coAdvisorName && (
                               <div className="flex justify-between items-center text-sm">
                                  <span className="text-slate-400 font-bold">المشرف المساعد:</span>
                                  <span className="font-black text-slate-700">{selectedThesis.coAdvisorName}</span>
                               </div>
                             )}
                             <div className="flex justify-between items-center text-sm">
                                <span className="text-slate-400 font-bold">تاريخ البدء:</span>
                                <span className="font-black text-slate-700">{selectedThesis.startDate}</span>
                             </div>
                             {selectedThesis.funding && (
                               <div className="pt-4 border-t border-slate-50 space-y-2">
                                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">الدعم المالي للبحث</p>
                                  <div className="flex justify-between items-center">
                                     <span className="text-xs font-bold text-slate-600">{selectedThesis.funding.source}</span>
                                     <span className="text-sm font-black text-emerald-600">{selectedThesis.funding.amount} {selectedThesis.funding.currency}</span>
                                  </div>
                               </div>
                             )}
                          </div>
                       </div>

                       <div className="p-6 bg-white border border-slate-100 rounded-2xl space-y-4">
                          <h5 className="font-black text-slate-800 flex items-center gap-2">
                             <TrendingUp size={16} className="text-emerald-600" />
                             المخطط الزمني للبحث
                          </h5>
                          <div className="space-y-6 relative pr-4 border-r-2 border-slate-100">
                             {selectedThesis.milestones?.map((m, idx) => (
                               <div 
                                 key={m.id} 
                                 className="relative cursor-pointer group/milestone"
                                 onClick={() => handleUpdateMilestone(m.id)}
                               >
                                  <div className={cn(
                                    "absolute right-[-21px] top-1.5 w-4 h-4 rounded-full border-4 border-white shadow-sm transition-all duration-300",
                                    m.status === 'COMPLETED' ? "bg-emerald-500 scale-110" : 
                                    m.status === 'IN_PROGRESS' ? "bg-amber-500" : 
                                    m.status === 'OVERDUE' ? "bg-rose-500" : "bg-slate-200",
                                    "group-hover/milestone:shadow-md"
                                  )} />
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <p className={cn(
                                        "text-[10px] font-black uppercase tracking-tight transition-colors",
                                        m.status === 'COMPLETED' ? "text-emerald-600" : 
                                        m.status === 'IN_PROGRESS' ? "text-amber-600" : "text-slate-400"
                                      )}>
                                        {m.status === 'COMPLETED' ? 'مكتمل' : m.status === 'IN_PROGRESS' ? 'قيد التنفيذ' : 'مخطط له'}
                                        {m.completedDate && <span className="mr-2 opacity-50">({m.completedDate})</span>}
                                      </p>
                                      <p className="text-xs font-black text-slate-800 group-hover/milestone:text-indigo-600 transition-colors">{m.name}</p>
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-400 font-mono">{m.dueDate}</span>
                                  </div>
                               </div>
                             ))}
                             {(!selectedThesis.milestones || selectedThesis.milestones.length === 0) && (
                               <p className="text-xs text-slate-400 py-4 text-center italic">لا يوجد جدول زمني معتمد بعد</p>
                             )}
                          </div>
                       </div>
                    </div>

                    <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100">
                       <div className="flex items-start gap-4">
                          <AlertCircle className="text-amber-600 shrink-0" size={20} />
                          <div>
                             <h4 className="text-sm font-black text-amber-900 mb-1">ملاحظات المتابعة</h4>
                             <p className="text-xs text-amber-700 font-medium leading-relaxed">
                               يجب تقديم تقرير الإنجاز الربع سنوي القادم بحلول نهاية الشهر الحالي لضمان استمرارية الصرف المالي لبحث الطالب.
                             </p>
                          </div>
                       </div>
                    </div>

                    {/* Defense Committee Section - Unit 4 SRS */}
                    <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 text-white space-y-6">
                        <div className="flex items-center justify-between">
                            <h5 className="font-black text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck size={18} className="text-indigo-400" />
                                لجنة المناقشة العلمية
                            </h5>
                            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                تشكيل اللجنة
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">رئيس اللجنة</p>
                                <p className="text-xs font-bold text-white">د. سالم عياد</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ممتحن خارجي</p>
                                <p className="text-xs font-bold text-white">د. فرج المبروك (جامعة بنغازي)</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ممتحن داخلي</p>
                                <p className="text-xs font-bold text-white">د. أسماء التاورغي</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">المشرف (مراقب)</p>
                                <p className="text-xs font-bold text-white">{selectedThesis.advisorName}</p>
                            </div>
                        </div>
                    </div>

                    {/* Comprehensive Exam Result - Unit 4 SRS */}
                    <div className="p-6 bg-white border border-slate-200 rounded-[2rem] shadow-sm flex items-center justify-between">
                        <div>
                            <h5 className="font-black text-slate-800 flex items-center gap-2">
                                <ClipboardCheck size={18} className="text-blue-600" />
                                نتيجة الامتحان الشامل
                            </h5>
                            <p className="text-[10px] text-slate-400 font-bold mt-1">متطلب أساسي للبرامج التي لا تتضمن أطروحة</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black border border-emerald-100">
                                ناجح (88/100)
                            </span>
                        </div>
                    </div>
                  </div>
                ) : modalType === 'thesis' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">عنوان الأطروحة</label>
                       <textarea 
                          value={newThesis.title || ''}
                          onChange={(e) => setNewThesis({...newThesis, title: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold min-h-[100px] focus:ring-2 focus:ring-indigo-500/20"
                          placeholder="مثلاً: تأثير التحول الرقمي على التعليم العالي..."
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">اسم الطالب</label>
                       <input 
                          type="text" 
                          value={newThesis.studentName || ''}
                          onChange={(e) => setNewThesis({...newThesis, studentName: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">المشرف الرئيسي</label>
                       <input 
                          type="text" 
                          value={newThesis.advisorName || ''}
                          onChange={(e) => setNewThesis({...newThesis, advisorName: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">المستوى الدراسي</label>
                       <select 
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                          onChange={(e) => setNewThesis({...newThesis, studentId: e.target.value})}
                       >
                          <option value="PHD">دكتوراه</option>
                          <option value="MASTER">ماجستير</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">تاريخ البدء</label>
                       <input 
                          type="date" 
                          value={newThesis.startDate || ''}
                          onChange={(e) => setNewThesis({...newThesis, startDate: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2 col-span-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">عنوان البحث</label>
                       <textarea 
                          value={newPub.title || ''}
                          onChange={(e) => setNewPub({...newPub, title: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold min-h-[80px] focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">اسم المجلة العلمية</label>
                       <input 
                          type="text" 
                          value={newPub.journalName || ''}
                          onChange={(e) => setNewPub({...newPub, journalName: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-xs font-black text-slate-500 uppercase tracking-widest mr-1">رقم الطالب الأكاديمي</label>
                       <input 
                          type="text" 
                          value={newPub.studentId || ''}
                          onChange={(e) => setNewPub({...newPub, studentId: e.target.value})}
                          className="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20"
                       />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 bg-slate-50/50 flex justify-end gap-3">
                {modalType !== 'detail' ? (
                  <>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="px-6 py-3 text-slate-500 font-black text-sm hover:text-slate-700 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button 
                      onClick={handleSaveItem}
                      className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <ClipboardCheck size={18} />
                      تأكيد الحفظ
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setShowModal(false)}
                    className="px-10 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all"
                  >
                    إغلاق العرض
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GraduateManagement;
