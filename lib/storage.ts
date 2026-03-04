import { getDb } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { StudyContent, RevisionTask, UserProfile, ExamInfo, Simulado, calculateRevisions, getNextMonthlyRevision } from './scheduler';
import { format } from 'date-fns';

const parseDateSafe = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  if (dateStr.includes('-')) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date();
};

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'
];

const getRandomColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

export const loadStudies = async (userId: string): Promise<StudyContent[]> => {
  try {
    const db = getDb();
    if (!db) return getLocalStudies(userId);
    const snapshot = await getDocs(collection(db, 'users', userId, 'studies'));
    const studies: StudyContent[] = [];
    snapshot.forEach(doc => studies.push(doc.data() as StudyContent));
    return studies.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  } catch {
    return getLocalStudies(userId);
  }
};

export const saveStudies = async (userId: string, studies: StudyContent[]): Promise<void> => {
  try {
    const db = getDb();
    if (!db) { saveLocalStudies(userId, studies); return; }
    for (const study of studies) {
      await setDoc(doc(db, 'users', userId, 'studies', study.id), study);
    }
  } catch {
    saveLocalStudies(userId, studies);
  }
};

export const addStudy = async (
  userId: string,
  title: string,
  category: string,
  startDateStr: string
): Promise<void> => {
  const startDate = parseDateSafe(startDateStr);
  const startDateFormatted = format(startDate, 'yyyy-MM-dd');
  const revisionTemplates = calculateRevisions(startDate);

  const newStudy: StudyContent = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    category,
    startDate: startDateFormatted,
    status: 'active',
    revisions: [],
    monthlyRevisionEnabled: true,
    totalMinutes: 0,
    totalQuestions: 0,
    totalHits: 0,
    color: getRandomColor(),
  };

  newStudy.revisions = revisionTemplates.map(r => ({
    ...r,
    id: Math.random().toString(36).substr(2, 9),
    contentId: newStudy.id,
  }));

  try {
    const db = getDb();
    if (!db) {
      const studies = getLocalStudies(userId);
      saveLocalStudies(userId, [...studies, newStudy]);
      return;
    }
    await setDoc(doc(db, 'users', userId, 'studies', newStudy.id), newStudy);
  } catch {
    const studies = getLocalStudies(userId);
    saveLocalStudies(userId, [...studies, newStudy]);
  }
};

export const updateRevision = async (
  userId: string,
  studyId: string,
  revisionId: string,
  data: Partial<RevisionTask>
): Promise<void> => {
  try {
    const studies = await loadStudies(userId);
    const study = studies.find(s => s.id === studyId);
    if (!study) return;

    study.revisions = study.revisions.map(r =>
      r.id === revisionId ? { ...r, ...data } : r
    );

    if (data.durationMinutes) study.totalMinutes = (study.totalMinutes || 0) + data.durationMinutes;
    if (data.questionsAttempted) study.totalQuestions = (study.totalQuestions || 0) + data.questionsAttempted;
    if (data.correctAnswers) study.totalHits = (study.totalHits || 0) + data.correctAnswers;

    if (study.monthlyRevisionEnabled) {
      const hasMonthlyPending = study.revisions.some(r => r.type === 'monthly' && !r.completedDate);
      if (!hasMonthlyPending) {
        const lastRevision = study.revisions[study.revisions.length - 1];
        const nextMonthly = getNextMonthlyRevision(lastRevision.scheduledDate);
        study.revisions.push({
          ...nextMonthly,
          id: Math.random().toString(36).substr(2, 9),
          contentId: studyId,
        });
      }
    }

    const db = getDb();
    if (db) {
      await setDoc(doc(db, 'users', userId, 'studies', studyId), study);
    } else {
      const studies = getLocalStudies(userId);
      saveLocalStudies(userId, studies.map(s => s.id === studyId ? study : s));
    }
  } catch (error) {
    console.error('Error updating revision:', error);
  }
};

export const cancelMonthlyRevisions = async (userId: string, studyId: string): Promise<void> => {
  try {
    const studies = await loadStudies(userId);
    const study = studies.find(s => s.id === studyId);
    if (!study) return;
    study.monthlyRevisionEnabled = false;
    study.revisions = study.revisions.filter(r => r.type !== 'monthly' || r.completedDate);
    const db = getDb();
    if (db) {
      await setDoc(doc(db, 'users', userId, 'studies', studyId), study);
    } else {
      saveLocalStudies(userId, studies.map(s => s.id === studyId ? study : s));
    }
  } catch (error) {
    console.error('Error cancelling monthly revisions:', error);
  }
};

export const updateStudyNotes = async (userId: string, studyId: string, notes: string): Promise<void> => {
  try {
    const studies = await loadStudies(userId);
    const study = studies.find(s => s.id === studyId);
    if (!study) return;
    study.notes = notes;
    const db = getDb();
    if (db) {
      await setDoc(doc(db, 'users', userId, 'studies', studyId), study);
    } else {
      saveLocalStudies(userId, studies.map(s => s.id === studyId ? study : s));
    }
  } catch (error) {
    console.error('Error updating study notes:', error);
  }
};

export const toggleStudyStatus = async (userId: string, studyId: string): Promise<void> => {
  try {
    const studies = await loadStudies(userId);
    const study = studies.find(s => s.id === studyId);
    if (!study) return;
    study.status = study.status === 'active' ? 'cancelled' : 'active';
    const db = getDb();
    if (db) {
      await setDoc(doc(db, 'users', userId, 'studies', studyId), study);
    } else {
      saveLocalStudies(userId, studies.map(s => s.id === studyId ? study : s));
    }
  } catch (error) {
    console.error('Error toggling study status:', error);
  }
};

