export default function Slide3() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <h1 className="font-display text-[4.2vw] font-bold tracking-[-0.04em] text-primary">One cockpit from signal to intervention</h1>
    <div className="mt-[8vh] grid grid-cols-4 gap-[1.6vw]">
      <section className="min-h-[37vh] bg-primary p-[2.3vw] text-bg"><p className="font-display text-[3.2vw] font-bold text-accent">01</p><p className="mt-[4vh] text-[2vw] leading-[1.3]">Attention queue prioritizes claims by existing risk data</p></section>
      <section className="min-h-[37vh] border border-primary/25 bg-[#ece7dc] p-[2.3vw]"><p className="font-display text-[3.2vw] font-bold text-accent">02</p><p className="mt-[4vh] text-[2vw] leading-[1.3]">Claim detail shows risk movement, operational evidence, and timeline</p></section>
      <section className="min-h-[37vh] border border-primary/25 bg-[#ece7dc] p-[2.3vw]"><p className="font-display text-[3.2vw] font-bold text-accent">03</p><p className="mt-[4vh] text-[2vw] leading-[1.3]">AI Assessment explains context, signals, and recommended action</p></section>
      <section className="min-h-[37vh] border border-primary/25 bg-[#ece7dc] p-[2.3vw]"><p className="font-display text-[3.2vw] font-bold text-accent">04</p><p className="mt-[4vh] text-[2vw] leading-[1.3]">Claims professionals approve, edit, or dismiss every intervention</p></section>
    </div>
    <p className="mt-[5vh] border-l-[0.6vw] border-positive pl-[2vw] text-[2.2vw] font-semibold text-primary">ClaimSignal never contacts a customer autonomously</p>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">03 / 09</div>
  </div>;
}