// src/pages/auth/ChangePasswordRequiredPage.tsx
//
// Puerto de lib/screens/auth/change_password_required_screen.dart

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';

interface ChangePasswordFormValues {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function ChangePasswordRequiredPage() {
  const { changePassword, updateCurrentUser, currentUser, logout, errorMessage } =
    useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>();

  const newPassword = watch('newPassword');

  const onSubmit = async (values: ChangePasswordFormValues) => {
    setIsSubmitting(true);
    try {
      const changed = await changePassword(values.currentPassword, values.newPassword);
      if (!changed) return; // el mensaje de error ya quedó en errorMessage

      // Limpiar el flag — una vez que mustChangePassword pasa a false,
      // ProtectedRoute deja de redirigir hacia esta pantalla.
      if (currentUser) {
        await updateCurrentUser({ ...currentUser, mustChangePassword: false });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-50 px-4 py-10">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-sm space-y-4 rounded-2xl bg-surface p-6 shadow-md"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-lg font-bold text-neutral-800">Crea tu contraseña</h1>
          <p className="text-sm text-neutral-600">
            Es tu primer ingreso. Ingresa la clave temporal que te compartió tu
            padre/madre y define una contraseña propia para las próximas veces.
          </p>
        </div>

        <div>
          <label
            className="mb-1 block text-sm text-neutral-700"
            htmlFor="currentPassword"
          >
            Clave temporal
          </label>
          <input
            id="currentPassword"
            type="password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            {...register('currentPassword', { required: 'Ingresa la clave temporal' })}
          />
          {errors.currentPassword && (
            <p className="mt-1 text-xs text-error">{errors.currentPassword.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm text-neutral-700" htmlFor="newPassword">
            Nueva contraseña
          </label>
          <input
            id="newPassword"
            type="password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            {...register('newPassword', {
              required: 'Ingresa una nueva contraseña',
              minLength: { value: 6, message: 'Debe tener al menos 6 caracteres' },
              validate: (value, formValues) =>
                value !== formValues.currentPassword ||
                'Debe ser distinta a la clave temporal',
            })}
          />
          {errors.newPassword && (
            <p className="mt-1 text-xs text-error">{errors.newPassword.message}</p>
          )}
        </div>

        <div>
          <label
            className="mb-1 block text-sm text-neutral-700"
            htmlFor="confirmPassword"
          >
            Confirmar nueva contraseña
          </label>
          <input
            id="confirmPassword"
            type="password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            {...register('confirmPassword', {
              validate: (value) =>
                value === newPassword || 'Las contraseñas no coinciden',
            })}
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-error">{errors.confirmPassword.message}</p>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Guardando…' : 'Guardar y continuar'}
        </button>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full text-center text-sm text-neutral-500 hover:underline"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
