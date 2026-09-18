import { Link } from 'wouter';
import { ArrowUpRight, Clock3, MessageCircle, UserRound } from 'lucide-react';
import type { Claim } from '@/lib/claimsignal-types';
import { RiskBadge } from '@/components/risk-badge';

export function ClaimRow({ claim, index }: { claim: Claim; index: number }) {
  const score = claim.risk_score ?? 0;
  return <Link href={`/claims/${claim.claim_id}`} className="group relative grid grid-cols-1 gap-4 border-b border-border/70 px-5 py-4 transition-colors hover:bg-[#f7f3e9] sm:grid-cols-[1.1fr_1.2fr_.75fr_.7fr_auto] sm:items-center lg:px-6" data-testid={`row-claim-${claim.claim_id}`}>
    <div className="flex items-start gap-3">
      <span className="mono mt-0.5 w-5 text-[10px] text-muted-foreground/60">{String(index + 1).padStart(2, '0')}</span>
      <div><div className="flex items-center gap-2"><span className="mono text-[12px] font-medium text-primary">{claim.claim_id}</span><RiskBadge level={claim.risk_level} score={score} compact /></div><p className="mt-1 font-semibold">{claim.customer_name || 'Unnamed customer'}</p><p className="mt-0.5 text-xs text-muted-foreground">{claim.claim_type || 'Claim'} · {claim.current_status || 'Open'}</p></div>
    </div>
    <div className="hidden sm:block"><p className="text-[13px] leading-snug">{claim.main_signal || claim.predicted_issue || 'Review claim activity and customer contact history.'}</p><p className="mt-1 text-[11px] text-muted-foreground">Primary signal</p></div>
    <div className="flex items-center gap-4 text-xs text-muted-foreground sm:block"><span className="inline-flex items-center gap-1"><Clock3 size={13} />{claim.days_open ?? '—'}d open</span><span className="ml-3 inline-flex items-center gap-1 sm:ml-0 sm:mt-1"><MessageCircle size={13} />{claim.customer_contact_count ?? 0} contacts</span></div>
    <div className="hidden text-xs text-muted-foreground sm:block"><span className="inline-flex items-center gap-1"><UserRound size={13} />{claim.assigned_handler || 'Unassigned'}</span><span className="mt-1 block text-[11px]">{claim.documents_outstanding ?? 0} docs outstanding</span></div>
    <ArrowUpRight size={17} className="absolute right-5 text-muted-foreground/40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 sm:static" />
  </Link>;
}