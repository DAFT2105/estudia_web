// src/repositories/studentRepository.ts
//
// Puerto de lib/repositories/student_repository.dart (interfaz) y
// lib/repositories/student_repository_impl.dart (implementación + validaciones).

import * as studentService from '@/services/studentService';
import type { CreateStudentParams } from '@/services/studentService';
import { isValidEmail } from '@/utils/validators';
import {
  canEditStudent as canEditStudentModel,
  gradeHasNumericLevel,
  gradeMaxLevel,
  getGradeDisplayName,
  StudentException,
  type Student,
  type StudentGrade,
  type StudentStats,
} from '@/types/student';

export interface StudentRepository {
  getStudentsByParent(parentId: string): Promise<Student[]>;
  getStudentById(studentId: string): Promise<Student | null>;
  createStudent(
    params: CreateStudentParams,
  ): Promise<{ student: Student; temporaryPassword: string }>;
  updateStudent(student: Student): Promise<Student>;
  deleteStudent(studentId: string): Promise<boolean>;
  assignSubjectToStudent(studentId: string, subjectId: string): Promise<Student>;
  unassignSubjectFromStudent(studentId: string, subjectId: string): Promise<Student>;
  searchStudents(queryText: string, parentId: string): Promise<Student[]>;
  canEditStudent(student: Student, userId: string, userRole: string): boolean;
  getStudentsWithSubject(subjectId: string): Promise<Student[]>;
  getStudentStats(parentId: string): Promise<StudentStats>;
  getAllStudents(): Promise<Student[]>;
  isEmailInUse(email: string, excludeStudentId?: string): Promise<boolean>;
}

const MAX_NAME_LENGTH = 50;
const MAX_AGE = 25;

function validateGradeLevel(grade: StudentGrade, gradeLevel: number | null | undefined) {
  if (gradeLevel == null) return;
  if (!gradeHasNumericLevel(grade)) {
    throw new StudentException(
      `${getGradeDisplayName(grade)} no tiene niveles numéricos`,
    );
  }
  const max = gradeMaxLevel(grade);
  if (gradeLevel < 1 || gradeLevel > max) {
    throw new StudentException(
      `El nivel de ${getGradeDisplayName(grade)} debe estar entre 1 y ${max}`,
    );
  }
}

