/**
 * Reseñas reales de Google Maps de las sedes de Fullness Camp, con la API oficial de Google Places (New).
 *
 * - Necesita GOOGLE_PLACES_API_KEY (la clave se queda en el servidor, nunca se envía al navegador).
 * - Sin clave, o si Google falla, devuelve null y la página muestra las reseñas guardadas como respaldo.
 * - Se consulta como máximo una vez al día por sede (caché de Next), y el resultado es siempre lo que Google publica
 *   en ese momento: no se inventa, no se edita y se muestra con el nombre de quien escribió y el enlace a Google.
 *
 * Cada sede se identifica por su Place ID (GOOGLE_PLACE_ID_TABIO, _CAJICA, _BOGOTA). Si falta, se busca por nombre y
 * se comprueba que el resultado sea de Fullness Camp antes de usarlo.
 */

export interface SedeConfig {
  sede: string;
  query: string;
  placeId?: string;
}

export interface ReviewItem {
  sede: string;
  author: string;
  authorUrl: string | null;
  rating: number;
  text: string;
  publishedAt: string | null;
}

export interface PlaceSummary {
  sede: string;
  name: string;
  rating: number | null;
  total: number | null;
  mapsUrl: string | null;
}

export interface GoogleReviewsData {
  places: PlaceSummary[];
  reviews: ReviewItem[];
  /** Promedio ponderado de todas las sedes, o null si Google no entregó calificaciones. */
  rating: number | null;
  total: number;
}

type Fetcher = (url: string, init?: RequestInit & { next?: { revalidate: number } }) => Promise<Response>;

const DAY = 24 * 3600;
const MIN_TEXT = 30;
const MAX_REVIEWS = 6;

export function defaultSedes(env: Record<string, string | undefined> = process.env): SedeConfig[] {
  return [
    { sede: "Tabío", query: "Fullness Camp sede Tabio teacher training", placeId: env.GOOGLE_PLACE_ID_TABIO },
    { sede: "Cajicá", query: "Fullness Camp Cajicá yoga", placeId: env.GOOGLE_PLACE_ID_CAJICA },
    { sede: "Bogotá", query: "Fullness Camp Bogotá yoga", placeId: env.GOOGLE_PLACE_ID_BOGOTA },
  ];
}

interface RawReview {
  authorAttribution?: { displayName?: string; uri?: string };
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  publishTime?: string;
}
interface RawPlace {
  id?: string;
  displayName?: { text?: string };
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  reviews?: RawReview[];
}

/** Convierte la respuesta de Google en datos simples. Función pura, probada sin red. */
export function parsePlace(sede: string, raw: RawPlace): { place: PlaceSummary; reviews: ReviewItem[] } {
  const reviews: ReviewItem[] = [];
  for (const r of raw.reviews ?? []) {
    const text = (r.text?.text ?? r.originalText?.text ?? "").trim();
    const rating = Number(r.rating ?? 0);
    const author = r.authorAttribution?.displayName?.trim();
    if (!author || text.length < MIN_TEXT || rating < 4) continue; // reseñas con texto real y de 4 o 5 estrellas
    reviews.push({ sede, author, authorUrl: r.authorAttribution?.uri ?? null, rating, text, publishedAt: r.publishTime ?? null });
  }
  return {
    place: {
      sede,
      name: raw.displayName?.text ?? "Fullness Camp",
      rating: typeof raw.rating === "number" ? raw.rating : null,
      total: typeof raw.userRatingCount === "number" ? raw.userRatingCount : null,
      mapsUrl: raw.googleMapsUri ?? null,
    },
    reviews,
  };
}

export function combine(parts: { place: PlaceSummary; reviews: ReviewItem[] }[]): GoogleReviewsData | null {
  if (parts.length === 0) return null;
  const places = parts.map((p) => p.place);
  const rated = places.filter((p) => p.rating !== null && p.total);
  const total = rated.reduce((s, p) => s + (p.total ?? 0), 0);
  const rating = total ? rated.reduce((s, p) => s + (p.rating ?? 0) * (p.total ?? 0), 0) / total : null;

  // Un máximo de 2 por sede para que se vean todas las sedes, luego las mejores y más recientes.
  const perSede = parts.flatMap((p) =>
    [...p.reviews].sort((a, b) => b.rating - a.rating || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 2),
  );
  const reviews = perSede.sort((a, b) => b.rating - a.rating || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, MAX_REVIEWS);
  if (reviews.length === 0 && !rating) return null;
  return { places, reviews, rating: rating === null ? null : Math.round(rating * 10) / 10, total };
}

export async function fetchGoogleReviews(
  options: { apiKey?: string; sedes?: SedeConfig[]; fetcher?: Fetcher } = {},
): Promise<GoogleReviewsData | null> {
  const apiKey = options.apiKey ?? process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;
  const doFetch: Fetcher = options.fetcher ?? ((url, init) => fetch(url, init));
  const parts: { place: PlaceSummary; reviews: ReviewItem[] }[] = [];

  for (const cfg of options.sedes ?? defaultSedes()) {
    try {
      let placeId = cfg.placeId;
      if (!placeId) {
        const search = await doFetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "places.id,places.displayName" },
          body: JSON.stringify({ textQuery: cfg.query, languageCode: "es", regionCode: "CO" }),
          next: { revalidate: 7 * DAY },
        });
        if (!search.ok) continue;
        const first = ((await search.json()) as { places?: RawPlace[] }).places?.[0];
        // Seguridad: solo se usa si el nombre del lugar es de Fullness Camp.
        if (!first?.id || !/fullness/i.test(first.displayName?.text ?? "")) continue;
        placeId = first.id;
      }

      const res = await doFetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`, {
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "id,displayName,rating,userRatingCount,googleMapsUri,reviews" },
        next: { revalidate: DAY },
      });
      if (!res.ok) continue;
      parts.push(parsePlace(cfg.sede, (await res.json()) as RawPlace));
    } catch {
      /* una sede que falla no tumba a las demás ni a la página */
    }
  }
  return combine(parts);
}
