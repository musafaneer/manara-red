
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, X, Trash2, CheckCircle, Info, AlertTriangle, 
  Clock, Filter, ShieldAlert, Sparkles, Megaphone,
  BellRing, Inbox
} from 'lucide-react';
import { SystemNotification, NotificationType, UserRole, AuthUser } from '../types';
import { getNotifications, markNotificationRead, clearAllNotifications } from '../services/communicationService';
import { cn } from '../lib/utils';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
    currentUser: AuthUser;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose, currentUser }) => {
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [filter, setFilter] = useState<NotificationType | 'ALL'>('ALL');

    useEffect(() => {
        if (isOpen) {
            refreshNotifications();
        }
    }, [isOpen]);

    const refreshNotifications = () => {
        const all = getNotifications();
        // Filter by role if specified
        const filtered = all.filter(n => {
            if (!n.targetRole) return true;
            return n.targetRole === currentUser.role;
        });
        setNotifications(filtered);
    };

    const handleMarkAsRead = (id: string) => {
        markNotificationRead(id);
        refreshNotifications();
    };

    const handleClearAll = () => {
        if (window.confirm('هل أنت متأكد من مسح جميع التنبيهات؟')) {
            clearAllNotifications();
            refreshNotifications();
        }
    };

    const getIcon = (type: NotificationType) => {
        switch (type) {
            case NotificationType.SYSTEM: return <ShieldAlert className="text-blue-500" size={20} />;
            case NotificationType.ACADEMIC: return <Sparkles className="text-purple-500" size={20} />;
            case NotificationType.FINANCE: return <Info className="text-emerald-500" size={20} />;
            case NotificationType.DEADLINE: return <AlertTriangle className="text-amber-500" size={20} />;
            default: return <Bell className="text-slate-500" size={20} />;
        }
    };

    const filteredNotifs = notifications.filter(n => filter === 'ALL' || n.type === filter);
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
                    />

                    {/* Drawer */}
                    <motion.div 
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 right-0 h-full w-full max-w-lg bg-white shadow-2xl z-[101] flex flex-col border-l border-slate-200"
                    >
                        {/* Header */}
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                                    <BellRing size={28} className="text-blue-600" />
                                    مركز التنبيهات
                                    {unreadCount > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-black animate-pulse">
                                            {unreadCount}
                                        </span>
                                    )}
                                </h2>
                                <p className="text-slate-500 text-sm font-medium mt-1">تنبيهات النظام والمواعيد الأكاديمية</p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="p-3 hover:bg-slate-200 rounded-2xl transition-all text-slate-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Filters */}
                        <div className="px-8 py-4 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-50">
                            {[
                                { id: 'ALL', label: 'الكل' },
                                { id: NotificationType.SYSTEM, label: 'النظام' },
                                { id: NotificationType.ACADEMIC, label: 'أكاديمي' },
                                { id: NotificationType.DEADLINE, label: 'مواعيد' },
                                { id: NotificationType.FINANCE, label: 'مالي' }
                            ].map(f => (
                                <button
                                    key={f.id}
                                    onClick={() => setFilter(f.id as any)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                        filter === f.id 
                                            ? "bg-slate-900 text-white shadow-lg" 
                                            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                    )}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                            {filteredNotifs.length > 0 ? (
                                filteredNotifs.map((notif) => (
                                    <motion.div 
                                        layout
                                        key={notif.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={cn(
                                            "p-6 rounded-[2rem] border transition-all relative group",
                                            notif.isRead 
                                                ? "bg-white border-slate-100 opacity-75" 
                                                : "bg-blue-50/30 border-blue-100 ring-1 ring-blue-500/5 shadow-sm"
                                        )}
                                    >
                                        <div className="flex gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                notif.isRead ? "bg-slate-50" : "bg-white"
                                            )}>
                                                {getIcon(notif.type)}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h3 className={cn(
                                                        "font-black text-sm",
                                                        notif.isRead ? "text-slate-600" : "text-slate-900"
                                                    )}>
                                                        {notif.title}
                                                    </h3>
                                                    <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(notif.date).toLocaleDateString('ar-LY')}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                                    {notif.message}
                                                </p>
                                                {!notif.isRead && (
                                                    <button 
                                                        onClick={() => handleMarkAsRead(notif.id)}
                                                        className="mt-3 text-[10px] font-black text-blue-600 hover:text-blue-800 uppercase tracking-widest flex items-center gap-1"
                                                    >
                                                        <CheckCircle size={12} /> تم الاطلاع
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-12">
                                    <div className="bg-slate-50 p-8 rounded-full mb-6">
                                        <Inbox size={64} className="text-slate-200" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900">لا توجد تنبيهات</h4>
                                    <p className="text-slate-400 text-sm mt-2 font-medium">كل شيء محدث، لا توجد تنبيهات جديدة في الوقت الحالي.</p>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {notifications.length > 0 && (
                            <div className="p-8 border-t border-slate-100 bg-white">
                                <button 
                                    onClick={handleClearAll}
                                    className="w-full py-4 text-[10px] font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    تفريغ قائمة التنبيهات
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default NotificationCenter;
