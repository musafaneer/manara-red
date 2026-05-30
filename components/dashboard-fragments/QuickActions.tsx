import React from 'react';
import { motion } from 'motion/react';
import { PlusCircle, TrendingUp, CreditCard, BookOpen, Network, Mail } from 'lucide-react';
import { UserRole } from '../../types';
import { Language } from '../../services/i18nService';
import { cn } from '../../lib/utils';

interface QuickActionsProps {
    setActiveTab?: (tab: string) => void;
    language: Language;
    role: UserRole;
}

const QuickActions: React.FC<QuickActionsProps> = ({ setActiveTab, language, role }) => {
    const actions = [
        { id: 'students', label: language === 'ar' ? 'تسجيل طالب جديد' : 'Enrollment Node', icon: PlusCircle, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
        { id: 'dept_performance', label: language === 'ar' ? 'أداء الأقسام' : 'Dept. Performance', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { id: 'financials', label: language === 'ar' ? 'التحصيل والمعالجة' : 'Billing & Recovery', icon: CreditCard, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
        { id: 'curriculum', label: language === 'ar' ? 'إدارة المناهج' : 'Syllabus Engine', icon: BookOpen, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
        { id: 'organization', label: language === 'ar' ? 'الهيكل الأكاديمي' : 'Architectural Map', icon: Network, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
        { id: 'communications', label: language === 'ar' ? 'إرسال تعميم' : 'Broadcast Center', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    ];

    // Filter based on role if necessary (for now show all for Admin/Registrar)

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {actions.map((action, index) => (
                <motion.button
                    key={action.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -8, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setActiveTab?.(action.id)}
                    className={cn(
                        "p-8 rounded-[2.5rem] border transition-all flex flex-col items-center gap-6 group",
                        "bg-white border-slate-100",
                        "hover:border-slate-300"
                    )}
                >
                    <div className={cn("p-5 rounded-2.5xl transition-all group-hover:scale-110 shadow-sm", action.bg, action.color)}>
                        <action.icon size={28} />
                    </div>
                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest text-center italic">{action.label}</span>
                </motion.button>
            ))}
        </div>
    );
};

export default QuickActions;
