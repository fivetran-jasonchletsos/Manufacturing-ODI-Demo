type HeroProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  rightSlot?: React.ReactNode;
};

export default function Hero({ eyebrow, title, subtitle, rightSlot }: HeroProps) {
  return (
    <section className="hero-grid-bg bg-graphite-800 text-white border-b-4 border-safety">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
        <div className="md:col-span-2">
          <div className="anim-fade-in font-mono text-[11px] uppercase tracking-[0.18em] text-safety-bright mb-2">{eyebrow}</div>
          <h1 className="anim-fade-up anim-delay-1 font-display text-3xl sm:text-5xl tracking-wide">{title}</h1>
          {subtitle && <p className="anim-fade-up anim-delay-2 mt-3 text-white/75 leading-relaxed max-w-3xl">{subtitle}</p>}
        </div>
        {rightSlot && <div className="anim-fade-up anim-delay-3 md:justify-self-end">{rightSlot}</div>}
      </div>
    </section>
  );
}
