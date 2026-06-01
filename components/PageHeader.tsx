export default function PageHeader({ kicker, title, subtitle, action }: { kicker?: string; title: string; subtitle?: string; action?: React.ReactNode }) {
  return <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="mb-1 text-xs font-black uppercase tracking-[.18em] text-brand-600">{kicker || 'Eatlyte'}</p><h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h1>{subtitle && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{subtitle}</p>}</div>{action}</div>;
}
