export default function Slide6() {
  return <div className="relative w-screen h-screen overflow-hidden bg-bg px-[6vw] py-[6vh] font-body text-text">
    <h1 className="font-display text-[4.2vw] font-bold tracking-[-0.04em] text-primary">Deterministic risk remains authoritative</h1>
    <div className="mt-[7vh] grid grid-cols-[34vw_1fr] gap-[6vw] items-center">
      <div className="relative grid h-[52vh] place-items-center bg-primary text-center text-bg">
        <div className="absolute inset-[2vw] border border-bg/25" />
        <div><p className="font-display text-[6.5vw] font-bold leading-none">RISK</p><p className="my-[1vh] text-[3vw] text-warning">≠</p><p className="font-display text-[6.5vw] font-bold leading-none">AI</p></div>
      </div>
      <div className="space-y-[3.2vh]">
        <p className="border-b border-primary/20 pb-[2vh] text-[2vw] leading-[1.3]">AI cannot calculate or overwrite risk_score, previous_risk_score, or risk_level</p>
        <p className="border-b border-primary/20 pb-[2vh] text-[2vw] leading-[1.3]">Strict nested Zod schemas reject malformed or unexpected model fields</p>
        <p className="border-b border-primary/20 pb-[2vh] text-[2vw] leading-[1.3]">Mismatched claim IDs and risk-bearing output are rejected before rendering</p>
        <p className="border-b border-primary/20 pb-[2vh] text-[2vw] leading-[1.3]">No live result writes risk values or approves an intervention</p>
        <p className="text-[2vw] font-semibold leading-[1.3] text-primary">Human review language remains explicit in every assessment</p>
      </div>
    </div>
    <div className="absolute bottom-[5.2vh] right-[4vw] font-display text-[1.5vw] text-primary">06 / 09</div>
  </div>;
}