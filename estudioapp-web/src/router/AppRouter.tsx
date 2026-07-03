// src/router/AppRouter.tsx
//
// Equivalente a la navegacion de main.dart (AuthWrapper) mas las rutas de
// autenticacion, materias, estudiantes, preguntas, practica/examen y
// resultados de las Etapas 1 a 4.

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/LoadingScreen';
import { LoginPage } from '@/pages/auth/LoginPage';
import { ChangePasswordRequiredPage } from '@/pages/auth/ChangePasswordRequiredPage';
import { HomePage } from '@/pages/home/HomePage';
import { SubjectsListPage } from '@/pages/subjects/SubjectsListPage';
import { SubjectFormPage } from '@/pages/subjects/SubjectFormPage';
import { VerMateriasPage } from '@/pages/subjects/VerMateriasPage';
import { StudentsListPage } from '@/pages/students/StudentsListPage';
import { StudentFormPage } from '@/pages/students/StudentFormPage';
import { VerEstudiantesPage } from '@/pages/students/VerEstudiantesPage';
import { AssignSubjectsPage } from '@/pages/students/AssignSubjectsPage';
import { QuestionsListPage } from '@/pages/questions/QuestionsListPage';
import { QuestionFormPage } from '@/pages/questions/QuestionFormPage';
import { QuestionSetsPage } from '@/pages/questions/QuestionSetsPage';
import { AIGenerateQuestionsPage } from '@/pages/questions/AIGenerateQuestionsPage';
import { PracticeSelectionPage } from '@/pages/students/PracticeSelectionPage';
import { ExamSelectionPage } from '@/pages/students/ExamSelectionPage';
import { QuestionSetChooserPage } from '@/pages/students/QuestionSetChooserPage';
import { PracticeConfigPage } from '@/pages/students/PracticeConfigPage';
import { ExamConfigPage } from '@/pages/students/ExamConfigPage';
import { PracticeModePage } from '@/pages/students/PracticeModePage';
import { ExamModePage } from '@/pages/students/ExamModePage';
import { ResultsPage } from '@/pages/results/ResultsPage';
import { ParentResultsPage } from '@/pages/results/ParentResultsPage';
import { StudentDetailPage } from '@/pages/results/StudentDetailPage';
import { ManageUsersPage } from '@/pages/admin/ManageUsersPage';
import { ReportsPage } from '@/pages/admin/ReportsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProtectedRoute } from '@/router/ProtectedRoute';
import { AppLayout } from '@/components/AppLayout';
import type { UserRole } from '@/types/user';

function ProtectedPage({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles?: string[];
}) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles as UserRole[] | undefined}>
      <AppLayout>{children}</AppLayout>
    </ProtectedRoute>
  );
}

export function AppRouter() {
  const { status, currentUser } = useAuth();

  if (status === 'loading') {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={status === 'authenticated' ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/cambiar-clave"
        element={
          status === 'authenticated' && currentUser?.mustChangePassword ? (
            <ChangePasswordRequiredPage />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />

      <Route path="/" element={<ProtectedPage><HomePage /></ProtectedPage>} />

      {/* Materias */}
      <Route path="/materias" element={<ProtectedPage allowedRoles={['parent', 'admin', 'student']}><SubjectsListPage /></ProtectedPage>} />
      <Route path="/materias/nueva" element={<ProtectedPage allowedRoles={['parent']}><SubjectFormPage /></ProtectedPage>} />
      <Route path="/materias/:subjectId/editar" element={<ProtectedPage allowedRoles={['parent']}><SubjectFormPage /></ProtectedPage>} />
      <Route path="/materias/ver" element={<ProtectedPage allowedRoles={['parent']}><VerMateriasPage /></ProtectedPage>} />

      {/* Banco de preguntas */}
      <Route path="/materias/:subjectId/preguntas" element={<ProtectedPage allowedRoles={['parent', 'admin']}><QuestionsListPage /></ProtectedPage>} />
      <Route path="/materias/:subjectId/preguntas/nueva" element={<ProtectedPage allowedRoles={['parent']}><QuestionFormPage /></ProtectedPage>} />
      <Route path="/materias/:subjectId/preguntas/:questionId/editar" element={<ProtectedPage allowedRoles={['parent']}><QuestionFormPage /></ProtectedPage>} />
      <Route path="/materias/:subjectId/preguntas/grupos" element={<ProtectedPage allowedRoles={['parent']}><QuestionSetsPage /></ProtectedPage>} />
      <Route path="/materias/:subjectId/preguntas/generar-ia" element={<ProtectedPage allowedRoles={['parent']}><AIGenerateQuestionsPage /></ProtectedPage>} />

      {/* Estudiantes */}
      <Route path="/estudiantes" element={<ProtectedPage allowedRoles={['parent']}><StudentsListPage /></ProtectedPage>} />
      <Route path="/estudiantes/nuevo" element={<ProtectedPage allowedRoles={['parent']}><StudentFormPage /></ProtectedPage>} />
      <Route path="/estudiantes/:studentId/editar" element={<ProtectedPage allowedRoles={['parent']}><StudentFormPage /></ProtectedPage>} />
      <Route path="/estudiantes/asignar" element={<ProtectedPage allowedRoles={['parent']}><AssignSubjectsPage /></ProtectedPage>} />
      <Route path="/estudiantes/ver" element={<ProtectedPage allowedRoles={['parent']}><VerEstudiantesPage /></ProtectedPage>} />

      {/* Práctica */}
      <Route path="/practicar" element={<ProtectedPage allowedRoles={['student']}><PracticeSelectionPage /></ProtectedPage>} />
      <Route path="/practicar/:subjectId/modo" element={<ProtectedPage allowedRoles={['student']}><QuestionSetChooserPage /></ProtectedPage>} />
      <Route path="/practicar/:subjectId/config" element={<ProtectedPage allowedRoles={['student']}><PracticeConfigPage /></ProtectedPage>} />
      <Route path="/practicar/:subjectId/jugar" element={<ProtectedPage allowedRoles={['student']}><PracticeModePage /></ProtectedPage>} />

      {/* Examen */}
      <Route path="/examen" element={<ProtectedPage allowedRoles={['student']}><ExamSelectionPage /></ProtectedPage>} />
      <Route path="/examen/:subjectId/modo" element={<ProtectedPage allowedRoles={['student']}><QuestionSetChooserPage /></ProtectedPage>} />
      <Route path="/examen/:subjectId/config" element={<ProtectedPage allowedRoles={['student']}><ExamConfigPage /></ProtectedPage>} />
      <Route path="/examen/:subjectId/jugar" element={<ProtectedPage allowedRoles={['student']}><ExamModePage /></ProtectedPage>} />

      {/* Resultados */}
      <Route path="/resultados" element={<ProtectedPage allowedRoles={['student']}><ResultsPage /></ProtectedPage>} />
      <Route path="/resultados-padre" element={<ProtectedPage allowedRoles={['parent']}><ParentResultsPage /></ProtectedPage>} />
      <Route path="/resultados-padre/:studentId" element={<ProtectedPage allowedRoles={['parent']}><StudentDetailPage /></ProtectedPage>} />

      {/* Admin */}
      <Route path="/admin/usuarios" element={<ProtectedPage allowedRoles={['admin']}><ManageUsersPage /></ProtectedPage>} />
      <Route path="/admin/reportes" element={<ProtectedPage allowedRoles={['admin']}><ReportsPage /></ProtectedPage>} />

      {/* 404 — cualquier ruta no reconocida */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
