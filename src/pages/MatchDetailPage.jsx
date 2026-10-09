import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeftIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';
import { Tabs } from '../components/ui';
import { MatchHeader } from './MatchesPage';
import { formatDate } from '../utils/time';
import InformeRival from './partido/InformeRival';
import Alineacion from './partido/Alineacion';
import PlanPartido from './partido/PlanPartido';
import ABP from './partido/ABP';
import Eventos from './partido/Eventos';

const TABS = [
  { id: 'rival', label: 'Informe rival', Component: InformeRival },
  { id: 'alineacion', label: 'Alineación', Component: Alineacion },
  { id: 'plan', label: 'Plan de partido', Component: PlanPartido },
  { id: 'abp', label: 'ABP', Component: ABP },
  { id: 'eventos', label: 'Eventos', Component: Eventos },
];

export default function MatchDetailPage() {
  const { id } = useParams();
  const { matches, players, events, loadEvents, loading } = useStore();
  const match = matches.find((m) => m.id === id);
  const [tab, setTab] = useState(() => sessionStorageGet(`tab:${id}`) || 'rival');
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    if (match) loadEvents(match.id);
  }, [match?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => sessionStorageSet(`tab:${id}`, tab), [id, tab]);

  if (!match) {
    return loading ? (
      <p className="text-slate-500">Cargando…</p>
    ) : (
      <div className="space-y-3">
        <p>Partido no encontrado.</p>
        <Link to="/matches" className="btn-secondary">Volver</Link>
      </div>
    );
  }

  async function pdf() {
    setPdfBusy(true);
    try {
      const { generateMatchPDF } = await import('../services/pdf/matchPdf');
      await generateMatchPDF({ match, players, events: events[match.id] || [] });
    } catch (e) {
      useStore.setState({ error: `No se pudo generar el PDF: ${e.message}` });
    } finally {
      setPdfBusy(false);
    }
  }

  const Active = TABS.find((t) => t.id === tab)?.Component ?? InformeRival;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to="/matches" className="btn-ghost px-2">
          <ArrowLeftIcon className="h-4 w-4" /> Partidos
        </Link>
        <span className="text-sm text-slate-500">
          {match.competition} · {formatDate(match.date)} {match.venue && `· ${match.venue}`}
        </span>
        <button className="btn-secondary ml-auto" onClick={pdf} disabled={pdfBusy}>
          <DocumentArrowDownIcon className="h-4 w-4" /> {pdfBusy ? 'Generando…' : 'Exportar PDF'}
        </button>
      </div>
      <div className="card p-5">
        <MatchHeader match={match} size="lg" />
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <Active match={match} />
    </div>
  );
}

function sessionStorageGet(k) {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function sessionStorageSet(k, v) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* sin almacenamiento */
  }
}
