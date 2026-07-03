// src/hooks/useActivityAlerts.ts
//
// Calcula y registra alertas de actividad para el padre/tutor:
//  - Reactivas: resultados nuevos desde la última visita ("Juan completó un
//    examen: 85%").
//  - Proactivas: estudiantes inactivos hace N+ días ("Ruth no practica
//    hace 4 días").
// Todo se calcula en el cliente a partir de los resultados ya guardados —
// no requiere backend de notificaciones push.

import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/useToast';
import { getResultsByParent } from '@/services/resultService';
import { getResultRatingDisplayName, getRating, getPercentageRounded } from '@/types/practiceResult';
import { getSessionTypeDisplayName } from '@/types/practiceResult';
import type { Student } from '@/types/student';
import { getStudentFullName } from '@/types/student';

const INACTIVITY_THRESHOLD_DAYS = 3;
const LAST_SEEN_KEY_PREFIX = 'estudioapp:lastSeenResultsAt:';
const LAST_INACTIVITY_CHECK_PREFIX = 'estudioapp:lastInactivityCheck:';
const MS_PER_DAY = 86_400_000;

export function useActivityAlerts(parentId: string | undefined, students: Student[]) {
  const { notify } = useToast();
  const hasRunRef = useRef(false);

  useEffect(() => {
    if (!parentId || students.length === 0) return;
    // Solo corre una vez por carga de la app — evita recalcular en cada
    // re-render del dashboard
    if (hasRunRef.current) return;
    hasRunRef.current = true;

    getResultsByParent(parentId).then((results) => {
      const studentById = new Map(students.map((s) => [s.id, s]));

      // ── Alertas reactivas: resultados nuevos desde la última visita ──
      const lastSeenKey = `${LAST_SEEN_KEY_PREFIX}${parentId}`;
      const lastSeenRaw = localStorage.getItem(lastSeenKey);
      const lastSeenAt = lastSeenRaw ? Number(lastSeenRaw) : 0;
      let maxCompletedAt = lastSeenAt;

      for (const result of results) {
        const completedAtMs = new Date(result.completedAt).getTime();
        if (completedAtMs <= lastSeenAt) continue;
        maxCompletedAt = Math.max(maxCompletedAt, completedAtMs);

        const student = studentById.get(result.studentId);
        if (!student) continue;

        const rating = getRating(result);
        const percentage = getPercentageRounded(result);
        notify({
          id: `result_${result.id}`,
          title: `${getStudentFullName(student)} completó ${getSessionTypeDisplayName(result.sessionType).toLowerCase()}`,
          description: `${percentage}% en ${result.subjectName} · ${getResultRatingDisplayName(rating)}`,
          variant: percentage >= 70 ? 'success' : 'info',
        });
      }

      // lastSeenAt arranca en 0 (epoch) la primera vez que el padre entra —
      // evita inundar de notificaciones todo el historial pasado en esa
      // primera carga: si no había nada guardado, solo actualiza el
      // marcador sin generar alertas retroactivas.
      if (lastSeenRaw == null && results.length > 0) {
        const newest = Math.max(...results.map((r) => new Date(r.completedAt).getTime()));
        localStorage.setItem(lastSeenKey, String(newest));
      } else if (maxCompletedAt > lastSeenAt) {
        localStorage.setItem(lastSeenKey, String(maxCompletedAt));
      }

      // ── Alertas proactivas: inactividad — máximo una vez por día ──
      const inactivityKey = `${LAST_INACTIVITY_CHECK_PREFIX}${parentId}`;
      const todayStamp = new Date().toDateString();
      if (localStorage.getItem(inactivityKey) === todayStamp) return;
      localStorage.setItem(inactivityKey, todayStamp);

      const lastResultByStudent = new Map<string, number>();
      for (const result of results) {
        const ts = new Date(result.completedAt).getTime();
        const prev = lastResultByStudent.get(result.studentId) ?? 0;
        if (ts > prev) lastResultByStudent.set(result.studentId, ts);
      }

      const now = Date.now();
      for (const student of students) {
        if (!student.isActive || student.assignedSubjects.length === 0) continue;
        const lastActivity = lastResultByStudent.get(student.id);
        // Sin actividad nunca registrada: usa la fecha de creación como referencia
        const referenceTime = lastActivity ?? new Date(student.createdAt).getTime();
        const daysInactive = Math.floor((now - referenceTime) / MS_PER_DAY);

        if (daysInactive >= INACTIVITY_THRESHOLD_DAYS) {
          notify({
            id: `inactivity_${student.id}_${daysInactive}`,
            title: `${getStudentFullName(student)} no practica hace ${daysInactive} días`,
            description: 'Anímalo/a a retomar sus materias asignadas',
            variant: 'info',
          });
        }
      }
    });
  }, [parentId, students, notify]);
}
