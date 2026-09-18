import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { Activity, AlertTriangle, BookOpen, ChevronRight, ClipboardCheck, Menu, Search, ShieldCheck, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Attention queue', icon: AlertTriangle },
  { href: '/interventions', label: 'Interventions', icon: ClipboardCheck },
  { href: '/how-it-works', label: 'How it works', icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-[100dvh] bg-background">
      <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-[82px] items-center justify-between border-b border-sidebar-border px-7">
          <Link href="/" className="flex items-center gap-3" data-testid="link-brand">
            <span className="grid size-9 place-items-center rounded-[11px] bg-sidebar-primary text-sidebar-primary-foreground">
              <Activity size={19} strokeWidth={2.4} />
            </span>
            <span>
              <span className="block text-[15px] font-bold tracking-[-.02em]">ClaimSignal</span>
              <span className="mono block text-[9px] uppercase tracking-[.17em] text-sidebar-foreground/50">Operations cockpit</span>
            </span>
          </Link>
          <button type="button" onClick={() => setOpen(false)} className="rounded-md p-1 text-sidebar-foreground/70 lg:hidden" data-testid="button-close-menu" aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="px-4 pt-8">
          <p className="mono mb-3 px-3 text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Workspace</p>
          <nav className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = href === '/' ? location === '/' : location.startsWith(href);
              return <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('group flex min-w-0 items-center gap-3 whitespace-nowrap rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors', active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground')} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>
                <Icon size={17} className={cn('shrink-0', active ? 'text-sidebar-primary' : 'text-sidebar-foreground/45')} />
                <span className="min-w-0 truncate">{label}</span>
                {active && <ChevronRight size={14} className="ml-auto text-sidebar-primary" />}
              </Link>;
            })}
          </nav>
        </div>
        <div className="mt-auto px-5 pb-6">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-4">
            <div className="mb-3 flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400 signal-pulse" /><span className="mono text-[10px] uppercase tracking-[.12em] text-sidebar-foreground/60">System status</span></div>
            <p className="text-[12px] leading-relaxed text-sidebar-foreground/70">Risk model and signal feed are operational.</p>
            <div className="mt-3 flex items-center gap-1.5 text-[10px] text-sidebar-foreground/45"><ShieldCheck size={13} /> Human review required for every action.</div>
          </div>
          <div className="mt-5 flex items-center gap-3 px-2">
            <span className="grid size-8 place-items-center rounded-full bg-sidebar-primary/20 text-[11px] font-bold text-sidebar-primary">JL</span>
            <div><p className="text-xs font-semibold">Jordan Lee</p><p className="text-[10px] text-sidebar-foreground/45">Claims operations</p></div>
          </div>
        </div>
      </aside>
      {open && <button type="button" aria-label="Close navigation" onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" data-testid="button-overlay" />}
      <main className="min-h-[100dvh] min-w-0 lg:pl-[300px]">
        <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-border/80 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <button type="button" className="rounded-md p-2 text-muted-foreground hover:bg-muted lg:hidden" onClick={() => setOpen(true)} data-testid="button-open-menu" aria-label="Open menu"><Menu size={20} /></button>
            <div className="hidden items-center gap-2 text-muted-foreground sm:flex"><Search size={16} /><span className="text-xs">Press <kbd className="mx-1 rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">/</kbd> to search claims</span></div>
            <span className="text-xs text-muted-foreground sm:hidden">Claims operations</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="mono hidden text-[10px] uppercase tracking-[.12em] text-muted-foreground md:inline">Updated just now</span>
            <span className="grid size-8 place-items-center rounded-full border border-border bg-card text-[11px] font-bold text-primary">JL</span>
          </div>
        </header>
        <div className="mx-auto max-w-[1440px] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">{children}</div>
      </main>
    </div>
  );
}