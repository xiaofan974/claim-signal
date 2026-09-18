const base = import.meta.env.BASE_URL;
export default function Slide9() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg font-body text-text">
    <img src={base + 'claimsignal-hero.jpg'} crossOrigin="anonymous" alt="Abstract operational signal architecture" className="absolute inset-y-0 right-0 h-full w-[43vw] object-cover opacity-90" />
    <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/95 to-primary/20" />
    <main className="absolute left-[6vw] top-[8vh] w-[64vw]">
      <h1 className="w-[63vw] font-display text-[4.6vw] font-bold leading-[1.02] tracking-[-0.045em] text-primary">Decision support, ready for controlled use</h1>
      <div className="mt-[7vh] w-[57vw] space-y-[3vh]">
        <p className="text-[2vw] leading-[1.3]">Live contextual interpretation is integrated end to end</p>
        <p className="text-[2vw] leading-[1.3]">Demo continuity is preserved for failures and timeouts</p>
        <p className="text-[2vw] leading-[1.3]">Existing claim stories and intervention workflows remain intact</p>
        <p className="text-[2vw] leading-[1.3]">Next hardening step: short-lived caching, in-flight deduplication, and route throttling</p>
        <p className="border-l-[0.6vw] border-positive pl-[2vw] text-[2.15vw] font-semibold leading-[1.3] text-primary">A claims professional remains responsible for deciding whether to act</p>
      </div>
    </main>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-bg">09 / 09</div>
  </div>;
}