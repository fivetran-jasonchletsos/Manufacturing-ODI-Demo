import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const NAV_ITEMS: [string, string][] = [
  ['/', 'Plant Floor'],
  ['/quality', 'Quality'],
  ['/predictive', 'Predictive Maintenance'],
  ['/sustainability', 'Sustainability'],
  ['/related', 'Related Parts'],
  ['/architecture', 'ODI Architecture'],
  ['/pipeline', 'Pipeline'],
  ['/dbt-wizard', 'dbt-wizard'],
  ['/policy', 'OT/IT Policy'],
  ['/about', 'About'],
];

const DEMOS = [
  { key: 'tax-assessment',  name: 'Allegheny County Tax', industry: 'Public sector · Property assessment',     url: 'https://fivetran-jasonchletsos.github.io/tax-assessment-databricks-demo/', accent: '#dc2626' },
  { key: 'healthcare',      name: 'Epic Clarity',         industry: 'Healthcare · Clinical analytics',          url: 'https://fivetran-jasonchletsos.github.io/Healthcare-EPIC-Snowflake-Demo/', accent: '#0d9488' },
  { key: 'finserv',         name: 'Meridian Capital',     industry: 'Financial Services · Wealth & banking',    url: 'https://fivetran-jasonchletsos.github.io/FinServ-ODI-Demo/', accent: '#1d4ed8' },
  { key: 'insurance',       name: 'Atlas Risk',           industry: 'Insurance · Policies, claims, reinsurance', url: 'https://fivetran-jasonchletsos.github.io/Insurance-ODI-Demo/', accent: '#0369a1' },
  { key: 'media',           name: 'Lighthouse Media',     industry: 'Media · Audience intelligence',            url: 'https://fivetran-jasonchletsos.github.io/Media-ODI-Demo/', accent: '#7c3aed' },
  { key: 'retail',          name: 'Storefront Analytics', industry: 'Retail & e-commerce',                       url: 'https://fivetran-jasonchletsos.github.io/RetailEcom-ODI-Demo/', accent: '#ea580c' },
  { key: 'techsaas',        name: 'SaaS Pulse',           industry: 'Tech · SaaS analytics',                     url: 'https://fivetran-jasonchletsos.github.io/TechSaaS-ODI-Demo/', accent: '#059669' },
  { key: 'supplychain',     name: 'Manifest',             industry: 'Supply chain · Logistics',                  url: 'https://fivetran-jasonchletsos.github.io/SupplyChain-ODI-Demo/', accent: '#0891b2' },
  { key: 'lifesci',         name: 'Cohort',               industry: 'Life sciences · Clinical research',         url: 'https://fivetran-jasonchletsos.github.io/LifeSci-ODI-Demo/', accent: '#be185d' },
  { key: 'manufacturing',   name: 'Vantex Manufacturing', industry: 'Manufacturing · Auto-parts (Tier-1)',       url: 'https://fivetran-jasonchletsos.github.io/Manufacturing-ODI-Demo/', accent: '#ffd60a' },
  { key: 'mission-control', name: 'Mission Control',      industry: 'Admin · Governance + observability',       url: 'https://fivetran-jasonchletsos.github.io/ODI-Mission-Control/', accent: '#22d3ee' },
];
const CURRENT_DEMO = 'manufacturing';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  return (
    <div className="min-h-full flex flex-col bg-bone">
      <div className="safety-rail" />

      <header className="bg-graphite-800 text-white sticky top-0 z-30">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 items-center justify-between gap-3 sm:gap-6">
            <Link to="/" className="flex items-center gap-3 shrink-0 min-w-0">
              <div className="h-11 w-11 flex items-center justify-center bg-safety">
                <MercerMark className="h-7 w-7 text-graphite-800" />
              </div>
              <div className="leading-tight min-w-0">
                <div className="font-display text-xl sm:text-2xl tracking-wide truncate">
                  Vantex Manufacturing
                </div>
                <div className="mt-0.5 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.16em] text-safety-bright">
                  Plant Operations Intelligence
                </div>
              </div>
            </Link>

            <nav className="hidden lg:flex items-center gap-0.5 text-sm">
              {NAV_ITEMS.map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `relative px-2.5 py-2 font-semibold tracking-tight text-[13px] transition-colors ${
                      isActive ? 'text-safety' : 'text-white/85 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      {label}
                      {isActive && <span className="absolute left-2.5 right-2.5 -bottom-[1px] h-[3px] bg-safety" />}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <DemoSwitcher />
              <button
                type="button"
                onClick={() => setMobileOpen((o) => !o)}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
                className="lg:hidden h-10 w-10 inline-flex items-center justify-center text-white hover:bg-white/10"
              >
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.25">
                  {mobileOpen ? <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" /> : <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />}
                </svg>
              </button>
            </div>
          </div>

          {mobileOpen && (
            <div className="lg:hidden pb-4 border-t border-white/10 pt-3">
              <nav className="grid grid-cols-2 gap-1 text-sm">
                {NAV_ITEMS.map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                      `px-3 py-2 text-center font-semibold border ${
                        isActive
                          ? 'bg-safety text-graphite-800 border-safety'
                          : 'border-white/15 text-white/85 hover:bg-white/10'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-graphite-700 bg-graphite-900 text-white/80 mt-16">
        <div className="safety-rail" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 flex items-center justify-center bg-safety">
                <MercerMark className="h-4 w-4 text-graphite-800" />
              </div>
              <div className="font-display text-white text-lg tracking-wide">Vantex Manufacturing</div>
            </div>
            <p className="leading-relaxed text-white/60">
              Tier-1 auto-parts supplier. Brake systems and wire harnesses. Three plants: Toledo OH, Sterling Heights MI, Indianapolis IN.
              Synthetic data — ODI architecture demonstration only. Not a real company.
            </p>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-safety-bright mb-2">Data Pipeline</div>
            <p className="leading-relaxed text-white/70">
              SAP S/4HANA · Rockwell FactoryTalk MES · OSIsoft PI · Ignition SCADA &rarr; Fivetran &rarr; Snowflake + Iceberg lake &rarr; dbt (bronze · silver · gold) &rarr; static JSON snapshot
            </p>
          </div>
          <div>
            <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-safety-bright mb-2">Open Standards</div>
            <p className="leading-relaxed text-white/70">
              Apache Iceberg v2 · Snowflake Horizon catalog · ANSI SQL · dbt semantic layer.
              OT data joined to IT data. Any compute engine.
            </p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 text-[11px] text-white/50 flex flex-col sm:flex-row gap-1 sm:items-center sm:justify-between">
            <div>© 2026 Vantex Manufacturing ODI Demo · Fivetran Open Data Infrastructure</div>
            <div className="flex items-center gap-3">
              <span>Synthetic snapshot · For Summit walkthrough</span>
              <a
                href={`${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/Vantex-Manufacturing-3min-Demo-Runbook.pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider border border-safety/40 bg-safety/10 text-safety hover:bg-safety/20 transition-colors"
              >
                3-min runbook
                <svg viewBox="0 0 14 14" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2 7h10M7 2l5 5-5 5" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function DemoSwitcher() {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative hidden sm:block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-mono font-bold uppercase tracking-wider border border-safety/40 bg-safety/15 text-safety hover:bg-safety/25"
      >
        <span className="h-1.5 w-1.5 bg-safety animate-pulse" />
        Snapshot
        <svg viewBox="0 0 24 24" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-2 w-[300px] border border-graphite-700 bg-white shadow-2xl z-40">
          <div className="px-3 pt-3 pb-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-graphite-500 border-b border-graphite-100">
            Switch demo
          </div>
          <div className="py-1 max-h-96 overflow-y-auto">
            {DEMOS.map((d) => {
              const current = d.key === CURRENT_DEMO;
              const inner = (
                <div className="flex items-center gap-2.5 px-3 py-2">
                  <span className="h-2.5 w-2.5 shrink-0" style={{ background: d.accent }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-graphite-800 truncate">{d.name}</div>
                    <div className="text-[11px] text-graphite-500 truncate">{d.industry}</div>
                  </div>
                  {current && (
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-graphite-100 text-graphite-600 border border-graphite-200">
                      Current
                    </span>
                  )}
                </div>
              );
              return current ? (
                <div key={d.key} className="opacity-60 cursor-default">{inner}</div>
              ) : (
                <a key={d.key} href={d.url} className="block hover:bg-graphite-50" onClick={() => setOpen(false)}>
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function MercerMark({ className = '' }: { className?: string }) {
  // Gear icon — six-tooth industrial cog
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 1.5l1.4 2.4 2.7-.4.7 2.6 2.6.7-.4 2.7 2.4 1.4-1.4 2.5 1.4 2.4-2.4 1.4.4 2.7-2.6.7-.7 2.6-2.7-.4L12 22.5l-1.4-2.4-2.7.4-.7-2.6-2.6-.7.4-2.7-2.4-1.4 1.4-2.4-1.4-2.5 2.4-1.4-.4-2.7 2.6-.7.7-2.6 2.7.4L12 1.5z" />
      <circle cx="12" cy="12" r="3.5" fill="#1f2937" />
    </svg>
  );
}
