/*
 * ActivationLivePage — NewCo Activations live-sync playback for Vantex Manufacturing.
 *
 * Mirrors WizardLivePage's dark-terminal aesthetic + reveal-state machine, but
 * for a NewCo Activations sync run instead of a dbt-wizard build: Segment
 * Definition → Field Mapping → Sync Preview → API Push → Destination
 * Confirmation. Content lives inline as local consts (no fetch, no
 * public/data JSON) — see spec note in activationTypes.ts.
 *
 * Vertical scenario: gold.fct_predictive_maintenance crosses the 0.85
 * risk_score threshold on Crimp Press 7 (STH-L8-CP7, Sterling Heights MI,
 * 88% confidence, 5-9 days to failure). Activations pushes a fully-scoped
 * Priority-1 work order straight into IBM Maximo Application Suite — no
 * export, no hand-keyed ticket, no bolt-on integration.
 */

import React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type {
  ActivationAgent,
  ActivationAgentId,
  ActivationEvent,
  ActivationRecord,
  ActivationScenario,
} from '../components/activationTypes';

// Timing constants — scale by speed control.
const NARR_TYPE_MS = 14;
const CODE_TYPE_MS = 4;
const POST_NARR_DELAY_MS = 550;
const POST_CODE_DELAY_MS = 350;
const SPEEDS = [1, 2, 4] as const;

interface RevealState {
  cursor: number;
  narrTyped: number;
  codeTyped: number;
  sideEffects: string[];
}

const INITIAL: RevealState = {
  cursor: 0,
  narrTyped: 0,
  codeTyped: 0,
  sideEffects: [],
};

const STEP_DEFS = [
  { label: 'Segment Definition',       who: 'Segment', tools: 'gold query',       insight: '1 asset matched' },
  { label: 'Field Mapping',            who: 'Mapper',  tools: 'schema map',       insight: '5 fields mapped' },
  { label: 'Sync Preview',             who: 'Mapper',  tools: 'diff preview',     insight: '1 insert · 5 unchanged' },
  { label: 'API Push',                 who: 'Sync',    tools: 'REST push',       insight: '1 record sent' },
  { label: 'Destination Confirmation', who: 'Sync',    tools: 'destination read', insight: '1 landed · 0 errors' },
];

// ─── Vertical-specific scenario content (predictive-maintenance risk → Maximo) ─

const ACTIVATION_SCENARIO: ActivationScenario = {
  company: 'Vantex Manufacturing',
  request_id: 'ACT-7719',
  requested_by: 'Predictive Maintenance Monitor',
  requested_at: '2026-07-09T11:06:00Z',
  timezone_label: 'ET',
  question: 'Dispatch a Maximo work order the instant Crimp Press 7 crosses an 85% bearing-failure risk score.',
  source_model: 'gold.fct_predictive_maintenance',
  destination_system: 'IBM Maximo Application Suite',
  destination_object: 'WORKORDER',
  sync_mode: 'insert',
  record_count: 6,
  build_room_seconds: 38,
};

const ACTIVATION_AGENTS: ActivationAgent[] = [
  { id: 'segment', name: 'Segment', code: 'SEG', color: '#ffd60a', role: 'Defines the gold-layer trigger query', tools: ['gold query', 'threshold watch'] },
  { id: 'mapper',  name: 'Mapper',  code: 'MAP', color: '#ea580c', role: 'Maps gold columns to destination fields', tools: ['schema map', 'diff preview'] },
  { id: 'sync',    name: 'Sync',    code: 'SYN', color: '#16a34a', role: 'Pushes the payload and confirms landing', tools: ['REST push', 'destination read'] },
];