export const resetSystem = async (userId: string): Promise<void> => {
  try {
    const db = getDb();
    if (db) {
      const snapshot = await getDocs(collection(db, 'users', userId, 'studies'));
      for (const d of snapshot.docs) await deleteDoc(d.ref);
    } else {
      localStorage.removeItem(`studyflow_studies_${userId}`);
    }
  } catch (error) {
    console.error('Error resetting system:', error);
  }
};

export const loadProfile = async (userId: string): Promise<UserProfile> => {
  try {
    const db = getDb();
    if (!db) return getLocalProfile(userId);
    const d = await getDoc(doc(db, 'users', userId, 'profile', 'data'));
    return d.exists() ? (d.data() as UserProfile) : { name: '', email: '', interestArea: '', level: '' };
  } catch {
    return getLocalProfile(userId);
  }
};

export const saveProfile = async (userId: string, profile: UserProfile): Promise<void> => {
  try {
    const db = getDb();
    if (!db) { saveLocalProfile(userId, profile); return; }
    await setDoc(doc(db, 'users', userId, 'profile', 'data'), profile);
  } catch {
    saveLocalProfile(userId, profile);
  }
};

export const loadExams = async (userId: string): Promise<ExamInfo[]> => {
  try {
    const db = getDb();
    if (!db) return getLocalExams(userId);
    const snapshot = await getDocs(collection(db, 'users', userId, 'exams'));
    const exams: ExamInfo[] = [];
    snapshot.forEach(doc => exams.push(doc.data() as ExamInfo));
    return exams;
  } catch {
    return getLocalExams(userId);
  }
};

export const saveExams = async (userId: string, exams: ExamInfo[]): Promise<void> => {
  try {
    const db = getDb();
    if (!db) { saveLocalExams(userId, exams); return; }
    const snapshot = await getDocs(collection(db, 'users', userId, 'exams'));
    for (const d of snapshot.docs) await deleteDoc(d.ref);
    for (const exam of exams) {
      await setDoc(doc(db, 'users', userId, 'exams', exam.id), exam);
    }
  } catch {
    saveLocalExams(userId, exams);
  }
};

export const deleteExam = async (userId: string, examId: string): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      const exams = getLocalExams(userId);
      saveLocalExams(userId, exams.filter(e => e.id !== examId));
      return;
    }
    await deleteDoc(doc(db, 'users', userId, 'exams', examId));
  } catch (error) {
    console.error('Error deleting exam:', error);
  }
};

export const updateExam = async (userId: string, exam: ExamInfo): Promise<void> => {
  try {
    const db = getDb();
    if (!db) {
      const exams = getLocalExams(userId);
      saveLocalExams(userId, exams.map(e => e.id === exam.id ? exam : e));
      return;
    }
    await setDoc(doc(db, 'users', userId, 'exams', exam.id), exam);
  } catch (error) {
    console.error('Error updating exam:', error);
  }
};

export const loadSimulados = async (userId: string): Promise<Simulado[]> => {
  try {
    const db = getDb();
    if (!db) return getLocalSimulados(userId);
    const snapshot = await getDocs(collection(db, 'users', userId, 'simulados'));
    const simulados: Simulado[] = [];
    snapshot.forEach(doc => simulados.push(doc.data() as Simulado));
    return simulados.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return getLocalSimulados(userId);
  }
};

export const saveSimulados = async (userId: string, simulados: Simulado[]): Promise<void> => {
  try {
    const db = getDb();
    if (!db) { saveLocalSimulados(userId, simulados); return; }
    const snapshot = await getDocs(collection(db, 'users', userId, 'simulados'));
    for (const d of snapshot.docs) await deleteDoc(d.ref);
    for (const simulado of simulados) {
      await setDoc(doc(db, 'users', userId, 'simulados', simulado.id), simulado);
    }
  } catch {
    saveLocalSimulados(userId, simulados);
  }
};

const getLocalStudies = (userId: string): StudyContent[] => {
  try {
    const data = localStorage.getItem(`studyflow_studies_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveLocalStudies = (userId: string, studies: StudyContent[]) => {
  try { localStorage.setItem(`studyflow_studies_${userId}`, JSON.stringify(studies)); } catch {}
};

const getLocalProfile = (userId: string): UserProfile => {
  try {
    const data = localStorage.getItem(`studyflow_profile_${userId}`);
    return data ? JSON.parse(data) : { name: '', email: '', interestArea: '', level: '' };
  } catch { return { name: '', email: '', interestArea: '', level: '' }; }
};

const saveLocalProfile = (userId: string, profile: UserProfile) => {
  try { localStorage.setItem(`studyflow_profile_${userId}`, JSON.stringify(profile)); } catch {}
};

const getLocalExams = (userId: string): ExamInfo[] => {
  try {
    const data = localStorage.getItem(`studyflow_exams_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveLocalExams = (userId: string, exams: ExamInfo[]) => {
  try { localStorage.setItem(`studyflow_exams_${userId}`, JSON.stringify(exams)); } catch {}
};

const getLocalSimulados = (userId: string): Simulado[] => {
  try {
    const data = localStorage.getItem(`studyflow_simulados_${userId}`);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const saveLocalSimulados = (userId: string, simulados: Simulado[]) => {
  try { localStorage.setItem(`studyflow_simulados_${userId}`, JSON.stringify(simulados)); } catch {}
};
