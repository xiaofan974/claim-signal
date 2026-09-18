import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Clock3, FileText, MessageSquare, ShieldCheck, UserRound } from 'lucide-react';
import { Link, useParams } from 'wouter';
import { AppShell } from '@/components/app-shell';
import { DataProblem, EmptyState, InlineSkeleton } from '@/components/loading-state';
import { RiskBadge, riskTone } from '@/components/risk-badge';
import { useClaim, useClaimEvents } from '@/hooks/use-claims';
import { useInterventions, useUpdateIntervention } from '@/hooks/use-interventions';
import type { ClaimEvent } from '@/lib/claimsignal-types';
import { parseClaimAnalysis } from '@/services/claim-analysis';
import { useToast } from '@/hooks/use-toast';

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
  if (claimQuery.isLoading) return <AppShell><InlineSkeleton rows={7} /></AppShell>;
  if (claimQuery.isError) return <AppShell><DataProblem onRetry={() => claimQuery.refetch()} /></AppShell>;
  if (!claim) return <AppShell><EmptyState title="Claim not found" detail={`We could not find ${claimId || 'this claim'} in the current workspace.`} /></AppShell>;
   const analysis = parseClaimAnalysis(claim.mock_ai_analysis, claim);
  const tone = riskTone(claim.risk_level);
  const delta = (claim.risk_score ?? 0) - (claim.previous_risk_score ?? 0);
  const handleAction = (status: 'scheduled' | 'dismissed') => {
    if (!intervention) return;
     if (status === 'dismissed' && !window.confirm('Dismiss this recommendation? It will remain in the audit trail.')) return;
     mutation.mutate({ id: intervention.id, claimId, status, customerMessage: messageRef.current?.value || undefined }, { onSuccess: () => toast({ title: status === 'scheduled' ? 'Intervention scheduled' : 'Recommendation dismissed', description: status === 'scheduled' ? 'The owner can now follow up. ClaimSignal will not contact the customer.' : 'The recommendation is preserved in the intervention record.' }), onError: () => toast({ title: 'Action could not be saved', description: 'Please try again.', variant: 'destructive' }) });
  };
  return <AppShell>
    <div className="animate-rise-in">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary" data-testid="link-back-dashboard"><ArrowLeft size={14} /> Back to attention queue</Link>
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="grid-paper rounded-t-xl border-b border-border/80 p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start"><div><div className="flex flex-wrap items-center gap-3"><span className="mono text-sm font-medium text-primary">{claim.claim_id}</span><RiskBadge level={claim.risk_level} score={claim.risk_score} /><span className="text-xs text-muted-foreground">{claim.current_status || 'Open'}</span></div><h1 className="mt-4 text-[28px] font-semibold tracking-[-.04em]">{claim.customer_name}</h1><p className="mt-1 text-sm text-muted-foreground">{claim.claim_type} · Lodged {formatDate(claim.lodgement_date)}</p></div><div className="text-left sm:text-right"><p className="mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">Current risk score</p><p className="mt-1 text-4xl font-semibold tracking-[-.06em] text-primary">{claim.risk_score ?? '—'}<span className="ml-1 text-base font-normal text-muted-foreground">/ 100</span></p><p className={`mt-1 text-xs ${delta > 0 ? 'text-red-700' : 'text-emerald-700'}`}>{delta > 0 ? `+${delta}` : delta} since previous review</p></div></div>
          <div className="mt-7 grid grid-cols-2 gap-4 border-t border-border/70 pt-5 sm:grid-cols-4"><DetailStat icon={Clock3} label="Days open" value={`${claim.days_open ?? '—'} days`} /><DetailStat icon={MessageSquare} label="Customer contacts" value={String(claim.customer_contact_count ?? 0)} /><DetailStat icon={FileText} label="Documents outstanding" value={String(claim.documents_outstanding ?? 0)} /><DetailStat icon={UserRound} label="Assigned handler" value={claim.assigned_handler || 'Unassigned'} /></div>
        </div>
        <div className="grid gap-0 lg:grid-cols-[1.25fr_.75fr]">
            <div className="p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><SectionLabel>What changed</SectionLabel><button type="button" onClick={() => setShowWhatChanged((visible) => !visible)} className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-primary hover:bg-muted" data-testid="button-what-changed">{showWhatChanged ? 'Hide details' : 'What changed?'}</button></div>{showWhatChanged && <><div className={`mt-4 rounded-lg border p-4 ${tone === 'high' ? 'border-red-200 bg-red-50/60' : tone === 'medium' ? 'border-amber-200 bg-amber-50/60' : 'border-emerald-200 bg-emerald-50/60'}`}><div className="flex items-start gap-3"><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${tone === 'high' ? 'bg-red-100 text-red-700' : tone === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}><ArrowUpRight size={15} /></span><div><p className="text-sm font-semibold">{claim.main_signal || 'Risk signal detected'}</p><p className="mt-1 text-xs leading-relaxed text-foreground/70">{claim.context_note || claim.predicted_issue || 'The model detected a meaningful shift in claim activity.'}</p><p className="mt-3 mono text-[11px] font-semibold text-primary">Risk {claim.previous_risk_score ?? '—'} → {claim.risk_score ?? '—'}</p></div></div></div>
            {claim.latest_customer_message && <blockquote className="mt-4 border-l-2 border-primary/30 pl-4 text-sm italic leading-relaxed text-muted-foreground">“{claim.latest_customer_message}”<footer className="mt-2 not-italic text-[11px] text-muted-foreground/70">Latest customer message</footer></blockquote>}
             <div className="mt-8"><SectionLabel>Claim timeline</SectionLabel><Timeline events={eventsQuery.data ?? []} loading={eventsQuery.isLoading} /></div></>}</div>
           <div className="border-t border-border/80 bg-[#f8f5ed] p-5 sm:p-7 lg:border-l lg:border-t-0">
             <SectionLabel>AI assessment</SectionLabel><div className="mt-4"><p className="text-[15px] leading-relaxed">{analysis.summary}</p></div>
             <div className="mt-6 space-y-3"><p className="text-xs font-semibold">Signals</p>{analysis.signals.length ? analysis.signals.map((signal) => <div key={`${signal.signal}-${signal.evidence}`} className="rounded-lg border border-border/80 bg-card/70 p-3"><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold">{signal.signal}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${signal.severity === 'high' ? 'bg-red-50 text-red-700' : signal.severity === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{signal.severity}</span></div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">{signal.evidence}</p></div>) : <p className="text-xs text-muted-foreground">No structured signals were returned.</p>}</div>
            <div className="mt-7 border-t border-border/70 pt-5"><div className="flex items-center gap-2 text-xs font-semibold text-primary"><ShieldCheck size={15} /> Human review required</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">This is decision support. A claims professional must review the evidence before any action is scheduled.</p></div>
          </div>
        </div>
         <div className="border-t border-border/80 p-5 sm:p-7"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><SectionLabel>Preventative intervention</SectionLabel><h2 className="mt-3 text-xl font-semibold tracking-[-.03em]">{intervention?.recommended_action || analysis.recommended_action?.action || 'No intervention proposed yet'}</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">{intervention?.reason || analysis.recommended_action?.reason || 'Review the recommendation alongside the evidence above. Scheduling records the plan; it never sends a message automatically.'}</p></div>{intervention && <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold capitalize text-amber-700">{intervention.status}</span>}</div>
           {intervention ? <div className="mt-6 rounded-lg border border-border bg-[#fbfaf6] p-4"><div className="grid gap-3 text-xs sm:grid-cols-3"><div><span className="block text-muted-foreground">Owner</span><strong className="mt-1 block">{intervention.owner || claim.assigned_handler || 'Claims team'}</strong></div><div><span className="block text-muted-foreground">Due by</span><strong className="mt-1 block">{formatDate(intervention.due_date)}</strong></div><div><span className="block text-muted-foreground">Urgency</span><strong className="mt-1 block capitalize">{intervention.urgency.replace('_', ' ')}</strong></div></div><label className="mt-5 block text-xs font-semibold">Suggested draft <span className="font-normal text-muted-foreground">— review before sending</span><textarea ref={messageRef} defaultValue={intervention.customer_message || analysis.draft_customer_message || ''} rows={4} className="mt-2 w-full resize-y rounded-md border border-input bg-card p-3 text-xs leading-relaxed outline-none ring-primary focus:ring-2" placeholder="No customer message draft was provided." /></label><div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" disabled={mutation.isPending || intervention.status === 'scheduled'} onClick={() => handleAction('dismissed')} className="rounded-md border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted disabled:opacity-50" data-testid="button-dismiss-intervention">Dismiss</button><button type="button" disabled={mutation.isPending || intervention.status === 'scheduled'} onClick={() => handleAction('scheduled')} className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50" data-testid="button-schedule-intervention">{intervention.status === 'scheduled' ? 'Scheduled' : 'Approve & schedule'}</button></div></div> : <div className="mt-5 rounded-lg border border-dashed border-border p-5 text-sm text-muted-foreground">No open recommendation is associated with this claim.</div>}
        </div>
      </div>
    </div>
  </AppShell>;
}

