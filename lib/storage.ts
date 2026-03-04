import { StudyContent, RevisionTask, UserProfile, ExamInfo, Simulado } from './scheduler';
import { calculateRevisions, getNextMonthlyRevision } from './scheduler';
import { getDb } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const PROFILES_COLLECTION = 'profiles';

const isBrowser = typeof window !== 'undefined';

const getLocal = (key: string) => {
  if (!isBrowser) return null;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
};

const setLocal = (key: string, value: any) => {
  if (!isBrowser) return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const saveStudies = async (userId: string, studies: StudyContent[]) => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, { studies }, { merge: true });
  } else {
    setLocal(`studies_${userId}`, studies);
  }
};

export const loadStudies = async (userId: string): Promise<StudyContent[]> => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    const snap = await getDoc(userDoc);
    return snap.exists() ? snap.data().studies || [] : [];
  }
  return getLocal(`studies_${userId}`) || [];
};

export const saveProfile = async (userId: string, profile: UserProfile) => {
  const db = getDb();
  if (db) {
    const profileDoc = doc(db, PROFILES_COLLECTION, userId);
    await setDoc(profileDoc, profile);
  } else {
    setLocal(`profile_${userId}`, profile);
  }
};

export const loadProfile = async (userId: string): Promise<UserProfile> => {
  const db = getDb();
  if (db) {
    const profileDoc = doc(db, PROFILES_COLLECTION, userId);
    const snap = await getDoc(profileDoc);
    return snap.exists() ? snap.data() as UserProfile : { name: '', email: '', interestArea: '', level: '' };
  }
  return getLocal(`profile_${userId}`) || { name: '', email: '', interestArea: '', level: '' };
};

export const saveExams = async (userId: string, exams: ExamInfo[]) => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, { exams }, { merge: true });
  } else {
    setLocal(`exams_${userId}`, exams);
  }
};

export const loadExams = async (userId: string): Promise<ExamInfo[]> => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    const snap = await getDoc(userDoc);
    return snap.exists() ? snap.data().exams || [] : [];
  }
  return getLocal(`exams_${userId}`) || [];
};

export const saveSimulados = async (userId: string, simulados: Simulado[]) => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, { simulados }, { merge: true });
  } else {
    setLocal(`simulados_${userId}`, simulados);
  }
};

export const loadSimulados = async (userId: string): Promise<Simulado[]> => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    const snap = await getDoc(userDoc);
    return snap.exists() ? snap.data().simulados || [] : [];
  }
  return getLocal(`simulados_${userId}`) || [];
};

export const resetSystem = async (userId: string) => {
  const db = getDb();
  if (db) {
    const userDoc = doc(db, 'users', userId);
    const profileDoc = doc(db, PROFILES_COLLECTION, userId);
    await setDoc(userDoc, { studies: [], exams: [], simulados: [] }, { merge: true });
    await setDoc(profileDoc, { name: '', email: '', interestArea: '', level: '' });
  } else {
    setLocal(`studies_${userId}`, []);
    setLocal(`exams_${userId}`, []);
    setLocal(`simulados_${userId}`, []);
    setLocal(`profile_${userId}`, { name: '', email: '', interestArea: '', level: '' });
  }
};

export const addStudy = async (userId: string, title: string, category: string, startDate: string): Promise<StudyContent> => {
  const studies = await loadStudies(userId);
  const id = Math.random().toString(36).substr(2, 9);
  
  const initialRevisions = calculateRevisions(new Date(startDate));
  
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];

  const newStudy: StudyContent = {
    id,
    title,
    category,
    startDate,
    status: 'active',
    monthlyRevisionEnabled: true,
    totalMinutes: 0,
    totalQuestions: 0,
    totalHits: 0,
    notes: '',
    color: randomColor,
    revisions: initialRevisions.map((rev: any, index: number) => ({
      ...rev,
      id: `${id}-rev-${index}`,
      contentId: id,
      notes: '',
    })),
  };

  await saveStudies(userId, [...studies, newStudy]);
  return newStudy;
};

export const updateRevision = async (userId: string, contentId: string, revisionId: string, updates: Partial<RevisionTask>) => {
  const studies = await loadStudies(userId);
  const updated = studies.map(s => {
    if (s.id === contentId) {
      const updatedRevisions = s.revisions.map(r => {
        if (r.id === revisionId) {
          return { ...r, ...updates };
        }
        return r;
      });

      const completedRev = updatedRevisions.find(r => r.id === revisionId);
      const wasJustCompleted = updates.completedDate && !s.revisions.find(r => r.id === revisionId)?.completedDate;
      
      if (wasJustCompleted && (completedRev?.type === '1m' || completedRev?.type === 'monthly') && s.monthlyRevisionEnabled) {
        const nextRev = getNextMonthlyRevision(completedRev.scheduledDate);
        updatedRevisions.push({
          ...nextRev,
          id: `${s.id}-rev-${Date.now()}`,
          contentId: s.id,
          notes: '',
        });
      }

      const totalMinutes = updatedRevisions.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
      const totalQuestions = updatedRevisions.reduce((acc, r) => acc + (r.questionsAttempted || 0), 0);
      const totalHits = updatedRevisions.reduce((acc, r) => acc + (r.correctAnswers || 0), 0);

      return { ...s, revisions: updatedRevisions, totalMinutes, totalQuestions, totalHits };
    }
    return s;
  });
  await saveStudies(userId, updated);
};

export const updateStudyNotes = async (userId: string, id: string, notes: string) => {
  const studies = await loadStudies(userId);
  const updated = studies.map(s => s.id === id ? { ...s, notes } : s);
  await saveStudies(userId, updated);
};

export const toggleStudyStatus = async (userId: string, id: string) => {
  const studies = await loadStudies(userId);
  const updated = studies.map(s => {
    if (s.id === id) {
      const newStatus: 'active' | 'cancelled' = s.status === 'active' ? 'cancelled' : 'active';
      return { ...s, status: newStatus };
    }
    return s;
  });
  await saveStudies(userId, updated);
};

export const cancelMonthlyRevisions = async (userId: string, contentId: string) => {
  const studies = await loadStudies(userId);
  const updated = studies.map(s => {
    if (s.id === contentId) {
      return { ...s, monthlyRevisionEnabled: false };
    }
    return s;
  });
  await saveStudies(userId, updated);
};

export const deleteExam = async (userId: string, id: string) => {
  const exams = await loadExams(userId);
  await saveExams(userId, exams.filter(e => e.id !== id));
};

export const updateExam = async (userId: string, exam: ExamInfo) => {
  const exams = await loadExams(userId);
  const index = exams.findIndex(e => e.id === exam.id);
  if (index !== -1) {
    exams[index] = exam;
    await saveExams(userId, exams);
  } else {
    await saveExams(userId, [...exams, exam]);
  }
};
