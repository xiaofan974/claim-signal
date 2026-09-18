import { AlertCircle, CheckCircle2, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export function riskTone(level?: string | null) {
  const value = (level ?? '').toLowerCase();
  if (value === 'high' || value === 'critical') return 'high';
  if (value === 'medium' || value === 'moderate') return 'medium';
  return 'low';
}

export function RiskBadge({ level, score, compact = false }: { level?: string | null; score?: number | null; compact?: boolean }) {
  const tone = riskTone(level);
  const Icon = tone === 'high' ? AlertCircle : tone === 'medium' ? CircleAlert : CheckCircle2;
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold capitalize', tone === 'high' ? 'border-red-200 bg-red-50 text-red-700' : tone === 'medium' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700')} data-testid={`status-risk-${tone}`}>
    <Icon size={compact ? 12 : 13} />{level ?? 'Low'}{score != null && <span className="mono font-medium opacity-70">{score}</span>}
  </span>;
}