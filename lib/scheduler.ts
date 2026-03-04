import { addDays, addMonths, format, parse } from 'date-fns';

export interface StudyContent {
  id: string;
  title: string;
  category: string;
  startDate: string;
  status: 'active' | 'completed' | 'cancelled';
  revisions: RevisionTask[];
  monthlyRevisionEnabled: boolean;
  totalMinutes: number;
  totalQuestions: number;
  totalHits: number;
  notes?: string;
  color?: string;
}

export interface RevisionTask {
  id: string;
  contentId: string;
  scheduledDate: string;
  completedDate?: string;
  type: '1d' | '7d' | '15d' | '1m' | 'monthly';
  label: string;
  notes?: string;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  questionsAttempted?: number;
  correctAnswers?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface UserProfile {
  name: string;
  email: string;
  interestArea?: string;
  level?: string;
}

export interface ExamTopic {
  subject: string;
  topics: string[];
}

export interface ExamInfo {
  id: string;
  title: string;
  date?: string;
  location?: string;
  salaries?: string;
  verticalizedSyllabus: ExamTopic[];
  relevantInfo?: string;
}

export interface SimuladoQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation?: string;
  userAnswerIndex?: number;
  isCorrect?: boolean;
}

export interface Simulado {
  id: string;
  subject: string;
  date: string;
  questions: SimuladoQuestion[];
  score: number;
  totalQuestions: number;
  completed: boolean;
}

export const parseDate = (dateStr: string): Date => {
  // Suporta formato dd/MM/yyyy e yyyy-MM-dd
  if (dateStr.includes('/')) {
    return parse(dateStr, 'dd/MM/yyyy', new Date());
  }
  return parse(dateStr, 'yyyy-MM-dd', new Date());
};

export const calculateRevisions = (startDate: Date): Omit<RevisionTask, 'id' | 'contentId'>[] => {
  const intervals: { type: RevisionTask['type']; days: number | null; months: number | null; label: string }[] = [
    { type: '1d', days: 0, months: null, label: 'Estudo Inicial' },
    { type: '1d', days: 1, months: null, label: 'Revisão 1 Dia' },
    { type: '7d', days: 7, months: null, label: 'Revisão 7 Dias' },
    { type: '15d', days: 15, months: null, label: 'Revisão 15 Dias' },
    { type: '1m', days: null, months: 1, label: 'Revisão 1 Mês' },
  ];

  return intervals.map(interval => {
    let date: Date;
    if (interval.days !== null) {
      date = addDays(startDate, interval.days);
    } else {
      date = addMonths(startDate, interval.months!);
    }
    return {
      scheduledDate: format(date, 'yyyy-MM-dd'),
      type: interval.type,
      label: interval.label,
    };
  });
};

export const getNextMonthlyRevision = (lastDate: string): Omit<RevisionTask, 'id' | 'contentId'> => {
  const date = addMonths(new Date(lastDate), 1);
  return {
    scheduledDate: format(date, 'yyyy-MM-dd'),
    type: 'monthly',
    label: 'Revisão Mensal',
  };
};