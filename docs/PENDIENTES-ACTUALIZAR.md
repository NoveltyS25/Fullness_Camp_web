# Pendientes por actualizar

Todo se edita en [src/data/programs.ts](../src/data/programs.ts) (estado, precio) y
[src/data/coupons.ts](../src/data/coupons.ts) (bonos). Un programa con `status: "proximamente"`
se muestra en el sitio pero no se puede comprar.

## Programas marcados como "Próximamente"

| Programa | Por qué está en próximamente | Precio guardado (COP) | Qué falta |
|---|---|---|---|
| Maestría Internacional en Hatha Vinyasa Yoga & Ayurveda para la mujer (500h) | El PDF tenía fechas vencidas (inicio 5 de abril, fin 10 de julio, de 2021) | 2.500.000 | Nuevas fechas, confirmar precio y descuento |
| Inmersión y Certificación de Yoga en Colombia (200h) | El PDF es de 2023: promo del 25% hasta el 24 de diciembre y graduación en marzo | 2.500.000 | Nuevas fechas, horarios y precio vigente |
| Retiro de Abundancia | PDF de 2023: preinscripción antes del 1 de noviembre y encuentro el viernes 13 | 560.000 | Fecha, lugar, cupos y precio |
| Yoga Retreat – India Espiritual | PDF de 2023 (pagos hasta octubre de 2023), precio en USD | Sin precio | Fechas, precio (el PDF decía 3.500 USD) y política de cancelación vigente |
| Certificación Internacional en Hatha Vinyasa (200h) | No tiene PDF ni precio | Sin precio | Precio, fechas y horarios |
| Certificación de Yoga Kids y Yoga Prenatal | No tiene PDF ni precio | Sin precio | Precio, fechas y horarios |
| Clases presenciales y online | No tiene precio | Sin precio | Definir si se venden en línea (mensualidad, paquete) o solo por asesora |

## Programas disponibles (revisar que sigan vigentes)

| Programa | Precio (COP) | Nota |
|---|---|---|
| Hatha Vinyasa Yoga y Meditación (300h) | 3.500.000 | Falta la fecha de inicio de la próxima cohorte |
| Yoga y Pilates (250h) | 3.800.000 | Falta la fecha de inicio |
| Yoga Kids (200h) | 2.500.000 | El PDF también lo ofrecía en 625 USD. Incluye un kit |
| Taller de yoga gestacional | 800.000 por pareja | Falta fecha y cupos |

## Reglas de pago ya definidas

- Se paga el valor **completo en un solo pago**, con tarjeta. Quien quiera cuotas las pide a su banco.
- Descuento automático por pago único: **15%** certificaciones, **10%** talleres, **retiros sin descuento automático** (solo con cupón). Está en `PAY_IN_FULL_PERCENT` de [src/lib/pricing.ts](../src/lib/pricing.ts).
- Bono promocional genérico `BONO-PROMO` (15%), activo y sin fechas. Por defecto **no se suma** al 15% automático:
  el cliente recibe el mayor de los dos. Para que se sume, se pone `stackable: true`.
- Pago en dólares por equivalencia del valor en pesos, con la tasa de la variable `USD_COP_RATE`.
  Sin tasa configurada, el pago en USD queda desactivado.

## Otros pendientes

- Políticas legales (términos, privacidad, reembolsos y cancelación): las enviará el equipo.
- Nombre legal: hoy es "Fullnes Camp International" en [src/lib/brand.ts](../src/lib/brand.ts); se ajusta con las políticas.
- Confirmar el aval que se mostrará: Yoga Alliance (RYS 200) o "Yoga Inbound Alliance", porque los PDF mencionan ambos.
- Cuenta de Bold: llaves de API y si permite cobrar en USD.

## Landing pages: cosas por confirmar o completar

- **Aval:** el sitio actual y el PDF de 300 h hablan de **Yoga Alliance (RYS 200)**; los PDF de Pilates, Kids, Mujer e Inmersión
  hablan de «Yoga Inbound Alliance / Yoga Inbound School International of India». Las landings usan lo que dice cada PDF o la
  página actual. Hay que confirmar el aval exacto de cada diploma antes de lanzar campañas.
- **Horas de la Maestría para la mujer:** la página actual dice **500 h** y el PDF habla de **200 h** (doble titulación 200 + 200).
  La landing muestra 500 h «por confirmar».
- **Horas del taller prenatal:** la página actual dice «100 horas» y el PDF «9 módulos». La landing usa «9 sesiones».
- **PDF por actualizar** (tienen datos vencidos o bancarios, por eso se excluyeron de la revista):
  Hatha 300 h (págs. de inversión y promo), Kids (inversión), Maestría (fechas 2021 e inversión), Inmersión (fechas de enero
  de 2021 e inversión) y Taller prenatal (inversión). La de Pilates trae el bloque de pago al pie de la pág. 9, que se tapa.
  Cuando haya versiones nuevas sin datos bancarios, se corre `scripts/build-magazines.py`.
- **Teléfono en los PDF:** aparece +57 323 571 8777 (también como Nequi/Daviplata) y la asesora es +57 311 674 1900. Conviene unificar.
- **Fechas de inicio y cupos** de cada cohorte, para mostrarlos en la landing.
- **Testimonios:** hoy solo se usan 3 reseñas reales de Google. Conviene reunir testimonios en video por programa.
- **Docente sin foto:** Nairo Andrés Díaz (Andy EVS) en la landing de Yoga Kids.
- **Reclamo público:** hay una reseña de Google con un reclamo por reembolso. Por eso conviene publicar pronto una política
  clara de cancelación y reembolso (la FAQ por ahora remite a una asesora).
- **GA4 / Tag Manager / píxel de Meta:** instalar con el consentimiento de cookies correspondiente (los eventos ya están listos).
- **Descripción de los retiros** (Abundancia, India) y de las demás páginas: Nosotros, Sedes, Retiros, Talleres y Ashram.
