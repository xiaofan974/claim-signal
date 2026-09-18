export default function Slide5() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <h1 className="font-display text-[4.2vw] font-bold tracking-[-0.04em] text-primary">Live AI explains context—never risk</h1>
    <div className="relative mt-[5vh] flex items-center justify-between gap-[1vw]">
      <section className="w-[18vw] border-t-[0.7vh] border-accent bg-[#e7e8e3] p-[1.5vw] text-center"><p className="font-display text-[2vw] font-bold text-primary">Claim Detail</p></section>
      <div className="flex items-center text-[3vw] text-accent">→</div>
      <section className="w-[18vw] border-t-[0.7vh] border-accent bg-[#e7e8e3] p-[1.5vw] text-center"><p className="font-display text-[2vw] font-bold text-primary">Application server</p></section>
      <div className="flex items-center text-[3vw] text-accent">→</div>
      <section className="w-[18vw] border-t-[0.7vh] border-accent bg-[#e7e8e3] p-[1.5vw] text-center"><p className="font-display text-[2vw] font-bold text-primary">Edge Function</p></section>
      <div className="flex items-center text-[3vw] text-accent">→</div>
      <section className="w-[18vw] border-t-[0.7vh] border-positive bg-primary p-[1.5vw] text-center text-bg"><p className="font-display text-[2vw] font-bold">Validated analysis</p></section>
    </div>
    <div className="mt-[4vh] grid grid-cols-2 gap-x-[5vw] gap-y-[2.4vh]">
      <p className="text-[2vw] leading-[1.3]">Claim Detail sends only claim_id to the application server</p>
      <p className="text-[2vw] leading-[1.3]">The server invokes the deployed Supabase analyze-claim Edge Function</p>
      <p className="text-[2vw] leading-[1.3]">The function re-fetches authoritative claim and event data</p>
      <p className="text-[2vw] leading-[1.3]">Validated analysis returns summary, signals, context adjustments, recommendation, and optional message draft</p>
    </div>
    <p className="mt-[3vh] border-l-[0.6vw] border-danger pl-[2vw] text-[2.1vw] font-semibold text-primary">The browser never calls the Edge Function directly</p>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">05 / 09</div>
  </div>;
}