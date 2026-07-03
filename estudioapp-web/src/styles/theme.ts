// src/styles/theme.ts
//
// Puerto literal de la paleta de lib/utils/app_theme.dart.
// Estos mismos valores se exponen también como utilidades de Tailwind en
// src/styles/index.css (@theme) para poder usarlos como `bg-primary`,
// `text-admin`, etc. directamente en las clases de los componentes.

export const AppTheme = {
  // Colores principales
  primaryColor: '#1565C0',
  secondaryColor: '#42A5F5',
  accentColor: '#26C6DA',
  errorColor: '#E53935',
  successColor: '#43A047',
  warningColor: '#FF9800',

  // Colores por rol
  adminColor: '#7B1FA2',
  parentColor: '#388E3C',
  studentColor: '#1565C0',

  // Colores de fondo
  backgroundColor: '#FAFAFA',
  surfaceColor: '#FFFFFF',
  cardColor: '#FFFFFF',
} as const;

/** Equivalente a `AppTheme.getRoleColor` */
export function getRoleColor(role: string): string {
  switch (role.toLowerCase()) {
    case 'admin':
      return AppTheme.adminColor;
    case 'parent':
      return AppTheme.parentColor;
    case 'student':
      return AppTheme.studentColor;
    default:
      return AppTheme.primaryColor;
  }
}
