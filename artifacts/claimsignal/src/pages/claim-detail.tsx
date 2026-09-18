import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Clock3, FileText, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { DataProblem, EmptyState, InlineSkeleton } from '@/components/loading-state';
import { RiskBadge, riskTone } from '@/components/risk-badge';
import { useClaim, useClaimEvents } from '@/hooks/use-claims';
import { useInterventions, useUpdateIntervention } from '@/hooks/use-interventions';
import type { Claim, ClaimEvent } from '@/lib/claimsignal-types';
import { parseClaimAnalysis } from '@/services/claim-analysis';
import { useToast } from '@/hooks/use-toast';
import { getJourneyLearning, INTERVENTION_CONTROL_LABELS } from '@/lib/demo-journeys';

function formatDate(value?: string | null) {
  if (!value) return 'Date not recorded';
  const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('en-SG', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export default function ClaimDetail() {
  const { claimId = '' } = useParams<{ claimId: string }>();
  const claimQuery = useClaim(claimId);
  const eventsQuery = useClaimEvents(claimId);
  const interventionsQuery = useInterventions('all');
  const mutation = useUpdateIntervention();
  const { toast } = useToast();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [showWhatChanged, setShowWhatChanged] = useState(true);
  const claim = claimQuery.data;
  const intervention = useMemo(() => interventionsQuery.data?.find((item) => item.claim_id === claimId && ['recommended', 'scheduled'].includes(item.status)), [interventionsQuery.data, claimId]);
  const events = eventsQuery.data ?? [];
  const latestOperationalEvent = useMemo(() => events.filter((event) => event.event_title || event.event_detail).at(-1), [events]);
  const journeyLearning = useMemo(() => claim ? getJourneyLearning(claim, events) : null, [claim, events]);
  if (claimQuery.isLoading) return <AppShell><InlineSkeleton rows={7} /></AppShell>;
  if (claimQuery.isError) return <AppShell><DataProblem onRetry={() => claimQuery.refetch()} /></AppShell>;
  if (!claim) return <AppShell><EmptyState title="Claim not found" detail={`We could not find ${claimId || 'this claim'} in the current workspace.`} /></AppShell>;
  const analysis = parseClaimAnalysis(claim.mock_ai_analysis);
  const tone = riskTone(claim.risk_level);
  const delta = (claim.risk_score ?? 0) - (claim.previous_risk_score ?? 0);
  const riskDirection = delta > 0 ? 'Increased' : delta < 0 ? 'Decreased' : 'Unchanged';
  const handleAction = (status: 'scheduled' | 'dismissed') => {
    if (!intervention) return;
    if (status === 'dismissed' && !window.confirm('Dismiss this recommendation? It will remain in the audit trail.')) return;
    mutation.mutate({ id: intervention.id, claimId, status, customerMessage: messageRef.current?.value }, { onSuccess: () => toast({ title: status === 'scheduled' ? 'Intervention scheduled' : 'Recommendation dismissed', description: status === 'scheduled' ? 'The owner can now follow up. ClaimSignal will not contact the customer.' : 'The recommendation is preserved in the intervention record.' }), onError: () => toast({ title: 'Action could not be saved', description: 'Please try again.', variant: 'destructive' }) });
  };
  return <AppShell>
    <div className="animate-rise-in">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary" data-testid="link-back-dashboard"><ArrowLeft size={14} /> Back to attention queue</Link>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="grid-paper rounded-t-xl border-b border-border/80 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-6 xl:flex-row xl:items-start">
            <div><div className="flex flex-wrap items-center gap-3"><span className="mono text-sm font-medium text-primary">{claim.claim_id}</span><RiskBadge level={claim.risk_level} score={claim.risk_score} /><span className="text-xs text-muted-foreground">{claim.current_status || 'Open'}</span></div><h1 className="mt-4 text-[28px] font-semibold tracking-[-.04em]">{claim.customer_name}</h1><p className="mt-1 text-sm text-muted-foreground">{claim.claim_type} · Lodged {formatDate(claim.lodgement_date)}</p>{intervention?.status === 'recommended' && <button type="button" onClick={() => document.getElementById('intervention-drawer')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2" data-testid="button-prevent-escalation"><ShieldCheck size={15} /> {INTERVENTION_CONTROL_LABELS.prevent}</button>}</div>
            <div className="grid min-w-0 grid-cols-3 gap-2 sm:min-w-[420px]">
              <RiskSummary label="Current risk" value={`${claim.risk_score ?? '—'} ${claim.risk_level ?? ''}`} tone={tone === 'high' ? 'danger' : tone === 'medium' ? 'warning' : 'positive'} />
              <RiskSummary label="Previous risk" value={String(claim.previous_risk_score ?? '—')} />
              <RiskSummary label="Direction" value={riskDirection} tone={delta > 0 ? 'danger' : delta < 0 ? 'positive' : 'neutral'} />
            </div>
          </div>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border/70 pt-5 sm:grid-cols-4"><DetailStat icon={Clock3} label="Days open" value={`${claim.days_open ?? '—'} days`} /><DetailStat icon={MessageSquare} label="Customer contacts" value={String(claim.customer_contact_count ?? 0)} emphasis={(claim.customer_contact_count ?? 0) === 0} note={(claim.customer_contact_count ?? 0) === 0 ? 'No contact yet' : undefined} /><DetailStat icon={FileText} label="Documents outstanding" value={String(claim.documents_outstanding ?? 0)} /><DetailStat icon={UserRound} label="Assigned handler" value={claim.assigned_handler || 'Unassigned'} /></div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
            <div className="p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><div><SectionLabel>What changed?</SectionLabel><p className="mt-1 text-[11px] text-muted-foreground">Operational evidence from the claim event record</p></div><button type="button" onClick={() => setShowWhatChanged((visible) => !visible)} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted" data-testid="button-what-changed">{showWhatChanged ? 'Hide details' : 'What changed?'}</button></div>{showWhatChanged && <><div className={`mt-4 rounded-lg border p-4 ${tone === 'high' ? 'border-red-200 bg-red-50/60' : tone === 'medium' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${tone === 'high' ? 'bg-red-100 text-red-700' : tone === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}><ArrowUpRight size={15} /></span><div><p className="mono text-[9px] font-medium uppercase tracking-[.14em] text-muted-foreground">Latest operational event</p><p className="mt-1 text-sm font-semibold">{journeyLearning?.changeTitle || latestOperationalEvent?.event_title || 'No recent operational event recorded'}</p>{(journeyLearning?.changeDetail || latestOperationalEvent?.event_detail) && <p className="mt-1 text-xs leading-relaxed text-foreground/70">{journeyLearning?.changeDetail || latestOperationalEvent?.event_detail}</p>}<p className="mt-3 mono text-[11px] font-semibold text-primary">Risk {claim.previous_risk_score ?? '—'} → {claim.risk_score ?? '—'} · {riskDirection.toLowerCase()}</p></div></div></div>
            {claim.latest_customer_message && <blockquote className="mt-4 border-l-2 border-primary/30 pl-4 text-sm italic leading-relaxed text-muted-foreground">“{claim.latest_customer_message}”<footer className="mt-2 not-italic text-[11px] text-muted-foreground/70">Latest customer message</footer></blockquote>}
             {journeyLearning && <div className={`mt-4 rounded-lg border p-4 ${journeyLearning.tone === 'positive' ? 'border-emerald-200 bg-emerald-50/55' : 'border-amber-200 bg-amber-50/55'}`}><p className="mono text-[9px] font-medium uppercase tracking-[.14em] text-muted-foreground">Context check</p><p className="mt-1 text-sm font-semibold">{journeyLearning.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{journeyLearning.detail}</p></div>}
              <div className="mt-8"><SectionLabel>Claim timeline</SectionLabel><div className="mt-1 flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] text-muted-foreground">Operational events recorded in Supabase</p><span title="These values represent transparent prototype risk rules, not trained machine-learning feature importance." className="cursor-help border-b border-dotted border-muted-foreground/50 text-[10px] text-muted-foreground">Prototype signal contribution</span></div><Timeline events={events} loading={eventsQuery.isLoading} /></div></>}</div>
           <div className="border-t border-border/80 bg-[#f8f5ed] p-5 sm:p-7 lg:border-l lg:border-t-0">
              <SectionLabel>AI assessment</SectionLabel><p className="mt-1 text-[11px] text-muted-foreground">AI assessment based on the claim event record and current operational signals.</p>{analysis ? <><div className="mt-4"><p className="text-[15px] leading-relaxed">{journeyLearning?.assessmentSummary || analysis.summary}</p></div>
              <div className="mt-6 space-y-3"><p className="text-xs font-semibold">Key evidence and signals</p>{analysis.signals.length ? analysis.signals.map((signal) => <div key={`${signal.signal}-${signal.evidence}`} className="rounded-lg border border-border/80 bg-card/70 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{signal.signal}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${signal.severity === 'high' ? 'bg-red-50 text-red-700' : signal.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{signal.severity}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{signal.evidence}</p></div>) : <p className="text-xs text-muted-foreground">No structured signals were returned.</p>}</div></> : <div className="mt-4 rounded-lg border border-dashed border-border bg-card/50 p-4 text-xs text-muted-foreground">Structured AI assessment is unavailable for this claim. No interpretation has been generated.</div>}
            <div className="mt-7 border-t border-border/70 pt-5"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck size={15} /> Human review required</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">This is decision support. A claims professional must review the evidence before any action is scheduled.</p></div>
          </div>
        </div>
          <aside id="intervention-drawer" className="scroll-mt-24 border-t border-border/80 bg-card p-5 sm:p-7"><div className="rounded-xl border border-primary/15 bg-[#fbfaf6] p-5 shadow-sm sm:p-6"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><SectionLabel>Preventative intervention</SectionLabel><h2 className="mt-3 text-xl font-semibold tracking-[-.03em]">{intervention?.recommended_action || analysis?.recommended_action?.action || 'No intervention proposed yet'}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{journeyLearning?.interventionReason || intervention?.reason || analysis?.recommended_action?.reason || 'No structured recommendation is available for this claim.'}</p></div>{intervention && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-amber-700">{intervention.status}</span>}</div>
            {intervention ? <div className="mt-6"><div className="grid gap-3 text-xs sm:grid-cols-3"><div className="rounded-lg border border-border bg-card p-3"><span className="block text-muted-foreground">Owner</span><strong className="mt-1 block">{intervention.owner || claim.assigned_handler || 'Claims team'}</strong></div><div className="rounded-lg border border-border bg-card p-3"><span className="block text-muted-foreground">Due by</span><strong className="mt-1 block">{formatDate(intervention.due_date)}</strong></div><div className="rounded-lg border border-border bg-card p-3"><span className="block text-muted-foreground">Urgency</span><strong className="mt-1 block capitalize">{intervention.urgency.replace('_', ' ')}</strong></div></div><label className="mt-5 block text-xs font-semibold">Editable draft customer message <span className="font-normal text-muted-foreground">— review before sending</span><textarea ref={messageRef} defaultValue={journeyLearning?.draftCustomerMessage || intervention.customer_message || analysis?.draft_customer_message || ''} rows={5} className="mt-2 w-full resize-y rounded-md border border-input bg-card p-3 text-xs leading-relaxed outline-none ring-primary focus:ring-2" placeholder="No customer message draft was provided." /></label><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground">Approval records the plan, owner and timestamp. ClaimSignal does not contact the customer.</p><div className="flex gap-2"><button type="button" disabled={mutation.isPending || intervention.status === 'scheduled'} onClick={() => handleAction('dismissed')} className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid="button-dismiss-intervention">{INTERVENTION_CONTROL_LABELS.dismiss}</button><button type="button" disabled={mutation.isPending || intervention.status === 'scheduled'} onClick={() => handleAction('scheduled')} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-50" data-testid="button-schedule-intervention">{intervention.status === 'scheduled' ? 'Scheduled' : INTERVENTION_CONTROL_LABELS.approve}</button></div></div></div> : <div className="mt-5 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No open recommendation is associated with this claim.</div>}
          </div>
          </aside>
        </div>
      </div>
  </AppShell>;
}

function DetailStat({ icon: Icon, label, value, emphasis = false, note }: { icon: typeof Clock3; label: string; value: string; emphasis?: boolean; note?: string }) { return <div className={`flex items-start gap-2.5 rounded-lg ${emphasis ? 'bg-amber-50/70 p-2.5 ring-1 ring-amber-200' : ''}`}><Icon size={15} className={`mt-0.5 ${emphasis ? 'text-amber-700' : 'text-muted-foreground'}`} /><div><p className="text-[11px] text-muted-foreground">{label}</p><p className={`mt-1 text-xs font-semibold ${emphasis ? 'text-amber-800' : ''}`}>{value}</p>{note && <p className="mt-0.5 text-[10px] font-medium text-amber-700">{note}</p>}</div></div>; }
function RiskSummary({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'danger' | 'warning' | 'positive' | 'neutral' }) {
  return <div className="rounded-lg border border-border/80 bg-card/75 p-3"><p className="mono text-[9px] uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className={`mt-1 text-sm font-semibold capitalize ${tone === 'danger' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : tone === 'positive' ? 'text-emerald-700' : 'text-primary'}`}>{value}</p></div>;
}
function SectionLabel({ children }: { children: React.ReactNode }) { return <div className="mono text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">{children}</div>; }
function Timeline({ events, loading }: { events: ClaimEvent[]; loading: boolean }) {
  if (loading) return <div className="mt-4"><InlineSkeleton rows={3} /></div>;
  if (!events.length) return <p className="mt-4 text-sm text-muted-foreground">No timeline events recorded.</p>;
  return <div className="mt-5 space-y-0">{events.map((event, i) => <div className="relative flex gap-4 pb-6 last:pb-0" key={event.id}>
    <div className="flex flex-col items-center"><span className={`z-10 mt-1 grid size-5 place-items-center rounded-full border-2 ${event.risk_delta && event.risk_delta > 0 ? 'border-red-300 bg-red-50' : 'border-border bg-card'}`}><span className="size-1.5 rounded-full bg-primary" /></span>{i < events.length - 1 && <span className="absolute top-6 h-full w-px bg-border" />}</div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{event.event_title}</p>{event.risk_delta != null && <span className={event.risk_delta > 0 ? 'mono text-[10px] text-red-700' : 'mono text-[10px] text-emerald-700'}>{event.risk_delta > 0 ? '+' : ''}{event.risk_delta} risk</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{formatDate(event.event_date)} · {event.event_type}</p>{event.event_detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.event_detail}</p>}</div>
  </div>)}</div>;
}