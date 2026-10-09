import { useState } from 'react';
import { useStore } from '../store/useStore';
import { isSupabaseConfigured } from '../lib/supabase';
import { Field } from '../components/ui';

export default function LoginPage() {
  const { signIn, startDemo } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (ex) {
      setError(ex.message === 'Invalid login credentials' ? 'Email o contraseña incorrectos' : ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-100 to-slate-200 p-4 dark:from-slate-950 dark:to-slate-900">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-bold">
          <span className="text-brand">Plan</span> de Partido
        </h1>
        <p className="mb-6 text-sm text-slate-500">Análisis y preparación de partidos</p>

        {isSupabaseConfigured ? (
          <form onSubmit={submit} className="space-y-3">
            <Field label="Email">
              <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </Field>
            <Field label="Contraseña">
              <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button className="btn-primary w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
          </form>
        ) : (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Supabase no está configurado. Copia <code>.env.example</code> a <code>.env.local</code> y rellena la URL y la anon key.
          </p>
        )}

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> o <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
        <button className="btn-secondary w-full" onClick={startDemo}>Ver demo (datos de ejemplo, sin guardar)</button>
      </div>
    </div>
  );
}
