import { StudyContent, RevisionTask, UserProfile, ExamInfo, Simulado } from './scheduler';
import { calculateRevisions, getNextMonthlyRevision } from './scheduler';

const STORAGE_KEY = 'studyflow_data';
const PROFILE_KEY = 'studyflow_profile';
const EXAM_KEY = 'studyflow_exam';
const SIMULADO_KEY = 'studyflow_simulado';

export const saveStudies = (studies: StudyContent[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(studies));
  }
};

export const loadStudies = (): StudyContent[] => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export const saveProfile = (profile: UserProfile) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  }
};

export const loadProfile = (): UserProfile => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(PROFILE_KEY);
    return data ? JSON.parse(data) : { name: '', email: '', interestArea: '', level: '' };
  }
  return { name: '', email: '', interestArea: '', level: '' };
};

export const saveExams = (exams: ExamInfo[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(EXAM_KEY, JSON.stringify(exams));
  }
};

export const loadExams = (): ExamInfo[] => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(EXAM_KEY);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export const saveSimulados = (simulados: Simulado[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SIMULADO_KEY, JSON.stringify(simulados));
  }
};

export const loadSimulados = (): Simulado[] => {
  if (typeof window !== 'undefined') {
    const data = localStorage.getItem(SIMULADO_KEY);
    return data ? JSON.parse(data) : [];
  }
  return [];
};

export const deleteExam = (id: string) => {
  const exams = loadExams();
  saveExams(exams.filter(e => e.id !== id));
};

export const updateExam = (exam: ExamInfo) => {
  const exams = loadExams();
  const index = exams.findIndex(e => e.id === exam.id);
  if (index !== -1) {
    exams[index] = exam;
    saveExams(exams);
  } else {
    saveExams([...exams, exam]);
  }
};

export const addStudy = (title: string, category: string, startDate: string): StudyContent => {
  const studies = loadStudies();
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

  saveStudies([...studies, newStudy]);
  return newStudy;
};

export const updateRevision = (contentId: string, revisionId: string, updates: Partial<RevisionTask>) => {
  const studies = loadStudies();
  const updated = studies.map(s => {
    if (s.id === contentId) {
      const updatedRevisions = s.revisions.map(r => {
        if (r.id === revisionId) {
          return { ...r, ...updates };
        }
        return r;
      });

      // Check if we need to add the next monthly revision
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

      // Calculate totals for the study
      const totalMinutes = updatedRevisions.reduce((acc, r) => acc + (r.durationMinutes || 0), 0);
      const totalQuestions = updatedRevisions.reduce((acc, r) => acc + (r.questionsAttempted || 0), 0);
      const totalHits = updatedRevisions.reduce((acc, r) => acc + (r.correctAnswers || 0), 0);

      return { ...s, revisions: updatedRevisions, totalMinutes, totalQuestions, totalHits };
    }
    return s;
  });
  saveStudies(updated);
};

export const updateStudyNotes = (id: string, notes: string) => {
  const studies = loadStudies();
  const updated = studies.map(s => s.id === id ? { ...s, notes } : s);
  saveStudies(updated);
};

export const toggleStudyStatus = (id: string) => {
  const studies = loadStudies();
  const updated = studies.map(s => {
    if (s.id === id) {
      const newStatus: 'active' | 'cancelled' = s.status === 'active' ? 'cancelled' : 'active';
      return { ...s, status: newStatus };
    }
    return s;
  });
  saveStudies(updated);
};

export const resetSystem = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(EXAM_KEY);
    localStorage.removeItem(SIMULADO_KEY);
  }
};

export const cancelMonthlyRevisions = (contentId: string) => {
  const studies = loadStudies();
  const updated = studies.map(s => {
    if (s.id === contentId) {
      return { ...s, monthlyRevisionEnabled: false };
    }
    return s;
  });
  saveStudies(updated);
};
