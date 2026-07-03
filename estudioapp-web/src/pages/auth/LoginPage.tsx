// src/pages/auth/LoginPage.tsx
//
// Puerto de lib/screens/auth/login_screen.dart. La lógica de validación y
// el flujo de login/Google se mantienen idénticos; el fondo con imagen y las
// animaciones de entrada se simplifican (no hay asset de imagen en la web).

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/hooks/useAuth';
import { TEST_CREDENTIALS } from '@/context/AuthContext';
import { isValidEmail } from '@/utils/validators';

interface LoginFormValues {
  identifier: string;
  password: string;
}

const GOOGLE_LETTERS: { char: string; color: string }[] = [
  { char: 'G', color: '#4285F4' },
  { char: 'o', color: '#EA4335' },
  { char: 'o', color: '#FBBC05' },
  { char: 'g', color: '#4285F4' },
  { char: 'l', color: '#34A853' },
  { char: 'e', color: '#EA4335' },
];

export function LoginPage() {
  const { login, loginWithGoogle, errorMessage, isLoading } = useAuth();
  const [showTestCredentials, setShowTestCredentials] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormValues>({ defaultValues: { identifier: '', password: '' } });

  // No hay mensaje de bienvenida tipo SnackBar como en Flutter: en cuanto el
  // login tiene éxito, `status` pasa a 'authenticated' y AppRouter redirige
  // fuera de esta página de inmediato (ver router/AppRouter.tsx) — un toast
  // aquí no llegaría a mostrarse. El error sí se queda visible porque en ese
  // caso el usuario permanece en LoginPage.
  const onSubmit = async (values: LoginFormValues) => {
    await login(values.identifier.trim(), values.password.trim());
  };

  const handleGoogleLogin = async () => {
    await loginWithGoogle();
    // Si el usuario cerró el popup de Google sin elegir cuenta, `login`
    // devuelve false y no hay errorMessage — no se muestra nada, igual que
    // en Flutter.
  };

  const fillCredentials = (credentials: string) => {
    const [identifier, password] = credentials.split(' / ');
    setValue('identifier', identifier);
    setValue('password', password);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-lg font-semibold text-white">
            EA
          </div>
          <h1 className="text-2xl font-bold text-neutral-800">EstudioApp</h1>
          <p className="text-sm text-neutral-600">Aprende de forma inteligente</p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-2xl bg-surface p-6 shadow-md"
        >
          <h2 className="text-center text-lg font-semibold text-neutral-800">
            Iniciar sesión
          </h2>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="identifier">
              Correo o usuario
            </label>
            <input
              id="identifier"
              type="text"
              placeholder="tu@correo.com  o  usuario"
              autoComplete="username"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('identifier', {
                validate: (value) => {
                  const trimmed = value.trim();
                  if (!trimmed) return 'El correo o usuario es requerido';
                  // Si parece un email, validar formato completo. Si no, es
                  // el "usuario" de un estudiante — basta con que no esté
                  // vacío, el login dual resuelve el resto.
                  if (trimmed.includes('@') && !isValidEmail(trimmed)) {
                    return 'Formato de email inválido';
                  }
                  return true;
                },
              })}
            />
            {errors.identifier && (
              <p className="mt-1 text-xs text-error">{errors.identifier.message}</p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm text-neutral-700" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              {...register('password', {
                required: 'La contraseña es requerida',
                minLength: {
                  value: 6,
                  message: 'La contraseña debe tener al menos 6 caracteres',
                },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-error">{errors.password.message}</p>
            )}
          </div>

          {errorMessage && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isLoading ? 'Ingresando…' : 'Iniciar sesión'}
          </button>

          <div className="flex items-center gap-3 text-xs text-neutral-400">
            <div className="h-px flex-1 bg-neutral-200" />o
            <div className="h-px flex-1 bg-neutral-200" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full rounded-xl border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 disabled:opacity-60"
          >
            Continuar con{' '}
            <span className="font-bold">
              {GOOGLE_LETTERS.map((l, i) => (
                <span key={i} style={{ color: l.color }}>
                  {l.char}
                </span>
              ))}
            </span>
          </button>
        </form>

        <div className="overflow-hidden rounded-xl border border-amber-200 bg-amber-50">
          <button
            type="button"
            onClick={() => setShowTestCredentials((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-amber-800"
          >
            Credenciales de prueba
            <span>{showTestCredentials ? '−' : '+'}</span>
          </button>
          {showTestCredentials && (
            <div className="space-y-2 px-4 pb-4">
              {Object.entries(TEST_CREDENTIALS).map(([roleLabel, credentials]) => (
                <div
                  key={roleLabel}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="font-semibold text-neutral-700">{roleLabel}</span>
                  <button
                    type="button"
                    onClick={() => fillCredentials(credentials)}
                    className="rounded-md border border-neutral-300 bg-white px-2 py-1 font-mono text-neutral-600"
                  >
                    {credentials}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
