// src/services/adminStatsService.ts
//
// Puerto de lib/services/admin_stats_service.dart -- agrega estadísticas de
// todo el sistema reutilizando los servicios existentes (no duplica
// queries, solo combina y calcula sobre los datos que cada uno ya expone).

import * as authService from './authService';
import * as studentService from './studentService';
import * as subjectService from './subjectService';
import * as questionService from './questionService';
import * as resultService from './resultService';
import { getRating, type ResultRating } from '@/types/practiceResult';

export interface AdminStats {
  totalParents: number;
  totalAdmins: number;
  totalStudentUsers: number; // usuarios con rol student (cuentas Auth)
  inactiveUsers: number;
  totalStudents: number; // documentos en la colección students
  totalSubjects: number;
  totalQuestions: number;
  totalSessions: number; // total de resultados (práctica + examen)
  averagePercentage: number;
  ratingDistribution: Record<ResultRating, number>;
  practiceSessionsCount: number;
  examSessionsCount: number;
}

export function getAveragePercentageRounded(stats: AdminStats): number {
  return Math.round(stats.averagePercentage);
}

export function getPracticePercentage(stats: AdminStats): number {
  return stats.totalSessions > 0
    ? (stats.practiceSessionsCount / stats.totalSessions) * 100
    : 0;
}

export function getExamPercentage(stats: AdminStats): number {
  return stats.totalSessions > 0
    ? (stats.examSessionsCount / stats.totalSessions) * 100
    : 0;
}

export function getRatingCount(stats: AdminStats, rating: ResultRating): number {
  return stats.ratingDistribution[rating] ?? 0;
}

export function getRatingPercentage(stats: AdminStats, rating: ResultRating): number {
  return stats.totalSessions > 0
    ? (getRatingCount(stats, rating) / stats.totalSessions) * 100
    : 0;
}

export async function getSystemStats(): Promise<AdminStats> {
  // Las 5 consultas no dependen entre sí -- se piden en paralelo.
  const [users, students, subjects, questions, results] = await Promise.all([
    authService.getAllUsers(),
    studentService.getAllStudents(),
    subjectService.getAllSubjects(),
    questionService.getAllQuestions(),
    resultService.getAllResults(),
  ]);

  const totalParents = users.filter((u) => u.role === 'parent').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalStudentUsers = users.filter((u) => u.role === 'student').length;
  const inactiveUsers = users.filter((u) => !u.isActive).length;

  let averagePercentage = 0;
  const ratingDistribution: Record<ResultRating, number> = {
    excellent: 0,
    good: 0,
    regular: 0,
    needsWork: 0,
  };

  if (results.length > 0) {
    averagePercentage =
      results.reduce(
        (sum, r) =>
          sum + (r.totalQuestions > 0 ? (r.correctAnswers / r.totalQuestions) * 100 : 0),
        0,
      ) / results.length;
    for (const r of results) {
      const rating = getRating(r);
      ratingDistribution[rating] = (ratingDistribution[rating] ?? 0) + 1;
    }
  }

  const practiceSessionsCount = results.filter(
    (r) => r.sessionType === 'practice',
  ).length;
  const examSessionsCount = results.filter((r) => r.sessionType === 'exam').length;

  return {
    totalParents,
    totalAdmins,
    totalStudentUsers,
    inactiveUsers,
    totalStudents: students.length,
    totalSubjects: subjects.length,
    totalQuestions: questions.length,
    totalSessions: results.length,
    averagePercentage,
    ratingDistribution,
    practiceSessionsCount,
    examSessionsCount,
  };
}
