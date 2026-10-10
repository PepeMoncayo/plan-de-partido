import { useState } from 'react';
import { useStore } from '../store/useStore';
import { Field, Modal } from './ui';

const MIN_LENGTH = 8;

function translateError(message) {
  if (/should be different/i.test(message)) return 'La nueva contraseña debe ser distinta de la actual';
  if (/at least|too short|weak/i.test(message)) return `La contraseña debe tener al menos ${MIN_LENGTH} caracteres`;
  return message;
}

export default function ChangePasswordModal({ open, onClose }) {
  const changePassword = useStore((s) => s.changePassword);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  function close() {
    setCurrent('');
    setNext('');
    setConfirm('');
    setError('');
    setDone(false);
    onClose();
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (next.length < MIN_LENGTH) return setError(`La nueva contraseña debe tener al menos ${MIN_LENGTH} caracteres`);
    if (next !== confirm) return setError('Las dos contraseñas nuevas no coinciden');
    if (next === current) return setError('La nueva contraseña debe ser distinta de la actual');
    setBusy(true);
    try {
      await changePassword(current, next);
      setDone(true);
    } catch (ex) {
      setError(translateError(ex.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title="Cambiar contraseña">
      {done ? (
        <div className="space-y-4">
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800 dark:bg-green-950 dark:text-green-200">
            Contraseña cambiada. La próxima vez que entres usa la nueva.
          </p>
          <button className="btn-primary w-full" onClick={close}>Cerrar</button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Contraseña actual">
            <input className="input" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
          </Field>
          <Field label={`Nueva contraseña (mínimo ${MIN_LENGTH} caracteres)`}>
            <input className="input" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field label="Repite la nueva contraseña">
            <input className="input" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Guardando…' : 'Cambiar contraseña'}</button>
        </form>
      )}
    </Modal>
  );
}
