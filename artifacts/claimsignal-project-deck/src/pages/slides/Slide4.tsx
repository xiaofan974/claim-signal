export default function Slide4() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <h1 className="font-display text-[4.2vw] font-bold tracking-[-0.04em] text-primary">Three claims, three distinct stories</h1>
    <div className="mt-[6vh] grid grid-cols-3 gap-[2vw]">
      <section className="bg-[#f1dfe0] p-[2.5vw]"><p className="text-[1.6vw] font-semibold uppercase tracking-[0.12em] text-danger">Sarah Lim</p><p className="mt-[2vh] font-display text-[4vw] font-bold text-danger">42 → 78</p><p className="text-[2vw] font-semibold text-danger">High</p><p className="mt-[3vh] text-[2vw] leading-[1.35]">repeated contacts, missed callback, stalled assessment</p></section>
      <section className="bg-[#efe4cc] p-[2.5vw]"><p className="text-[1.6vw] font-semibold uppercase tracking-[0.12em] text-warning">James Tan</p><p className="mt-[2vh] font-display text-[4vw] font-bold text-warning">39 → 61</p><p className="text-[2vw] font-semibold text-warning">Medium</p><p className="mt-[3vh] text-[2vw] leading-[1.35]">missed milestone before any customer complaint</p></section>
      <section className="bg-[#dcebe4] p-[2.5vw]"><p className="text-[1.6vw] font-semibold uppercase tracking-[0.12em] text-positive">Mei Chen</p><p className="mt-[2vh] font-display text-[4vw] font-bold text-positive">65 → 32</p><p className="text-[2vw] font-semibold text-positive">Low</p><p className="mt-[3vh] text-[2vw] leading-[1.35]">customer-requested hold and accepted delay</p></section>
    </div>
    <p className="mt-[5vh] text-[2.15vw] font-semibold leading-[1.25] text-primary">The same interface distinguishes escalation, early warning, and mitigating context</p>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">04 / 09</div>
  </div>;
}