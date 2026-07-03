// src/types/subject.ts
//
// Puerto literal de lib/models/subject.dart

export type TimeUnit = 'hours' | 'minutes';

const TIME_UNIT_SHORT_NAME: Record<TimeUnit, string> = {
  hours: 'h',
  minutes: 'min',
};

export type SubjectColor =
  'blue' | 'green' | 'orange' | 'purple' | 'red' | 'teal' | 'pink' | 'indigo';

export type SubjectIcon =
  | 'book'
  | 'calculate'
  | 'science'
  | 'history'
  | 'language'
  | 'art'
  | 'music'
  | 'sports'
  | 'computer'
  | 'geography';

/**
 * Área curricular de la materia — define qué prompt de IA usar y, a futuro,
 * qué estilo visual aplicar. Se elige manualmente al crear la materia, sin
 * depender de adivinar por el nombre.
 */
export type SubjectArea =
  | 'matematica'
  | 'comunicacion'
  | 'cienciasSociales'
  | 'cienciaYTecnologia'
  | 'ingles'
  | 'arteYCultura'
  | 'educacionFisica'
  | 'otra';

const SUBJECT_AREA_DISPLAY_NAME: Record<SubjectArea, string> = {
  matematica: 'Matemática',
  comunicacion: 'Comunicación',
  cienciasSociales: 'Ciencias Sociales',
  cienciaYTecnologia: 'Ciencia y Tecnología',
  ingles: 'Inglés',
  arteYCultura: 'Arte y Cultura',
  educacionFisica: 'Educación Física',
  otra: 'Otra',
};

export function getSubjectAreaDisplayName(area: SubjectArea): string {
  return SUBJECT_AREA_DISPLAY_NAME[area];
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  createdBy: string; // ID del usuario que la creó
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
  assignedStudents: string[]; // IDs de estudiantes asignados
  color: SubjectColor;
  icon: SubjectIcon;
  estimatedDuration?: number | null;
  timeUnit?: TimeUnit | null;
  difficulty?: string | null; // Fácil, Medio, Difícil
  area: SubjectArea; // Usado para IA y diseño visual
}

export function isAssignedToStudent(subject: Subject, studentId: string): boolean {
  return subject.assignedStudents.includes(studentId);
}

export function getSubjectStudentCount(subject: Subject): number {
  return subject.assignedStudents.length;
}

/** Equivalente a `Subject.formattedDuration` */
export function getFormattedDuration(subject: Subject): string {
  if (subject.estimatedDuration == null || subject.timeUnit == null) return '';
  return `${subject.estimatedDuration}${TIME_UNIT_SHORT_NAME[subject.timeUnit]}`;
}

/** Equivalente a `Subject.durationInMinutes` */
export function getDurationInMinutes(subject: Subject): number {
  if (subject.estimatedDuration == null || subject.timeUnit == null) return 0;
  return subject.timeUnit === 'hours'
    ? subject.estimatedDuration * 60
    : subject.estimatedDuration;
}

/** Equivalente a `Subject.canEdit` */
export function canEditSubject(
  subject: Subject,
  userId: string,
  userRole: string,
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'parent') return subject.createdBy === userId;
  return false;
}

export const SUBJECT_DEFAULTS = {
  isActive: true,
  assignedStudents: [] as string[],
  color: 'blue' as SubjectColor,
  icon: 'book' as SubjectIcon,
  area: 'otra' as SubjectArea,
} as const;

export class SubjectException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SubjectException';
  }
}

/**
 * Puerto de la clase `SubjectStats` definida en subject_repository.dart
 * (vive ahí, no en subject_service.dart — se calcula en la capa de
 * repositorio a partir de la lista de materias, no en una query aparte).
 */
export interface SubjectStats {
  totalSubjects: number;
  activeSubjects: number;
  assignedStudents: number;
  subjectsByDifficulty: Record<string, number>;
  totalEstimatedMinutes: number;
}

/** Equivalente a `SubjectStats.formattedTotalTime` — "2h 30min", "45min", "3h" */
export function getFormattedTotalTime(stats: SubjectStats): string {
  if (stats.totalEstimatedMinutes === 0) return '0min';
  const hours = Math.floor(stats.totalEstimatedMinutes / 60);
  const minutes = stats.totalEstimatedMinutes % 60;
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}
