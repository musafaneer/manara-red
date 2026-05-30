import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Bell, Zap } from 'lucide-react';
import { getNotifications, markNotificationRead } from '../../services/communicationService';
import { UserRole } from '../../types';
import { Language } from '../../services/i18nService';

interface NotificationCenterProps {
    role: UserRole;
    studentId?: string;
    language: Language;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ role, studentId, language }) => {
    const [notifications, setNotifications] = useState(getNotifications(role, studentId));
    
    const unreadCount = notifications.filter(n => !n.isRead).length;

    const handleRead = (id: string) => {
        markNotificationRead(id);
        setNotifications(getNotifications(role, studentId));
    };

    if (notifications.length === 0) return null;

    return (
        <div className="mb-12 space-y-4">
            <div className="flex items-center justify-between px-2">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 italic uppercase">
                    <Bell className="text-indigo-600" />
                    {language === 'ar' ? 'مركز التنبيهات' : 'Global Alert Hub'}
                    {unreadCount > 0 && (
                        <span className="bg-rose-500 text-white text-[10px] px-3 py-1 rounded-full animate-pulse uppercase tracking-widest border border-white/20">
                            {unreadCount} {language === 'ar' ? 'جديد' : 'New'}
                        </span>
                    )}
                </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {notifications.slice(0, 3).map(n => (
                    <motion.div 
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-6 rounded-[2.5rem] border transition-all hover:shadow-2xl hover:shadow-slate-100 relative group overflow-hidden ${
                            n.isRead ? 'bg-white border-slate-100 opacity-60' : 'bg-white border-blue-200 ring-4 ring-blue-50/50'
                        }`}
                    >
                        {!n.isRead && (
                            <div className={`absolute top-6 ${language === 'ar' ? 'left-6' : 'right-6'} w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-200`}></div>
                        )}
                        <div className="flex gap-4 items-start">
                            <div className={`p-4 rounded-2xl ${
                                n.type === 'DEADLINE' ? 'bg-rose-50 text-rose-600' :
                                n.type === 'FINANCE' ? 'bg-amber-50 text-amber-600' :
                                'bg-blue-50 text-blue-600'
                            }`}>
                                <Zap size={20} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-black text-slate-800 text-sm leading-tight mb-2 uppercase italic">{n.title}</h4>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed line-clamp-2">{n.message}</p>
                                <div className="mt-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">
                                        {new Date(n.date).toLocaleDateString(language === 'ar' ? 'ar-LY' : 'en-US')}
                                    </span>
                                    {!n.isRead && (
                                        <button 
                                            onClick={() => handleRead(n.id)}
                                            className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline active:scale-95 transition-transform"
                                        >
                                            {language === 'ar' ? 'تمت القراءة' : 'Acknowledge'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default NotificationCenter;
