"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

type Params = Parameters<typeof track>[1];

/** Registra un evento de medición una sola vez cuando la página (o la sección) se muestra. */
export function TrackEvent({ event, params }: { event: string; params?: Params }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    track(event, params);
    // Se vuelve a registrar solo si cambia el evento o sus datos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, key]);
  return null;
}
