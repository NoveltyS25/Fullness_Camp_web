"use client";

import { useEffect } from "react";

/**
 * Lleva la pantalla al inicio al llegar. Después de enviar un formulario desde el final de una página,
 * la siguiente (gracias, pago) se abriría con el desplazamiento anterior, mostrando el pie de página.
 */
export function ScrollTop() {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  return null;
}
