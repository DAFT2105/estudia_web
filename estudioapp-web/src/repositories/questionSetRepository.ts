// src/repositories/questionSetRepository.ts
//
// Puerto de lib/repositories/question_set_repository.dart (interfaz) y
// lib/repositories/question_set_repository_impl.dart (validaciones).

import * as questionSetService from '@/services/questionSetService';
import type { CreateQuestionSetServiceParams } from '@/services/questionSetService';
import {
  canEditQuestionSet as canEditQuestionSetModel,
  QuestionSetException,
  type QuestionSet,
} from '@/types/questionSet';
import type { QuestionPurpose } from '@/types/question';

export interface QuestionSetRepository {
  createQuestionSet(params: CreateQuestionSetServiceParams): Promise<QuestionSet>;
  getQuestionSetsBySubject(
    subjectId: string,
    purpose?: QuestionPurpose,
  ): Promise<QuestionSet[]>;
  getQuestionSetsByCreator(creatorId: string): Promise<QuestionSet[]>;
  getQuestionSetById(id: string): Promise<QuestionSet | null>;
  updateQuestionSet(set: QuestionSet): Promise<QuestionSet>;
  deleteQuestionSet(id: string): Promise<boolean>;
  canEditQuestionSet(set: QuestionSet, userId: string, userRole: string): boolean;
}

const MAX_TITLE_LENGTH = 80;

export const questionSetRepository: QuestionSetRepository = {
  async createQuestionSet(params) {
    try {
      const title = params.title.trim();
      if (!title) throw new QuestionSetException('El título es requerido');
      if (params.title.length > MAX_TITLE_LENGTH) {
        throw new QuestionSetException(
          `El título no puede exceder ${MAX_TITLE_LENGTH} caracteres`,
        );
      }
      if (params.questionIds.length === 0) {
        throw new QuestionSetException('Debes seleccionar al menos una pregunta');
      }

      return await questionSetService.createQuestionSet({
        ...params,
        title,
        description: params.description?.trim() ?? null,
      });
    } catch (e) {
      if (e instanceof QuestionSetException) throw e;
      throw new QuestionSetException(`Error al crear el grupo de preguntas: ${e}`);
    }
  },

  async getQuestionSetsBySubject(subjectId, purpose) {
    try {
      return await questionSetService.getQuestionSetsBySubject(subjectId, purpose);
    } catch (e) {
      throw new QuestionSetException(`Error al obtener grupos de preguntas: ${e}`);
    }
  },

  async getQuestionSetsByCreator(creatorId) {
    try {
      return await questionSetService.getQuestionSetsByCreator(creatorId);
    } catch (e) {
      throw new QuestionSetException(`Error al obtener tus grupos de preguntas: ${e}`);
    }
  },

  async getQuestionSetById(id) {
    try {
      return await questionSetService.getQuestionSetById(id);
    } catch (e) {
      throw new QuestionSetException(`Error al obtener el grupo de preguntas: ${e}`);
    }
  },

  async updateQuestionSet(set) {
    try {
      if (!set.title.trim()) throw new QuestionSetException('El título es requerido');
      if (set.questionIds.length === 0) {
        throw new QuestionSetException('Debe tener al menos una pregunta seleccionada');
      }
      return await questionSetService.updateQuestionSet(set);
    } catch (e) {
      if (e instanceof QuestionSetException) throw e;
      throw new QuestionSetException(`Error al actualizar el grupo de preguntas: ${e}`);
    }
  },

  async deleteQuestionSet(id) {
    try {
      return await questionSetService.deleteQuestionSet(id);
    } catch (e) {
      throw new QuestionSetException(`Error al eliminar el grupo de preguntas: ${e}`);
    }
  },

  canEditQuestionSet(set, userId, userRole) {
    return canEditQuestionSetModel(set, userId, userRole);
  },
};
