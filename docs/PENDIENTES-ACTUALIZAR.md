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
