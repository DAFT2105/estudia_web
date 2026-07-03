// src/components/AppLayout.tsx
//
// Shell web con sidebar oscuro (#1e293b) + área de contenido.
// Inspirado en la paleta Learnify: sidebar ink, CTA coral, accents lavanda/amarillo.

import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}

// Íconos SVG simples inline — sin dependencia extra
const Icons = {
  Home: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  Book: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  ),
  Chart: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
    </svg>
  ),
  Assign: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  ),
  Practice: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  ),
  Exam: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Results: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
  Bell: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  SidebarToggle: () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/>
    </svg>
  ),
  Hamburger: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  ),
};

const SIDEBAR_COLLAPSED_KEY = 'estudioapp:sidebar-collapsed';

const NAV_ADMIN: NavItem[] = [
  { to: '/', icon: <Icons.Home />, label: 'Inicio' },
  { to: '/admin/usuarios', icon: <Icons.Users />, label: 'Usuarios' },
  { to: '/materias', icon: <Icons.Book />, label: 'Materias' },
  { to: '/admin/reportes', icon: <Icons.Chart />, label: 'Reportes' },
];

const NAV_PARENT: NavItem[] = [
  { to: '/', icon: <Icons.Home />, label: 'Inicio' },
  { to: '/materias', icon: <Icons.Book />, label: 'Materias' },
  { to: '/estudiantes', icon: <Icons.Users />, label: 'Estudiantes' },
  { to: '/estudiantes/asignar', icon: <Icons.Assign />, label: 'Asignar' },
  { to: '/resultados-padre', icon: <Icons.Results />, label: 'Progreso' },
];

const NAV_STUDENT: NavItem[] = [
  { to: '/', icon: <Icons.Home />, label: 'Inicio' },
  { to: '/materias', icon: <Icons.Book />, label: 'Materias' },
  { to: '/practicar', icon: <Icons.Practice />, label: 'Practicar' },
  { to: '/examen', icon: <Icons.Exam />, label: 'Examen' },
  { to: '/resultados', icon: <Icons.Results />, label: 'Resultados' },
];

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  parent: 'Padre / Tutor',
  student: 'Estudiante',
};

/** "hace 2 min" / "hace 3 h" / "hace 1 d" a partir de un timestamp. */
function formatRelativeTime(timestamp: number): string {
  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return 'ahora mismo';
  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) return `hace ${diffMinutes} min`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

