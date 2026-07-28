import { FAQ } from "./content";

export function FaqList() {
  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-mk-border overflow-hidden rounded-2xl border border-mk-border bg-mk-surface/50">
      {FAQ.map((item) => (
        <details key={item.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-mk-fg">
            {item.q}
            <span className="grid size-6 shrink-0 place-items-center rounded-full border border-mk-border text-mk-muted transition-transform duration-200 group-open:rotate-45">
              +
            </span>
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-mk-muted">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
