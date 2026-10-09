import { requireSupabase } from '../lib/supabase';
import { rowToCamel, objToSnake } from '../utils/case';

const unwrap = ({ data, error }) => {
  if (error) throw new Error(error.message);
  return data;
};

const READONLY = ['id', 'createdAt', 'updatedAt'];
const clean = (obj) => objToSnake(Object.fromEntries(Object.entries(obj).filter(([k]) => !READONLY.includes(k))));

function table(name, order) {
  return {
    async list() {
      let q = requireSupabase().from(name).select('*');
      if (order) q = q.order(order.column, { ascending: order.ascending ?? true });
      return unwrap(await q).map(rowToCamel);
    },
    async insert(obj) {
      return rowToCamel(unwrap(await requireSupabase().from(name).insert(clean(obj)).select().single()));
    },
    async insertMany(list) {
      return unwrap(await requireSupabase().from(name).insert(list.map(clean)).select()).map(rowToCamel);
    },
    async update(id, patch) {
      return rowToCamel(unwrap(await requireSupabase().from(name).update(clean(patch)).eq('id', id).select().single()));
    },
    async remove(id) {
      unwrap(await requireSupabase().from(name).delete().eq('id', id));
    },
  };
}

export const teamsDb = table('teams', { column: 'name' });
export const playersDb = table('players', { column: 'dorsal' });
export const matchesDb = table('matches', { column: 'date' });
export const eventsDb = table('match_events', { column: 'video_time' });

export async function deleteAllPlayers() {
  unwrap(await requireSupabase().from('players').delete().not('id', 'is', null));
}

export async function fetchProfile(userId) {
  const data = unwrap(
    await requireSupabase().from('profiles').select('id, email, nombre, role').eq('id', userId).maybeSingle()
  );
  return data;
}

export async function listEvents(matchId) {
  const q = requireSupabase().from('match_events').select('*').eq('match_id', matchId).order('video_time');
  return unwrap(await q).map(rowToCamel);
}
