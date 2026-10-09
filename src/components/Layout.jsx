import { NavLink } from 'react-router-dom';
import { MoonIcon, SunIcon, ArrowRightOnRectangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

const NAV = [
  { to: '/', label: 'Plantilla', end: true },
  { to: '/teams', label: 'Equipos' },
  { to: '/matches', label: 'Partidos' },
];

export default function Layout({ children }) {
  const { user, isDemo, darkMode, toggleDark, logout, error, clearError } = useStore();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <span className="font-bold tracking-tight">
            <span className="text-brand">Plan</span> de Partido
          </span>
          <nav className="flex gap-1">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  clsx('rounded-lg px-3 py-1.5 text-sm font-medium', isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800')
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <span className="hidden text-slate-500 sm:inline">
              {user.nombre} · {user.role === 'admin' ? 'Admin' : 'Solo lectura'}
            </span>
            <button className="btn-ghost p-2" onClick={toggleDark} aria-label="Cambiar tema">
              {darkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
            </button>
            <button className="btn-ghost p-2" onClick={logout} aria-label="Cerrar sesión">
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        {isDemo && (
          <div className="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            Modo demo: los cambios solo existen en esta pestaña y se pierden al recargar. No se guarda nada en el servidor.
          </div>
        )}
      </header>

      {error && (
        <div className="mx-auto mt-4 flex max-w-7xl items-start gap-2 px-4">
          <div className="flex w-full items-start justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            <span>{error}</span>
            <button onClick={clearError} aria-label="Cerrar">
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
