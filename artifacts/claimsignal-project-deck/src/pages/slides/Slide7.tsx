export default function Slide7() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <h1 className="font-display text-[4.2vw] font-bold tracking-[-0.04em] text-primary">The assessment degrades gracefully</h1>
    <div className="mt-[7vh] grid grid-cols-3 gap-[2vw]">
      <section className="bg-primary p-[2.5vw] text-bg"><p className="font-display text-[5vw] font-bold text-accent">1</p><p className="mt-[2vh] text-[2vw] font-semibold leading-[1.25]">Live AI assessment when validated analysis succeeds</p></section>
      <section className="border border-primary/20 bg-[#e8e3d8] p-[2.5vw]"><p className="font-display text-[5vw] font-bold text-warning">2</p><p className="mt-[2vh] text-[2vw] font-semibold leading-[1.25]">Demo assessment from mock_ai_analysis when live AI fails</p></section>
      <section className="border border-primary/20 bg-[#e8e3d8] p-[2.5vw]"><p className="font-display text-[5vw] font-bold text-muted">3</p><p className="mt-[2vh] text-[2vw] font-semibold leading-[1.25]">Deterministic claim-field assessment when both are unavailable</p></section>
    </div>
    <div className="mt-[5vh] grid grid-cols-2 gap-[3vw] border-t border-primary/25 pt-[3vh]">
      <p className="text-[2vw] leading-[1.35]">No automatic retries; server timeout 12 seconds, client timeout 15 seconds</p>
      <p className="text-[2vw] font-semibold leading-[1.35] text-primary">Only AI Assessment loads—the claim, timeline, risk, and controls stay usable</p>
    </div>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">07 / 09</div>
  </div>;
}