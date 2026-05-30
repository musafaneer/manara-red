
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getBranches, saveBranch, moveBranch, deleteBranch, getBranchName,
  getColleges, saveCollege, moveCollege, deleteCollege, getCollegeName,
  getDepartments, saveDepartment, moveDepartment, deleteDepartment, getDepartmentName,
  getAcademicPrograms, saveAcademicProgram, moveProgram, deleteAcademicProgram, getAcademicProgramName,
  getSections, saveSection, moveSection, deleteSection,
  getStaff, getStudents, getBuildings, getRooms
} from '../services/storageService';
import { Branch, College, Department, AcademicProgram, Section, ProgramType, Permission, StaffMember, Student, Building, Room } from '../types';
import { 
  Network, Landmark, Building2, BookOpen, Layers, 
  Plus, Edit2, Save, X, ChevronRight, ChevronDown, MapPin, User, Search, Trash2, FolderPlus,
  Users, GraduationCap, GripVertical, Filter, ShieldCheck, Info, AlertTriangle
} from 'lucide-react';
import { notifySuccess, notifyError, notifyInfo } from '../services/notificationService';
import { getCurrentUser, hasPermission } from '../services/authService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type OrgLevel = 'branch' | 'college' | 'dept' | 'program' | 'section';

import Modal from './ui/Modal';

import { Language } from '../services/i18nService';

