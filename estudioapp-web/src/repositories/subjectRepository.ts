// src/repositories/subjectRepository.ts
//
// Puerto de lib/repositories/subject_repository.dart (interfaz) y
// lib/repositories/subject_repository_impl.dart (implementación + validaciones).

import * as subjectService from '@/services/subjectService';
import type { CreateSubjectServiceParams } from '@/services/subjectService';
import {
  canEditSubject as canEditSubjectModel,
  SubjectException,
  getFormattedTotalTime,
  type Subject,
  type SubjectStats,
} from '@/types/subject';

export interface SubjectRepository {
  getSubjects(userId: string, userRole: string): Promise<Subject[]>;
  getSubjectById(subjectId: string): Promise<Subject | null>;
  createSubject(params: CreateSubjectServiceParams): Promise<Subject>;
  updateSubject(subject: Subject): Promise<Subject>;
  deleteSubject(subjectId: string): Promise<boolean>;
  assignStudentToSubject(subjectId: string, studentId: string): Promise<Subject>;
  unassignStudentFromSubject(subjectId: string, studentId: string): Promise<Subject>;
  searchSubjects(queryText: string, userId: string, userRole: string): Promise<Subject[]>;
  canEditSubject(subject: Subject, userId: string, userRole: string): boolean;
  getSubjectsForStudent(studentId: string): Promise<Subject[]>;
  getSubjectStats(userId: string, userRole: string): Promise<SubjectStats>;
}

const MAX_NAME_LENGTH = 50;
const MAX_DESCRIPTION_LENGTH = 200;

export const subjectRepository: SubjectRepository = {
  async getSubjects(userId, userRole) {
    try {
      return await subjectService.getSubjectsByUser(userId, userRole);
    } catch (e) {
      throw new SubjectException(`Error al obtener materias: ${e}`);
    }
  },

  async getSubjectById(subjectId) {
    try {
      return await subjectService.getSubjectById(subjectId);
    } catch (e) {
      throw new SubjectException(`Error al obtener materia: ${e}`);
    }
  },

  async createSubject(params) {
    try {
      const name = params.name.trim();
      const description = params.description.trim();

      if (!name) throw new SubjectException('El nombre de la materia es requerido');
      if (!description) throw new SubjectException('La descripción es requerida');
      if (params.name.length > MAX_NAME_LENGTH) {
        throw new SubjectException(
          `El nombre no puede exceder ${MAX_NAME_LENGTH} caracteres`,
        );
      }
      if (params.description.length > MAX_DESCRIPTION_LENGTH) {
        throw new SubjectException(
          `La descripción no puede exceder ${MAX_DESCRIPTION_LENGTH} caracteres`,
        );
      }

      // Verificar nombre duplicado solo entre las materias del creador --
      // usa role 'parent' igual que el original, para respetar las reglas
      // de Firestore (un admin creando una materia igual no chocaría contra
      // las materias de otros padres, tal cual se comporta en Flutter).
      const existing = await subjectService.getSubjectsByUser(params.createdBy, 'parent');
      const nameExists = existing.some(
        (s) => s.name.toLowerCase() === name.toLowerCase(),
      );
      if (nameExists) throw new SubjectException('Ya existe una materia con ese nombre');

      return await subjectService.createSubject({ ...params, name, description });
    } catch (e) {
      if (e instanceof SubjectException) throw e;
      throw new SubjectException(`Error al crear materia: ${e}`);
    }
  },

  async updateSubject(subject) {
    try {
      if (!subject.name.trim())
        throw new SubjectException('El nombre de la materia es requerido');
      if (!subject.description.trim())
        throw new SubjectException('La descripción es requerida');

      const existing = await subjectService.getSubjectsByUser(
        subject.createdBy,
        'parent',
      );
      const nameExists = existing.some(
        (s) =>
          s.name.toLowerCase() === subject.name.trim().toLowerCase() &&
          s.id !== subject.id,
      );
      if (nameExists) throw new SubjectException('Ya existe otra materia con ese nombre');

      return await subjectService.updateSubject(subject);
    } catch (e) {
      if (e instanceof SubjectException) throw e;
      throw new SubjectException(`Error al actualizar materia: ${e}`);
    }
  },

  async deleteSubject(subjectId) {
    try {
      return await subjectService.deleteSubject(subjectId);
    } catch (e) {
      if (e instanceof SubjectException) throw e;
      throw new SubjectException(`Error al eliminar materia: ${e}`);
    }
  },

  // Ver la nota en subjectService.ts: estos dos métodos existen por
  // completitud de la interfaz, pero ninguna pantalla los invoca -- el
  // flujo real de asignación vive en studentRepository.
  async assignStudentToSubject(subjectId, studentId) {
    try {
      return await subjectService.assignStudentToSubject(subjectId, studentId);
    } catch (e) {
      if (e instanceof SubjectException) throw e;
      throw new SubjectException(`Error al asignar estudiante: ${e}`);
    }
  },

  async unassignStudentFromSubject(subjectId, studentId) {
    try {
      return await subjectService.unassignStudentFromSubject(subjectId, studentId);
    } catch (e) {
      if (e instanceof SubjectException) throw e;
      throw new SubjectException(`Error al desasignar estudiante: ${e}`);
    }
  },

  async searchSubjects(queryText, userId, userRole) {
    try {
      if (!queryText.trim())
        return await subjectService.getSubjectsByUser(userId, userRole);
      return await subjectService.searchSubjects(queryText.trim(), userId, userRole);
    } catch (e) {
      throw new SubjectException(`Error al buscar materias: ${e}`);
    }
  },

  canEditSubject(subject, userId, userRole) {
    return canEditSubjectModel(subject, userId, userRole);
  },

  async getSubjectsForStudent(studentId) {
    try {
      // Usa el rol 'student' para filtrar por assignedStudents en Firestore
      // -- respeta las reglas de seguridad sin llamar getAllSubjects().
      return await subjectService.getSubjectsByUser(studentId, 'student');
    } catch (e) {
      throw new SubjectException(`Error al obtener materias del estudiante: ${e}`);
    }
  },

  async getSubjectStats(userId, userRole) {
    try {
      const subjects = await subjectRepository.getSubjects(userId, userRole);

      const difficultyCount: Record<string, number> = { Fácil: 0, Medio: 0, Difícil: 0 };
      let totalEstimatedMinutes = 0;
      let totalAssignedStudents = 0;

      for (const subject of subjects) {
        const difficulty = subject.difficulty ?? 'Medio';
        difficultyCount[difficulty] = (difficultyCount[difficulty] ?? 0) + 1;

        if (subject.estimatedDuration != null && subject.timeUnit != null) {
          totalEstimatedMinutes +=
            subject.timeUnit === 'hours'
              ? subject.estimatedDuration * 60
              : subject.estimatedDuration;
        }

        totalAssignedStudents += subject.assignedStudents.length;
      }

      return {
        totalSubjects: subjects.length,
        activeSubjects: subjects.filter((s) => s.isActive).length,
        assignedStudents: totalAssignedStudents,
        subjectsByDifficulty: difficultyCount,
        totalEstimatedMinutes,
      };
    } catch (e) {
      throw new SubjectException(`Error al obtener estadísticas: ${e}`);
    }
  },
};

export { getFormattedTotalTime };
