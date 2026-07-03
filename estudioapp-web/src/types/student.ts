// src/types/student.ts
//
// Puerto literal de lib/models/student.dart

export type StudentGrade =
  'preescolar' | 'primaria' | 'secundaria' | 'preparatoria' | 'universidad';

export type StudentAvatar =
  'student1' | 'student2' | 'student3' | 'student4' | 'student5' | 'student6';

/** ¿Este grado se subdivide en niveles numéricos (1°, 2°, ...)? Solo Primaria y Secundaria. */
export function gradeHasNumericLevel(grade: StudentGrade): boolean {
  return grade === 'primaria' || grade === 'secundaria';
}

/** Nivel máximo válido para este grado (0 si no aplica) */
export function gradeMaxLevel(grade: StudentGrade): number {
  switch (grade) {
    case 'primaria':
      return 6;
    case 'secundaria':
      return 5;
    default:
      return 0;
  }
}

const GRADE_DISPLAY_NAME: Record<StudentGrade, string> = {
  preescolar: 'Preescolar',
  primaria: 'Primaria',
  secundaria: 'Secundaria',
  preparatoria: 'Preparatoria',
  universidad: 'Universidad',
};

export function getGradeDisplayName(grade: StudentGrade): string {
  return GRADE_DISPLAY_NAME[grade];
}

/** Tipo de meta semanal que el padre puede definir para un estudiante. */
export type WeeklyGoalType = 'sessions' | 'averageScore';

export interface WeeklyGoal {
  id: string;
  type: WeeklyGoalType;
  /** Para 'sessions': cantidad de sesiones. Para 'averageScore': porcentaje (0-100). */
  target: number;
  /** Materia específica, o null/undefined para "todas las materias". */
  subjectId?: string | null;
}

export interface Student {
  id: string; // = UID de Firebase Auth
  nombres: string;
  apellidos: string;
  username: string; // Usuario de acceso (sin @), único — generado automáticamente
  email?: string | null; // Opcional — reservado para integración futura con colegios
  parentId: string; // ID del padre que lo creó
  createdAt: string;
  updatedAt?: string | null;
  isActive: boolean;
  assignedSubjects: string[]; // IDs de materias asignadas
  grade: StudentGrade;
  gradeLevel?: number | null; // 1-6 Primaria, 1-5 Secundaria, null en el resto
  birthDate?: string | null;
  notes?: string | null;
  avatar: StudentAvatar;
  weeklyGoals?: WeeklyGoal[];
}

/** Nombre completo — equivalente al getter `Student.name` */
export function getStudentFullName(student: Student): string {
  return `${student.nombres} ${student.apellidos}`.trim();
}

/** "Primaria 3°" / "Secundaria 5°", o solo "Preescolar" si no aplica nivel numérico */
export function getGradeDisplayWithLevel(student: Student): string {
  if (gradeHasNumericLevel(student.grade) && student.gradeLevel != null) {
    return `${getGradeDisplayName(student.grade)} ${student.gradeLevel}°`;
  }
  return getGradeDisplayName(student.grade);
}

/** Edad calculada — null si no hay fecha de nacimiento */
export function getStudentAge(student: Student): number | null {
  if (!student.birthDate) return null;
  const birth = new Date(student.birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (
    now.getMonth() < birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  ) {
    age--;
  }
  return age;
}

export function isAssignedToSubject(student: Student, subjectId: string): boolean {
  return student.assignedSubjects.includes(subjectId);
}

// ── Metas semanales ──────────────────────────────────────────────────────────

export interface WeeklyGoalProgress {
  goal: WeeklyGoal;
  current: number;
  met: boolean;
  /** Días restantes hasta el cierre de la semana (domingo incluido). */
  daysLeft: number;
}

/** Minimal shape de PracticeResult que necesita este cálculo — evita el import cruzado con practiceResult.ts. */
interface ResultLike {
  subjectId: string;
  completedAt: string;
  correctAnswers: number;
  totalQuestions: number;
}

/** Lunes 00:00:00 de la semana de `now`, en hora local. */
function getStartOfWeek(now: Date): Date {
  const day = now.getDay(); // 0=domingo … 6=sábado
  const diffToMonday = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diffToMonday);
  return start;
}

/** Calcula el progreso de cada meta semanal del estudiante contra sus resultados de esta semana. */
export function computeWeeklyGoalsProgress(
  student: Student,
  results: ResultLike[],
): WeeklyGoalProgress[] {
  const goals = student.weeklyGoals ?? [];
  if (goals.length === 0) return [];

  const now = new Date();
  const startOfWeek = getStartOfWeek(now);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const daysLeft = Math.max(0, Math.ceil((endOfWeek.getTime() - now.getTime()) / 86_400_000));

  const thisWeekResults = results.filter((r) => {
    const t = new Date(r.completedAt).getTime();
    return t >= startOfWeek.getTime() && t < endOfWeek.getTime();
  });

  return goals.map((goal) => {
    const relevant = goal.subjectId
      ? thisWeekResults.filter((r) => r.subjectId === goal.subjectId)
      : thisWeekResults;

    let current: number;
    if (goal.type === 'sessions') {
      current = relevant.length;
    } else {
      current = relevant.length === 0
        ? 0
        : Math.round(
            relevant.reduce(
              (sum, r) => sum + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0),
              0,
            ) / relevant.length,
          );
    }

    return { goal, current, met: current >= goal.target, daysLeft };
  });
}

/** Equivalente a `Student.canEdit` */
export function canEditStudent(
  student: Student,
  userId: string,
  userRole: string,
): boolean {
  if (userRole === 'admin') return true;
  if (userRole === 'parent') return student.parentId === userId;
  return false;
}

/**
 * Normaliza un nombre legacy ("name" único, sin nombres/apellidos/username)
 * que pudiera venir de los 4 estudiantes de prueba antiguos mencionados en
 * el documento funcional — equivalente al fallback de `Student.fromJson`.
 */
export function splitLegacyName(legacyName: string): {
  nombres: string;
  apellidos: string;
} {
  const parts = legacyName.trim().split(/\s+/);
  return {
    nombres: parts[0] ?? '',
    apellidos: parts.length > 1 ? parts.slice(1).join(' ') : '',
  };
}

export class StudentException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentException';
  }
}

/**
 * Puerto de la clase `StudentStats` definida al final de
 * lib/services/student_service.dart — se calcula en la capa de repositorio
 * (studentRepository.ts) a partir de la lista de estudiantes del padre.
 */
export interface StudentStats {
  totalStudents: number;
  activeStudents: number;
  totalAssignedSubjects: number;
  studentsByGrade: Record<StudentGrade, number>;
  studentsWithSubjects: number;
  studentsWithoutSubjects: number;
  averageAge: number;
}
