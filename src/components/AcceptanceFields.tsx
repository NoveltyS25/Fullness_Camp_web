"use client";

import { politica, type PoliticaKey } from "@/data/politicas";

const LABEL: Record<string, string> = {
  contrato: "el contrato de prestación de servicios",
  general: "la política general de matrícula, cancelación y reembolso",
  profesorados: "la política de profesorados y formaciones de larga duración",
  talleres: "la política de talleres cortos",
  retiros: "la política de retiros de fin de semana",
  clases: "la política de clases sueltas y tiqueteras",
  asistencia: "la política de asistencia",
};

const box = "mt-1 h-6 w-6 shrink-0 accent-[#7a4a45]";

/**
 * Casillas de aceptación. Las tres primeras son obligatorias; imagen y novedades son opcionales; el inicio anticipado solo se pide
 * cuando el programa empieza dentro de los 5 días hábiles del retracto. Los textos son provisionales hasta que la abogada los revise.
 */
export function AcceptanceFields({ keys, earlyStart = false, idPrefix = "ac" }: { keys: PoliticaKey[]; earlyStart?: boolean; idPrefix?: string }) {
  return (
    <fieldset className="space-y-4 rounded-3xl border border-clay-soft bg-white p-5">
      <legend className="px-2 text-lg font-bold">Antes de continuar</legend>

      <label className="flex gap-3 text-lg">
        <input type="checkbox" name="accept_core" required className={box} id={`${idPrefix}-core`} />
        <span>
          He leído y acepto{" "}
          {keys.map((k, i) => (
            <span key={k}>
              {i > 0 && (i === keys.length - 1 ? " y " : ", ")}
              <a href={politica(k).href} target="_blank" rel="noopener noreferrer" className="font-medium text-clay-dark underline">{LABEL[k]}</a>
            </span>
          ))}
          .
        </span>
      </label>

      <label className="flex gap-3 text-lg">
        <input type="checkbox" name="accept_data" required className={box} />
        <span>
          Autorizo a Fullness Camp Internacional a tratar mis datos personales (nombre, cédula, correo y celular) para gestionar mi inscripción, mi acceso al campus y
          los avisos de mis clases. <span className="text-muted">(La política de tratamiento de datos personales se publicará antes del lanzamiento.)</span>
        </span>
      </label>

      <label className="flex gap-3 text-lg">
        <input type="checkbox" name="accept_health" required className={box} />
        <span>
          Entiendo que la práctica de yoga implica esfuerzo físico y me comprometo a informar a mis docentes sobre cualquier lesión, condición médica o embarazo.
          <span className="block text-base text-muted">Compartir datos de salud es voluntario; se tratan como datos sensibles.</span>
        </span>
      </label>

      {earlyStart && (
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="accept_early" required className={box} />
          <span>
            Autorizo que el programa empiece antes de que venzan mis 5 días hábiles de retracto y entiendo que, una vez inicie, <strong>pierdo el derecho de retracto</strong>.
          </span>
        </label>
      )}

      <div className="space-y-4 border-t border-clay-soft pt-4">
        <p className="text-base font-medium text-muted">Opcional</p>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="accept_image" className={box} />
          <span>Autorizo el uso de mi imagen (fotos o videos de las actividades) para difusión y promoción de la escuela. Puedo revocarlo cuando quiera.</span>
        </label>
        <label className="flex gap-3 text-lg">
          <input type="checkbox" name="accept_marketing" className={box} />
          <span>Quiero recibir novedades y promociones por correo o WhatsApp.</span>
        </label>
      </div>
    </fieldset>
  );
}
