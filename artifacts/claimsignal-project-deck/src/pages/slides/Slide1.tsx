const base = import.meta.env.BASE_URL;
export default function Slide1() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg font-body text-text">
    <img src={base + 'claimsignal-hero.jpg'} crossOrigin="anonymous" alt="Abstract operational signal architecture" className="absolute inset-y-0 right-0 h-full w-[56vw] object-cover" />
    <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/95 to-bg/5" />
    <div className="absolute left-[6vw] top-[7vh] h-[1.2vh] w-[10vw] bg-accent" />
    <main className="absolute left-[6vw] top-[24vh] w-[55vw]">
      <h1 className="font-display text-[7vw] font-bold leading-[0.95] tracking-[-0.06em] text-primary">ClaimSignal</h1>
      <p className="mt-[5vh] w-[47vw] text-[2.65vw] leading-[1.25] text-text">AI-assisted claims operations, with deterministic risk and human control</p>
      <p className="mt-[2.5vh] text-[2vw] font-semibold uppercase tracking-[0.16em] text-muted">A product and technical overview</p>
    </main>
    <div className="absolute bottom-[6vh] left-[6vw] h-px w-[33vw] bg-primary/25" />
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">01 / 09</div>
  </div>;
}