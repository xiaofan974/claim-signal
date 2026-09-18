import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';
import { AppShell } from '@/components/app-shell';

export default function NotFound() {
  return <AppShell><div className="grid min-h-[60vh] place-items-center"><div className="max-w-sm text-center"><div className="mx-auto grid size-12 place-items-center rounded-xl bg-[#e8eef4] text-primary"><Compass size={23} /></div><p className="mono mt-5 text-[10px] uppercase tracking-[.18em] text-primary">No signal here</p><h1 className="mt-2 text-2xl font-semibold tracking-[-.03em]">This page is off the map.</h1><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The view you requested does not exist in this workspace.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground" data-testid="link-return-dashboard"><ArrowLeft size={14} /> Return to dashboard</Link></div></div></AppShell>;
}
