import React, { useState } from 'react';
import { 
  Lock, User, ShieldCheck, ChevronLeft, ArrowLeft, ArrowRight, 
  HelpCircle, ExternalLink, GraduationCap, Globe, 
  Eye, EyeOff, LayoutPanelLeft, Compass, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { login } from '../services/authService';
import { AuthUser } from '../types';
import { Language } from '../services/i18nService';

interface LoginProps {
  onLogin: (user: AuthUser) => void;
  language: Language;
  onOpenAdmission?: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, language, onOpenAdmission }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }
    setError('');
    setLoading(true);

    try {
        const user = await login(username, password);
        onLogin(user);
    } catch (err) {
        setError('اسم المستخدم أو كلمة المرور غير صحيحة. يرجى المحاولة مرة أخرى.');
    } finally {
        setLoading(false);
    }
  };

  const handleQuickFill = (role: string) => {
      setUsername(role);
      setPassword(role);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col lg:flex-row font-sans selection:bg-brand-100 selection:text-brand-900 overflow-hidden" dir="ltr">
      {/* Sidebar / Info Panel - Visible on LG screens */}
      <div className="hidden lg:flex lg:w-[40%] bg-stone-900 relative overflow-hidden flex-col justify-between p-12 text-white shadow-2xl z-10">
        {/* Abstract Background Patterns */}
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
          <div className="absolute -top-[10%] -right-[10%] w-[80%] h-[80%] rounded-full bg-white blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] [background-size:24px_24px] opacity-10" />
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative z-10"
        >
          <div className="flex items-center gap-3 mb-16">
            <div className="w-12 h-12 bg-[#C74634] rounded-xl flex items-center justify-center text-white shadow-2xl shadow-red-900/40">
              <Compass size={28} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight uppercase">Oracle <span className="font-light opacity-50">Campus</span></h2>
          </div>

          <div className="space-y-12 max-w-sm">
            <div>
              <h3 className="text-5xl font-light mb-6 leading-tight tracking-tight">The Modern Era of <span className="font-bold">Education</span></h3>
              <p className="text-stone-400 text-lg leading-relaxed">
                Integrated enterprise solutions for academic management, student services, and institutional intelligence.
              </p>
            </div>

            <div className="space-y-8">
              {[
                { icon: ShieldCheck, title: "Enterprise Security", desc: "Military-grade data protection and student privacy." },
                { icon: LayoutPanelLeft, title: "Modern Interface", desc: "Intuitive Redwood design for maximum productivity." },
                { icon: Globe, title: "Global Accessibility", desc: "Cloud-native access from any device, anywhere." }
              ].map((item, idx) => (
                <motion.div 
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + (idx * 0.1) }}
                  className="flex gap-5"
                >
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon size={22} className="text-stone-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white mb-1">{item.title}</h4>
                    <p className="text-xs text-stone-500 font-medium leading-relaxed">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="relative z-10 pt-12 border-t border-white/5">
          <p className="text-xs font-bold text-stone-600 uppercase tracking-widest">
            © 2026 Oracle Campus Management. All Rights Reserved.
          </p>
        </div>
      </div>

      {/* Main Login Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 lg:p-24 bg-stone-50 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-12"
        >
          {/* Header Mobile Only */}
          <div className="lg:hidden text-center mb-4">
            <div className="w-16 h-16 bg-[#C74634] rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-xl shadow-red-100">
               <Compass size={32} />
            </div>
            <h1 className="text-2xl font-black text-stone-800">Oracle Campus</h1>
          </div>

          <div>
            <h2 className="text-4xl font-light text-stone-900 mb-3 leading-tight tracking-tight">Welcome back</h2>
            <p className="text-stone-500 font-medium">Please sign in to your institutional account.</p>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3"
                role="alert"
                id="login-error"
              >
                <AlertTriangle size={18} className="text-red-600 shrink-0" aria-hidden="true" />
                <p className="text-red-700 text-sm font-bold">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6" aria-labelledby="login-title">
            <h1 id="login-title" className="sr-only">تسجيل الدخول</h1>
            <div className="space-y-2">
              <label htmlFor="username" className="text-xs font-bold text-stone-400 uppercase tracking-widest px-1">
                {language === 'ar' ? 'اسم المستخدم / الرقم الجامعي' : 'Username / ID'}
              </label>
              <div className="group relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-500 transition-colors pointer-events-none" aria-hidden="true">
                  <User size={20} />
                </div>
                <input 
                  id="username"
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'ar' ? 'أدخل الرقم الجامعي' : 'Enter your university ID'}
                  className="w-full h-14 bg-white border border-stone-200 rounded-xl pl-14 pr-6 text-sm font-bold focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label htmlFor="password" className="text-xs font-bold text-stone-400 uppercase tracking-widest">
                  {language === 'ar' ? 'كلمة المرور' : 'Password'}
                </label>
                <button type="button" className="text-xs font-bold text-brand-600 hover:underline">
                  {language === 'ar' ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                </button>
              </div>
              <div className="group relative">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-brand-500 transition-colors pointer-events-none" aria-hidden="true">
                  <Lock size={20} />
                </div>
                <input 
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full h-14 bg-white border border-stone-200 rounded-xl pl-14 pr-14 text-sm font-bold focus:ring-4 focus:ring-brand-500/5 focus:border-brand-500 outline-none transition-all font-mono"
                  aria-invalid={error ? "true" : "false"}
                  aria-describedby={error ? "login-error" : undefined}
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-stone-600 transition-all focus:outline-none"
                  aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                >
                  {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3 px-1">
              <input type="checkbox" id="remember" className="w-4 h-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500" />
              <label htmlFor="remember" className="text-sm font-bold text-stone-600 cursor-pointer">Keep me signed in</label>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full h-14 bg-[#C74634] text-white rounded-xl font-bold text-base shadow-xl shadow-red-200 hover:bg-[#A53A2A] transition-all flex justify-center items-center gap-3 disabled:opacity-70"
            >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={20} />
                  </>
                )}
            </button>
          </form>

          {/* Footer Actions */}
          <div className="pt-8 text-center space-y-8">
            <div className="flex items-center gap-4 text-stone-300 before:content-[''] before:flex-1 before:h-px before:bg-stone-100 after:content-[''] after:flex-1 after:h-px after:bg-stone-100 uppercase text-[10px] font-black tracking-widest">
               Access Portals
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={onOpenAdmission}
                className="h-12 w-full border border-stone-200 rounded-xl flex items-center justify-center gap-3 text-stone-700 font-bold text-sm hover:bg-stone-100 transition-all"
              >
                <GraduationCap size={18} className="text-[#C74634]" />
                Student Admission Portal
              </button>
              
              <div className="mt-8">
                <button 
                  onClick={() => setShowDemo(!showDemo)}
                  className="text-xs font-bold text-stone-400 hover:text-brand-600 flex items-center gap-2 mx-auto transition-colors"
                >
                  {showDemo ? 'Hide Simulation Accounts' : 'Show Simulation Access'}
                  <HelpCircle size={14} />
                </button>

                <AnimatePresence>
                  {showDemo && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-4 p-3 bg-stone-100 rounded-xl border border-stone-200">
                        {[
                          { id: 'admin', label: 'Admin' },
                          { id: 'steward', label: 'Steward' },
                          { id: 'graduate', label: 'Graduate' },
                          { id: 'dept_head', label: 'Dept Head' },
                          { id: 'registrar', label: 'Registrar' },
                          { id: 'finance', label: 'Finance' },
                          { id: 'faculty', label: 'Professor' },
                          { id: 'student', label: 'Student' }
                        ].map(acc => (
                           <button 
                            key={acc.id}
                            type="button" 
                            onClick={() => handleQuickFill(acc.id)} 
                            className="bg-white hover:bg-stone-200 p-2 rounded-lg text-[10px] font-bold text-stone-700 border border-stone-200 transition-all"
                          >
                            {acc.label}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            <div className="pt-12 flex flex-wrap justify-center gap-8 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
               <a href="#" className="hover:text-stone-900 flex items-center gap-1.5 transition-colors">
                  Documentation
               </a>
               <a href="#" className="hover:text-stone-900 flex items-center gap-1.5 transition-colors">
                  Support Center
               </a>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
