export default function Slide2() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <div className="absolute right-0 top-0 h-full w-[1.2vw] bg-danger" />
    <h1 className="w-[78vw] font-display text-[4.25vw] font-bold leading-[1.02] tracking-[-0.04em] text-primary">Claims teams need earlier, clearer signals</h1>
    <div className="mt-[7vh] grid grid-cols-2 gap-x-[4vw] gap-y-[4vh]">
      <section className="border-t-[0.45vh] border-danger pt-[2.2vh]"><p className="text-[2.05vw] leading-[1.28]">Operational delays can become customer escalations before teams act</p></section>
      <section className="border-t-[0.45vh] border-warning pt-[2.2vh]"><p className="text-[2.05vw] leading-[1.28]">Raw events do not explain what changed or why it matters</p></section>
      <section className="border-t-[0.45vh] border-muted/40 pt-[2.2vh]"><p className="text-[2.05vw] leading-[1.28]">Automation without evidence or review creates new operational risk</p></section>
      <section className="border-t-[0.45vh] border-positive pt-[2.2vh]"><p className="text-[2.05vw] font-semibold leading-[1.28] text-primary">ClaimSignal turns claim activity into reviewable, preventative action</p></section>
    </div>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">02 / 09</div>
  </div>;
}