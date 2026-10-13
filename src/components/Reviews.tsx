import type { Testimonial } from "@/data/landing";
import type { GoogleReviewsData } from "@/server/google-reviews";

export const Stars = ({ n }: { n: number }) => (
  <span className="inline-flex gap-0.5 text-clay-dark" role="img" aria-label={`${n} de 5 estrellas`}>
    {Array.from({ length: 5 }, (_, i) => (
      <svg key={i} viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" className={i < Math.round(n) ? "fill-current" : "fill-clay-soft"}>
        <path d="m12 2.8 2.8 5.9 6.4.9-4.6 4.5 1.1 6.4L12 17.4l-5.7 3.1 1.1-6.4L2.8 9.6l6.4-.9L12 2.8Z" />
      </svg>
    ))}
  </span>
);

/**
 * Opiniones reales de Google: las de las sedes (con la clave de Google Places) o, si no hay clave o Google falla,
 * las reseñas reales guardadas del sitio anterior.
 */
export function Reviews({
  id = "opiniones",
  tone = "white",
  title = "Lo que dicen quienes ya estudiaron con nosotras",
  googleReviews,
  fallback,
}: {
  id?: string;
  tone?: "white" | "sand" | "soft";
  title?: string;
  googleReviews: GoogleReviewsData | null;
  fallback?: Testimonial[];
}) {
  if (!googleReviews && !(fallback && fallback.length)) return null;
  const bg = tone === "soft" ? "bg-clay-soft" : tone === "sand" ? "bg-sand" : "bg-white";
  const card = tone === "white" ? "bg-sand" : "bg-white";
  const count = googleReviews ? googleReviews.reviews.length : (fallback?.length ?? 0);
  const cols = count >= 3 && count % 3 === 0 ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2";

  return (
    <section id={id} aria-labelledby={`${id}-t`} className={`${bg} scroll-mt-20 py-14 sm:py-20`}>
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 id={`${id}-t`} className="text-3xl font-bold sm:text-4xl">{title}</h2>
          {!googleReviews && <p className="mt-3 text-lg text-muted">Opiniones reales de nuestra comunidad en Google.</p>}
        </div>

        {googleReviews ? (
          <>
            {googleReviews.rating && (
              <p className="mb-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-lg">
                <Stars n={googleReviews.rating} />
                <span className="text-2xl font-bold text-clay-dark">{googleReviews.rating.toLocaleString("es-CO", { minimumFractionDigits: 1 })}</span>
                <span className="text-muted">· {googleReviews.total.toLocaleString("es-CO")} reseñas en Google Maps</span>
              </p>
            )}
            <div className={`grid gap-6 ${cols}`}>
              {googleReviews.reviews.map((r) => (
                <figure key={`${r.sede}-${r.author}`} className={`flex flex-col rounded-3xl border border-clay-soft ${card} p-7`}>
                  <Stars n={r.rating} />
                  <blockquote className="mt-3 flex-1 text-xl leading-relaxed">«{r.text}»</blockquote>
                  <figcaption className="mt-4 font-medium text-clay-dark">
                    {r.authorUrl ? <a href={r.authorUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">{r.author}</a> : r.author}
                    <span className="font-normal text-muted"> · Sede {r.sede} · Reseña en Google</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <p className="mt-8 flex flex-wrap items-center justify-center gap-3 text-center">
              {googleReviews.places.filter((p) => p.mapsUrl).map((p) => (
                <a key={p.sede} href={p.mapsUrl!} target="_blank" rel="noopener noreferrer" className="btn btn-secondary !min-h-12">Ver reseñas de la sede {p.sede}</a>
              ))}
            </p>
          </>
        ) : (
          <div className={`grid gap-6 ${cols}`}>
            {fallback?.map((t) => (
              <figure key={t.author} className={`flex flex-col rounded-3xl border border-clay-soft ${card} p-7`}>
                <blockquote className="flex-1 text-xl leading-relaxed">«{t.quote}»</blockquote>
                <figcaption className="mt-4 font-medium text-clay-dark">{t.author}</figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
