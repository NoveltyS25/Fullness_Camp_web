/** Tipos de situación que se pueden reportar. Vive en lib para poder usarse también en componentes de cliente. */
export const KINDS = {
  queja: "Queja sobre una clase, una docente o el programa",
  acoso: "Acoso o conducta inapropiada",
  represalia: "Represalia por una queja o denuncia",
  otra: "Otra situación que viola nuestras políticas",
} as const;

export type ComplaintKind = keyof typeof KINDS;

export const STATUSES = {
  recibida: "Recibida",
  en_revision: "En revisión",
  aceptada: "Aceptada",
  desestimada: "Desestimada",
  cerrada: "Cerrada",
} as const;

export type ComplaintStatus = keyof typeof STATUSES;

/** La política da 30 días hábiles para aceptar o desestimar una queja. */
export const REVIEW_BUSINESS_DAYS = 30;
