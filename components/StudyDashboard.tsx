'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Download, 
  Upload, 
  BookOpen, 
  Trash2, 
  XCircle,
  ChevronRight,
  Filter,
  Play,
  Square,
  FileText,
  BarChart3,
  Layers,
  Settings2,
  Timer,
  Target,
  Trophy,
  TrendingUp,
  BrainCircuit,
  LayoutDashboard,
  ListTodo,
  CalendarDays,
  Activity,
  HelpCircle,
  User,
  Search,
  Sparkles,
  Lock,
  Mail,
  LogOut,
  Bot,
  Pencil,
  ExternalLink,
  MapPin,
  DollarSign,
  ClipboardList,
  Check,
  X
} from 'lucide-react';
import { extractTextFromPDF } from '@/lib/pdf';
import { 
  format, 
  isToday, 
  isPast, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay,
  startOfWeek,
  endOfWeek,
  subDays
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import dynamic from 'next/dynamic';
import { getAuthInstance } from '@/lib/firebase';
import { onAuthStateChanged, User as FirebaseUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { StudyContent, RevisionTask, UserProfile, ExamInfo, Simulado, SimuladoQuestion } from '@/lib/scheduler';
import { 
  loadStudies, 
  saveStudies, 
  addStudy, 
  updateRevision, 
  cancelMonthlyRevisions, 
  updateStudyNotes, 
  resetSystem,
  toggleStudyStatus,
  loadProfile,
  saveProfile,
  loadExams,
  saveExams,
  deleteExam,
  updateExam,
  loadSimulados,
  saveSimulados
} from '@/lib/storage';
import { verticalizeSyllabus, searchOpenExams, OpenExam, generateSimulado } from '@/lib/ai';
import UserGuide from './UserGuide';

type Tab = 'dashboard' | 'tasks' | 'calendar' | 'subjects' | 'analytics' | 'profile' | 'exams' | 'simulados' | 'settings';

export default function StudyDashboard() {
  const [studies, setStudies] = useState<StudyContent[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStudyModalOpen, setIsStudyModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isEditExamModalOpen, setIsEditExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<ExamInfo | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [loginData, setLoginData] = useState({ user: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [forgotMessage, setForgotMessage] = useState({ text: '', type: 'error' as 'error' | 'success' });
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [userProfile, setUserProfile] = useState<UserProfile>({ name: '', email: '', interestArea: '', level: '' });
  const [exams, setExams] = useState<ExamInfo[]>([]);
  const [simulados, setSimulados] = useState<Simulado[]>([]);
  const [openExams, setOpenExams] = useState<OpenExam[]>([]);
  const [isSearchingExams, setIsSearchingExams] = useState(false);
  const [isVerticalizing, setIsVerticalizing] = useState(false);
  const [syllabusInput, setSyllabusInput] = useState('');
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<(RevisionTask & { contentTitle: string; category: string; color?: string; studyStatus?: string }) | null>(null);
  const [newStudy, setNewStudy] = useState({ title: '', category: '', startDate: format(new Date(), 'yyyy-MM-dd') });
  const [filter, setFilter] = useState<'today' | 'all' | 'pending'>('today');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');
  const [mounted, setMounted] = useState(false);
  
  // Study Session State
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [studyNotes, setStudyNotes] = useState('');
  const [questionsAttempted, setQuestionsAttempted] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isAddingStudy, setIsAddingStudy] = useState(false);

  const loadGuestData = async () => {
    setIsGuestMode(true);
    const guestId = 'guest_user';
    const [loadedStudies, loadedProfile, loadedExams, loadedSimulados] = await Promise.all([
      loadStudies(guestId),
      loadProfile(guestId),
      loadExams(guestId),
      loadSimulados(guestId)
    ]);
    setStudies(loadedStudies);
    setUserProfile(loadedProfile);
    setExams(loadedExams);
    setSimulados(loadedSimulados);
    setIsAuthenticated(true);
    setUser({ uid: guestId, email: 'convidado@studyflow.com', displayName: 'Convidado' } as any);
    setIsAuthLoading(false);
  };

  useEffect(() => {
    let unsubscribe: () => void = () => {};
    
    const checkAuth = async () => {
      try {
        const authInstance = getAuthInstance();
        if (authInstance) {
          unsubscribe = onAuthStateChanged(authInstance, async (currentUser) => {
            setUser(currentUser);
            setIsAuthenticated(!!currentUser);
            
            if (currentUser) {
              const [loadedStudies, loadedProfile, loadedExams, loadedSimulados] = await Promise.all([
                loadStudies(currentUser.uid),
                loadProfile(currentUser.uid),
                loadExams(currentUser.uid),
                loadSimulados(currentUser.uid)
              ]);
              setStudies(loadedStudies);
              setUserProfile(loadedProfile);
              setExams(loadedExams);
              setSimulados(loadedSimulados);
            } else {
              setStudies([]);
              setUserProfile({ name: '', email: '', interestArea: '', level: '' });
              setExams([]);
              setSimulados([]);
            }
            setIsAuthLoading(false);
          });
        } else {
          setIsAuthLoading(false);
        }
      } catch (error: any) {
        console.error('Firebase initialization error:', error);
        setIsAuthLoading(false);
      }
    };

    checkAuth();

    const savedTheme = localStorage.getItem('studyflow_theme') as 'light' | 'dark' | 'system';
    if (savedTheme) setTheme(savedTheme);
    
    setMounted(true);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    const applyTheme = (t: 'light' | 'dark' | 'system') => {
      root.classList.remove('light', 'dark');
      
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(t);
      }
      localStorage.setItem('studyflow_theme', t);
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (sessionStartTime) {
      interval = setInterval(() => {
        setElapsedSeconds(Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [sessionStartTime]);

  const todayTasks = useMemo(() => {
    return studies.flatMap(s => 
      s.revisions.map(r => ({ ...r, contentTitle: s.title, category: s.category, color: s.color, studyStatus: s.status }))
    ).filter(r => {
      if (r.studyStatus !== 'active') return false;
      const date = parseISO(r.scheduledDate);
      if (filter === 'today') return isToday(date) && !r.completedDate;
      if (filter === 'pending') return isPast(date) && !r.completedDate;
      return true;
    });
  }, [studies, filter]);

  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayTasks = studies.flatMap(s => s.revisions).filter(r => r.completedDate && r.completedDate.startsWith(dateStr));
      return {
        name: format(date, 'EEE', { locale: ptBR }),
        minutos: dayTasks.reduce((acc, r) => acc + (r.durationMinutes || 0), 0),
        questoes: dayTasks.reduce((acc, r) => acc + (r.questionsAttempted || 0), 0),
      };
    });
    return last7Days;
  }, [studies]);

  const subjectData = useMemo(() => {
    const categories = Array.from(new Set(studies.map(s => s.category)));
    return categories.map(cat => ({
      name: cat,
      value: studies.filter(s => s.category === cat).length,
      color: studies.find(s => s.category === cat)?.color || '#6366f1'
    }));
  }, [studies]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const auth = getAuthInstance();
    if (!auth) {
      setLoginError('Firebase não configurado. Use o Modo Convidado.');
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, loginData.user, loginData.password);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError('E-mail ou senha incorretos!');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const auth = getAuthInstance();
    if (!auth) {
      setLoginError('Firebase não configurado. Use o Modo Convidado.');
      return;
    }
    try {
      await createUserWithEmailAndPassword(auth, loginData.user, loginData.password);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setLoginError('Este e-mail já está em uso.');
      } else if (error.code === 'auth/weak-password') {
        setLoginError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setLoginError('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  const handleLogout = async () => {
    if (isGuestMode) {
      setIsAuthenticated(false);
      setIsGuestMode(false);
      setUser(null);
      return;
    }
    try {
      const auth = getAuthInstance();
      if (auth) await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage({ text: '', type: 'error' });
    if (!forgotEmail) {
      setForgotMessage({ text: 'Por favor, insira seu e-mail.', type: 'error' });
      return;
    }
    const auth = getAuthInstance();
    if (!auth) {
      setForgotMessage({ text: 'Firebase não configurado.', type: 'error' });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMessage({ text: 'E-mail de recuperação enviado!', type: 'success' });
      setTimeout(() => setShowForgot(false), 3000);
    } catch (error: any) {
      console.error('Forgot password error:', error);
      setForgotMessage({ text: 'Erro ao enviar e-mail. Verifique o endereço.', type: 'error' });
    }
  };

  if (!mounted || isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto shadow-2xl shadow-indigo-600/20">
              <BrainCircuit className="text-white" size={40} />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">StudyFlow</h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sistema de Revisão Inteligente</p>
          </div>

          {!showForgot ? (
            <div className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-6">
              {loginError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl text-rose-500 text-sm font-bold text-center"
                >
                  {loginError}
                </motion.div>
              )}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="email" 
                      required
                      value={loginData.user}
                      onChange={e => setLoginData({...loginData, user: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="password" 
                      required
                      value={loginData.password}
                      onChange={e => setLoginData({...loginData, password: e.target.value})}
                      className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={handleLogin}
                  className="py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                >
                  ENTRAR
                </button>
                <button 
                  onClick={handleSignup}
                  className="py-5 bg-slate-800 text-white rounded-2xl font-black text-lg hover:bg-slate-700 transition-all active:scale-95"
                >
                  CRIAR CONTA
                </button>
              </div>

              <button 
                type="button"
                onClick={loadGuestData}
                className="w-full py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl font-black text-sm hover:bg-amber-500/20 transition-all active:scale-95 flex flex-col items-center gap-1"
              >
                <span>ENTRAR COMO CONVIDADO (MODO OFFLINE)</span>
                <span className="text-[10px] opacity-60 font-medium">Seus dados serão salvos apenas neste navegador</span>
              </button>

              <button 
                type="button" 
                onClick={() => setShowForgot(true)}
                className="w-full text-center text-slate-500 hover:text-indigo-400 font-bold text-sm transition-colors"
              >
                Esqueceu a senha?
              </button>
            </div>
          ) : (
            <form onSubmit={handleForgot} className="bg-slate-900/50 border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-6">
              {forgotMessage.text && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-2xl text-sm font-bold text-center ${
                    forgotMessage.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-500' : 'bg-rose-500/10 border border-rose-500/20 text-rose-500'
                  }`}
                >
                  {forgotMessage.text}
                </motion.div>
              )}
              <div className="space-y-4">
                <h2 className="text-2xl font-black text-white text-center">Recuperar Senha</h2>
                <p className="text-slate-400 text-center text-sm font-medium">Insira o e-mail cadastrado no seu perfil para receber o link de recuperação.</p>
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600" size={20} />
                    <input 
                      type="email" 
                      required
                      value={forgotEmail}
                      onChange={e => setForgotEmail(e.target.value)}
                      className="w-full pl-14 pr-6 py-4 bg-slate-950 border border-slate-800 rounded-2xl text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="seu@email.com"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                ENVIAR LINK
              </button>

              <button 
                type="button" 
                onClick={() => setShowForgot(false)}
                className="w-full text-center text-slate-500 hover:text-indigo-400 font-bold text-sm transition-colors"
              >
                Voltar para o Login
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const handleReset = async () => {
    if (!user) return;
    await resetSystem(user.uid);
    setIsResetModalOpen(false);
    window.location.reload();
  };

  const handleToggleStatus = async (id: string) => {
    if (!user) return;
    await toggleStudyStatus(user.uid, id);
    setStudies(await loadStudies(user.uid));
  };

  const skipRevision = async () => {
    if (!selectedTask || !user) return;
    if (confirm('Deseja pular esta revisão? Ela será marcada como concluída sem registro de tempo.')) {
      await updateRevision(user.uid, selectedTask.contentId, selectedTask.id, {
        completedDate: new Date().toISOString(),
        notes: 'Revisão pulada pelo usuário.'
      });
      setStudies(await loadStudies(user.uid));
      setIsStudyModalOpen(false);
      setSelectedTask(null);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    await saveProfile(user.uid, userProfile);
    alert('Perfil salvo com sucesso!');
  };

  const handleSearchExams = async () => {
    if (!userProfile.interestArea || !userProfile.level) {
      alert('Por favor, preencha sua área de interesse e nível no perfil primeiro.');
      setActiveTab('profile');
      return;
    }
    setIsSearchingExams(true);
    try {
      const results = await searchOpenExams(userProfile.interestArea, userProfile.level);
      setOpenExams(results);
      if (results.length === 0) {
        alert('Nenhum concurso encontrado para os critérios informados.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao buscar concursos. Tente novamente mais tarde.');
    } finally {
      setIsSearchingExams(false);
    }
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsPdfLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      setSyllabusInput(text);
      alert('PDF importado com sucesso! Agora clique em "Verticalizar com IA".');
    } catch (error: any) {
      console.error('Erro ao ler PDF:', error);
      alert(error.message || 'Erro ao processar o PDF. Certifique-se de que é um arquivo PDF válido.');
    } finally {
      setIsPdfLoading(false);
    }
  };

  const handleVerticalize = async () => {
    if (!syllabusInput) return;
    setIsVerticalizing(true);
    try {
      const result = await verticalizeSyllabus(syllabusInput);
      const newExam: ExamInfo = {
        id: Math.random().toString(36).substr(2, 9),
        title: result.title,
        date: result.date,
        location: result.location,
        salaries: result.salaries,
        relevantInfo: result.relevantInfo,
        verticalizedSyllabus: result.syllabus
      };
      const updatedExams = [...exams, newExam];
      setExams(updatedExams);
      if (user) await saveExams(user.uid, updatedExams);
      setSyllabusInput('');
      alert('Edital verticalizado com sucesso pela IA!');
      setActiveTab('exams');
    } catch (error) {
      console.error(error);
      alert('Erro ao verticalizar edital. Verifique sua conexão ou chave de API.');
    } finally {
      setIsVerticalizing(false);
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (confirm('Deseja realmente excluir este edital verticalizado?')) {
      const updated = exams.filter(e => e.id !== id);
      setExams(updated);
      if (user) await saveExams(user.uid, updated);
    }
  };

  const handleEditExam = (exam: ExamInfo) => {
    setEditingExam({ ...exam });
    setIsEditExamModalOpen(true);
  };

  const saveEditedExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam || !user) return;
    const updated = exams.map(e => e.id === editingExam.id ? editingExam : e);
    setExams(updated);
    await saveExams(user.uid, updated);
    setIsEditExamModalOpen(false);
    setEditingExam(null);
    alert('Edital atualizado com sucesso!');
  };

  const handleAddStudy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudy.title || !user) {
      alert('Por favor, preencha o título.');
      return;
    }
    
    setIsAddingStudy(true);
    try {
      await addStudy(user.uid, newStudy.title, newStudy.category, newStudy.startDate);
      const updatedStudies = await loadStudies(user.uid);
      setStudies(updatedStudies);
      setIsModalOpen(false);
      setNewStudy({ title: '', category: '', startDate: format(new Date(), 'yyyy-MM-dd') });
      setActiveTab('subjects');
    } catch (error) {
      console.error('Error adding study:', error);
      alert('Erro ao criar conteúdo. Tente novamente.');
    } finally {
      setIsAddingStudy(false);
    }
  };

  const openStudySession = (task: any) => {
    setSelectedTask(task);
    setStudyNotes(task.notes || '');
    setQuestionsAttempted(task.questionsAttempted || 0);
    setCorrectAnswers(task.correctAnswers || 0);
    setDifficulty(task.difficulty || 'medium');
    setIsStudyModalOpen(true);
  };

  const startSession = () => {
    setSessionStartTime(new Date());
    setElapsedSeconds(0);
  };

  const finishSession = async () => {
    if (!selectedTask || !sessionStartTime || !user) return;
    
    const endTime = new Date();
    const durationMinutes = Math.max(1, Math.floor((endTime.getTime() - sessionStartTime.getTime()) / 60000));
    
    await updateRevision(user.uid, selectedTask.contentId, selectedTask.id, {
      completedDate: endTime.toISOString(),
      startTime: sessionStartTime.toISOString(),
      endTime: endTime.toISOString(),
      durationMinutes,
      notes: studyNotes,
      questionsAttempted,
      correctAnswers,
      difficulty
    });

    setStudies(await loadStudies(user.uid));
    setSessionStartTime(null);
    setIsStudyModalOpen(false);
    setSelectedTask(null);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setOpenExams([]); // Clear search results when navigating to a new tab
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#020617] text-slate-200'} font-sans selection:bg-indigo-500/30`}>
      {/* Floating Help Button for Mobile/Desktop if needed */}
      <button 
        onClick={() => setIsGuideOpen(true)}
        className={`fixed bottom-20 right-6 lg:bottom-8 lg:right-8 z-40 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-2xl flex items-center justify-center hover:bg-indigo-500 transition-all active:scale-95 group`}
        title="Ajuda"
      >
        <HelpCircle size={28} />
        <span className="absolute right-full mr-4 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Precisa de Ajuda?
        </span>
      </button>

      {/* Sidebar Navigation */}
      <aside className={`fixed left-0 top-0 h-full w-20 hidden lg:flex flex-col items-center py-8 ${theme === 'light' ? 'bg-white border-r border-slate-200' : 'bg-slate-950 border-r border-slate-800/50'} z-50`}>
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-12 shadow-lg shadow-indigo-500/20">
          <BrainCircuit className="text-white" size={28} />
        </div>
        
        {isGuestMode && (
          <div className="mb-6 px-2">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-center">
              <Lock size={16} className="text-amber-500 mx-auto mb-1" />
              <span className="text-[8px] font-black text-amber-500 uppercase tracking-tighter leading-none block">Modo Offline</span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-6">
          <NavItem icon={<LayoutDashboard size={24} />} active={activeTab === 'dashboard'} onClick={() => changeTab('dashboard')} label="Dashboard" theme={theme} />
          <NavItem icon={<ListTodo size={24} />} active={activeTab === 'tasks'} onClick={() => changeTab('tasks')} label="Tarefas" theme={theme} />
          <NavItem icon={<CalendarDays size={24} />} active={activeTab === 'calendar'} onClick={() => changeTab('calendar')} label="Calendário" theme={theme} />
          <NavItem icon={<Layers size={24} />} active={activeTab === 'subjects'} onClick={() => changeTab('subjects')} label="Matérias" theme={theme} />
          <NavItem icon={<FileText size={24} />} active={activeTab === 'exams'} onClick={() => changeTab('exams')} label="Editais" theme={theme} />
          <NavItem icon={<ClipboardList size={24} />} active={activeTab === 'simulados'} onClick={() => changeTab('simulados')} label="Simulados" theme={theme} />
          <NavItem icon={<Activity size={24} />} active={activeTab === 'analytics'} onClick={() => changeTab('analytics')} label="Análise" theme={theme} />
          <NavItem icon={<User size={24} />} active={activeTab === 'profile'} onClick={() => changeTab('profile')} label="Perfil" theme={theme} />
          <NavItem icon={<Settings2 size={24} />} active={activeTab === 'settings'} onClick={() => changeTab('settings')} label="Configurações" theme={theme} />
          <NavItem icon={<HelpCircle size={24} />} active={false} onClick={() => setIsGuideOpen(true)} label="Ajuda / Tutorial" theme={theme} />
          <div className="mt-auto">
            <NavItem icon={<LogOut size={24} />} active={false} onClick={handleLogout} label="Sair" theme={theme} />
          </div>
        </nav>
        <div className="mt-auto flex flex-col gap-6">
          <div className={`w-10 h-10 rounded-full ${theme === 'light' ? 'bg-slate-100 border-slate-200' : 'bg-slate-800 border-slate-700'} border flex items-center justify-center overflow-hidden`}>
            <div className="w-full h-full bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-50" />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className={`fixed bottom-0 left-0 w-full h-16 ${theme === 'light' ? 'bg-white border-t border-slate-200' : 'bg-slate-950 border-t border-slate-800'} flex lg:hidden items-center justify-around px-4 z-50`}>
        <NavItem icon={<LayoutDashboard size={20} />} active={activeTab === 'dashboard'} onClick={() => changeTab('dashboard')} theme={theme} />
        <NavItem icon={<ListTodo size={20} />} active={activeTab === 'tasks'} onClick={() => changeTab('tasks')} theme={theme} />
        <NavItem icon={<ClipboardList size={20} />} active={activeTab === 'simulados'} onClick={() => changeTab('simulados')} theme={theme} />
        <NavItem icon={<Settings2 size={20} />} active={activeTab === 'settings'} onClick={() => changeTab('settings')} theme={theme} />
        <NavItem icon={<HelpCircle size={20} />} active={false} onClick={() => setIsGuideOpen(true)} theme={theme} />
      </nav>

      <main className="lg:pl-20 pb-24 lg:pb-0">
        <div className="p-6 md:p-10 lg:p-12 max-w-7xl mx-auto">
          {/* Top Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                Olá, <span className="text-indigo-500">{userProfile.name || 'Estudante'}</span>!
              </h1>
              <p className="text-slate-400 font-medium">
                {exams.length > 0 ? `Você tem ${exams.length} edital(is) verticalizado(s)` : 'Pronto para bater suas metas de hoje?'}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setIsGuideOpen(true)}
                className={`flex items-center gap-2 px-6 py-3 ${theme === 'light' ? 'bg-white text-slate-600 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700'} border rounded-2xl hover:bg-indigo-500/10 hover:text-indigo-500 transition-all font-bold active:scale-95`}
              >
                <HelpCircle size={20} />
                Ajuda
              </button>
              <button 
                onClick={handleSearchExams}
                disabled={isSearchingExams}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded-2xl hover:bg-indigo-600/20 transition-all font-bold active:scale-95"
              >
                {isSearchingExams ? <div className="w-5 h-5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" /> : <Bot size={20} />}
                Robozinho de Concursos
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 font-bold active:scale-95"
              >
                <Plus size={20} />
                Novo Conteúdo
              </button>
            </div>
          </header>

          {/* Robozinho Results Section */}
          {openExams.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-12 bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500 rounded-xl text-white">
                    <Bot size={24} />
                  </div>
                  <h3 className="text-xl font-black text-white">Concursos Encontrados pela IA</h3>
                </div>
                <button onClick={() => setOpenExams([])} className="text-slate-500 hover:text-white transition-colors">
                  <XCircle size={24} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {openExams.map((exam, i) => (
                  <div key={i} className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl hover:border-indigo-500/30 transition-all">
                    <h4 className="text-lg font-black text-white mb-1">{exam.name}</h4>
                    <p className="text-xs font-bold text-indigo-400 mb-3">{exam.organization}</p>
                    <div className="space-y-2 mb-4">
                      {exam.salary && <div className="flex items-center gap-2 text-xs text-slate-400"><DollarSign size={14} /> {exam.salary}</div>}
                      {exam.date && <div className="flex items-center gap-2 text-xs text-slate-400"><Calendar size={14} /> {exam.date}</div>}
                      <div className="flex items-center gap-2 text-xs text-slate-400"><Activity size={14} /> {exam.status}</div>
                    </div>
                    <a href={exam.link} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black rounded-xl transition-all">
                      VER EDITAL <ExternalLink size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard icon={<Timer className="text-indigo-400" />} label="Tempo Total" value={`${studies.reduce((acc, s) => acc + (s.totalMinutes || 0), 0)}m`} sub="Minutos acumulados" theme={theme} />
                  <StatCard icon={<Target className="text-emerald-400" />} label="Questões" value={studies.reduce((acc, s) => acc + (s.totalQuestions || 0), 0)} sub="Total de exercícios" theme={theme} />
                  <StatCard icon={<Trophy className="text-amber-400" />} label="Precisão" value={`${studies.reduce((acc, s) => acc + (s.totalQuestions || 0), 0) > 0 ? Math.round((studies.reduce((acc, s) => acc + (s.totalHits || 0), 0) / studies.reduce((acc, s) => acc + (s.totalQuestions || 0), 0)) * 100) : 0}%`} sub="Taxa de acerto global" theme={theme} />
                  <StatCard icon={<TrendingUp className="text-purple-400" />} label="Conteúdos" value={studies.length} sub="Matérias cadastradas" theme={theme} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Performance Chart */}
                  <div className="lg:col-span-2 bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8">
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-xl font-black text-white">Atividade Semanal</h3>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-indigo-500" /> Minutos</div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Questões</div>
                      </div>
                    </div>
                    <PerformanceChart chartData={chartData} />
                  </div>

                  {/* Subjects Distribution */}
                  <div className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8 flex flex-col">
                    <h3 className="text-xl font-black text-white mb-8">Distribuição</h3>
                    <DistributionChart subjectData={subjectData} />
                    <div className="mt-6 space-y-3">
                      {subjectData.slice(0, 4).map((sub, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sub.color }} />
                            <span className="text-xs font-bold text-slate-400">{sub.name}</span>
                          </div>
                          <span className="text-xs font-black text-white">{sub.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Recent Tasks Preview */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <BookOpen size={20} className="text-indigo-400" /> Estudos de Hoje
                      </h3>
                    </div>
                    <div className="space-y-4">
                      {todayTasks.filter(t => t.label === 'Estudo Inicial').length === 0 && (
                         <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800/50">
                           <p className="text-slate-500 text-sm font-bold">Nenhum novo estudo para hoje.</p>
                         </div>
                      )}
                      {todayTasks.filter(t => t.label === 'Estudo Inicial').map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => openStudySession(task)} theme={theme} />
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <Activity size={20} className="text-emerald-400" /> Revisões de Hoje
                      </h3>
                      <button onClick={() => setActiveTab('tasks')} className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
                        Ver todas <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {todayTasks.filter(t => t.label !== 'Estudo Inicial').length === 0 && (
                         <div className="p-8 text-center bg-slate-900/30 rounded-3xl border border-slate-800/50">
                           <p className="text-slate-500 text-sm font-bold">Nenhuma revisão pendente para hoje.</p>
                         </div>
                      )}
                      {todayTasks.filter(t => t.label !== 'Estudo Inicial').slice(0, 4).map(task => (
                        <TaskCard key={task.id} task={task} onClick={() => openStudySession(task)} theme={theme} />
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'tasks' && (
              <motion.div 
                key="tasks"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                   <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-bold w-fit">
                    <button onClick={() => setFilter('today')} className={`px-6 py-2.5 rounded-lg transition-all ${filter === 'today' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Hoje</button>
                    <button onClick={() => setFilter('pending')} className={`px-6 py-2.5 rounded-lg transition-all ${filter === 'pending' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Pendentes</button>
                    <button onClick={() => setFilter('all')} className={`px-6 py-2.5 rounded-lg transition-all ${filter === 'all' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-slate-300'}`}>Tudo</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {todayTasks.map(task => (
                    <TaskCard key={task.id} task={task} onClick={() => openStudySession(task)} theme={theme} />
                  ))}
                  {todayTasks.length === 0 && (
                    <div className="col-span-full py-24 text-center bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-800">
                      <ListTodo className="mx-auto text-slate-700 mb-4" size={48} />
                      <p className="text-slate-400 font-bold text-xl">Nenhuma tarefa encontrada</p>
                      <p className="text-slate-600 mt-1">Seu cronograma está limpo!</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'calendar' && (
              <motion.div 
                key="calendar"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-slate-900/50 border border-slate-800 rounded-[2.5rem] p-8"
              >
                <CalendarView studies={studies} onTaskClick={openStudySession} />
              </motion.div>
            )}

            {activeTab === 'subjects' && (
              <motion.div 
                key="subjects"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {studies.map(study => (
                  <div key={study.id} className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'} p-8 rounded-[2.5rem] border shadow-xl group hover:border-indigo-500/30 transition-all`}>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${study.color}20`, color: study.color }}>
                        <BookOpen size={24} />
                      </div>
                      <button onClick={async () => { if(user && confirm('Excluir este conteúdo?')) { const updated = studies.filter(s => s.id !== study.id); await saveStudies(user.uid, updated); setStudies(updated); } }} className="text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={20} />
                      </button>
                    </div>
                    <h4 className={`text-xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'} mb-1`}>{study.title}</h4>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">{study.category}</p>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`${theme === 'light' ? 'bg-slate-50' : 'bg-slate-800/50'} p-4 rounded-2xl`}>
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Tempo</p>
                        <p className={`text-lg font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{study.totalMinutes || 0}<span className="text-xs ml-1 text-slate-500">min</span></p>
                      </div>
                      <div className={`${theme === 'light' ? 'bg-slate-50' : 'bg-slate-800/50'} p-4 rounded-2xl`}>
                        <p className="text-[10px] text-slate-500 font-black uppercase mb-1">Questões</p>
                        <p className={`text-lg font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{study.totalQuestions || 0}</p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between pt-6 border-t ${theme === 'light' ? 'border-slate-100' : 'border-slate-800'}`}>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Status</span>
                        <span className={`text-xs font-bold ${study.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {study.status === 'active' ? 'Ativo' : 'Pausado'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleToggleStatus(study.id)}
                          className={`text-[10px] font-black uppercase border border-slate-800 px-3 py-1.5 rounded-xl transition-all ${
                            study.status === 'active' ? 'text-slate-500 hover:text-rose-400 hover:bg-rose-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
                          }`}
                        >
                          {study.status === 'active' ? 'Pausar' : 'Ativar'}
                        </button>
                        {study.monthlyRevisionEnabled && study.status === 'active' && (
                          <button onClick={async () => { if (user) { await cancelMonthlyRevisions(user.uid, study.id); setStudies(await loadStudies(user.uid)); } }} className="text-[10px] font-black text-slate-500 hover:text-rose-400 uppercase border border-slate-800 px-3 py-1.5 rounded-xl hover:bg-rose-500/10 transition-all">
                            Parar Mensal
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
            {activeTab === 'analytics' && (
              <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AnalyticsView studies={studies} chartData={chartData} subjectData={subjectData} />
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ProfileView 
                  userProfile={userProfile} 
                  setUserProfile={setUserProfile} 
                  handleSaveProfile={handleSaveProfile}
                  exams={exams}
                  setExams={setExams}
                  syllabusInput={syllabusInput}
                  setSyllabusInput={setSyllabusInput}
                  handleVerticalize={handleVerticalize}
                  isVerticalizing={isVerticalizing}
                  handlePdfUpload={handlePdfUpload}
                  isPdfLoading={isPdfLoading}
                  handleSearchExams={handleSearchExams}
                  isSearchingExams={isSearchingExams}
                  theme={theme}
                  handleLogout={handleLogout}
                />
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <SettingsView 
                  theme={theme} 
                  setTheme={setTheme} 
                  setIsResetModalOpen={setIsResetModalOpen}
                  setIsGuideOpen={setIsGuideOpen}
                />
              </motion.div>
            )}

            {activeTab === 'simulados' && (
              <motion.div 
                key="simulados"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <SimuladosView 
                  simulados={simulados} 
                  setSimulados={setSimulados} 
                  theme={theme}
                  user={user}
                />
              </motion.div>
            )}

            {activeTab === 'exams' && (
              <motion.div 
                key="exams"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="flex items-center justify-between">
                  <h2 className={`text-3xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>Meus Editais Verticalizados</h2>
                  <button onClick={() => setActiveTab('profile')} className={`flex items-center gap-2 px-4 py-2 ${theme === 'light' ? 'bg-indigo-50 text-indigo-600' : 'bg-indigo-600/10 text-indigo-400'} rounded-xl font-bold text-sm hover:bg-indigo-600/20 transition-all`}>
                    <Plus size={18} /> Novo Edital
                  </button>
                </div>

                {exams.length === 0 ? (
                  <div className={`py-24 text-center ${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-800'} rounded-[3rem] border-2 border-dashed`}>
                    <FileText className="mx-auto text-slate-300 mb-4" size={48} />
                    <p className="text-slate-400 font-bold text-xl">Nenhum edital verticalizado</p>
                    <p className="text-slate-500 mt-1">Importe um PDF no seu perfil para começar.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-8">
                    {exams.map((exam) => (
                      <div key={exam.id} className={`${theme === 'light' ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900/50 border-slate-800'} border rounded-[2.5rem] p-8 space-y-6`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                            <h3 className={`text-2xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'} mb-2`}>{exam.title}</h3>
                            <div className="flex flex-wrap gap-4">
                              {exam.date && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><Calendar size={14} /> {exam.date}</span>}
                              {exam.location && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><MapPin size={14} /> {exam.location}</span>}
                              {exam.salaries && <span className="flex items-center gap-1.5 text-xs font-bold text-slate-400"><DollarSign size={14} /> {exam.salaries}</span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditExam(exam)} className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500/20 transition-all" title="Editar">
                              <Pencil size={20} />
                            </button>
                            <button onClick={() => handleDeleteExam(exam.id)} className="p-3 bg-rose-500/10 text-rose-500 rounded-xl hover:bg-rose-500/20 transition-all" title="Excluir">
                              <Trash2 size={20} />
                            </button>
                          </div>
                        </div>

                        {exam.relevantInfo && (
                          <div className={`${theme === 'light' ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-500/5 border-indigo-500/10'} border rounded-2xl p-4`}>
                            <p className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-1">Informações Relevantes</p>
                            <p className={`text-sm ${theme === 'light' ? 'text-slate-700' : 'text-slate-300'}`}>{exam.relevantInfo}</p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {exam.verticalizedSyllabus.map((subject, idx) => (
                            <div key={idx} className={`${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-950/50 border-slate-800'} border rounded-2xl overflow-hidden`}>
                              <div className={`${theme === 'light' ? 'bg-slate-100' : 'bg-slate-800/30'} px-5 py-3 border-b ${theme === 'light' ? 'border-slate-200' : 'border-slate-800/50'}`}>
                                <h4 className="font-black text-indigo-500 uppercase tracking-wider text-xs">{subject.subject}</h4>
                              </div>
                              <div className="p-5">
                                <ul className="space-y-2">
                                  {subject.topics.map((topic, tIdx) => (
                                    <li key={tIdx} className={`flex items-start gap-2.5 ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'} font-medium text-xs`}>
                                      <div className="w-1 h-1 bg-indigo-500 rounded-full mt-1.5 shrink-0" />
                                      {topic}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Study Session Modal */}
      <AnimatePresence>
        {isStudyModalOpen && selectedTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !sessionStartTime && setIsStudyModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }} className={`relative ${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900'} w-full max-w-4xl rounded-[3rem] shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]`}>
              <div className={`p-8 md:p-10 border-b ${theme === 'light' ? 'border-slate-100 bg-slate-50/50' : 'border-slate-800 bg-slate-900/50'} flex justify-between items-center`}>
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.3em] bg-indigo-500/10 px-3 py-1 rounded-full">Sessão de Estudo</span>
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.3em] bg-emerald-500/10 px-3 py-1 rounded-full">{selectedTask.label}</span>
                  </div>
                  <h2 className={`text-3xl md:text-4xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'} tracking-tight`}>{selectedTask.contentTitle}</h2>
                </div>
                {!sessionStartTime && (
                  <div className="flex items-center gap-4">
                    <button 
                      onClick={skipRevision}
                      className={`text-xs font-black ${theme === 'light' ? 'text-slate-400 hover:text-rose-500 border-slate-200' : 'text-slate-500 hover:text-rose-400 border-slate-800'} uppercase border px-4 py-2 rounded-xl hover:bg-rose-500/10 transition-all`}
                    >
                      Pular Revisão
                    </button>
                    <button onClick={() => setIsStudyModalOpen(false)} className={`${theme === 'light' ? 'text-slate-400 hover:text-slate-900' : 'text-slate-500 hover:text-white'} transition-colors`}>
                      <XCircle size={36} />
                    </button>
                  </div>
                )}
              </div>

              <div className="p-8 md:p-10 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-8">
                  {/* Timer */}
                  <div className={`${theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} rounded-[2.5rem] p-10 flex flex-col items-center justify-center border shadow-inner`}>
                    <div className={`text-7xl font-black ${theme === 'light' ? 'text-slate-900' : 'text-white'} font-mono mb-8 tracking-tighter tabular-nums`}>
                      {formatTime(elapsedSeconds)}
                    </div>
                    {!sessionStartTime ? (
                      <button onClick={startSession} className="w-full flex items-center justify-center gap-3 py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                        <Play size={24} fill="currentColor" /> INICIAR ESTUDO
                      </button>
                    ) : (
                      <button onClick={finishSession} className="w-full flex items-center justify-center gap-3 py-5 bg-rose-600 text-white rounded-2xl font-black text-xl hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-95">
                        <Square size={24} fill="currentColor" /> FINALIZAR SESSÃO
                      </button>
                    )}
                  </div>

                  {/* Performance Inputs */}
                  <div className={`${theme === 'light' ? 'bg-slate-50 border-slate-100' : 'bg-slate-800/30 border-slate-800'} rounded-[2rem] p-8 border space-y-6`}>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Target size={18} className="text-emerald-500" /> Desempenho
                    </h4>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Questões Tentadas</label>
                        <input type="number" value={questionsAttempted} onChange={e => setQuestionsAttempted(Number(e.target.value))} className={`w-full ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'} border rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500`} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-2">Acertos</label>
                        <input type="number" value={correctAnswers} onChange={e => setCorrectAnswers(Number(e.target.value))} className={`w-full ${theme === 'light' ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'} border rounded-xl p-4 font-bold outline-none focus:ring-2 focus:ring-indigo-500`} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-3">Nível de Dificuldade</label>
                      <div className="flex gap-2">
                        {(['easy', 'medium', 'hard'] as const).map(d => (
                          <button key={d} onClick={() => setDifficulty(d)} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${difficulty === d ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : theme === 'light' ? 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600' : 'bg-slate-900 text-slate-500 hover:text-slate-300'}`}>
                            {d === 'easy' ? 'Fácil' : d === 'medium' ? 'Médio' : 'Difícil'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {/* Notes */}
                  <div className="flex flex-col h-full">
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                      <FileText size={18} className="text-indigo-400" /> Observações
                    </h4>
                    <textarea 
                      value={studyNotes} 
                      onChange={e => setStudyNotes(e.target.value)} 
                      placeholder="Anote os pontos principais, fórmulas ou dúvidas..."
                      className={`flex-1 w-full ${theme === 'light' ? 'bg-slate-50 border-slate-200 text-slate-700' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-[2rem] p-8 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none font-medium leading-relaxed`}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Novo Conteúdo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 border border-slate-800">
              <div className="flex justify-between items-center mb-10">
                <h2 className="text-3xl font-black text-white tracking-tight">Novo Conteúdo</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-white"><XCircle size={32} /></button>
              </div>
              <form onSubmit={handleAddStudy} className="space-y-6">
                <FormInput label="Título do Conteúdo" value={newStudy.title} onChange={v => setNewStudy({...newStudy, title: v})} placeholder="Ex: Anatomia Humana" theme={theme} />
                <FormInput label="Categoria / Matéria" value={newStudy.category} onChange={v => setNewStudy({...newStudy, category: v})} placeholder="Ex: Medicina" theme={theme} />
                <FormInput label="Data de Início" type="date" value={newStudy.startDate} onChange={v => setNewStudy({...newStudy, startDate: v})} theme={theme} />
                <button 
                  type="submit" 
                  disabled={isAddingStudy}
                  className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-95 mt-6 flex items-center justify-center gap-3"
                >
                  {isAddingStudy ? (
                    <>
                      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      CRIANDO...
                    </>
                  ) : (
                    'CRIAR CONTEÚDO'
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Modal */}
      <AnimatePresence>
        {isResetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsResetModalOpen(false)} className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl p-10 border border-slate-800 text-center">
              <div className="w-20 h-20 bg-rose-500/10 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6"><Trash2 size={40} /></div>
              <h2 className="text-3xl font-black text-white mb-4">Resetar Sistema?</h2>
              <p className="text-slate-400 font-medium mb-10 leading-relaxed">Esta ação irá apagar permanentemente todos os seus conteúdos, revisões e histórico de desempenho. Esta ação não pode ser desfeita.</p>
              <div className="flex flex-col gap-3">
                <button onClick={handleReset} className="w-full py-4 bg-rose-600 text-white rounded-2xl font-black text-lg hover:bg-rose-500 transition-all shadow-xl shadow-rose-600/20 active:scale-95">SIM, APAGAR TUDO</button>
                <button onClick={() => setIsResetModalOpen(false)} className="w-full py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-lg hover:bg-slate-700 transition-all active:scale-95">CANCELAR</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal: Editar Edital */}
      <AnimatePresence>
        {isEditExamModalOpen && editingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsEditExamModalOpen(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-slate-900 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl border border-slate-800">
              <h2 className="text-3xl font-black text-white mb-8">Editar Informações do Concurso</h2>
              <form onSubmit={saveEditedExam} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Título do Concurso</label>
                    <input type="text" value={editingExam.title} onChange={e => setEditingExam({ ...editingExam, title: e.target.value })} className="w-full px-5 py-4 bg-slate-950 rounded-2xl border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Data da Prova</label>
                    <input type="text" value={editingExam.date || ''} onChange={e => setEditingExam({ ...editingExam, date: e.target.value })} className="w-full px-5 py-4 bg-slate-950 rounded-2xl border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: 15/12/2024" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Local/Horário</label>
                    <input type="text" value={editingExam.location || ''} onChange={e => setEditingExam({ ...editingExam, location: e.target.value })} className="w-full px-5 py-4 bg-slate-950 rounded-2xl border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: Brasília, 14h" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Salários</label>
                    <input type="text" value={editingExam.salaries || ''} onChange={e => setEditingExam({ ...editingExam, salaries: e.target.value })} className="w-full px-5 py-4 bg-slate-950 rounded-2xl border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: R$ 10.000,00" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">Outras Informações Relevantes</label>
                  <textarea value={editingExam.relevantInfo || ''} onChange={e => setEditingExam({ ...editingExam, relevantInfo: e.target.value })} className="w-full px-5 py-4 bg-slate-950 rounded-2xl border border-slate-800 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none" />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsEditExamModalOpen(false)} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black hover:bg-slate-700 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20">Salvar Alterações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Guide Modal */}
      <AnimatePresence>
        {isGuideOpen && (
          <UserGuide onClose={() => setIsGuideOpen(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function NavItem({ icon, active, onClick, label, theme }: { icon: React.ReactNode; active: boolean; onClick: () => void; label?: string; theme?: string }) {
  const isLight = theme === 'light';
  return (
    <button 
      type="button"
      onClick={onClick}
      className={`group relative p-3.5 rounded-2xl transition-all duration-300 flex items-center gap-3 ${
        active 
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
          : isLight 
            ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-600' 
            : 'text-slate-500 hover:bg-slate-900 hover:text-slate-300'
      }`}
    >
      {icon}
      {label && (
        <span className={`absolute left-full ml-4 px-3 py-1.5 ${isLight ? 'bg-slate-800' : 'bg-slate-800'} text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50`}>
          {label}
        </span>
      )}
    </button>
  );
}

function StatCard({ icon, label, value, sub, theme }: { icon: React.ReactNode; label: string; value: string | number; sub: string; theme?: string }) {
  const isLight = theme === 'light';
  return (
    <div className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800'} p-8 rounded-[2.5rem] border shadow-xl hover:border-indigo-500/30 transition-all`}>
      <div className="flex items-center gap-4 mb-6">
        <div className={`p-3 ${isLight ? 'bg-slate-100' : 'bg-slate-800'} rounded-2xl`}>{icon}</div>
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{label}</p>
      </div>
      <h3 className={`text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'} mb-2 tracking-tight`}>{value}</h3>
      <p className="text-xs text-slate-500 font-medium">{sub}</p>
    </div>
  );
}

function TaskCard({ task, onClick, theme }: { task: any; onClick: () => void; theme?: string }) {
  const isLight = theme === 'light';
  return (
    <motion.div 
      layout
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
      className={`group ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'} p-6 rounded-[2rem] border hover:border-indigo-500/50 transition-all cursor-pointer flex items-center justify-between shadow-lg`}
    >
      <div className="flex items-center gap-5">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner" style={{ backgroundColor: `${task.color}15`, color: task.color }}>
          <Play size={24} fill="currentColor" />
        </div>
        <div>
          <h3 className={`text-lg font-bold ${isLight ? 'text-slate-900' : 'text-white'} group-hover:text-indigo-400 transition-colors`}>{task.contentTitle}</h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="text-[10px] uppercase tracking-widest font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              {task.label}
            </span>
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">{task.category}</span>
          </div>
        </div>
      </div>
      <ChevronRight size={20} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
    </motion.div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder, theme }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; theme?: string }) {
  const isLight = theme === 'light';
  return (
    <div>
      <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{label}</label>
      <input 
        type={type} 
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-5 py-4 ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl border focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold placeholder:text-slate-400`}
      />
    </div>
  );
}

const AnalyticsView = dynamic(() => import('./AnalyticsView'), { ssr: false });
const PerformanceChart = dynamic(() => import('./DashboardCharts').then(mod => mod.PerformanceChart), { ssr: false });
const DistributionChart = dynamic(() => import('./DashboardCharts').then(mod => mod.DistributionChart), { ssr: false });

function SettingsView({ 
  theme, 
  setTheme, 
  setIsResetModalOpen,
  setIsGuideOpen
}: { 
  theme: 'light' | 'dark' | 'system'; 
  setTheme: (t: 'light' | 'dark' | 'system') => void;
  setIsResetModalOpen: (o: boolean) => void;
  setIsGuideOpen: (o: boolean) => void;
}) {
  const isLight = theme === 'light';
  
  return (
    <div className="space-y-12 max-w-4xl">
      <header>
        <h2 className={`text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'} tracking-tight mb-2`}>Configurações</h2>
        <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Personalize sua experiência no StudyFlow</p>
      </header>

      <section className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800'} p-8 md:p-10 rounded-[3rem] border shadow-xl space-y-10`}>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <Settings2 size={20} />
            </div>
            <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Aparência</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => setTheme('light')}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
                theme === 'light' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : isLight ? 'border-slate-100 bg-slate-50 hover:border-slate-200' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-slate-900">
                <Plus size={24} />
              </div>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Claro</span>
            </button>
            
            <button 
              onClick={() => setTheme('dark')}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
                theme === 'dark' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : isLight ? 'border-slate-100 bg-slate-50 hover:border-slate-200' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 bg-slate-900 rounded-xl shadow-sm border border-slate-800 flex items-center justify-center text-white">
                <Plus size={24} className="opacity-50" />
              </div>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Escuro</span>
            </button>
            
            <button 
              onClick={() => setTheme('system')}
              className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-4 ${
                theme === 'system' 
                  ? 'border-indigo-500 bg-indigo-500/5' 
                  : isLight ? 'border-slate-100 bg-slate-50 hover:border-slate-200' : 'border-slate-800 bg-slate-950 hover:border-slate-700'
              }`}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-900 rounded-xl shadow-sm border border-slate-200 flex items-center justify-center text-white">
                <Settings2 size={24} />
              </div>
              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>Padrão do Sistema</span>
            </button>
          </div>
        </div>

        <div className={`h-px ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />

        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl">
              <HelpCircle size={20} />
            </div>
            <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Suporte</h3>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4">
            <button 
              onClick={() => setIsGuideOpen(true)}
              className={`flex-1 p-6 rounded-2xl border-2 transition-all flex items-center gap-4 ${
                isLight ? 'border-slate-100 bg-slate-50 hover:border-indigo-500/30' : 'border-slate-800 bg-slate-950 hover:border-indigo-500/30'
              }`}
            >
              <div className="p-3 bg-indigo-500/10 text-indigo-500 rounded-xl">
                <BookOpen size={24} />
              </div>
              <div className="text-left">
                <p className={`font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Ajuda / Guia do Usuário</p>
                <p className="text-xs text-slate-500 font-medium">Aprenda a usar todas as funções do sistema</p>
              </div>
            </button>
          </div>
        </div>

        <div className={`h-px ${isLight ? 'bg-slate-100' : 'bg-slate-800'}`} />

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-rose-500">
            <div className="p-2 bg-rose-500/10 rounded-xl">
              <Trash2 size={20} />
            </div>
            <h3 className="text-xl font-black">Zona de Perigo</h3>
          </div>
          
          <div className={`p-6 rounded-3xl border ${isLight ? 'bg-rose-50 border-rose-100' : 'bg-rose-500/5 border-rose-500/20'} space-y-4`}>
            <div className="flex items-start gap-4">
              <div className="p-2 bg-rose-500 text-white rounded-lg shrink-0">
                <Lock size={16} />
              </div>
              <div>
                <p className={`font-black ${isLight ? 'text-rose-900' : 'text-rose-400'}`}>Resetar todo o sistema</p>
                <p className={`text-sm ${isLight ? 'text-rose-800/70' : 'text-rose-400/70'} font-medium leading-relaxed`}>
                  Esta ação irá apagar permanentemente todos os seus estudos, revisões, editais e simulados. 
                  Não há como desfazer esta operação.
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 active:scale-[0.98]"
            >
              Resetar Agora
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
function ProfileView({ 
  userProfile, 
  setUserProfile, 
  handleSaveProfile,
  exams,
  setExams,
  syllabusInput,
  setSyllabusInput,
  handleVerticalize,
  isVerticalizing,
  handlePdfUpload,
  isPdfLoading,
  handleSearchExams,
  isSearchingExams,
  theme,
  handleLogout
}: { 
  userProfile: UserProfile; 
  setUserProfile: (p: UserProfile) => void; 
  handleSaveProfile: (e: React.FormEvent) => void;
  exams: ExamInfo[];
  setExams: (e: ExamInfo[]) => void;
  syllabusInput: string;
  setSyllabusInput: (s: string) => void;
  handleVerticalize: () => void;
  isVerticalizing: boolean;
  handlePdfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isPdfLoading: boolean;
  handleSearchExams: () => void;
  isSearchingExams: boolean;
  theme: string;
  handleLogout: () => void;
}) {
  const isLight = theme === 'light';
  return (
    <div className="space-y-12 max-w-4xl">
      <section className={`${isLight ? 'bg-white border-slate-200' : 'bg-slate-900/50 border-slate-800'} p-8 rounded-[2.5rem] border shadow-xl space-y-6`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center">
              <User size={24} />
            </div>
            <h2 className={`text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Perfil do Estudante</h2>
          </div>
          <button 
            onClick={handleSearchExams}
            disabled={isSearchingExams}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all disabled:opacity-50"
          >
            {isSearchingExams ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Bot size={18} />}
            Buscar Concursos Abertos
          </button>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={`block text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 uppercase tracking-wider`}>Seu Nome</label>
              <input 
                type="text" 
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium`}
                placeholder="Ex: João Silva"
              />
            </div>
            <div>
              <label className={`block text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 uppercase tracking-wider`}>Seu E-mail</label>
              <input 
                type="email" 
                value={userProfile.email}
                onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium`}
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label className={`block text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 uppercase tracking-wider`}>Área de Interesse</label>
              <input 
                type="text" 
                value={userProfile.interestArea}
                onChange={(e) => setUserProfile({ ...userProfile, interestArea: e.target.value })}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium`}
                placeholder="Ex: Fiscal, Policial, Administrativa"
              />
            </div>
            <div>
              <label className={`block text-sm font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'} mb-2 uppercase tracking-wider`}>Nível de Escolaridade</label>
              <select 
                value={userProfile.level}
                onChange={(e) => setUserProfile({ ...userProfile, level: e.target.value })}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none`}
              >
                <option value="">Selecione o nível</option>
                <option value="Médio">Médio</option>
                <option value="Técnico">Técnico</option>
                <option value="Superior">Superior</option>
              </select>
            </div>
          </div>
          <div className="flex gap-4">
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">
              Salvar Perfil
            </button>
            <button 
              type="button" 
              onClick={handleLogout}
              className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black transition-all ${isLight ? 'bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20 hover:bg-rose-500/20'}`}
            >
              <LogOut size={20} />
              Sair da Conta
            </button>
          </div>
        </form>
      </section>

      <section className="bg-slate-900/50 border border-slate-800 p-8 rounded-[2.5rem] space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-2xl flex items-center justify-center">
            <Sparkles size={24} />
          </div>
          <h2 className="text-2xl font-black text-white">Novo Edital Verticalizado (IA)</h2>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Importar PDF do Edital</label>
                <div className="relative group">
                  <input 
                    type="file" 
                    accept=".pdf"
                    onChange={handlePdfUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 group-hover:border-purple-500/50 rounded-2xl p-8 transition-all bg-slate-900/50">
                    {isPdfLoading ? (
                      <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mb-3" />
                    ) : (
                      <Upload className="text-slate-600 group-hover:text-purple-400 mb-3 transition-colors" size={32} />
                    )}
                    <span className="text-slate-500 group-hover:text-slate-300 font-bold text-sm">
                      {isPdfLoading ? 'Processando PDF...' : 'Clique ou arraste o PDF aqui'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Ou cole o texto aqui</label>
                <textarea 
                  value={syllabusInput}
                  onChange={(e) => setSyllabusInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-all font-medium h-40 resize-none"
                  placeholder="Copie e cole as matérias e tópicos do edital oficial..."
                />
              </div>
            </div>
            
            <button 
              onClick={handleVerticalize}
              disabled={isVerticalizing || !syllabusInput}
              className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black px-8 py-4 rounded-2xl transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
            >
              {isVerticalizing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verticalizando...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Verticalizar com IA
                </>
              )}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function CalendarView({ studies, onTaskClick }: { studies: StudyContent[]; onTaskClick: (task: any) => void }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const tasksByDay = useMemo(() => {
    const allTasks = studies
      .filter(s => s.status === 'active')
      .flatMap(s => s.revisions.map(r => ({ ...r, contentTitle: s.title, color: s.color })));
    const map: Record<string, any[]> = {};
    allTasks.forEach(t => {
      if (!map[t.scheduledDate]) map[t.scheduledDate] = [];
      map[t.scheduledDate].push(t);
    });
    return map;
  }, [studies]);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-black text-white">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subDays(currentDate, 30))} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronRight size={20} className="rotate-180" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-2 bg-slate-800 rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors">Hoje</button>
          <button onClick={() => setCurrentDate(subDays(currentDate, -30))} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors"><ChevronRight size={20} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px bg-slate-800 rounded-3xl overflow-hidden border border-slate-800">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-slate-900 p-4 text-center text-[10px] font-black text-slate-500 uppercase tracking-widest">{d}</div>
        ))}
        {days.map((day, i) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTasks = tasksByDay[dateStr] || [];
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();
          
          return (
            <div key={i} className={`bg-slate-950 min-h-[120px] p-3 border-t border-slate-800/50 ${!isCurrentMonth ? 'opacity-30' : ''} ${isToday(day) ? 'bg-indigo-500/5' : ''}`}>
              <span className={`text-xs font-bold ${isToday(day) ? 'text-indigo-400' : 'text-slate-500'}`}>{format(day, 'd')}</span>
              <div className="mt-2 space-y-1">
                {dayTasks.slice(0, 3).map(t => (
                  <button 
                    key={t.id} 
                    onClick={() => onTaskClick(t)}
                    className="w-full text-left text-[9px] font-black px-2 py-1 rounded-md truncate cursor-pointer hover:brightness-125 transition-all"
                    style={{ backgroundColor: `${t.color}20`, color: t.color }}
                  >
                    {t.contentTitle}
                  </button>
                ))}
                {dayTasks.length > 3 && <div className="text-[8px] font-bold text-slate-600 pl-1">+{dayTasks.length - 3} mais</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SimuladosView({ simulados, setSimulados, theme, user }: { simulados: Simulado[]; setSimulados: (s: Simulado[]) => void; theme: string; user: FirebaseUser | null }) {
  const isLight = theme === 'light';
  const [isGenerating, setIsGenerating] = useState(false);
  const [subject, setSubject] = useState('');
  const [banca, setBanca] = useState('');
  const [quantity, setQuantity] = useState(5);
  const [activeSimulado, setActiveSimulado] = useState<Simulado | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleGenerate = async () => {
    if (!subject || !user) {
      alert('Por favor, informe a matéria.');
      return;
    }
    setIsGenerating(true);
    try {
      const questions = await generateSimulado(subject, quantity, banca);
      if (!questions || questions.length === 0) {
        throw new Error('Nenhuma questão foi gerada pela IA.');
      }
      const newSimulado: Simulado = {
        id: Math.random().toString(36).substr(2, 9),
        subject: banca ? `${subject} (${banca})` : subject,
        date: new Date().toISOString(),
        questions: questions.map((q, i) => ({ ...q, id: `q-${i}` })),
        score: 0,
        totalQuestions: questions.length,
        completed: false
      };
      const updated = [newSimulado, ...simulados];
      setSimulados(updated);
      await saveSimulados(user.uid, updated);
      setActiveSimulado(newSimulado);
      setCurrentQuestionIndex(0);
      setShowExplanation(false);
    } catch (error: any) {
      console.error(error);
      const msg = error.message?.includes('API key') 
        ? 'Chave de API do Gemini não configurada. Configure nos Secrets.' 
        : 'Erro ao gerar simulado. Verifique sua conexão ou tente um tema diferente.';
      alert(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAnswer = async (optionIndex: number) => {
    if (!activeSimulado || !user || activeSimulado.questions[currentQuestionIndex].userAnswerIndex !== undefined) return;

    const updatedQuestions = [...activeSimulado.questions];
    const currentQuestion = updatedQuestions[currentQuestionIndex];
    currentQuestion.userAnswerIndex = optionIndex;
    currentQuestion.isCorrect = optionIndex === currentQuestion.correctOptionIndex;

    const newScore = updatedQuestions.filter(q => q.isCorrect).length;
    const isLastQuestion = currentQuestionIndex === activeSimulado.questions.length - 1;

    const updatedSimulado = {
      ...activeSimulado,
      questions: updatedQuestions,
      score: newScore,
      completed: isLastQuestion ? true : activeSimulado.completed
    };

    setActiveSimulado(updatedSimulado);
    setShowExplanation(true);

    const updatedList = simulados.map(s => s.id === updatedSimulado.id ? updatedSimulado : s);
    setSimulados(updatedList);
    await saveSimulados(user.uid, updatedList);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < (activeSimulado?.questions.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setShowExplanation(false);
    }
  };

  const deleteSimuladoItem = async (id: string) => {
    if (!user) return;
    if (confirm('Deseja excluir este simulado?')) {
      const updated = simulados.filter(s => s.id !== id);
      setSimulados(updated);
      await saveSimulados(user.uid, updated);
    }
  };

  const performanceBySubject = useMemo(() => {
    const stats: Record<string, { total: number; correct: number }> = {};
    simulados.filter(s => s.completed).forEach(s => {
      if (!stats[s.subject]) stats[s.subject] = { total: 0, correct: 0 };
      stats[s.subject].total += s.totalQuestions;
      stats[s.subject].correct += s.score;
    });
    return Object.entries(stats).map(([subject, data]) => ({
      subject,
      percent: Math.round((data.correct / data.total) * 100),
      total: data.total
    })).sort((a, b) => b.percent - a.percent);
  }, [simulados]);

  if (activeSimulado) {
    const q = activeSimulado.questions[currentQuestionIndex];
    const isAnswered = q.userAnswerIndex !== undefined;

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <button onClick={() => setActiveSimulado(null)} className={`flex items-center gap-2 ${isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'} transition-colors font-bold`}>
            <ChevronRight size={20} className="rotate-180" /> Voltar aos Simulados
          </button>
          <div className="text-right">
            <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Progresso</p>
            <p className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentQuestionIndex + 1} / {activeSimulado.totalQuestions}</p>
          </div>
        </div>

        <div className={`${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900/50 border-slate-800'} border rounded-[2.5rem] p-8 md:p-12 space-y-10`}>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full">Questão {currentQuestionIndex + 1}</span>
              <span className={`px-3 py-1 ${isLight ? 'bg-slate-100 text-slate-500' : 'bg-slate-800 text-slate-400'} text-[10px] font-black uppercase tracking-widest rounded-full`}>{activeSimulado.subject}</span>
            </div>
            <h3 className={`text-xl md:text-2xl font-bold ${isLight ? 'text-slate-900' : 'text-white'} leading-relaxed`}>{q.question}</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {q.options.map((option, idx) => {
              let bgColor = isLight ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' : 'bg-slate-950 hover:bg-slate-900 border-slate-800';
              let textColor = isLight ? 'text-slate-700' : 'text-slate-300';
              
              if (isAnswered) {
                if (idx === q.correctOptionIndex) {
                  bgColor = 'bg-emerald-500/10 border-emerald-500/50';
                  textColor = 'text-emerald-500';
                } else if (idx === q.userAnswerIndex) {
                  bgColor = 'bg-rose-500/10 border-rose-500/50';
                  textColor = 'text-rose-500';
                } else {
                  bgColor = isLight ? 'bg-slate-50/50 border-slate-100 opacity-50' : 'bg-slate-950/50 border-slate-900 opacity-50';
                }
              }

              return (
                <button 
                  key={idx}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(idx)}
                  className={`flex items-center gap-4 w-full p-6 border rounded-2xl transition-all text-left group ${bgColor}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black shrink-0 ${isAnswered && idx === q.correctOptionIndex ? 'bg-emerald-500 text-white' : isAnswered && idx === q.userAnswerIndex ? 'bg-rose-500 text-white' : isLight ? 'bg-slate-200 text-slate-500 group-hover:bg-indigo-500 group-hover:text-white' : 'bg-slate-800 text-slate-500 group-hover:bg-indigo-500 group-hover:text-white'}`}>
                    {String.fromCharCode(65 + idx)}
                  </div>
                  <span className={`font-bold ${textColor}`}>{option}</span>
                  {isAnswered && idx === q.correctOptionIndex && <Check size={20} className="ml-auto text-emerald-500" />}
                  {isAnswered && idx === q.userAnswerIndex && idx !== q.correctOptionIndex && <X size={20} className="ml-auto text-rose-500" />}
                </button>
              );
            })}
          </div>

          {showExplanation && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`p-8 ${isLight ? 'bg-indigo-50 border-indigo-100' : 'bg-indigo-500/5 border-indigo-500/10'} border rounded-3xl space-y-3`}>
              <div className="flex items-center gap-2 text-indigo-500 font-black text-xs uppercase tracking-widest">
                <Sparkles size={16} /> Explicação da IA
              </div>
              <p className={`${isLight ? 'text-slate-700' : 'text-slate-300'} text-sm leading-relaxed`}>{q.explanation}</p>
              {currentQuestionIndex < activeSimulado.totalQuestions - 1 ? (
                <button onClick={nextQuestion} className="mt-4 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-500 transition-all">
                  Próxima Questão
                </button>
              ) : (
                <div className={`pt-4 border-t ${isLight ? 'border-indigo-100' : 'border-indigo-500/10'} mt-6`}>
                  <p className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'} mb-4`}>Simulado Finalizado!</p>
                  <div className="flex items-center gap-6">
                    <div className={`${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800'} px-6 py-4 rounded-2xl border`}>
                      <p className="text-[10px] font-black text-slate-500 uppercase mb-1">Acertos</p>
                      <p className="text-2xl font-black text-emerald-500">{activeSimulado.score} / {activeSimulado.totalQuestions}</p>
                    </div>
                    <button onClick={() => setActiveSimulado(null)} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all">
                      Ver Resultados
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className={`text-3xl font-black ${isLight ? 'text-slate-900' : 'text-white'} mb-2`}>Simulados Inteligentes</h2>
          <p className={`${isLight ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Gere questões personalizadas com IA para testar seus conhecimentos.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className={`lg:col-span-1 ${isLight ? 'bg-white border-slate-200 shadow-xl' : 'bg-slate-900/50 border-slate-800'} border p-8 rounded-[2.5rem] space-y-8 h-fit`}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center">
              <Bot size={24} />
            </div>
            <h3 className={`text-xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>Novo Simulado</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Matéria ou Assunto</label>
              <input 
                type="text" 
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium`}
                placeholder="Ex: Direito Administrativo, Português..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Banca Examinadora (Opcional)</label>
              <input 
                type="text" 
                value={banca}
                onChange={(e) => setBanca(e.target.value)}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium`}
                placeholder="Ex: FGV, FCC, Cebraspe..."
              />
            </div>
            <div>
              <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Quantidade de Questões</label>
              <select 
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={`w-full ${isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'} rounded-2xl px-6 py-4 focus:outline-none focus:border-indigo-500 transition-all font-medium appearance-none`}
              >
                <option value={5}>5 Questões</option>
                <option value={10}>10 Questões</option>
                <option value={15}>15 Questões</option>
                <option value={20}>20 Questões</option>
              </select>
            </div>
            <button 
              onClick={handleGenerate}
              disabled={isGenerating || !subject}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando Questões...
                </>
              ) : (
                <>
                  <Sparkles size={20} /> Gerar Simulado
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {performanceBySubject.length > 0 && (
            <div className="bg-slate-900/30 border border-slate-800/50 rounded-3xl p-6 mb-8">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Desempenho por Matéria</h4>
              <div className="flex flex-wrap gap-3">
                {performanceBySubject.map((stat, i) => (
                  <div key={i} className="bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 flex items-center gap-3">
                    <span className="text-xs font-bold text-slate-300">{stat.subject}</span>
                    <span className={`text-xs font-black ${stat.percent >= 70 ? 'text-emerald-400' : stat.percent >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>
                      {stat.percent}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h3 className="text-xl font-black text-white flex items-center gap-3">
            <ClipboardList size={24} className="text-slate-500" /> Histórico de Simulados
          </h3>
          
          <div className="grid grid-cols-1 gap-4">
            {simulados.map((s) => (
              <div key={s.id} className="bg-slate-900/50 border border-slate-800 p-6 rounded-3xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                <div className="flex items-center gap-5">
                  <div className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black ${s.completed ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                    <span className="text-lg leading-none">{s.score}</span>
                    <span className="text-[8px] uppercase opacity-50">/ {s.totalQuestions}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white mb-1">{s.subject}</h4>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{format(new Date(s.date), 'dd/MM/yyyy HH:mm')}</span>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${s.completed ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {s.completed ? 'Concluído' : 'Em andamento'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => { setActiveSimulado(s); setCurrentQuestionIndex(0); setShowExplanation(false); }}
                    className="px-4 py-2 bg-slate-800 hover:bg-indigo-600 text-white text-xs font-black rounded-xl transition-all"
                  >
                    {s.completed ? 'REVISAR' : 'CONTINUAR'}
                  </button>
                  <button onClick={() => deleteSimuladoItem(s.id)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {simulados.length === 0 && (
              <div className="py-20 text-center bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                <ClipboardList className="mx-auto text-slate-800 mb-4" size={48} />
                <p className="text-slate-500 font-bold">Nenhum simulado realizado ainda.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
