"use client";

import { useEffect, useState } from "react";

/**
 * Barra fija inferior solo en celular: aparece cuando ya pasaste el inicio y se esconde cuando llegas a la sección
 * de inscripción, para que el botón principal esté siempre al alcance del pulgar sin estorbar.
 *
 * Se calcula con el desplazamiento (no con IntersectionObserver): este último solo avisa cuando un elemento cruza el
 * borde de la pantalla, y si la persona salta de golpe (deslizamiento rápido o enlace ancla) nunca avisaría.
 */
export function StickyCta({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const heroEnd = document.getElementById("hero-fin");
      const target = document.getElementById("inscripcion");
      if (!heroEnd) return;
      const pastHero = heroEnd.getBoundingClientRect().top < 0;
      let atTarget = false;
      if (target) {
        const r = target.getBoundingClientRect();
        atTarget = r.top < window.innerHeight && r.bottom > 0;
      }
      setVisible(pastHero && !atTarget);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-clay-soft bg-white/95 px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-300 md:hidden ${visible ? "translate-y-0" : "translate-y-full"}`}
      aria-hidden={!visible}
      inert={!visible}
    >
      {children}
    </div>
  );
}
