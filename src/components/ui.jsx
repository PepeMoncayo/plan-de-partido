import { useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useStore } from '../store/useStore';

export const useCanEdit = () => useStore((s) => s.user?.role === 'admin');

// Solo oculta controles; los permisos reales los aplica RLS en Supabase.
export function AdminOnly({ children }) {
  return useCanEdit() ? children : null;
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        className={clsx('card my-8 w-full p-5', wide ? 'max-w-4xl' : 'max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button className="btn-ghost p-1" onClick={onClose} aria-label="Cerrar">
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, className }) {
  return (
    <label className={clsx('block', className)}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export function Tabs({ tabs, active, onChange, className }) {
  return (
    <div className={clsx('flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800', className)}>
      {tabs.map((t) => {
        const id = typeof t === 'string' ? t : t.id;
        const label = typeof t === 'string' ? t : t.label;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={clsx(
              '-mb-px whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium transition',
              active === id
                ? 'border-brand text-brand'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export function Empty({ children }) {
  return <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">{children}</div>;
}

export function SaveBar({ dirty, saving, onSave, savedAt }) {
  return (
    <AdminOnly>
      <div className="sticky bottom-4 z-10 mt-6 flex items-center justify-end gap-3">
        {savedAt && !dirty && <span className="text-xs text-slate-500">Guardado</span>}
        <button className="btn-primary shadow-lg" disabled={!dirty || saving} onClick={onSave}>
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </AdminOnly>
  );
}
