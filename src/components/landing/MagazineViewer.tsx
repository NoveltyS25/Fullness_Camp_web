"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PageFlip } from "page-flip";
import { track } from "@/lib/analytics";

interface Props {
  slug: string;
  title: string;
  pages: string[];
  /** Tamaño de una página, para conservar la proporción. */
  width: number;
  height: number;
  /** Páginas horizontales (diapositivas): se muestra una por una incluso en computador. */
  landscape: boolean;
}

/**
 * Revista tipo «flipbook» que se hojea con el dedo o el mouse, en computador y en celular.
 * Las imágenes y la librería solo se descargan cuando la persona abre la revista: no afectan la velocidad de la página.
 * En computador muestra dos páginas abiertas; en celular, una.
 */
export function MagazineViewer({ slug, title, pages, width, height, landscape }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlip | null>(null);
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !bookRef.current) return;
    let cancelled = false;
    (async () => {
      try {
        const { PageFlip } = await import("page-flip");
        if (cancelled || !bookRef.current) return;
        const baseWidth = landscape ? 640 : 420;
        const baseHeight = Math.round((baseWidth * height) / width);
        const minWidth = landscape ? 700 : 280; // con ancho < 2 × minWidth muestra una sola página
        const flip = new PageFlip(bookRef.current, {
          width: baseWidth,
          height: baseHeight,
          size: "stretch",
          minWidth,
          maxWidth: landscape ? 1100 : 560,
          minHeight: Math.round((minWidth * height) / width),
          maxHeight: 1600,
          showCover: !landscape,
          usePortrait: true,
          mobileScrollSupport: false,
          drawShadow: true,
          maxShadowOpacity: 0.35,
          flippingTime: 650,
        });
        flip.loadFromImages(pages.map((p) => `/revistas/${slug}/${p}`));
        flip.on("flip", (e) => setCurrent(Number(e.data)));
        flipRef.current = flip;
      } catch {
        setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      flipRef.current?.destroy();
      flipRef.current = null;
    };
  }, [open, slug, pages, width, height, landscape]);

  const openBook = () => {
    setFailed(false);
    setCurrent(0);
    dialogRef.current?.showModal();
    setOpen(true);
    track("view_magazine", { item_id: slug });
  };

  return (
    <>
      <button
        type="button"
        onClick={openBook}
        className="group relative block w-full max-w-sm overflow-hidden rounded-3xl bg-white text-left shadow-xl ring-1 ring-clay-soft transition hover:shadow-2xl focus-visible:outline-clay-dark"
        aria-label={`Hojear la revista de ${title}, ${pages.length} páginas`}
      >
        <Image
          src={`/revistas/${slug}/${pages[0]}`}
          alt={`Portada de la revista de ${title}`}
          width={width}
          height={height}
          sizes="(min-width: 640px) 384px, 90vw"
          className="h-auto w-full"
        />
        <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-2 bg-clay-dark/95 px-4 py-4 text-lg font-medium text-white">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5v-15ZM20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5v-15Z" strokeLinejoin="round" />
          </svg>
          Hojear la revista
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={`Revista: ${title}`}
        onClose={() => setOpen(false)}
        onClick={(e) => e.target === dialogRef.current && dialogRef.current?.close()}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") flipRef.current?.flipNext();
          if (e.key === "ArrowLeft") flipRef.current?.flipPrev();
        }}
        className="m-auto h-[100dvh] w-screen max-w-none bg-transparent p-0 backdrop:bg-black/80 sm:h-auto sm:w-[min(1180px,96vw)]"
      >
        <div className="flex h-full flex-col gap-3 bg-white p-3 sm:rounded-3xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-serif text-lg font-bold text-clay-dark sm:text-xl">{title}</p>
            <button type="button" onClick={() => dialogRef.current?.close()} className="btn btn-secondary !min-h-12 !px-5">
              Cerrar
            </button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden sm:h-[72vh] sm:flex-none">
            {failed ? (
              <p className="p-6 text-center text-lg" role="alert">No pudimos abrir la revista. Inténtalo de nuevo.</p>
            ) : (
              <div ref={bookRef} className="h-full w-full" />
            )}
          </div>

          <div className="relative z-10 flex items-center justify-center gap-3">
            <button type="button" onClick={() => flipRef.current?.flipPrev()} className="btn btn-secondary !min-h-12 !px-4 whitespace-nowrap" aria-label="Página anterior">← Atrás</button>
            <span className="min-w-24 text-center text-lg" aria-live="polite">
              {current + 1} / {pages.length}
            </span>
            <button type="button" onClick={() => flipRef.current?.flipNext()} className="btn btn-primary !min-h-12 !px-4 whitespace-nowrap" aria-label="Página siguiente">Siguiente →</button>
          </div>
          <p className="text-center text-sm text-muted">Pasa las páginas deslizando con el dedo o con las flechas del teclado.</p>
        </div>
      </dialog>
    </>
  );
}
