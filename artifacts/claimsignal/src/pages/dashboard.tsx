import { useMemo, useState } from 'react';
import { ArrowRight, ChevronDown, Filter, Search, SlidersHorizontal, TrendingUp, TriangleAlert } from 'lucide-react';
import { Link } from 'wouter';
import { useClaims } from '@/hooks/use-claims';
import { AppShell } from '@/components/app-shell';
import { ClaimRow } from '@/components/claim-row';
import { DataProblem, EmptyState, PageSkeleton } from '@/components/loading-state';
import { riskTone } from '@/components/risk-badge';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [risk, setRisk] = useState('all');
  const [claimType, setClaimType] = useState('all');
  const { data, isLoading, isError, refetch } = useClaims({ search, risk, claimType });
  const claims = data ?? [];
  const todayLabel = useMemo(() => new Intl.DateTimeFormat('en-SG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), []);
  const stats = useMemo(() => ({
    atRisk: claims.filter((c) => ['high', 'critical'].includes(riskTone(c.risk_level))).length,
    rising: claims.filter((c) => (c.risk_score ?? 0) > (c.previous_risk_score ?? 0)).length,
    callbacks: claims.reduce((sum, c) => sum + (c.missed_callback_count ?? 0), 0),
  }), [claims]);
  return <AppShell>
    <div className="animate-rise-in">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="mono text-[10px] uppercase tracking-[.18em] text-primary">{todayLabel}</p><h1 className="mt-2 text-[30px] font-semibold tracking-[-.04em] sm:text-[36px]">Claims needing attention</h1><p className="mt-2 max-w-xl text-sm text-muted-foreground">Prioritized by emerging complaint and customer-outcome risk.</p></div>
        <Link href="/interventions" className="inline-flex items-center gap-2 self-start rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-primary shadow-sm transition-colors hover:bg-muted sm:self-auto" data-testid="link-view-interventions">Review intervention queue <ArrowRight size={14} /></Link>
      </div>
      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-rise-in animate-rise-in-delay-1" data-testid="kpi-at-risk"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Claims needing attention</span><span className="rounded-md bg-red-50 p-1.5 text-red-700"><TriangleAlert size={16} /></span></div><div className="mt-4 flex items-end gap-2"><span className="text-[32px] font-semibold tracking-[-.05em]">{isLoading ? '—' : stats.atRisk}</span><span className="mb-1.5 text-xs text-red-700">high risk</span></div><p className="mt-1 text-[11px] text-muted-foreground">Prioritised by current risk score</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-rise-in animate-rise-in-delay-2" data-testid="kpi-rising"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Risk rising this week</span><span className="rounded-md bg-amber-50 p-1.5 text-amber-700"><TrendingUp size={16} /></span></div><div className="mt-4 flex items-end gap-2"><span className="text-[32px] font-semibold tracking-[-.05em]">{isLoading ? '—' : stats.rising}</span><span className="mb-1.5 text-xs text-amber-700">signals</span></div><p className="mt-1 text-[11px] text-muted-foreground">Compared with prior assessment</p></div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm animate-rise-in animate-rise-in-delay-3" data-testid="kpi-callbacks"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">Missed callbacks</span><span className="rounded-md bg-[#e8eef4] p-1.5 text-primary"><span className="mono text-[12px]">↗</span></span></div><div className="mt-4 flex items-end gap-2"><span className="text-[32px] font-semibold tracking-[-.05em]">{isLoading ? '—' : stats.callbacks}</span><span className="mb-1.5 text-xs text-muted-foreground">across open claims</span></div><p className="mt-1 text-[11px] text-muted-foreground">A common early warning signal</p></div>
      </div>
      <section className="mt-9 rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/80 p-5 lg:flex-row lg:items-center lg:justify-between lg:px-6">
          <div><div className="flex items-center gap-2"><h2 className="font-semibold tracking-[-.02em]">Claims needing attention</h2><span className="rounded-full bg-muted px-2 py-0.5 mono text-[10px] text-muted-foreground">{claims.length}</span></div><p className="mt-1 text-xs text-muted-foreground">Ordered by risk, then most recent signal.</p></div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative flex min-w-[220px] items-center"><Search size={15} className="absolute left-3 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Claim, customer or handler" className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-xs outline-none ring-primary transition focus:ring-2" data-testid="input-search-claims" /></label>
            <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5"><Filter size={14} className="text-muted-foreground" /><select value={risk} onChange={(e) => setRisk(e.target.value)} className="bg-transparent text-xs font-medium outline-none" data-testid="select-filter-risk"><option value="all">All risk</option><option value="high">High risk</option><option value="medium">Medium risk</option><option value="low">Low risk</option></select><ChevronDown size={13} className="text-muted-foreground" /></label>
            <label className="hidden h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 sm:flex"><SlidersHorizontal size={14} className="text-muted-foreground" /><select value={claimType} onChange={(e) => setClaimType(e.target.value)} className="bg-transparent text-xs font-medium outline-none" data-testid="select-filter-claim-type"><option value="all">All claim types</option><option value="Motor">Motor</option><option value="Home">Home</option><option value="Travel">Travel</option></select></label>
          </div>
        </div>
        {isLoading ? <div className="p-6"><PageSkeleton /></div> : isError ? <div className="p-6"><DataProblem onRetry={() => refetch()} /></div> : claims.length === 0 ? <div className="p-6"><EmptyState title="No claims match these filters" detail="Try clearing a filter or searching for a different claim." /></div> : <div className="relative">{claims.map((claim, index) => <ClaimRow key={claim.id} claim={claim} index={index} />)}</div>}
      </section>
      <p className="mt-5 flex items-center justify-center gap-2 text-center text-[11px] text-muted-foreground"><span className="size-1.5 rounded-full bg-emerald-500" />Signal scores are decision support, not decisions. A claims professional remains accountable.</p>
    </div>
  </AppShell>;
}