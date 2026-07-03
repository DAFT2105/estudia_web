// src/repositories/resultRepository.ts
//
// Puerto de lib/repositories/result_repository.dart (interfaz) y
// lib/repositories/result_repository_impl.dart. La interfaz de Dart solo
// declara estos 6 métodos -- getAllResults/getResultsByParent/getStatsBySubject
// quedan en el servicio para cuando se necesiten directo (ver nota en
// services/resultService.ts), igual que `ai_generate_screen.dart` bypassea
// su propia arquitectura para leer estudiantes.

import * as resultService from '@/services/resultService';
import {
  ResultException,
  type PracticeResult,
  type PracticeStats,
} from '@/types/practiceResult';

export interface ResultRepository {
  saveResult(result: PracticeResult, parentId?: string | null): Promise<void>;
  getResultsByStudent(studentId: string): Promise<PracticeResult[]>;
  getResultsByStudentAndSubject(
    studentId: string,
    subjectId: string,
  ): Promise<PracticeResult[]>;
  deleteResult(resultId: string): Promise<void>;
  deleteResultsByStudent(studentId: string): Promise<void>;
  getStudentStats(studentId: string): Promise<PracticeStats>;
}

export const resultRepository: ResultRepository = {
  async saveResult(result, parentId) {
    try {
      await resultService.saveResult(result, parentId);
    } catch (e) {
      throw new ResultException(`Error al guardar resultado: ${e}`);
    }
  },

  async getResultsByStudent(studentId) {
    try {
      return await resultService.getResultsByStudent(studentId);
    } catch (e) {
      throw new ResultException(`Error al obtener resultados: ${e}`);
    }
  },

  async getResultsByStudentAndSubject(studentId, subjectId) {
    try {
      return await resultService.getResultsByStudentAndSubject(studentId, subjectId);
    } catch (e) {
      throw new ResultException(`Error al obtener resultados por materia: ${e}`);
    }
  },

  async deleteResult(resultId) {
    try {
      await resultService.deleteResult(resultId);
    } catch (e) {
      throw new ResultException(`Error al eliminar resultado: ${e}`);
    }
  },

  async deleteResultsByStudent(studentId) {
    try {
      await resultService.deleteResultsByStudent(studentId);
    } catch (e) {
      throw new ResultException(`Error al eliminar resultados: ${e}`);
    }
  },

  async getStudentStats(studentId) {
    try {
      return await resultService.getStudentStats(studentId);
    } catch (e) {
      throw new ResultException(`Error al calcular estadísticas: ${e}`);
    }
  },
};
