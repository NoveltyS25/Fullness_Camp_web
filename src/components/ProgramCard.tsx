import Link from "next/link";
import { isPurchasable, type Program } from "@/data/programs";
import { PAY_IN_FULL_PERCENT, formatCOP } from "@/lib/pricing";

export function ProgramCard({ program }: { program: Program }) {
  const buyable = isPurchasable(program);
  const percent = PAY_IN_FULL_PERCENT[program.category];

  return (
    <article className="flex h-full flex-col rounded-3xl border border-clay-soft bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium">
        {program.hours && <span className="rounded-full bg-clay-soft px-3 py-1 text-clay-dark">{program.hours} horas</span>}
        {!buyable && <span className="rounded-full bg-ink px-3 py-1 text-white">Próximamente</span>}
      </div>

      <h3 className="text-xl font-bold">
        <Link href={`/programas/${program.slug}`} className="no-underline hover:underline">
          {program.title}
        </Link>
      </h3>
      <p className="mt-3 flex-1 text-muted">{program.summary}</p>

      {buyable ? (
        <p className="mt-5">
          <span className="block text-sm text-muted line-through" hidden={percent === 0}>
            {formatCOP(program.priceCOP)}
          </span>
          <span className="text-2xl font-bold text-clay-dark">
            {formatCOP(Math.round(program.priceCOP * (1 - percent / 100)))}
          </span>
          <span className="block text-sm text-muted">
            {percent > 0 ? `pagando completo online (${percent}% de descuento)` : "valor del programa"}
            {program.priceNote ? ` · ${program.priceNote}` : ""}
          </span>
        </p>
      ) : (
        <p className="mt-5 text-muted">Fechas y valor por confirmar.</p>
      )}

      <Link href={`/programas/${program.slug}`} className="btn btn-secondary mt-5">
        {buyable ? "Ver programa" : "Más información"}
      </Link>
    </article>
  );
}