const ACTIVATION_SCRIPT: ActivationEvent[] = [
  {
    from: 'segment',
    step: 1,
    step_label: 'Segment Definition',
    body: "Watching gold.fct_predictive_maintenance for one condition: risk_score at or above 0.85 within the 7-day risk window, for a machine newly flagged or re-scored upward since the last sync. Crimp Press 7 — asset STH-L8-CP7, Sterling Heights MI — just crossed 88% confidence on the bearing-failure model, 5 to 9 days out.",
    side_effect: 'gold.fct_predictive_maintenance · threshold crossed · STH-L8-CP7',
    code_target: 'sql',
    code_append:
      "select\n  asset_id,\n  plant_name,\n  risk_score,\n  days_to_failure_p50,\n  recommended_action,\n  risk_window\nfrom gold.fct_predictive_maintenance\nwhere risk_score >= 0.85\n  and risk_window = '7d'\n  and (is_newly_flagged = true\n    or risk_score_increased_since_last_sync = true);",
  },
  {
    from: 'mapper',
    step: 2,
    step_label: 'Field Mapping',
    body: "Field Mapping translates the governed gold columns straight into Maximo's asset and work-order schema — no custom API integration, no analyst in the loop.",
    side_effect: 'mapping · 5 fields → WORKORDER',
    code_target: 'json',
    code_append: JSON.stringify(
      {
        destination: 'IBM Maximo Application Suite',
        object: 'WORKORDER',
        field_map: {
          asset_id: 'ASSET.ASSETNUM',
          recommended_action: 'WORKORDER.DESCRIPTION',
          risk_score: 'WORKORDER.WOPRIORITY (>=0.85 -> Priority 1)',
          days_to_failure_p50: 'WORKORDER.TARGSTARTDATE (sync_date + p50 - 2d buffer)',
          plant_name: 'LOCATION.LOCATION',
        },
      },
      null,
      2,
    ),
  },
  {
    from: 'mapper',
    step: 3,
    step_label: 'Sync Preview',
    body: 'Sync Preview diffs against Maximo before anything pushes: 1 new Priority-1 work order to insert, 5 already-open maintenance work orders unchanged.',
    side_effect: 'diff · 1 insert · 5 unchanged',
    code_target: 'json',
    code_append: JSON.stringify({ to_insert: 1, unchanged: 5, to_update: 0 }, null, 2),
  },
  {
    from: 'sync',
    step: 4,
    step_label: 'API Push',
    body: "API Push sends the payload straight into Maximo Manage as a fully-scoped work order — asset, description, priority, target start date, all populated. No CSV, no export, zero code.",
    side_effect: 'POST /oslc/os/mxwo · Maximo · 201 created',
    code_target: 'json',
    code_append: JSON.stringify(
      {
        object: 'WORKORDER',
        ASSETNUM: 'STH-L8-CP7',
        DESCRIPTION: 'Replace main bearing — vibration RMS +38% over 14 days, 88% confidence',
        WOPRIORITY: 1,
        TARGSTARTDATE: '2026-07-14',
        LOCATION: 'Sterling Heights MI',
        STATUS: 'WAPPR',
      },
      null,
      2,
    ),
  },
  {
    from: 'sync',
    step: 5,
    step_label: 'Destination Confirmation',
    body: 'Destination Confirmation: the work order landed in Maximo in under a minute — Priority 1, target start date inside the 7-day window, assigned to Maintenance. The reliability engineer gets a dispatched work order, not a dashboard row waiting to be noticed.',
    side_effect: 'Maximo · work order dispatched · 0 errors',
  },
];

const ACTIVATION_RECORDS: ActivationRecord[] = [
  {
    key: 'STH-L8-CP7',
    fields: {
      Asset: 'STH-L8-CP7',
      Location: 'Sterling Heights MI',
      Description: 'Replace main bearing — 88% confidence',
      Priority: 1,
      'Target Start': '2026-07-14',
    },
    status: 'created',
  },
  {
    key: 'TOL-L3-FRG2',
    fields: {
      Asset: 'TOL-L3-FRG2',
      Location: 'Toledo OH',
      Description: 'Hydraulic flush + filter replacement',
      Priority: 3,
      'Target Start': '2026-07-19',
    },
    status: 'skipped',
  },
  {
    key: 'IND-L1-ROB4',
    fields: {
      Asset: 'IND-L1-ROB4',
      Location: 'Indianapolis IN',
      Description: 'Re-grease joint-2; inspect harmonic drive',
      Priority: 2,
      'Target Start': '2026-07-16',
    },
    status: 'skipped',
  },
  {
    key: 'STH-L4-CUT1',
    fields: {
      Asset: 'STH-L4-CUT1',
      Location: 'Sterling Heights MI',
      Description: 'Inspect cutting head; verify blade alignment',
      Priority: 3,
      'Target Start': '2026-07-21',
    },
    status: 'skipped',
  },
  {
    key: 'TOL-L6-CTG1',
    fields: {
      Asset: 'TOL-L6-CTG1',
      Location: 'Toledo OH',
      Description: 'Replace exhaust filter; check fan VFD',
      Priority: 3,
      'Target Start': '2026-07-26',
    },
    status: 'skipped',
  },
  {
    key: 'IND-L4-CNV3',
    fields: {
      Asset: 'IND-L4-CNV3',
      Location: 'Indianapolis IN',
      Description: 'Inspect motor bearings; verify belt tension',
      Priority: 4,
      'Target Start': '2026-07-30',
    },
    status: 'skipped',
  },
];

