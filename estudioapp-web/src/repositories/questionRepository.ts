// src/repositories/questionRepository.ts
//
// Puerto de lib/repositories/question_repository.dart (interfaz) y
// lib/repositories/question_repository_impl.dart (implementación + validaciones).

import * as questionService from '@/services/questionService';
import type {
  CreateQuestionServiceParams,
  RandomQuestionsParams,
} from '@/services/questionService';
import {
  QuestionException,
  type Question,
  type QuestionDifficulty,
  type QuestionStats,
  type QuestionType,
} from '@/types/question';

export interface QuestionRepository {
  getAllQuestions(): Promise<Question[]>;
  getQuestionsBySubject(subjectId: string): Promise<Question[]>;
  getQuestionsByCreator(creatorId: string): Promise<Question[]>;
  getQuestionById(questionId: string): Promise<Question | null>;
  createQuestion(params: CreateQuestionServiceParams): Promise<Question>;
  updateQuestion(question: Question): Promise<Question>;
  deleteQuestion(questionId: string): Promise<boolean>;
  searchQuestions(queryText: string, subjectId: string | null): Promise<Question[]>;
  getQuestionsByType(subjectId: string, type: QuestionType): Promise<Question[]>;
  getQuestionsByDifficulty(
    subjectId: string,
    difficulty: QuestionDifficulty,
  ): Promise<Question[]>;
  getRandomQuestions(params: RandomQuestionsParams): Promise<Question[]>;
  getQuestionStats(subjectId: string): Promise<QuestionStats>;
  canEditQuestion(question: Question, userId: string, userRole: string): boolean;
}

const VALID_TRUE_FALSE_ANSWERS = ['verdadero', 'falso', 'true', 'false'];

export const questionRepository: QuestionRepository = {
  async getAllQuestions() {
    try {
      return await questionService.getAllQuestions();
    } catch (e) {
      throw new QuestionException(`Error al obtener preguntas: ${e}`);
    }
  },

  async getQuestionsBySubject(subjectId) {
    try {
      return await questionService.getQuestionsBySubject(subjectId);
    } catch (e) {
      throw new QuestionException(`Error al obtener preguntas de la materia: ${e}`);
    }
  },

  async getQuestionsByCreator(creatorId) {
    try {
      return await questionService.getQuestionsByCreator(creatorId);
    } catch (e) {
      throw new QuestionException(`Error al obtener preguntas del creador: ${e}`);
    }
  },

  async getQuestionById(questionId) {
    try {
      return await questionService.getQuestionById(questionId);
    } catch (e) {
      throw new QuestionException(`Error al obtener pregunta: ${e}`);
    }
  },

  async createQuestion(params) {
    try {
      const text = params.text.trim();
      if (!text) throw new QuestionException('El texto de la pregunta es requerido');
      if (text.length < 10) {
        throw new QuestionException('La pregunta debe tener al menos 10 caracteres');
      }
      if (text.length > 500)
        throw new QuestionException('La pregunta no puede exceder 500 caracteres');
      if (!params.correctAnswer.trim()) {
        throw new QuestionException('Debe especificar la respuesta correcta');
      }

      switch (params.type) {
        case 'multipleChoice':
          if (params.options.length < 2)
            throw new QuestionException('Debe haber al menos 2 opciones');
          if (params.options.length > 6)
            throw new QuestionException('No puede haber más de 6 opciones');
          if (!params.options.includes(params.correctAnswer)) {
            throw new QuestionException(
              'La respuesta correcta debe estar en las opciones',
            );
          }
          break;
        case 'trueFalse':
          if (!VALID_TRUE_FALSE_ANSWERS.includes(params.correctAnswer.toLowerCase())) {
            throw new QuestionException('Respuesta debe ser Verdadero o Falso');
          }
          break;
        case 'shortAnswer':
          if (params.correctAnswer.length > 100) {
            throw new QuestionException(
              'La respuesta corta no puede exceder 100 caracteres',
            );
          }
          break;
      }

      return await questionService.createQuestion({
        ...params,
        text,
        correctAnswer: params.correctAnswer.trim(),
        explanation: params.explanation?.trim() ?? null,
        topic: params.topic?.trim() ?? null,
      });
    } catch (e) {
      if (e instanceof QuestionException) throw e;
      throw new QuestionException(`Error al crear pregunta: ${e}`);
    }
  },

  async updateQuestion(question) {
    try {
      if (!question.text.trim())
        throw new QuestionException('El texto de la pregunta es requerido');
      return await questionService.updateQuestion(question);
    } catch (e) {
      if (e instanceof QuestionException) throw e;
      throw new QuestionException(`Error al actualizar pregunta: ${e}`);
    }
  },

  async deleteQuestion(questionId) {
    try {
      return await questionService.deleteQuestion(questionId);
    } catch (e) {
      if (e instanceof QuestionException) throw e;
      throw new QuestionException(`Error al eliminar pregunta: ${e}`);
    }
  },

  async searchQuestions(queryText, subjectId) {
    try {
      if (!queryText.trim()) {
        return subjectId
          ? await questionService.getQuestionsBySubject(subjectId)
          : await questionService.getAllQuestions();
      }
      return await questionService.searchQuestions(queryText.trim(), subjectId);
    } catch (e) {
      throw new QuestionException(`Error al buscar preguntas: ${e}`);
    }
  },

  async getQuestionsByType(subjectId, type) {
    try {
      return await questionService.getQuestionsByType(subjectId, type);
    } catch (e) {
      throw new QuestionException(`Error al filtrar preguntas por tipo: ${e}`);
    }
  },

  async getQuestionsByDifficulty(subjectId, difficulty) {
    try {
      return await questionService.getQuestionsByDifficulty(subjectId, difficulty);
    } catch (e) {
      throw new QuestionException(`Error al filtrar preguntas por dificultad: ${e}`);
    }
  },

  async getRandomQuestions(params) {
    try {
      return await questionService.getRandomQuestions(params);
    } catch (e) {
      throw new QuestionException(`Error al obtener preguntas aleatorias: ${e}`);
    }
  },

  async getQuestionStats(subjectId) {
    try {
      return await questionService.getQuestionStats(subjectId);
    } catch (e) {
      throw new QuestionException(`Error al obtener estadísticas: ${e}`);
    }
  },

  canEditQuestion(question, userId, userRole) {
    // A diferencia de Subject/Student, en Dart esta lógica vive directo en
    // QuestionRepositoryImpl, no en un método `canEdit` del modelo.
    if (userRole === 'admin') return true;
    if (userRole === 'parent') return question.createdBy === userId;
    return false;
  },
};
