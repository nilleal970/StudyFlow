import { db } from './firebase';
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  getDoc,
} from 'firebase/firestore';
import { StudyContent, RevisionTask, UserProfile, ExamInfo, Simulado, calculateRevisions, getNextMonthlyRevision } from './scheduler';
import { format, parse } from 'date-fns';

// Helper para converter string de data para Date sem problema de timezone
const parseDateSafe = (dateStr: string): Date => {
  if (!dateStr) return new Date();
  // Formato dd/MM/yyyy
  if (dateStr.includes('/')) {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  // Formato yyyy-MM-dd
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

// ─── Studies ────────────────────────────────────────────────────────────────

export const loadStudies = async (userId: string): Promise<StudyContent[]> => {
  try {
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
  // Converte a data com segurança, sem problema de timezone
  const startDate = parseDateSafe(startDateStr);

  // Salva a data no formato yyyy-MM-dd para consistência
  const startDateFormatted = format(startDate, 'yyyy-MM-dd');

  const revisionTemplates = calculateRevisions(startDate);

  const newStudy: StudyContent = {
    id: Math.random().toString(36).substr(2, 9),
    title,
    category,
    startDate: startDateFormatted,
    status: 'active',
    revisions: revisionTemplates.map(r => ({
      ...r,
      id: Math.random().toString(36).substr(2, 9),
      contentId: '',
    })),
    monthlyRevisionEnabled: true,
    totalMinutes: 0,
    totalQuestions: 0,
    totalHits: 0,
    color: getRandomColor(),
  };

  // Atualiza o contentId nas revisões
  newStudy.revisions = newStudy.revisions.map(r => ({ ...r, contentId: newStudy.id }));

  try {
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

    // Atualiza totais
    if (data.durationMinutes) study.totalMinutes = (study.totalMinutes || 0) + data.durationMinutes;
    if (data.questionsAttempted) study.totalQuestions = (study.totalQuestions || 0) + data.questionsAttempted;
    if (data.correctAnswers) study.totalHits = (study.totalHits || 0) + data.correctAnswers;

    // Agenda próxima revisão mensal se habilitada
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

