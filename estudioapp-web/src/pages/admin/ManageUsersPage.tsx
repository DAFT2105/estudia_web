// src/pages/admin/ManageUsersPage.tsx
//
// Puerto funcional de manage_users_screen.dart.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getRoleDisplayName, type User, type UserRole } from '@/types/user';
import { useToast } from '@/hooks/useToast';
import { useConfirm } from '@/hooks/useConfirm';

const ROLE_ORDER: Record<UserRole, number> = { admin: 0, parent: 1, student: 2 };

function roleColor(role: UserRole): string {
  if (role === 'admin') return '#7B1FA2';
  if (role === 'parent') return '#388E3C';
  return '#1565C0';
}

function RoleIcon({ role }: { role: UserRole }) {
  const emoji = role === 'admin' ? '🛡️' : role === 'parent' ? '👨‍👩‍👧' : '🎓';
  return (
    <span
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg"
      style={{ backgroundColor: `${roleColor(role)}26` }}
    >
      {emoji}
    </span>
  );
}

function RoleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-admin bg-admin/10 text-admin'
          : 'border-neutral-200 text-neutral-500'
      }`}
    >
      {label}
    </button>
  );
}

export function ManageUsersPage() {
  const { currentUser, getUsers, toggleUserActive, errorMessage } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | null>(null);

  const loadUsers = () =>
    getUsers()
      .then((loaded) => {
        loaded.sort((a, b) => {
          const roleCompare = ROLE_ORDER[a.role] - ROLE_ORDER[b.role];
          if (roleCompare !== 0) return roleCompare;
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        setUsers(loaded);
        setLoadError(null);
      })
      .catch((e) => setLoadError(`Error al cargar usuarios: ${e}`))
      .finally(() => setIsLoading(false));

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!currentUser) return null;

  const filtered = users.filter((u) => {
    if (filterRole && u.role !== filterRole) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleToggle = async (user: User) => {
    const willActivate = !user.isActive;
    const ok = await confirm({
      title: willActivate ? '¿Activar este usuario?' : '¿Desactivar este usuario?',
      description: willActivate
        ? `${user.name} podrá volver a iniciar sesión.`
        : `${user.name} no podrá iniciar sesión hasta que se reactive.`,
      confirmLabel: willActivate ? 'Activar' : 'Desactivar',
      tone: willActivate ? 'default' : 'danger',
    });
    if (!ok) return;
    const success = await toggleUserActive(user);
    if (success) {
      toast.success(
        user.isActive ? 'Usuario desactivado' : 'Usuario activado',
        user.name,
      );
      loadUsers();
    } else {
      toast.error('No se pudo actualizar el estado del usuario');
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-4">
        <Link to="/" className="text-sm text-admin hover:underline">
          ← Inicio
        </Link>
        <h1 className="text-xl font-bold text-neutral-800">Usuarios</h1>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o correo..."
          className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm focus:border-admin focus:outline-none"
        />

        <div className="flex gap-2 overflow-x-auto">
          <RoleChip
            label="Todos"
            active={filterRole === null}
            onClick={() => setFilterRole(null)}
          />
          <RoleChip
            label="Admins"
            active={filterRole === 'admin'}
            onClick={() => setFilterRole('admin')}
          />
          <RoleChip
            label="Padres"
            active={filterRole === 'parent'}
            onClick={() => setFilterRole('parent')}
          />
          <RoleChip
            label="Estudiantes"
            active={filterRole === 'student'}
            onClick={() => setFilterRole('student')}
          />
        </div>

        {(loadError || errorMessage) && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-error">
            {loadError ?? errorMessage}
          </div>
        )}

        {isLoading && <p className="text-sm text-neutral-500">Cargando…</p>}

        {!isLoading && filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-500">
            No se encontraron usuarios
          </p>
        )}

        <div className="space-y-2">
          {filtered.map((user) => {
            const isSelf = user.id === currentUser.id;
            return (
              <div
                key={user.id}
                className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-sm"
              >
                <RoleIcon role={user.role} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-neutral-800">{user.name}</p>
                    {!user.isActive && (
                      <span className="rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[10px] text-error">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="truncate text-xs text-neutral-500">
                    {user.username ? `Usuario: ${user.username}` : user.email}
                  </p>
                  <span
                    className="mt-1 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
                    style={{
                      backgroundColor: `${roleColor(user.role)}1A`,
                      color: roleColor(user.role),
                    }}
                  >
                    {getRoleDisplayName(user.role)}
                  </span>
                </div>
                {isSelf ? (
                  <span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs text-neutral-500">
                    Tú
                  </span>
                ) : (
                  <button
                    onClick={() => handleToggle(user)}
                    className="rounded-lg border border-neutral-300 px-2 py-1 text-xs text-neutral-700 transition-colors hover:bg-neutral-50 active:scale-[0.97]"
                  >
                    {user.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
