/**
 * Atribución de campañas: guarda de dónde llegó la persona (utm_source, utm_medium, utm_campaign, etc.) la primera vez
 * que entra, para saber qué anuncio o publicación trajo cada inscripción o interesada. Se queda en el navegador
 * (localStorage) hasta que la persona compra o deja sus datos.
 */
const KEY = "fc_attribution";
const FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "fbclid"] as const;

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
  landing?: string;
  at?: string;
}

const clean = (v: string | null) => (v ? v.slice(0, 120) : undefined);

export function captureAttribution(): void {
  try {
    const params = new URLSearchParams(window.location.search);
    const hasCampaign = FIELDS.some((f) => params.get(f));
    const existing = localStorage.getItem(KEY);
    // Una campaña nueva reemplaza a la anterior; sin campaña se conserva lo que ya había.
    if (existing && !hasCampaign) return;

    const a: Attribution = { landing: window.location.pathname, at: new Date().toISOString() };
    for (const f of FIELDS) {
      const v = clean(params.get(f));
      if (v) a[f] = v;
    }
    if (document.referrer) {
      try {
        const ref = new URL(document.referrer);
        if (ref.host !== window.location.host) a.referrer = ref.host;
      } catch {
        /* referrer inválido: se ignora */
      }
    }
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
    /* almacenamiento bloqueado: la compra sigue funcionando sin atribución */
  }
}

/** JSON corto para enviar junto a un formulario. Vacío si no hay nada. */
export function readAttribution(): string {
  try {
    return localStorage.getItem(KEY)?.slice(0, 900) ?? "";
  } catch {
    return "";
  }
}

export function clearAttribution(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nada */
  }
}
