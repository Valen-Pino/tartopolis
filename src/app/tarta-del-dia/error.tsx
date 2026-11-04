"use client";

export default function DailyTartError({ reset }: { reset: () => void }) {
  return (
    <section className="pt-3">
      <h1 className="mb-7 text-4xl font-black uppercase tracking-[-0.06em]">La Tarta del Día</h1>
      <div className="card p-6">
        <p role="alert" className="font-bold">No pudimos cargar la tarta.</p>
        <button type="button" onClick={reset} className="primary-button mt-5 w-full">Reintentar</button>
      </div>
    </section>
  );
}
