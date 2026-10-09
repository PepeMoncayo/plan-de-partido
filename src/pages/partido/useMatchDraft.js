import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../store/useStore';

const pickFields = (match, fields) => Object.fromEntries(fields.map((f) => [f, structuredClone(match[f] ?? null)]));

/** Borrador local de algunos campos del partido + guardado con updateMatch. */
export function useMatchDraft(match, fields, normalize = (x) => x) {
  const updateMatch = useStore((s) => s.updateMatch);
  const original = useMemo(() => normalize(pickFields(match, fields)), [match, fields, normalize]);
  const [draft, setDraft] = useState(original);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  // Si el partido cambia fuera (otra pestaña, recarga), reinicia el borrador
  useEffect(() => setDraft(original), [original]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(original);

  async function save() {
    setSaving(true);
    try {
      await updateMatch(match.id, draft);
      setSavedAt(Date.now());
    } catch {
      /* banner global */
    } finally {
      setSaving(false);
    }
  }

  return { draft, setDraft, dirty, saving, save, savedAt };
}
