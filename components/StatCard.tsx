import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<any>;
  color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'indigo' | 'emerald';
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, color, trend, trendUp, delay = 0 }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', accent: 'bg-blue-600' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100', accent: 'bg-rose-600' },
    yellow: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100', accent: 'bg-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100', accent: 'bg-purple-600' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-100', accent: 'bg-indigo-600' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', accent: 'bg-emerald-600' },
  };

  const theme = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
      className="bg-white p-8 rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100 hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] transition-all relative overflow-hidden group"
    >
      {/* Precision Grid Background */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none group-hover:opacity-[0.05] transition-opacity" 
           style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />
      
      <div className="flex justify-between items-start relative z-10">
        <div className="space-y-6">
            <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.25em] mb-3 opacity-60">{label}</p>
                <div className="flex items-baseline gap-3">
                    <h3 className="text-5xl font-black text-slate-900 tracking-[-0.04em]">
                        {value}
                    </h3>
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", theme.accent)} />
                </div>
            </div>

            {trend && (
                <div className={cn(
                    "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter w-fit border",
                    trendUp ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                )}>
                    {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {trend}
                </div>
            )}
        </div>

        <div className={cn(
            "p-5 rounded-[2rem] transition-all duration-700 shadow-sm border",
            theme.bg, theme.text, theme.border
        )}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Corner Status Notch */}
      <div className={cn("absolute top-0 right-0 w-16 h-1 opacity-20", theme.accent)} />
    </motion.div>
  );
};

export default StatCard;