export const studentRepository: StudentRepository = {
  async getStudentsByParent(parentId) {
    try {
      return await studentService.getStudentsByParent(parentId);
    } catch (e) {
      throw new StudentException(`Error al obtener estudiantes: ${e}`);
    }
  },

  async getStudentById(studentId) {
    try {
      return await studentService.getStudentById(studentId);
    } catch (e) {
      throw new StudentException(`Error al obtener estudiante: ${e}`);
    }
  },

  async createStudent(params) {
    try {
      // Validaciones de formato -- la generación del username y la creación
      // de la cuenta Auth las maneja el servicio.
      if (!params.nombres.trim()) {
        throw new StudentException('Los nombres del estudiante son requeridos');
      }
      if (!params.apellidos.trim()) {
        throw new StudentException('Los apellidos del estudiante son requeridos');
      }
      if (params.nombres.length > MAX_NAME_LENGTH) {
        throw new StudentException(
          `Los nombres no pueden exceder ${MAX_NAME_LENGTH} caracteres`,
        );
      }
      if (params.apellidos.length > MAX_NAME_LENGTH) {
        throw new StudentException(
          `Los apellidos no pueden exceder ${MAX_NAME_LENGTH} caracteres`,
        );
      }
      // El email es opcional -- solo se valida formato si el padre lo ingresó
      if (params.email?.trim() && !isValidEmail(params.email)) {
        throw new StudentException('Formato de email inválido');
      }
      if (params.birthDate) {
        const birth = new Date(params.birthDate);
        const now = new Date();
        if (birth > now)
          throw new StudentException('La fecha de nacimiento no puede ser futura');
        const age = now.getFullYear() - birth.getFullYear();
        if (age > MAX_AGE)
          throw new StudentException(`La edad no puede ser mayor a ${MAX_AGE} años`);
      }
      validateGradeLevel(params.grade ?? 'primaria', params.gradeLevel);

      return await studentService.createStudent({
        ...params,
        nombres: params.nombres.trim(),
        apellidos: params.apellidos.trim(),
        email: params.email?.trim() ?? null,
        notes: params.notes?.trim() ?? null,
      });
    } catch (e) {
      if (e instanceof StudentException) throw e;
      throw new StudentException(`Error al crear estudiante: ${e}`);
    }
  },

  async updateStudent(student) {
    try {
      if (!student.nombres.trim()) {
        throw new StudentException('Los nombres del estudiante son requeridos');
      }
      if (!student.apellidos.trim()) {
        throw new StudentException('Los apellidos del estudiante son requeridos');
      }
      validateGradeLevel(student.grade, student.gradeLevel);
      if (student.email?.trim() && !isValidEmail(student.email)) {
        throw new StudentException('Formato de email inválido');
      }

      // Verificar email duplicado excluyendo al propio estudiante (solo si
      // el estudiante tiene un email asignado).
      if (student.email?.trim()) {
        const emailInUse = await studentService.isEmailInUse(student.email, {
          excludeStudentId: student.id,
          parentId: student.parentId,
        });
        if (emailInUse)
          throw new StudentException('Ya existe otro estudiante con ese email');
      }

      return await studentService.updateStudent(student);
    } catch (e) {
      if (e instanceof StudentException) throw e;
      throw new StudentException(`Error al actualizar estudiante: ${e}`);
    }
  },

  async deleteStudent(studentId) {
    try {
      return await studentService.deleteStudent(studentId);
    } catch (e) {
      if (e instanceof StudentException) throw e;
      throw new StudentException(`Error al eliminar estudiante: ${e}`);
    }
  },

  async assignSubjectToStudent(studentId, subjectId) {
    try {
      return await studentService.assignSubjectToStudent(studentId, subjectId);
    } catch (e) {
      if (e instanceof StudentException) throw e;
      throw new StudentException(`Error al asignar materia: ${e}`);
    }
  },

  async unassignSubjectFromStudent(studentId, subjectId) {
    try {
      return await studentService.unassignSubjectFromStudent(studentId, subjectId);
    } catch (e) {
      if (e instanceof StudentException) throw e;
      throw new StudentException(`Error al desasignar materia: ${e}`);
    }
  },

  async searchStudents(queryText, parentId) {
    try {
      if (!queryText.trim()) return await studentService.getStudentsByParent(parentId);
      return await studentService.searchStudents(queryText.trim(), parentId);
    } catch (e) {
      throw new StudentException(`Error al buscar estudiantes: ${e}`);
    }
  },

  canEditStudent(student, userId, userRole) {
    return canEditStudentModel(student, userId, userRole);
  },

  async getStudentsWithSubject(subjectId) {
    try {
      return await studentService.getStudentsWithSubject(subjectId);
    } catch (e) {
      throw new StudentException(`Error al obtener estudiantes con materia: ${e}`);
    }
  },

  async getStudentStats(parentId) {
    try {
      const students = await studentRepository.getStudentsByParent(parentId);

      const gradeCount: Record<StudentGrade, number> = {
        preescolar: 0,
        primaria: 0,
        secundaria: 0,
        preparatoria: 0,
        universidad: 0,
      };

      let totalAssignedSubjects = 0;
      let studentsWithSubjects = 0;
      let totalAge = 0;
      let studentsWithAge = 0;

      for (const student of students) {
        gradeCount[student.grade] = (gradeCount[student.grade] ?? 0) + 1;
        totalAssignedSubjects += student.assignedSubjects.length;
        if (student.assignedSubjects.length > 0) studentsWithSubjects++;

        if (student.birthDate) {
          const birth = new Date(student.birthDate);
          const now = new Date();
          let age = now.getFullYear() - birth.getFullYear();
          if (
            now.getMonth() < birth.getMonth() ||
            (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
          ) {
            age--;
          }
          totalAge += age;
          studentsWithAge++;
        }
      }

      return {
        totalStudents: students.length,
        activeStudents: students.filter((s) => s.isActive).length,
        totalAssignedSubjects,
        studentsByGrade: gradeCount,
        studentsWithSubjects,
        studentsWithoutSubjects: students.length - studentsWithSubjects,
        averageAge: studentsWithAge > 0 ? totalAge / studentsWithAge : 0,
      };
    } catch (e) {
      throw new StudentException(`Error al obtener estadísticas: ${e}`);
    }
  },

  async getAllStudents() {
    try {
      return await studentService.getAllStudents();
    } catch (e) {
      throw new StudentException(`Error al obtener todos los estudiantes: ${e}`);
    }
  },

  async isEmailInUse(email, excludeStudentId) {
    try {
      return await studentService.isEmailInUse(email, { excludeStudentId });
    } catch (e) {
      throw new StudentException(`Error al verificar email: ${e}`);
    }
  },
};