// ─── Destination confirmation payoff table ──────────────────────────────────

function DestinationConfirmationTable({
  scenario,
  records,
}: {
  scenario: ActivationScenario;
  records: ActivationRecord[];
}) {
  const cols = Object.keys(records[0]?.fields ?? {});
  return (
    <div className="mt-4 overflow-hidden" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderLeft: '4px solid #ffd60a' }}>
      <header className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--t-line)', background: 'var(--t-elev)' }}>
        <div>
          <div className="eyebrow" style={{ fontSize: 11, color: '#ffd60a' }}>Landed in {scenario.destination_system}</div>
          <div className="font-mono text-[12px] text-[var(--t-text-dim)] mt-0.5">{scenario.destination_object} · {scenario.sync_mode}</div>
        </div>
        <span className="font-mono text-[12px]" style={{ color: '#ffd60a' }}>
          {records.filter((r) => r.status !== 'skipped').length} of {records.length} shown
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead style={{ background: 'var(--t-elev)', borderBottom: '1px solid var(--t-line)' }}>
            <tr>
              <th className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-soft)' }}>Key</th>
              {cols.map((c) => (
                <th key={c} className="px-4 py-2 text-left text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-soft)' }}>{c}</th>
              ))}
              <th className="px-4 py-2 text-right text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--t-text-soft)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.key} style={{ borderTop: '1px solid var(--t-line-soft)' }}>
                <td className="px-4 py-2 font-mono text-[12px]" style={{ color: 'var(--t-text)' }}>{r.key}</td>
                {cols.map((c) => (
                  <td key={c} className="px-4 py-2 text-[12px]" style={{ color: 'var(--t-text-dim)' }}>{r.fields[c]}</td>
                ))}
                <td className="px-4 py-2 text-right">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: r.status === 'skipped' ? '#ea580c' : '#16a34a' }}
                  >
                    {r.status === 'skipped' ? '● unchanged' : `● ${r.status}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Small agent avatar (local — ActivationAgent has no sample_input/responsibilities) ─

function AgentBadge({ agent, active, size = 40 }: { agent?: ActivationAgent; active?: boolean; size?: number }) {
  const color = agent?.color ?? '#ffd60a';
  const code = agent?.code ?? '??';
  return (
    <span
      className="wizard-agent-avatar"
      data-active={active ? 'true' : undefined}
      style={{
        color,
        height: size,
        width: size,
        minWidth: size,
        fontSize: Math.max(11, size * 0.36),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 4,
        background: 'rgba(17,24,39,0.7)',
        border: `1.5px solid ${active ? color : 'rgba(255,255,255,0.15)'}`,
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        letterSpacing: '0.05em',
        transition: 'all 200ms ease',
        boxShadow: active ? `0 0 0 2px ${color}, 0 0 14px ${color}66` : undefined,
        flexShrink: 0,
      }}
      title={agent?.name ?? 'System'}
    >
      {code}
    </span>
  );
}

// ─── Syntax highlighting (regex-based, dark panel) — SQL + light JSON ───────

const SQL_KEYWORDS = new Set([
  'with', 'as', 'select', 'from', 'where', 'and', 'or', 'on', 'left', 'right',
  'inner', 'outer', 'join', 'group', 'by', 'order', 'desc', 'asc', 'when', 'then',
  'else', 'end', 'case', 'true', 'false', 'null', 'distinct', 'nullif', 'count',
  'sum', 'max', 'min', 'avg', 'dateadd', 'current_date', 'is', 'not',
]);

function tokenizeSqlLine(line: string): React.ReactNode[] {
  const trimmed = line.trimStart();
  if (trimmed.startsWith('--')) {
    return [<span key="c" className="wtok-com">{line}</span>];
  }
  const parts: React.ReactNode[] = [];
  const re = /(\{\{[^}]*\}\})|('[^']*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)|(\s+)|([^\s'\w{]+)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > idx) parts.push(line.slice(idx, m.index));
    if (m[1]) {
      parts.push(<span key={key++} className="wtok-jinja">{m[1]}</span>);
    } else if (m[2]) {
      parts.push(<span key={key++} className="wtok-str">{m[2]}</span>);
    } else if (m[3]) {
      parts.push(<span key={key++} className="wtok-num">{m[3]}</span>);
    } else if (m[4]) {
      const word = m[4];
      if (SQL_KEYWORDS.has(word.toLowerCase())) {
        parts.push(<span key={key++} className="wtok-kw">{word}</span>);
      } else {
        parts.push(word);
      }
    } else if (m[5]) {
      parts.push(m[5]);
    } else {
      parts.push(m[6] ?? '');
    }
    idx = re.lastIndex;
  }
  if (idx < line.length) parts.push(line.slice(idx));
  return parts;
}

function SyntaxSql({ text, cursor }: { text: string; cursor: boolean }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>{tokenizeSqlLine(line)}{li < lines.length - 1 && '\n'}</span>
      ))}
      {cursor && <span className="wizard-code-cursor" />}
    </>
  );
}

function tokenizeJsonLine(line: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /("(?:[^"\\]|\\.)*")(\s*:)?|(\btrue\b|\bfalse\b|\bnull\b)|(-?\b\d+(?:\.\d+)?\b)/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  let key = 0;
  while ((m = re.exec(line)) !== null) {
    if (m.index > idx) parts.push(line.slice(idx, m.index));
    if (m[1]) {
      const isKey = !!m[2];
      parts.push(<span key={key++} className={isKey ? 'wtok-kw' : 'wtok-str'}>{m[1]}</span>);
      if (m[2]) parts.push(m[2]);
    } else if (m[3]) {
      parts.push(<span key={key++} className="wtok-jinja">{m[3]}</span>);
    } else if (m[4]) {
      parts.push(<span key={key++} className="wtok-num">{m[4]}</span>);
    }
    idx = re.lastIndex;
  }
  if (idx < line.length) parts.push(line.slice(idx));
  return parts;
}

function SyntaxJson({ text, cursor }: { text: string; cursor: boolean }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, li) => (
        <span key={li}>{tokenizeJsonLine(line)}{li < lines.length - 1 && '\n'}</span>
      ))}
      {cursor && <span className="wizard-code-cursor" />}
    </>
  );
}

// =============================================================================
// Page
// =============================================================================

export default function ActivationLivePage() {
  const [events] = useState<ActivationEvent[]>(ACTIVATION_SCRIPT);
  const scenario = ACTIVATION_SCENARIO;
  const agents = ACTIVATION_AGENTS;

  const [state, setState] = useState<RevealState>(INITIAL);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const [complete, setComplete] = useState(false);

  const narrPanelRef = useRef<HTMLDivElement | null>(null);
  const codePanelRef = useRef<HTMLPreElement | null>(null);
  const narrUserScrolled = useRef(false);
  const codeUserScrolled = useRef(false);

  const agentById = useMemo(() => {
    const m: Record<string, ActivationAgent> = {};
    for (const a of agents) m[a.id] = a;
    return m;
  }, [agents]);

  const currentEvent: ActivationEvent | undefined = events[state.cursor];
  const totalSteps = useMemo(() => {
    if (events.length === 0) return 5;
    return Math.max(...events.map((e) => e.step));
  }, [events]);

  // Phase machine: type narration → type code (if any) → advance
  useEffect(() => {
    if (!playing || !currentEvent) {
      if (events.length > 0 && state.cursor >= events.length && !complete) {
        setComplete(true);
      }
      return;
    }
    // Phase 1: type narration
    if (state.narrTyped < currentEvent.body.length) {
      const id = setTimeout(() => {
        setState((s) => ({ ...s, narrTyped: s.narrTyped + 1 }));
      }, Math.max(2, Math.floor(NARR_TYPE_MS / speed)));
      return () => clearTimeout(id);
    }
    // Phase 2: type code if any
    const code = currentEvent.code_append ?? '';
    if (code.length > 0 && state.codeTyped < code.length) {
      const id = setTimeout(() => {
        setState((s) => ({ ...s, codeTyped: s.codeTyped + 1 }));
      }, Math.max(1, Math.floor(CODE_TYPE_MS / speed)));
      return () => clearTimeout(id);
    }
    // Phase 3: commit side effect + advance cursor
    const postDelay = code.length > 0 ? POST_CODE_DELAY_MS : POST_NARR_DELAY_MS;
    const id = setTimeout(() => {
      setState((s) => {
        const next: RevealState = { ...s, cursor: s.cursor + 1, narrTyped: 0, codeTyped: 0 };
        if (currentEvent.side_effect) {
          next.sideEffects = [currentEvent.side_effect, ...s.sideEffects].slice(0, 8);
        }
        return next;
      });
    }, Math.max(80, Math.floor(postDelay / speed)));
    return () => clearTimeout(id);
  }, [playing, speed, currentEvent, state.narrTyped, state.codeTyped, state.cursor, events.length, complete]);

  useEffect(() => {
    const el = narrPanelRef.current;
    if (el && !narrUserScrolled.current) el.scrollTop = el.scrollHeight;
  }, [state.cursor, state.narrTyped]);
  useEffect(() => {
    const el = codePanelRef.current;
    if (el && !codeUserScrolled.current) el.scrollTop = el.scrollHeight;
  }, [state.codeTyped, state.cursor]);

  useEffect(() => {
    const NEAR_BOTTOM_PX = 32;
    const bind = (el: HTMLElement | null, flag: React.MutableRefObject<boolean>) => {
      if (!el) return () => {};
      const handler = () => {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        flag.current = distanceFromBottom > NEAR_BOTTOM_PX;
      };
      el.addEventListener('scroll', handler, { passive: true });
      return () => el.removeEventListener('scroll', handler);
    };
    const offs = [bind(narrPanelRef.current, narrUserScrolled), bind(codePanelRef.current, codeUserScrolled)];
    return () => { offs.forEach((off) => off()); };
  }, []);

  const reset = () => { setState(INITIAL); setComplete(false); setPlaying(true); };
  const cycleSpeed = () => { const i = SPEEDS.indexOf(speed); setSpeed(SPEEDS[(i + 1) % SPEEDS.length]); };

  const currentStep = currentEvent?.step ?? totalSteps;
  const currentStepLabel = currentEvent?.step_label ?? 'Destination Confirmation';
  const activeAgentId: ActivationAgentId | undefined =
    currentEvent && state.narrTyped < currentEvent.body.length ? currentEvent.from : undefined;

  const visibleNarr = events.slice(0, Math.min(state.cursor + 1, events.length)).map((e, idx) => {
    const isCurrent = idx === state.cursor;
    const body = isCurrent ? e.body.slice(0, state.narrTyped) : e.body;
    return { e, body, isCurrent };
  });

  const codeSoFar = currentEvent?.code_append ? currentEvent.code_append.slice(0, state.codeTyped) : '';
  const codeLabel =
    currentEvent?.code_target === 'sql'
      ? 'models/gold/fct_predictive_maintenance.sql'
      : 'activation_mapping.json';

  return (
    <div className="wizard-terminal mx-auto max-w-[1640px] px-4 py-4 sm:px-6 lg:px-8">

      {/* ── Control bar ── */}
      <div
        className="mb-3 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-20 z-20"
        style={{
          background: 'var(--t-elev)',
          border: '1px solid var(--t-line)',
          borderLeft: '4px solid #ffd60a',
          boxShadow: '0 2px 8px rgba(17,24,39,0.18)',
        }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem', fontSize: 12, padding: '4px 10px', fontWeight: 700,
              background: 'rgba(255,214,10,0.12)', color: '#ffd60a', border: '1px solid rgba(255,214,10,0.35)',
              fontFamily: '"JetBrains Mono", monospace',
            }}
          >
            <span
              style={{
                display: 'inline-block', width: 8, height: 8, borderRadius: 0,
                background: '#ffd60a',
                animation: complete ? 'none' : 'signal-pulse 1.8s ease-in-out infinite',
              }}
            />
            {complete ? 'Sync Complete' : 'Sync Active'}
          </span>
          <span className="eyebrow" style={{ fontSize: 12 }}>{scenario.request_id}</span>
          <span className="font-mono" style={{ color: 'var(--t-text-dim)', fontSize: 13 }}>
            Step{' '}
            <span style={{ color: '#ffd60a', fontWeight: 700 }}>{currentStep}/{totalSteps}</span>
            <span className="mx-2" style={{ color: 'var(--t-text-soft)' }}>·</span>
            <span style={{ color: 'var(--t-text)' }}>{currentStepLabel}</span>
          </span>
          <div
            aria-hidden
            style={{ width: 160, height: 6, borderRadius: 0, background: 'var(--t-bg)', overflow: 'hidden', border: '1px solid var(--t-line)' }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.max(0, Math.round(((complete ? events.length : state.cursor) / Math.max(1, events.length)) * 100)))}%`,
                height: '100%',
                background: complete ? '#16a34a' : '#ffd60a',
                transition: 'width 220ms ease, background 200ms ease',
              }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="inline-flex items-center gap-1.5 font-semibold border transition-colors"
            style={{ background: 'var(--t-elev)', borderColor: 'var(--t-line)', color: 'var(--t-text)', padding: '7px 14px', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}
            onClick={() => setPlaying((p) => !p)}
            disabled={complete}
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            className="inline-flex items-center gap-1.5 font-semibold border transition-colors"
            style={{ background: 'var(--t-elev)', borderColor: 'var(--t-line)', color: 'var(--t-text)', padding: '7px 14px', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}
            onClick={cycleSpeed}
          >
            {speed}x
          </button>
          <button
            className="inline-flex items-center gap-1.5 font-semibold border transition-colors"
            style={{ background: 'var(--t-elev)', borderColor: 'var(--t-line)', color: 'var(--t-text)', padding: '7px 14px', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}
            onClick={reset}
          >
            Restart
          </button>
          <Link
            to="/architecture"
            className="inline-flex items-center gap-1.5 font-semibold border transition-colors"
            style={{ background: 'var(--t-elev)', borderColor: 'var(--t-line)', color: 'var(--t-text)', padding: '7px 14px', fontSize: 13, fontFamily: '"JetBrains Mono", monospace' }}
          >
            Back
          </Link>
        </div>
      </div>

      {/* ── Question + trigger banner (compact single row) ── */}
      <div
        className="mb-3 px-4 py-2.5 flex items-center gap-5 flex-wrap"
        style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)', borderLeft: '4px solid #ffd60a' }}
      >
        <div className="min-w-0 flex-shrink" style={{ flex: '1 1 460px' }}>
          <div className="font-mono" style={{ fontSize: 10, marginBottom: 2, color: '#ffd60a', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
            Predictive Maintenance · {scenario.timezone_label} · {scenario.requested_by}
          </div>
          <p className="font-semibold text-[var(--t-text)] leading-snug truncate" style={{ fontSize: 16 }} title={scenario.question}>
            "{scenario.question}"
          </p>
        </div>
        <div className="font-mono text-[var(--t-text-dim)] shrink-0" style={{ fontSize: 11 }}>
          Source: <span style={{ color: '#ffd60a', fontWeight: 700 }}>{scenario.source_model}</span>
          <span className="mx-2" style={{ color: 'var(--t-text-soft)' }}>&rarr;</span>
          <span style={{ color: '#ffd60a', fontWeight: 700 }}>{scenario.destination_system}</span>
        </div>
      </div>

      {/* ── Step rail (5 columns) ── */}
      <div className="mb-3 grid gap-1.5" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {STEP_DEFS.map((s, idx) => {
          const num = idx + 1;
          const done = currentStep > num || (currentStep === num && complete);
          const active = currentStep === num && !complete;
          const accentColor = active ? '#ffd60a' : done ? '#16a34a' : 'rgba(255,255,255,0.15)';
          return (
            <div
              key={s.label}
              style={{
                background: 'var(--t-surface)',
                border: '1px solid var(--t-line)',
                borderLeft: `4px solid ${accentColor}`,
                padding: '8px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
              title={`${s.who} · ${s.tools}`}
            >
              <div
                className="font-mono font-bold flex items-center gap-1.5"
                style={{ fontSize: 10, letterSpacing: '0.04em', color: active ? '#ffd60a' : done ? '#16a34a' : 'rgba(255,255,255,0.3)' }}
              >
                <span>STEP {String(num).padStart(2, '0')}</span>
                <span style={{ opacity: 0.6 }}>·</span>
                <span>{done ? 'DONE' : active ? 'NOW' : 'WAIT'}</span>
              </div>
              <div className="font-semibold text-[var(--t-text)] truncate" style={{ fontSize: 13, lineHeight: 1.15 }}>
                {s.label}
              </div>
              <div
                className="font-mono truncate"
                style={{ fontSize: 10, lineHeight: 1.25, color: active ? '#ffd60a' : done ? '#16a34a' : 'rgba(255,255,255,0.3)', opacity: done || active ? 0.95 : 0.55 }}
                title={s.insight}
              >
                {s.insight}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.25fr)' }}>

        {/* ── LEFT: Sub-agent narration ── */}
        <section
          className="lg:!h-[calc(100dvh-440px)]"
          style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)', display: 'flex', flexDirection: 'column', minHeight: 'max(60vh, 300px)' }}
        >
          <header className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--t-line)', background: 'var(--t-elev)' }}>
            <div>
              <div className="eyebrow" style={{ fontSize: 11 }}>Sub-agent narration</div>
              <div className="font-mono mt-0.5 text-[var(--t-text-dim)]" style={{ fontSize: 12 }}>
                {scenario.company} · Activations live sync
              </div>
            </div>
            <div className="flex items-center gap-2">
              {agents.map((a) => (
                <AgentBadge key={a.id} agent={a} active={activeAgentId === a.id} size={36} />
              ))}
            </div>
          </header>

          <div
            ref={narrPanelRef}
            className="px-5 py-4 overflow-y-auto flex-1"
            style={{ background: 'var(--t-bg)', overscrollBehavior: 'contain', fontSize: 14, lineHeight: 1.55 }}
          >
            {visibleNarr.map((m, idx) => {
              const a = agentById[m.e.from];
              const color = a?.color ?? '#ffd60a';
              const isTyping = m.isCurrent && playing && state.narrTyped < m.e.body.length;
              return (
                <div
                  key={idx}
                  data-wizard-card="narr"
                  style={{
                    borderLeft: `3px solid ${color}`,
                    paddingLeft: 12,
                    marginBottom: 10,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderLeftColor: color,
                    borderLeftWidth: 3,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, padding: '12px 14px 12px 0' }}>
                    <div style={{ paddingTop: 2, flexShrink: 0 }}>
                      <AgentBadge agent={a} active={isTyping} size={40} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <span className="font-mono font-semibold" style={{ color, fontSize: 13, letterSpacing: '0.02em' }}>
                          {a?.name ?? m.e.from}
                        </span>
                        <span
                          style={{
                            fontSize: 10, padding: '2px 7px', fontWeight: 700,
                            background: 'rgba(255,214,10,0.12)', color: '#ffd60a',
                            border: '1px solid rgba(255,214,10,0.35)',
                            fontFamily: '"JetBrains Mono", monospace',
                          }}
                        >
                          STEP {m.e.step}
                        </span>
                        <span className="font-mono" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>{m.e.step_label}</span>
                      </div>
                      <div className={isTyping ? 'wizard-chat-bubble wizard-chat-cursor' : 'wizard-chat-bubble'} style={{ color: 'var(--t-text)', fontSize: 14.5, lineHeight: 1.55 }}>
                        {m.body}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── RIGHT: Single live code panel (SQL or JSON, per step) ── */}
        <section className="flex flex-col gap-3 lg:!h-[calc(100dvh-440px)]" style={{ minHeight: 'max(60vh, 300px)', minWidth: 0 }}>
          <div style={{ flex: '1 1 0', background: 'var(--t-surface)', border: '1px solid var(--t-line)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <header className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--t-line)', background: 'var(--t-elev)' }}>
              <div className="flex items-center gap-3 flex-wrap min-w-0">
                <div className="font-mono" style={{ fontSize: 11, letterSpacing: '0.02em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{codeLabel}</div>
                <span
                  style={{
                    color: '#ea580c', background: 'rgba(234,88,12,0.1)',
                    border: '1px solid rgba(234,88,12,0.3)',
                    fontSize: 10, padding: '3px 8px', fontWeight: 700, whiteSpace: 'nowrap',
                    fontFamily: '"JetBrains Mono", monospace',
                  }}
                >
                  {currentEvent?.from ? `${agentById[currentEvent.from]?.name ?? currentEvent.from} authoring` : 'Awaiting sync'}
                </span>
              </div>
              <span className="font-mono" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, whiteSpace: 'nowrap' }}>
                {codeSoFar.length.toLocaleString()} chars
              </span>
            </header>
            <pre
              ref={codePanelRef}
              className="flex-1"
              style={{
                fontFamily: '"JetBrains Mono", monospace',
                fontSize: 14, lineHeight: 1.6,
                background: '#0d1117', color: '#e8edf8',
                border: 'none', margin: 0, padding: '1.25rem',
                overflowX: 'auto', overflowY: 'auto',
                whiteSpace: 'pre', tabSize: 2,
                overscrollBehavior: 'contain',
                minHeight: 0,
              }}
            >
              {codeSoFar.length === 0 ? (
                <span style={{ color: '#4b5563' }}>{'-- waiting for the next stage to author...'}</span>
              ) : currentEvent?.code_target === 'sql' ? (
                <SyntaxSql text={codeSoFar} cursor={state.codeTyped > 0 && state.codeTyped < (currentEvent.code_append?.length ?? 0)} />
              ) : (
                <SyntaxJson text={codeSoFar} cursor={state.codeTyped > 0 && state.codeTyped < (currentEvent?.code_append?.length ?? 0)} />
              )}
            </pre>
          </div>
        </section>
      </div>

      {/* ── Full-width tool side effects ticker (compact) ── */}
      <div className="mt-3 px-3 py-2 flex items-center gap-3" style={{ background: 'var(--t-surface)', border: '1px solid var(--t-line)' }}>
        <div className="eyebrow shrink-0" style={{ fontSize: 10 }}>sync events</div>
        {state.sideEffects.length === 0 ? (
          <div className="font-mono text-[var(--t-text-soft)]" style={{ fontSize: 11.5 }}>Awaiting first sync event...</div>
        ) : (
          <ul className="flex items-center gap-x-4 gap-y-1 flex-wrap min-w-0">
            {state.sideEffects.slice(0, 4).map((s, i) => (
              <li key={`${s}-${i}`} className="flex items-center gap-1.5 font-mono text-[var(--t-text)] truncate" style={{ fontSize: 11.5, maxWidth: '32ch' }} title={s}>
                <span
                  style={{
                    display: 'inline-block', width: 7, height: 7, borderRadius: 0, flexShrink: 0,
                    background: i === 0 ? '#ffd60a' : 'rgba(255,255,255,0.3)',
                    animation: i === 0 ? 'signal-pulse 1.8s ease-in-out infinite' : 'none',
                  }}
                />
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Sync complete: destination confirmation payoff ── */}
      {complete && (
        <div
          className="mt-6 p-5"
          style={{ border: '1px solid var(--t-line)', borderLeft: '5px solid #16a34a', background: 'rgba(22,163,74,0.06)' }}
        >
          <div className="flex items-baseline justify-between flex-wrap gap-3 mb-1">
            <div className="flex items-baseline gap-3 flex-wrap">
              <div
                style={{
                  display: 'inline-flex', fontSize: 12, padding: '4px 10px', fontWeight: 700,
                  background: 'rgba(22,163,74,0.14)', color: '#16a34a',
                  border: '1px solid rgba(22,163,74,0.35)',
                  fontFamily: '"JetBrains Mono", monospace',
                }}
              >
                Sync Complete
              </div>
              <span className="eyebrow" style={{ fontSize: 11 }}>{scenario.request_id} · {scenario.company}</span>
            </div>
            <Link
              to="/architecture"
              className="inline-flex items-center gap-2 font-semibold transition-colors"
              style={{ background: '#ffd60a', color: '#111827', padding: '10px 18px', fontSize: 13 }}
            >
              Back to architecture
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <DestinationConfirmationTable scenario={scenario} records={ACTIVATION_RECORDS} />
        </div>
      )}

      {/* Inline styles for wizard-specific primitives (shared aesthetic across app) */}
      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.28; }
        }

        .wizard-terminal {
          --t-bg:       #0d1117;
          --t-surface:  #161b22;
          --t-elev:     #1c2128;
          --t-line:     #30363d;
          --t-line-soft:#21262d;
          --t-text:     #e6edf3;
          --t-text-dim: #8b949e;
          --t-text-soft:#484f58;
          --t-accent:   #ffd60a;
          background: var(--t-bg);
          color: var(--t-text);
          font-family: "JetBrains Mono", ui-monospace, monospace;
          border: 1px solid var(--t-line);
          padding-top: 28px;
          position: relative;
          margin-top: 4px;
          margin-bottom: 12px;
          box-shadow: 0 18px 40px -22px rgba(0, 0, 0, 0.65);
        }
        .wizard-terminal::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28px;
          background: linear-gradient(180deg, #1c2128, #161b22);
          border-bottom: 1px solid var(--t-line);
        }
        .wizard-terminal::after {
          content: 'vantex-manufacturing/activations-live · NewCo Activations';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 28px;
          display: flex;
          align-items: center;
          font-size: 11.5px;
          font-family: "JetBrains Mono", monospace;
          background:
            radial-gradient(circle at 14px 14px, #ff5f57 5px, transparent 5.5px),
            radial-gradient(circle at 30px 14px, #febc2e 5px, transparent 5.5px),
            radial-gradient(circle at 46px 14px, #28c940 5px, transparent 5.5px);
          color: var(--t-text-dim);
          text-indent: 64px;
          letter-spacing: 0.02em;
          pointer-events: none;
        }
        .wizard-terminal > * { position: relative; z-index: 1; }

        .wizard-chat-bubble {
          font-family: "JetBrains Mono", monospace;
          font-size: 14px;
          line-height: 1.6;
          white-space: pre-wrap;
          word-break: break-word;
          color: var(--t-text);
        }
        .wizard-chat-cursor::after {
          content: '▌';
          display: inline-block;
          margin-left: 2px;
          color: #ffd60a;
          animation: cursor-blink 0.9s steps(2, start) infinite;
        }
        @keyframes cursor-blink {
          to { visibility: hidden; }
        }
        .wizard-code-cursor::after {
          content: '▌';
          color: #ffd60a;
          animation: cursor-blink 0.9s steps(2, start) infinite;
        }
        .wtok-kw    { color: #79b8ff; font-weight: 600; }
        .wtok-str   { color: #4ade80; }
        .wtok-com   { color: #6e7681; font-style: italic; }
        .wtok-num   { color: #ffd60a; }
        .wtok-jinja { color: #e879b8; font-weight: 600; }
      `}</style>
    </div>
  );
}