const UniversityManagement: React.FC<{ language?: Language }> = ({ language = 'ar' }) => {
  const [viewMode, setViewMode] = useState<'tree' | 'cards'>('tree');
  const [activeTab, setActiveTab] = useState<OrgLevel>('branch');
  const [treeSearchTerm, setTreeSearchTerm] = useState('');
  
  const [isAllExpanded, setIsAllExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<AcademicProgram[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [modalLevel, setModalLevel] = useState<OrgLevel>('branch');
  const [parentId, setParentId] = useState<string | null>(null);

  const currentUser = getCurrentUser();
  const canManage = hasPermission(currentUser, Permission.ORGANIZATION_MANAGE);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = () => {
    setIsRefreshing(true);
    // Explicitly fetching fresh data from storage service to ensure consistency across views
    const b = getBranches();
    const c = getColleges();
    const d = getDepartments();
    const p = getAcademicPrograms();
    const s = getSections();
    
    setBranches(b);
    setColleges(c);
    setDepts(d);
    setPrograms(p);
    setSections(s);
    setStaff(getStaff());
    setStudents(getStudents());
    setBuildings(getBuildings());
    setRooms(getRooms());
    
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const handleOpenAdd = (level: OrgLevel, pId: string | null = null) => {
    if (!canManage) return;
    setEditItem(null);
    setModalLevel(level);
    setParentId(pId);
    setShowModal(true);
  };

  const handleOpenEdit = (level: OrgLevel, item: any) => {
    if (!canManage) return;
    setEditItem(item);
    setModalLevel(level);
    setShowModal(true);
  };

  const handleDrop = (level: OrgLevel, sourceId: string, targetId: string, sourceLevel: string) => {
      if (sourceId === targetId) return;
      if (sourceLevel !== level) {
          notifyError('لا يمكن نقل العناصر بين مستويات مختلفة في الهيكل');
          return;
      }
      
      if (level === 'branch') moveBranch(sourceId, targetId);
      else if (level === 'college') moveCollege(sourceId, targetId);
      else if (level === 'dept') moveDepartment(sourceId, targetId);
      else if (level === 'program') moveProgram(sourceId, targetId);
      else if (level === 'section') moveSection(sourceId, targetId);
      
      refresh();
      notifySuccess('تم تحديث الترتيب بنجاح');
  };

  const handleDelete = (level: OrgLevel, id: string) => {
      if (!canManage) return;
      
      // Check for children
      let hasChildren = false;
      if (level === 'branch') hasChildren = colleges.some(c => c.branchId === id);
      else if (level === 'college') hasChildren = depts.some(d => d.collegeId === id);
      else if (level === 'dept') hasChildren = programs.some(p => p.deptId === id);
      else if (level === 'program') hasChildren = sections.some(s => s.programId === id);
      
      if (hasChildren) {
          notifyError('لا يمكن حذف هذا البند لاحتوائه على عناصر تابعة. يرجى حذف العناصر التابعة أولاً.');
          return;
      }

      if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا البند نهائياً من الهيكل التنظيمي؟')) return;

      if (level === 'branch') deleteBranch(id);
      else if (level === 'college') deleteCollege(id);
      else if (level === 'dept') deleteDepartment(id);
      else if (level === 'program') deleteAcademicProgram(id);
      else if (level === 'section') deleteSection(id);

      notifySuccess('تم حذف البند بنجاح');
      refresh();
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    if (modalLevel === 'branch') {
      const capacity = parseInt(formData.get('capacity') as string || '0');
      if (capacity <= 0) {
        notifyError('يجب أن تكون السعة الاستيعابية رقماً موجباً أكبر من الصفر');
        return;
      }
      saveBranch({ 
        id: editItem?.id || `BR-${Date.now()}`, 
        name: formData.get('name') as string,
        location: formData.get('location') as string,
        managerName: formData.get('managerName') as string,
        contactNumber: formData.get('contactNumber') as string,
        establishedDate: formData.get('establishedDate') as string,
        status: formData.get('status') as 'ACTIVE' | 'INACTIVE',
        capacity: capacity
      });
    } else if (modalLevel === 'college') {
      const councilMembers = (formData.get('councilMembers') as string || '').split(',').map(s => s.trim()).filter(Boolean);
      saveCollege({
        id: editItem?.id || `COL-${Date.now()}`,
        branchId: (formData.get('branchId') as string) || parentId || '',
        name: formData.get('name') as string,
        deanName: formData.get('deanName') as string,
        buildingId: formData.get('buildingId') as string || undefined,
        councilMembers
      });
    } else if (modalLevel === 'dept') {
      const councilMembers = (formData.get('councilMembers') as string || '').split(',').map(s => s.trim()).filter(Boolean);
      saveDepartment({
        id: editItem?.id || `DEPT-${Date.now()}`,
        collegeId: (formData.get('collegeId') as string) || parentId || '',
        name: formData.get('name') as string,
        headName: formData.get('headName') as string,
        buildingId: formData.get('buildingId') as string || undefined,
        roomNumber: formData.get('roomNumber') as string || undefined,
        councilMembers
      });
    } else if (modalLevel === 'program') {
      const objectives = (formData.get('objectives') as string || '').split(',').map(s => s.trim()).filter(Boolean);
      saveAcademicProgram({
        id: editItem?.id || `PRG-${Date.now()}`,
        deptId: (formData.get('deptId') as string) || parentId || '',
        name: formData.get('name') as string,
        type: formData.get('type') as ProgramType,
        durationSemesters: parseInt(formData.get('duration') as string),
        objectives
      });
    } else if (modalLevel === 'section') {
      saveSection({
        id: editItem?.id || `SEC-${Date.now()}`,
        programId: (formData.get('programId') as string) || parentId || '',
        name: formData.get('name') as string
      });
    }

    notifySuccess('تم حفظ البيانات بنجاح');
    setShowModal(false);
    refresh();
  };

  return (
    <div className="p-10 space-y-12 animate-in fade-in duration-1000">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 bg-white p-10 rounded-[3.5rem] border border-stone-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl" />
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-slate-900 rounded-2xl text-indigo-400 shadow-2xl">
                 <Network size={32} />
             </div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">
               Organizational Architecture
             </h2>
          </div>
          <p className="text-stone-400 font-black text-xs uppercase tracking-[0.2em] opacity-60">High-fidelity schematic of the institutional node hierarchy and spatial distribution</p>
        </div>
        
        <div className="flex gap-3 bg-stone-50 p-2 rounded-2.5xl border border-stone-100 shadow-inner relative z-10">
            <button 
                onClick={() => setViewMode('tree')}
                className={cn(
                    "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'tree' ? "bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-stone-100" : "text-stone-400 hover:text-slate-600"
                )}
            >
                Hierarchical Tree
            </button>
            <button 
                onClick={() => setViewMode('cards')}
                className={cn(
                    "px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                    viewMode === 'cards' ? "bg-white text-slate-900 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-stone-100" : "text-stone-400 hover:text-slate-600"
                )}
            >
                Component Grid
            </button>
        </div>
      </div>

      {viewMode === 'tree' ? (
        <div className="bg-white rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-stone-100 overflow-hidden min-h-[800px] relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
            
            <div className="p-8 bg-white/80 backdrop-blur-xl border-b border-stone-50 flex flex-col md:flex-row gap-6 items-center justify-between sticky top-0 z-30">
                <div className="relative w-full md:w-[450px]">
                    <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="Filter organizational nodes..."
                        className="w-full pr-14 pl-6 py-4 rounded-2.5xl bg-stone-50 border border-stone-100 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-stone-200 transition-all font-black text-xs uppercase tracking-widest text-slate-700 placeholder:text-stone-300"
                        value={treeSearchTerm}
                        onChange={e => setTreeSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-6 items-center">
                    <div className="flex gap-2 p-1.5 bg-stone-50 rounded-2xl border border-stone-100">
                        <button 
                            onClick={() => setIsAllExpanded(true)}
                            className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-stone-100 shadow-sm transition-all"
                        >
                            <ChevronDown size={14} /> Expand All
                        </button>
                        <button 
                            onClick={() => setIsAllExpanded(false)}
                            className="text-[9px] font-black text-stone-400 hover:text-stone-700 uppercase tracking-widest flex items-center gap-2 px-4 py-2.5 hover:bg-white rounded-xl transition-all"
                        >
                            <ChevronRight size={14} /> Collapse
                        </button>
                    </div>
                    <div className="flex gap-4 px-6 border-l border-stone-100 text-[9px] font-black text-stone-400 uppercase tracking-[0.2em] hidden xl:flex">
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-slate-900" /> HQ</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /> COLLEGE</div>
                        <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /> DEPT</div>
                    </div>
                    {canManage && (
                        <button onClick={() => handleOpenAdd('branch')} className="bg-slate-900 text-white px-8 py-4 rounded-2.5xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 transition-all shadow-2xl">
                            <Plus size={18} className="text-indigo-400" /> Initialize Node
                        </button>
                    )}
                </div>
            </div>

            <div className="p-16 max-w-6xl mx-auto relative z-10">
                <AnimatePresence mode="popLayout">
                    {branches.length > 0 ? (
                        <div className="space-y-6">
                            {branches.map(branch => (
                                <TreeNode 
                                    key={branch.id} 
                                    item={branch} 
                                    level="branch" 
                                    canManage={canManage}
                                    forceExpand={isAllExpanded}
                                    onAddChild={(l, p) => handleOpenAdd(l, p)}
                                    onEdit={(l, i) => handleOpenEdit(l, i)}
                                    onDelete={(l, id) => handleDelete(l, id)}
                                    onDrop={(l, s, t, sl) => handleDrop(l, s, t, sl)}
                                    searchTerm={treeSearchTerm}
                                    childrenData={{colleges, depts, programs, sections, staff, students}}
                                />
                            ))}
                        </div>
                    ) : (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="text-center py-40 bg-stone-50/50 rounded-[4rem] border-2 border-dashed border-stone-100"
                        >
                            <div className="w-32 h-32 bg-white border border-stone-100 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-xl">
                                <Network size={48} className="text-stone-100" />
                            </div>
                            <p className="font-black text-2xl text-slate-800 tracking-tight uppercase italic mb-2">Void State Detected</p>
                            <p className="text-stone-400 font-black text-[10px] uppercase tracking-widest mx-auto max-w-xs leading-loose italic opacity-60">The institutional topology is currently undefined. Manual initialization required.</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-[4rem] shadow-[0_30px_100px_rgba(0,0,0,0.03)] border border-stone-100 overflow-hidden flex flex-col min-h-[700px]">
          <div className="flex border-b border-stone-50 bg-[#fafafa] px-12 pt-8 gap-8 overflow-x-auto no-scrollbar">
            {(['branch', 'college', 'dept', 'program', 'section'] as OrgLevel[]).map(lvl => (
                <button 
                  key={lvl}
                  onClick={() => setActiveTab(lvl)} 
                  className={cn(
                      "pb-8 px-6 text-[10px] font-black border-b-4 flex items-center gap-3 transition-all relative uppercase tracking-[0.2em] group",
                      activeTab === lvl ? "border-slate-900 text-slate-900" : "border-transparent text-stone-400 hover:text-stone-600"
                  )}
                >
                  <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        activeTab === lvl ? "bg-slate-900 text-indigo-400" : "bg-stone-100 text-stone-400 group-hover:bg-stone-200"
                  )}>
                    {lvl === 'branch' && <MapPin size={16} />}
                    {lvl === 'college' && <Landmark size={16} />}
                    {lvl === 'dept' && <Building2 size={16} />}
                    {lvl === 'program' && <BookOpen size={16} />}
                    {lvl === 'section' && <Layers size={16} />}
                  </div>
                  {lvl === 'branch' ? 'HQ Nodes' : lvl === 'college' ? 'Colleges' : lvl === 'dept' ? 'Academic Depts' : lvl === 'program' ? 'Curricula' : 'Units'}
                  {activeTab === lvl && (
                      <motion.div layoutId="activeTabIndicator" className="absolute bottom-0 left-0 right-0 h-1 bg-slate-900 rounded-t-full shadow-[0_-4px_10px_rgba(0,0,0,0.1)]" />
                  )}
                </button>
            ))}
          </div>

          <div className="p-16 flex-1 bg-white relative">
            <div className="flex justify-between items-center mb-12">
              <div className="flex items-baseline gap-4">
                <h3 className="font-black text-2xl text-slate-900 uppercase italic tracking-tight">Active Component Registry</h3>
                <div className="px-3 py-1 bg-stone-100 rounded-lg text-[9px] font-black text-stone-400 tracking-widest uppercase">System Managed</div>
              </div>
              {canManage && (
                <button onClick={() => handleOpenAdd(activeTab)} className="bg-slate-900 text-white px-8 py-4 rounded-2.5xl flex items-center gap-3 hover:scale-105 shadow-2xl transition-all font-black text-[10px] uppercase tracking-widest">
                  <Plus size={20} className="text-indigo-400" /> Register Node
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Visual Stats Bar for Cards Mode */}
                {activeTab === 'branch' && (
                    <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 group hover:border-indigo-100 transition-colors">
                            <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 shadow-inner group-hover:rotate-6 transition-transform">
                                <MapPin size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Global HQ Nodes</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{branches.length}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 group hover:border-emerald-100 transition-colors">
                            <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600 shadow-inner group-hover:rotate-6 transition-transform">
                                <ShieldCheck size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Status: Online</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{branches.filter(b => b.status === 'ACTIVE').length}</p>
                            </div>
                        </div>
                        <div className="bg-white border border-stone-100 p-8 rounded-[2.5rem] shadow-sm flex items-center gap-6 group hover:border-amber-100 transition-colors">
                            <div className="p-4 bg-amber-50 rounded-2xl text-amber-600 shadow-inner group-hover:rotate-6 transition-transform">
                                <Users size={24} />
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest mb-1">Institutional Capacity</p>
                                <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{branches.reduce((sum, b) => sum + (b.capacity || 0), 0).toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                )}
                <AnimatePresence mode="popLayout">
                  {activeTab === 'branch' && branches.map(item => (
                    <BranchCard key={item.id} branch={item} onEdit={() => handleOpenEdit('branch', item)} canManage={canManage} />
                  ))}
                  {activeTab === 'college' && colleges.map(item => {
                    const bld = buildings.find(b => b.id === item.buildingId);
                    const branchName = getBranchName(item.branchId);
                    return <DirectCard 
                      key={item.id} 
                      title={item.name} 
                      sub={`العميد: ${item.deanName || '---'}`} 
                      extra={bld ? `المقر: ${bld.name}` : undefined} 
                      hierarchy={branchName}
                      icon={Landmark} 
                      onEdit={() => handleOpenEdit('college', item)} 
                      canManage={canManage} 
                    />;
                  })}
                  {activeTab === 'dept' && depts.map(item => {
                    const bld = buildings.find(b => b.id === item.buildingId);
                    const college = colleges.find(c => c.id === item.collegeId);
                    const collegeName = college ? college.name : '---';
                    const branchName = college ? getBranchName(college.branchId) : '---';
                    
                    return <DirectCard 
                      key={item.id} 
                      title={item.name} 
                      sub={`رئيس القسم: ${item.headName || '---'}`} 
                      extra={bld ? `المبنى: ${bld.name} | مكتب: ${item.roomNumber || '---'}` : undefined} 
                      hierarchy={`${branchName} » ${collegeName}`}
                      icon={Building2} 
                      onEdit={() => handleOpenEdit('dept', item)} 
                      canManage={canManage} 
                    />;
                  })}
                  {activeTab === 'program' && programs.map(item => {
                    const dept = depts.find(d => d.id === item.deptId);
                    const deptName = dept ? dept.name : '---';
                    return <DirectCard 
                      key={item.id} 
                      title={item.name} 
                      sub={`النوع: ${item.type} | الفصول: ${item.durationSemesters}`} 
                      hierarchy={deptName}
                      icon={BookOpen} 
                      onEdit={() => handleOpenEdit('program', item)} 
                      canManage={canManage} 
                    />;
                  })}
                  {activeTab === 'section' && sections.map(item => {
                    const prog = programs.find(p => p.id === item.programId);
                    const progName = prog ? prog.name : '---';
                    return <DirectCard 
                      key={item.id} 
                      title={item.name} 
                      sub="تخصص دقيق" 
                      hierarchy={progName}
                      icon={Layers} 
                      onEdit={() => handleOpenEdit('section', item)} 
                      canManage={canManage} 
                    />;
                  })}
                </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={`${editItem ? 'تعديل' : 'إضافة'} ${
            modalLevel === 'branch' ? 'فرع' :
            modalLevel === 'college' ? 'كلية' :
            modalLevel === 'dept' ? 'قسم' :
            modalLevel === 'program' ? 'برنامج' : 'شعبة'
        }`}
        description={editItem ? 'تحديث بيانات الوحدة التنظيمية' : 'توسيع الهيكل التنظيمي للمؤسسة'}
        icon={editItem ? Edit2 : Plus}
        maxWidth="md"
        footer={
            <div className="flex justify-end gap-4">
                <button 
                    type="button" 
                    onClick={() => setShowModal(false)}
                    className="px-8 py-3.5 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                    إلغاء
                </button>
                <button 
                    onClick={() => {
                        const form = document.getElementById('org-form') as HTMLFormElement;
                        if (form) form.requestSubmit();
                    }}
                    className="px-12 py-3.5 bg-blue-600 text-white rounded-2xl font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                >
                    <Save size={20} />
                    حفظ التغييرات
                </button>
            </div>
        }
      >
        <form id="org-form" onSubmit={handleSave} className="space-y-6">
            {!editItem && !parentId && (
                <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-wider">المستوى التنظيمي</label>
                    <div className="grid grid-cols-3 gap-2">
                        {(['branch', 'college', 'dept', 'program', 'section'] as OrgLevel[]).map(lvl => (
                            <button 
                                key={lvl}
                                type="button"
                                onClick={() => setModalLevel(lvl)}
                                className={cn(
                                    "py-2 px-1 rounded-xl text-[10px] font-black border transition-all",
                                    modalLevel === lvl 
                                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200" 
                                        : "bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100"
                                )}
                            >
                                {lvl === 'branch' ? 'فرع' : lvl === 'college' ? 'كلية' : lvl === 'dept' ? 'قسم' : lvl === 'program' ? 'برنامج' : 'شعبة'}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {modalLevel === 'branch' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="اسم الفرع" name="name" defaultValue={editItem?.name} />
                    <FormInput label="الموقع الجغرافي" name="location" defaultValue={editItem?.location} />
                    <FormInput label="اسم مدير الفرع" name="managerName" defaultValue={editItem?.managerName} />
                    <FormInput label="رقم التواصل" name="contactNumber" defaultValue={editItem?.contactNumber} />
                    <FormInput label="تاريخ التأسيس" name="establishedDate" type="date" defaultValue={editItem?.establishedDate} />
                    <FormInput label="السعة الاستيعابية للطلاب" name="capacity" type="number" defaultValue={editItem?.capacity} />
                    <FormSelect label="حالة الفرع" name="status" defaultValue={editItem?.status || 'ACTIVE'}>
                        <option value="ACTIVE">نشط</option>
                        <option value="INACTIVE">غير نشط</option>
                    </FormSelect>
                </div>
            )}
            {modalLevel === 'college' && (
                <>
                    {!parentId && (
                        <FormSelect label="الفرع التابع له" name="branchId" defaultValue={editItem?.branchId}>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </FormSelect>
                    )}
                    <FormInput label="اسم الكلية" name="name" defaultValue={editItem?.name} />
                    <FormInput label="اسم العميد" name="deanName" defaultValue={editItem?.deanName} />
                    <FormSelect label="المبنى الرئيسي (اختياري)" name="buildingId" defaultValue={editItem?.buildingId}>
                        <option value="">لا يوجد مبنى محدد (افتراضي)</option>
                        {buildings.map(b => <option key={b.id} value={b.id}>{b.name} ({b.code})</option>)}
                    </FormSelect>
                    <FormTextArea label="أعضاء المجلس العلمي (فصل بالفاصلة)" name="councilMembers" defaultValue={editItem?.councilMembers?.join(', ')} />
                </>
            )}
            {modalLevel === 'dept' && (
                <>
                    {!parentId && (
                        <FormSelect label="الكلية" name="collegeId" defaultValue={editItem?.collegeId}>
                            {colleges.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </FormSelect>
                    )}
                    <FormInput label="اسم القسم" name="name" defaultValue={editItem?.name} />
                    <FormInput label="رئيس القسم" name="headName" defaultValue={editItem?.headName} />
                    <div className="grid grid-cols-2 gap-4">
                        <FormSelect label="مبنى القسم" name="buildingId" defaultValue={editItem?.buildingId}>
                            <option value="">اختر المبنى...</option>
                            {buildings.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </FormSelect>
                        <FormInput label="رقم/اسم المكتب" name="roomNumber" defaultValue={editItem?.roomNumber} />
                    </div>
                    <FormTextArea label="أعضاء مجلس القسم (فصل بالفاصلة)" name="councilMembers" defaultValue={editItem?.councilMembers?.join(', ')} />
                </>
            )}
            {modalLevel === 'program' && (
                <>
                    {!parentId && (
                        <FormSelect label="القسم العلمي" name="deptId" defaultValue={editItem?.deptId}>
                            {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </FormSelect>
                    )}
                    <FormInput label="اسم البرنامج" name="name" defaultValue={editItem?.name} />
                    <FormSelect label="نوع الدرجة" name="type" defaultValue={editItem?.type}>
                        <option value={ProgramType.UNDERGRADUATE}>بكالوريوس (جامعي)</option>
                        <option value={ProgramType.POSTGRADUATE}>ماجستير/دكتوراه (دراسات عليا)</option>
                    </FormSelect>
                    <FormInput label="عدد الفصول المقررة" name="duration" type="number" defaultValue={editItem?.durationSemesters} />
                    <FormTextArea label="أهداف البرنامج (فصل بالفاصلة)" name="objectives" defaultValue={editItem?.objectives?.join(', ')} />
                </>
            )}
            {modalLevel === 'section' && (
                <>
                    {!parentId && (
                        <FormSelect label="البرنامج العلمي" name="programId" defaultValue={editItem?.programId}>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </FormSelect>
                    )}
                    <FormInput label="اسم الشعبة / التخصص" name="name" defaultValue={editItem?.name} />
                </>
            )}
        </form>
      </Modal>
    </div>
  );
};

const TreeNode = ({ item, level, canManage, onAddChild, onEdit, onDelete, onDrop, childrenData, searchTerm, forceExpand }: any) => {
    const [isInternalOpen, setIsInternalOpen] = useState(level === 'branch');
    const [showStaff, setShowStaff] = useState(false);
    const [isDraggingOver, setIsDraggingOver] = useState(false);
    
    useEffect(() => {
        if (searchTerm || forceExpand) setIsInternalOpen(true);
        if (!forceExpand && !searchTerm && level !== 'branch') setIsInternalOpen(false);
    }, [searchTerm, forceExpand, level]);

    const highlightText = (text: string, term: string) => {
        if (!term) return text;
        const parts = text.split(new RegExp(`(${term})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) => 
                    part.toLowerCase() === term.toLowerCase() ? 
                    <span key={i} className="bg-indigo-500/10 text-indigo-700 rounded px-1 border border-indigo-200/30">{part}</span> : 
                    part
                )}
            </span>
        );
    };

    let children: any[] = [];
    let childLevel: OrgLevel | null = null;
    let Icon = MapPin;
    let label = "";
    let accentColor = "bg-slate-900";
    
    const staffHere = childrenData.staff.filter((s: StaffMember) => {
      if (level === 'branch') return s.branchId === item.id && !s.collegeId;
      if (level === 'college') return s.collegeId === item.id && !s.deptId;
      if (level === 'dept') return s.deptId === item.id;
      return false;
    });

    const studentsHere = useMemo(() => {
        if (level === 'dept') return childrenData.students.filter((s: Student) => s.departmentId === item.id);
        if (level === 'college') return childrenData.students.filter((s: Student) => s.collegeId === item.id);
        if (level === 'branch') return childrenData.students.filter((s: Student) => s.branchId === item.id);
        return [];
    }, [level, item.id, childrenData.students]);

    if (level === 'branch') {
        children = childrenData.colleges.filter((c: any) => c.branchId === item.id);
        childLevel = 'college';
        Icon = MapPin;
        label = "Primary HQ Node";
        accentColor = "bg-slate-900 shadow-slate-200";
    } else if (level === 'college') {
        children = childrenData.depts.filter((d: any) => d.collegeId === item.id);
        childLevel = 'dept';
        Icon = Landmark;
        label = "Faculty / College";
        accentColor = "bg-indigo-600 shadow-indigo-100";
    } else if (level === 'dept') {
        children = childrenData.programs.filter((p: any) => p.deptId === item.id);
        childLevel = 'program';
        Icon = Building2;
        label = "Academic Dept";
        accentColor = "bg-emerald-600 shadow-emerald-100";
    } else if (level === 'program') {
        children = childrenData.sections.filter((s: any) => s.programId === item.id);
        childLevel = 'section';
        Icon = BookOpen;
        label = "Curriculum Spec";
        accentColor = "bg-amber-600 shadow-amber-100";
    } else {
        Icon = Layers;
        label = "Modular Unit";
        accentColor = "bg-stone-500 shadow-stone-100";
    }

    const isMatch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const hasVisibleChild = useMemo(() => {
        if (!searchTerm) return true;
        const checkChildren = (items: any[], lvl: OrgLevel): boolean => {
            return items.some(it => {
                if (it.name.toLowerCase().includes(searchTerm.toLowerCase())) return true;
                if (lvl === 'college') return checkChildren(childrenData.depts.filter((d: any) => d.collegeId === it.id), 'dept');
                if (lvl === 'dept') return checkChildren(childrenData.programs.filter((p: any) => p.deptId === it.id), 'program');
                if (lvl === 'program') return checkChildren(childrenData.sections.filter((s: any) => s.programId === it.id), 'section');
                return false;
            });
        };
        return isMatch || checkChildren(children, childLevel!);
    }, [searchTerm, item.name, children, childLevel, childrenData]);

    if (!hasVisibleChild) return null;

    const hasAnyChildren = children.length > 0 || staffHere.length > 0;

    return (
        <motion.div 
            layout
            className={cn(
                "mr-8 mb-4 border-r border-stone-100 pr-10 transition-all relative",
                isDraggingOver ? "pt-10" : ""
            )}
            onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
            onDragLeave={() => setIsDraggingOver(false)}
            onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                const sourceId = e.dataTransfer.getData('text/plain');
                const sourceLevel = e.dataTransfer.getData('level');
                onDrop(level, sourceId, item.id, sourceLevel);
            }}
        >
            <div className="absolute top-0 right-0 h-full w-px bg-stone-50 pointer-events-none" />
            
            <div 
                draggable={canManage}
                onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', item.id);
                    e.dataTransfer.setData('level', level);
                }}
                className={cn(
                    "flex items-center justify-between p-6 rounded-[2.5rem] transition-all group border relative",
                    isMatch && searchTerm ? "bg-indigo-50/50 border-indigo-200 shadow-xl shadow-indigo-100" : "hover:bg-stone-50/50 border-transparent bg-white shadow-sm",
                    canManage ? "cursor-grab active:cursor-grabbing" : ""
                )}
            >
                <div className="flex items-center gap-6 flex-1">
                    <button onClick={() => setIsInternalOpen(!isInternalOpen)} className="p-2 hover:bg-white rounded-xl transition-all shadow-sm border border-stone-100 bg-stone-50 group/btn">
                        {hasAnyChildren ? (
                            <ChevronDown size={18} className={cn("text-stone-400 transition-transform duration-500", !isInternalOpen && "-rotate-90", isInternalOpen && "text-slate-900")} />
                        ) : (
                            <div className="w-4 h-4 opacity-10 border border-stone-900 rounded-full" />
                        ) }
                    </button>
                    
                    <div className={cn(
                        "p-4 rounded-2.5xl shadow-xl transition-transform duration-500 group-hover:rotate-6 text-white shrink-0",
                        accentColor
                    )}>
                        <Icon size={22} className="opacity-80" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <span className="text-[9px] font-black text-stone-400 block uppercase tracking-[0.25em] leading-none mb-2">{label}</span>
                        <h4 className={cn("font-black truncate text-xl tracking-tight leading-none italic uppercase transition-colors", isMatch && searchTerm ? "text-indigo-900" : "text-slate-900")}>
                            {highlightText(item.name, searchTerm)}
                        </h4>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-900 flex items-center gap-2 group/stat">
                                <Users size={12} className="text-stone-300 group-hover/stat:text-indigo-500 transition-colors" /> {studentsHere.length}
                            </span>
                            <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">Enrolled</span>
                        </div>
                        <div className="w-px h-8 bg-stone-100 mx-1" />
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-900 flex items-center gap-2 group/stat">
                                <Landmark size={12} className="text-stone-300 group-hover/stat:text-indigo-500 transition-colors" /> {staffHere.length}
                            </span>
                            <span className="text-[8px] font-black text-stone-300 uppercase tracking-widest">Faculty</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0 mr-6">
                    {staffHere.length > 0 && (
                      <button onClick={() => setShowStaff(!showStaff)} className={cn("p-3 rounded-xl transition-all", showStaff ? "bg-slate-900 text-white shadow-xl" : "bg-white border border-stone-100 text-slate-400 hover:text-slate-900 hover:border-slate-300")}>
                        <Users size={18} />
                      </button>
                    )}
                    {canManage && childLevel && (
                        <button 
                            onClick={() => onAddChild(childLevel, item.id)}
                            className="p-3 bg-white border border-stone-100 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 rounded-xl shadow-sm transition-all"
                            title="Register Child Descriptor"
                        >
                            <FolderPlus size={18} />
                        </button>
                    )}
                    {canManage && (
                        <div className="flex gap-1.5 p-1.5 bg-stone-100 rounded-2xl border border-stone-200">
                            <button 
                                onClick={() => onEdit(level, item)}
                                className="p-2.5 bg-white text-stone-400 hover:text-slate-900 rounded-xl shadow-sm transition-all"
                                title="Modify Configuration"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => onDelete(level, item.id)}
                                className="p-2.5 bg-white text-stone-300 hover:text-rose-600 rounded-xl shadow-sm transition-all"
                                title="Purge Node"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {isInternalOpen && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-6"
                    >
                        {showStaff && (
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 ms-16 mb-6">
                             {staffHere.map((s: StaffMember) => (
                                <div key={s.id} className="flex items-center gap-5 p-5 border border-stone-100 bg-white rounded-3xl shadow-sm hover:border-indigo-200 transition-all group/staff">
                                    <div className="w-12 h-12 rounded-2xl bg-stone-50 border border-stone-100 flex items-center justify-center text-stone-400 group-hover/staff:bg-slate-900 group-hover/staff:text-indigo-400 group-hover/staff:rotate-6 transition-all">
                                    {s.type === 'ACADEMIC' ? <GraduationCap size={24}/> : <User size={24}/>}
                                    </div>
                                    <div className="min-w-0">
                                    <p className="text-sm font-black text-slate-800 truncate leading-tight uppercase italic">{s.name}</p>
                                    <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mt-1 opacity-60">{s.position}</p>
                                    </div>
                                </div>
                             ))}
                           </div>
                        )}
                        {children.map(child => (
                                <TreeNode 
                                    key={child.id} 
                                    item={child} 
                                    level={childLevel} 
                                    canManage={canManage}
                                    forceExpand={forceExpand}
                                    onAddChild={onAddChild}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                    onDrop={onDrop}
                                    searchTerm={searchTerm}
                                    childrenData={childrenData}
                                />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const BranchCard = ({ branch, onEdit, canManage }: { branch: Branch, onEdit: () => void, canManage: boolean }) => (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-white border border-stone-100 p-8 rounded-[3.5rem] hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] transition-all group flex flex-col justify-between hover:border-indigo-200 relative overflow-hidden"
    >
        <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-bl-[4rem] opacity-30 group-hover:scale-110 transition-transform" />
        
        <div className="flex justify-between items-start mb-8 relative z-10">
            <div className="bg-slate-900 text-indigo-400 p-5 rounded-2.5xl shadow-2xl group-hover:rotate-6 transition-all duration-500">
                <MapPin size={28} />
            </div>
            <div className="flex gap-3">
                <span className={cn(
                    "px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border inline-flex items-center gap-2 shadow-sm",
                    branch.status === 'ACTIVE' ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", branch.status === 'ACTIVE' ? "bg-emerald-500" : "bg-rose-500")} />
                    {branch.status === 'ACTIVE' ? 'ONLINE' : 'OFFLINE'}
                </span>
                {canManage && (
                    <button onClick={onEdit} className="p-3 bg-stone-50 text-stone-400 hover:text-slate-900 hover:bg-white rounded-xl border border-stone-100 transition-all">
                        <Edit2 size={18} />
                    </button>
                )}
            </div>
        </div>
        
        <div className="mb-8 relative z-10">
            <h4 className="font-black text-2xl text-slate-900 mb-2 italic uppercase tracking-tight leading-none">{branch.name}</h4>
            <div className="flex items-center gap-2 text-stone-400 text-[10px] font-black uppercase tracking-widest opacity-60">
                <MapPin size={12} className="text-indigo-500" />
                {branch.location}
            </div>
        </div>

        <div className="grid grid-cols-2 gap-6 border-t border-stone-50 pt-8 relative z-10">
            <div>
                <p className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em] mb-2">Commanding Officer</p>
                <p className="text-sm font-black text-slate-800 truncate uppercase italic">{branch.managerName || '---'}</p>
            </div>
            <div className="flex flex-col items-end">
                <p className="text-[9px] font-black text-stone-300 uppercase tracking-[0.2em] mb-2">Max Capacity</p>
                <div className="flex items-center gap-2">
                    <Users size={14} className="text-indigo-400" />
                    <p className="text-lg font-mono font-black text-slate-900 leading-none">{branch.capacity?.toLocaleString() || '0'}</p>
                </div>
            </div>
        </div>
    </motion.div>
);

const DirectCard = ({ title, sub, extra, hierarchy, icon: Icon, onEdit, canManage }: any) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="bg-white border border-stone-100 p-8 rounded-[3.5rem] hover:shadow-[0_40px_80px_rgba(0,0,0,0.06)] transition-all group flex items-center justify-between hover:border-indigo-200 relative overflow-hidden"
  >
    <div className="absolute top-0 left-0 w-24 h-24 bg-stone-50 rounded-br-[3rem] opacity-20 pointer-events-none" />
    <div className="flex items-center gap-6 relative z-10 flex-1 min-w-0">
      <div className="bg-stone-50 text-stone-400 p-5 rounded-2.5xl group-hover:bg-slate-900 group-hover:text-indigo-400 transition-all duration-500 shadow-sm shrink-0 border border-stone-100">
        <Icon size={28} />
      </div>
      <div className="min-w-0">
        {hierarchy && (
            <div className="flex items-center gap-2 mb-2">
                <div className="w-4 h-px bg-indigo-500 opacity-20" />
                <p className="text-[9px] font-black text-stone-400 uppercase tracking-[0.25em] truncate group-hover:text-indigo-600 transition-colors">{hierarchy}</p>
            </div>
        )}
        <h4 className="font-black text-slate-900 truncate text-xl uppercase italic tracking-tight italic leading-none mb-2">{title}</h4>
        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest truncate opacity-60">{sub}</p>
        {extra && (
            <div className="mt-3 flex items-center gap-2 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-100 inline-flex">
                <div className="w-1 h-1 bg-indigo-500 rounded-full animate-pulse" />
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest truncate">{extra}</p>
            </div>
        )}
      </div>
    </div>
    {canManage && (
        <button onClick={onEdit} className="p-3 bg-stone-50 text-stone-300 hover:text-slate-900 hover:bg-white rounded-xl border border-stone-100 transition-all opacity-0 group-hover:opacity-100 shrink-0 ml-4 shadow-sm">
            <Edit2 size={20} />
        </button>
    )}
  </motion.div>
);

const FormInput = ({ label, name, defaultValue, type = "text" }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] opacity-60 ml-1">{label}</label>
    <input 
      name={name} 
      defaultValue={defaultValue} 
      type={type} 
      required 
      className="w-full bg-stone-50 border border-stone-100 rounded-2.5xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-stone-200 transition-all font-black text-slate-700 italic uppercase tracking-tight placeholder:text-stone-300" 
    />
  </div>
);

const FormTextArea = ({ label, name, defaultValue }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] opacity-60 ml-1">{label}</label>
    <textarea 
      name={name} 
      defaultValue={defaultValue} 
      className="w-full bg-stone-50 border border-stone-100 rounded-2.5xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-stone-200 transition-all font-black text-slate-700 italic uppercase tracking-tight placeholder:text-stone-300 min-h-[120px] resize-none" 
    />
  </div>
);

const FormSelect = ({ label, name, children, defaultValue }: any) => (
  <div className="space-y-3">
    <label className="text-[10px] font-black text-stone-400 uppercase tracking-[0.25em] opacity-60 ml-1">{label}</label>
    <div className="relative">
      <select 
        name={name} 
        defaultValue={defaultValue} 
        className="w-full bg-stone-50 border border-stone-100 rounded-2.5xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-stone-200 transition-all font-black text-slate-700 italic uppercase tracking-tight appearance-none"
      >
        {children}
      </select>
      <div className="absolute left-5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-300">
        <ChevronRight size={16} className="rotate-90" />
      </div>
    </div>
  </div>
);

export default UniversityManagement;
