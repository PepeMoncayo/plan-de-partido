import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { teamsDb, playersDb, matchesDb, eventsDb, deleteAllPlayers, fetchProfile, listEvents } from '../services/db';
import { seedPlayers, seedTeams, seedMatches, seedEvents } from '../data/seed';
import { DEFAULT_RATINGS } from '../data/constants';

const readDark = () => {
  try {
    return localStorage.getItem('darkMode') === '1';
  } catch {
    return false;
  }
};

const demoId = () => `demo-${crypto.randomUUID()}`;
const byKey = (key) => (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''));

/*
 * Modo demo: los datos viven solo en memoria (se pierden al recargar) y nunca se envían a Supabase.
 * Con sesión real, los permisos los impone RLS; la UI solo oculta controles a los viewers.
 */
export const useStore = create((set, get) => {
  // Actualización optimista con vuelta atrás si el servidor la rechaza
  async function optimistic(collection, apply, remote) {
    const prev = get()[collection];
    set({ [collection]: apply(prev), error: null });
    if (get().isDemo) return;
    try {
      await remote();
    } catch (e) {
      set({ [collection]: prev, error: e.message });
      throw e;
    }
  }

  async function create(collection, db, obj, sortKey) {
    if (get().isDemo) {
      const row = { ...obj, id: demoId() };
      set({ [collection]: [...get()[collection], row].sort(byKey(sortKey)) });
      return row;
    }
    try {
      const row = await db.insert(obj);
      set({ [collection]: [...get()[collection], row].sort(byKey(sortKey)), error: null });
      return row;
    } catch (e) {
      set({ error: e.message });
      throw e;
    }
  }

  const patchIn = (id, patch) => (list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x));
  const removeFrom = (id) => (list) => list.filter((x) => x.id !== id);

  return {
    // ─── UI ───────────────────────────────────────────────
    darkMode: readDark(),
    toggleDark: () => {
      const darkMode = !get().darkMode;
      try {
        localStorage.setItem('darkMode', darkMode ? '1' : '0');
      } catch {
        /* sin almacenamiento */
      }
      set({ darkMode });
    },
    error: null,
    clearError: () => set({ error: null }),

    // ─── Sesión ───────────────────────────────────────────
    authReady: false,
    user: null, // { id, email, nombre, role }
    isDemo: false,
    isAdmin: () => get().user?.role === 'admin',

    async initAuth() {
      if (!supabase) return set({ authReady: true });
      const { data } = await supabase.auth.getSession();
      if (data.session) await get().setSessionUser(data.session.user);
      set({ authReady: true });
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') set({ user: null, players: [], teams: [], matches: [], events: {} });
        else if (event === 'SIGNED_IN' && session && get().user?.id !== session.user.id) {
          get().setSessionUser(session.user);
        }
      });
    },

    async setSessionUser(authUser) {
      let profile = null;
      try {
        profile = await fetchProfile(authUser.id);
      } catch (e) {
        set({ error: e.message });
      }
      set({
        isDemo: false,
        user: {
          id: authUser.id,
          email: authUser.email,
          nombre: profile?.nombre || authUser.email,
          role: profile?.role === 'admin' ? 'admin' : 'viewer',
        },
      });
      await get().loadAll();
    },

    async signIn(email, password) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await get().setSessionUser(data.user);
    },

    // Comprueba la contraseña actual antes de cambiarla, para que una sesión
    // abierta en un ordenador ajeno no baste para quitarle la cuenta a nadie.
    async changePassword(currentPassword, newPassword) {
      const { email } = get().user;
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (authError) throw new Error('La contraseña actual no es correcta');
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },

    startDemo() {
      set({
        isDemo: true,
        user: { id: 'demo', email: 'demo', nombre: 'Demo', role: 'admin' },
        players: structuredClone(seedPlayers),
        teams: structuredClone(seedTeams),
        matches: structuredClone(seedMatches),
        events: { 'demo-m1': structuredClone(seedEvents) },
        loading: false,
      });
    },

    async logout() {
      if (get().isDemo) return set({ isDemo: false, user: null, players: [], teams: [], matches: [], events: {} });
      await supabase?.auth.signOut();
      set({ user: null, players: [], teams: [], matches: [], events: {} });
    },

    // ─── Datos ────────────────────────────────────────────
    loading: false,
    players: [],
    teams: [],
    matches: [],
    events: {}, // { [matchId]: Event[] }

    async loadAll() {
      if (get().isDemo) return;
      set({ loading: true, error: null });
      try {
        const [players, teams, matches] = await Promise.all([playersDb.list(), teamsDb.list(), matchesDb.list()]);
        set({ players, teams, matches });
      } catch (e) {
        set({ error: e.message });
      } finally {
        set({ loading: false });
      }
    },

    // Jugadores
    addPlayer: (p) => create('players', playersDb, p, 'dorsal'),
    updatePlayer: (id, patch) => optimistic('players', patchIn(id, patch), () => playersDb.update(id, patch)),
    removePlayer: (id) => optimistic('players', removeFrom(id), () => playersDb.remove(id)),
    async loadSamplePlayers() {
      const rows = seedPlayers.map(({ id, teamId, ...p }) => p);
      if (get().isDemo) return set({ players: structuredClone(seedPlayers) });
      await deleteAllPlayers();
      const inserted = await playersDb.insertMany(rows);
      set({ players: inserted.sort(byKey('dorsal')) });
    },
    newPlayerDefaults: (position = 'CEN') => ({
      name: '',
      position,
      fitness: 80,
      ...structuredClone(DEFAULT_RATINGS[position]),
    }),

    // Equipos
    addTeam: (t) => create('teams', teamsDb, t, 'name'),
    updateTeam: (id, patch) => optimistic('teams', patchIn(id, patch), () => teamsDb.update(id, patch)),
    removeTeam: (id) => optimistic('teams', removeFrom(id), () => teamsDb.remove(id)),

    // Partidos
    addMatch: (m) => create('matches', matchesDb, m, 'date'),
    updateMatch: (id, patch) => optimistic('matches', patchIn(id, patch), () => matchesDb.update(id, patch)),
    removeMatch: (id) => optimistic('matches', removeFrom(id), () => matchesDb.remove(id)),

    // Eventos de vídeo
    async loadEvents(matchId) {
      if (get().isDemo) {
        if (!get().events[matchId]) set({ events: { ...get().events, [matchId]: [] } });
        return;
      }
      try {
        const own = await listEvents(matchId);
        set({ events: { ...get().events, [matchId]: own } });
      } catch (e) {
        set({ error: e.message });
      }
    },

    async addEvent(matchId, ev) {
      const tmp = { ...ev, matchId, id: demoId() };
      const setList = (fn) => set({ events: { ...get().events, [matchId]: fn(get().events[matchId] || []) } });
      setList((l) => [...l, tmp].sort((a, b) => a.videoTime - b.videoTime));
      if (get().isDemo) return tmp;
      try {
        const row = await eventsDb.insert({ ...ev, matchId });
        setList((l) => l.map((x) => (x.id === tmp.id ? row : x)));
        return row;
      } catch (e) {
        setList((l) => l.filter((x) => x.id !== tmp.id));
        set({ error: e.message });
        throw e;
      }
    },

    async updateEvent(matchId, id, patch) {
      const prev = get().events[matchId] || [];
      set({ events: { ...get().events, [matchId]: prev.map((x) => (x.id === id ? { ...x, ...patch } : x)) } });
      if (get().isDemo) return;
      try {
        await eventsDb.update(id, patch);
      } catch (e) {
        set({ events: { ...get().events, [matchId]: prev }, error: e.message });
        throw e;
      }
    },

    async removeEvent(matchId, id) {
      const prev = get().events[matchId] || [];
      set({ events: { ...get().events, [matchId]: prev.filter((x) => x.id !== id) } });
      if (get().isDemo) return;
      try {
        await eventsDb.remove(id);
      } catch (e) {
        set({ events: { ...get().events, [matchId]: prev }, error: e.message });
        throw e;
      }
    },
  };
});