function NavLink({
  item, collapsed, onNavigate,
}: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const { pathname } = useLocation();
  const active = pathname === item.to;

  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={[
        'group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium transition-all duration-150',
        collapsed ? 'justify-center' : '',
        active
          ? 'bg-coral text-white'
          : 'text-white/50 hover:bg-white/8 hover:text-white/80',
      ].join(' ')}
    >
      <span className="flex-shrink-0 opacity-90">{item.icon}</span>
      {!collapsed && <span className="truncate">{item.label}</span>}

      {/* Tooltip flotante cuando está colapsado */}
      {collapsed && (
        <span
          className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
          style={{ backgroundColor: '#1e293b' }}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { notifications, unreadCount, markAllRead } = useToast();
  const { pathname } = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Cierra el drawer móvil al navegar a otra página
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        /* localStorage no disponible — el estado sigue funcionando en memoria */
      }
      return next;
    });
  };

  // Cierra el panel de notificaciones al hacer clic fuera
  useEffect(() => {
    if (!notifOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const handleToggleNotif = () => {
    setNotifOpen((prev) => {
      const next = !prev;
      if (next) markAllRead();
      return next;
    });
  };

  if (!currentUser) return null;

  const role = currentUser.role;
  const navItems = role === 'admin' ? NAV_ADMIN : role === 'parent' ? NAV_PARENT : NAV_STUDENT;

  return (
    <div className="flex h-full bg-background">
      {/* Backdrop — solo visible en mobile cuando el drawer está abierto */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar oscuro ──
          Mobile (< lg): drawer fijo que se desliza con translate-x.
          Desktop (>= lg): vuelve al layout estático de siempre. */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex flex-col transition-transform duration-200 ease-in-out',
          'lg:relative lg:z-auto lg:translate-x-0 lg:transition-[width]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{ backgroundColor: '#1e293b', width: collapsed ? '64px' : '208px' }}
      >
        {/* Brand + toggle */}
        <div
          className={[
            'flex items-center border-b py-4',
            collapsed ? 'justify-center px-2' : 'justify-between px-4',
          ].join(' ')}
          style={{ borderColor: '#ffffff12' }}
        >
          {!collapsed && (
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-coral text-[11px] font-bold text-white">
                EA
              </div>
              <span className="truncate text-[13px] font-semibold tracking-tight text-white">
                Estudio<span className="text-coral">App</span>
              </span>
            </div>
          )}
          {collapsed && (
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-coral text-[11px] font-bold text-white">
              EA
            </div>
          )}
        </div>

        {/* Botón colapsar/expandir */}
        <div className={`flex px-2 pt-2 ${collapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            onClick={toggleCollapsed}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80 active:scale-95"
          >
            <Icons.SidebarToggle />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              item={item}
              collapsed={collapsed}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </nav>

        {/* Logout */}
        <div className="border-t px-2 py-2" style={{ borderColor: '#ffffff12' }}>
          <button
            onClick={() => logout()}
            title={collapsed ? 'Cerrar sesión' : undefined}
            className={[
              'group relative flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-white/35 transition-colors hover:bg-white/8 hover:text-white/70',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            <Icons.Logout />
            {!collapsed && <span>Cerrar sesión</span>}
            {collapsed && (
              <span
                className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100"
                style={{ backgroundColor: '#1e293b' }}
              >
                Cerrar sesión
              </span>
            )}
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-surface px-4 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.06)] lg:justify-end lg:px-6">
          {/* Botón hamburguesa — solo visible en mobile/tablet */}
          <button
            onClick={() => setMobileOpen(true)}
            className="text-neutral-500 transition-colors hover:text-ink lg:hidden"
            aria-label="Abrir menú"
          >
            <Icons.Hamburger />
          </button>

          {/* Search — desactivado temporalmente: no filtra nada todavía.
              Reactivar cuando se conecte a una búsqueda global real.
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-1.5 w-64">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 bg-transparent text-[12px] outline-none text-ink placeholder-neutral-400"
            />
          </div>
          */}

          {/* User */}
          <div className="flex items-center gap-3">
            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleToggleNotif}
                className="relative text-neutral-400 transition-colors hover:text-ink"
                aria-label="Notificaciones"
              >
                <Icons.Bell />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-bold text-white"
                    style={{ backgroundColor: '#ff4d2e' }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-neutral-200 bg-surface shadow-xl">
                  <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                    <p className="text-[13px] font-bold text-ink">Notificaciones</p>
                    {notifications.length > 0 && (
                      <span className="text-[11px] text-neutral-400">{notifications.length} reciente(s)</span>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-8 text-center text-[12px] text-neutral-400">
                        Sin notificaciones todavía
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="flex gap-2.5 border-b border-neutral-50 px-4 py-3 last:border-0"
                        >
                          <span
                            className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                            style={{
                              backgroundColor:
                                n.variant === 'success' ? '#43a047' : n.variant === 'error' ? '#e53935' : '#34d399',
                            }}
                          >
                            {n.variant === 'success' ? '✓' : n.variant === 'error' ? '✕' : 'i'}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold leading-snug text-ink">{n.title}</p>
                            {n.description && (
                              <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{n.description}</p>
                            )}
                            <p className="mt-0.5 text-[10px] text-neutral-300">{formatRelativeTime(n.createdAt)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="h-4 w-px bg-neutral-200" />
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lavender text-[11px] font-bold text-white">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[12px] font-semibold text-ink leading-tight">{currentUser.name}</p>
                <p className="text-[11px] text-neutral-400 leading-tight">{ROLE_LABELS[role]}</p>
              </div>
            </div>
          </div>
        </header>

        {/* overflow-hidden: cada página gestiona su scroll. El wrapper interno
            provee scroll para páginas normales; las de modo fullscreen
            (práctica/examen) usan h-full con overflow interno propio. */}
        <main className="flex-1 overflow-hidden">
          <div className="h-full overflow-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
