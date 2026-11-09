export function PageHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return (
    <div className="mb-7 pt-3">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-2 text-4xl font-black uppercase tracking-[-0.06em]">{title}</h1>
      {description && <p className="mt-3 max-w-md text-sm leading-6 text-[var(--muted)]">{description}</p>}
    </div>
  );
}