function DetailStat({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) { return <div className="flex items-start gap-2.5"><Icon size={15} className="mt-0.5 text-muted-foreground" /><div><p className="text-[11px] text-muted-foreground">{label}</p><p className="mt-1 text-xs font-semibold">{value}</p></div></div>; }
function SectionLabel({ children }: { children: React.ReactNode }) { return <div className="mono text-[10px] font-medium uppercase tracking-[.16em] text-muted-foreground">{children}</div>; }
function Timeline({ events, loading }: { events: ClaimEvent[]; loading: boolean }) {
  if (loading) return <div className="mt-4"><InlineSkeleton rows={3} /></div>;
  if (!events.length) return <p className="mt-4 text-sm text-muted-foreground">No timeline events recorded.</p>;
  return <div className="mt-5 space-y-0">{events.map((event, i) => <div className="relative flex gap-4 pb-6 last:pb-0" key={event.id}>
    <div className="flex flex-col items-center"><span className={`z-10 mt-1 grid size-5 place-items-center rounded-full border-2 ${event.risk_delta && event.risk_delta > 0 ? 'border-red-300 bg-red-50' : 'border-border bg-card'}`}><span className="size-1.5 rounded-full bg-primary" /></span>{i < events.length - 1 && <span className="absolute top-6 h-full w-px bg-border" />}</div>
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold">{event.event_title}</p>{event.risk_delta != null && <span className={event.risk_delta > 0 ? 'mono text-[10px] text-red-700' : 'mono text-[10px] text-emerald-700'}>{event.risk_delta > 0 ? '+' : ''}{event.risk_delta} risk</span>}</div><p className="mt-1 text-[11px] text-muted-foreground">{formatDate(event.event_date)} · {event.event_type}</p>{event.event_detail && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{event.event_detail}</p>}</div>
  </div>)}</div>;
}