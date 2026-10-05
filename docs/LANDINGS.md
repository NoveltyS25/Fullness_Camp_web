# Landing pages de los programas

Cada programa (`/programas/<slug>`) es una landing pensada para recibir tráfico de campañas (Instagram, Meta Ads,
Google Ads, WhatsApp, correo) y también para posicionar en buscadores. Todo el contenido sale de los PDF y de las
páginas del sitio anterior; nada se inventa. Lo que falta está marcado como «por confirmar».

## Estructura (y por qué)

Orden pensado para que quien llega decida con confianza, sin distracciones:

1. **Portada:** promesa clara en el título, precio con descuento, **un solo botón principal** («Inscribirme ahora») y
   tres pruebas de confianza. En celular el botón ya está en la primera pantalla.
2. **Datos rápidos:** duración, modalidad, sedes, retiro.
3. **Para quién es** y qué pasa si no se tiene experiencia (filtra y tranquiliza).
4. **Lo que vas a lograr** (resultados concretos, no adjetivos).
5. **Opiniones reales** de Google (solo reseñas verdaderas del sitio anterior; si un programa no tiene, la sección no aparece).
6. **Temario** en acordeón.
7. **Revista** (flipbook) del programa, en computador y celular.
8. **Docentes** con foto y credenciales (cerca de las afirmaciones de calidad).
9. **Horarios, qué incluye y requisitos para graduarte** (transparencia: menos compras con mala expectativa).
10. **Inscripción:** precio de lista tachado, precio final, ahorro y cómo se paga. O, si el programa aún no abre, **lista de espera**.
11. **Preguntas frecuentes** (resuelven objeciones: experiencia, pago, qué pasa después).
12. **Cierre:** WhatsApp y formulario corto para quien todavía duda.

En celular hay una **barra fija** con el precio y el botón, que aparece al bajar y se esconde al llegar a la inscripción.

## Qué hay detrás

- **Contenido:** [src/data/landing.ts](../src/data/landing.ts) (un bloque por programa). Para cambiar un texto, se edita ahí.
- **Precios y estado** (disponible / próximamente): [src/data/programs.ts](../src/data/programs.ts). Un programa «próximamente»
  cambia solo su inscripción por la lista de espera.
- **Plantilla:** [src/components/landing/ProgramLanding.tsx](../src/components/landing/ProgramLanding.tsx).
- **Programas sin contenido detallado** (`landing.ts` no los trae) usan una ficha sencilla con el mismo formulario.

## Revista (flipbook)

Se genera a partir de los PDF con `scripts/build-magazines.py`:

```
uv run --with pymupdf --with pillow python scripts/build-magazines.py <carpeta con los PDF>
```

- Crea imágenes WebP en `public/revistas/<slug>/` y un `manifest.json` (tamaño y número de páginas).
- **Excluye las páginas con datos bancarios, precios antiguos o fechas vencidas** y tapa lo que quede mezclado.
  Las listas están al inicio del script (`REVISTAS`). **Los números de cuenta y los nombres de sus titulares nunca se
  publican.** Si se actualiza un PDF, se vuelve a correr el script.
- La librería (`page-flip`) y las imágenes solo se descargan cuando la persona pulsa «Hojear la revista»: no afecta la
  velocidad de la página. En computador se ven dos páginas abiertas; en celular, una (se pasan con el dedo).

## Campañas y medición

- **UTM:** si el enlace trae `?utm_source=…&utm_medium=…&utm_campaign=…` (y `gclid` / `fbclid`), se guarda en el navegador
  y queda ligado al **pedido** y a la **persona interesada**. En el campus: *Administración → Personas interesadas*
  (con descarga CSV).
- **Convención sugerida:** `utm_source` = plataforma (`instagram`, `facebook`, `google`, `whatsapp`, `email`),
  `utm_medium` = tipo (`cpc`, `social`, `organic`, `story`), `utm_campaign` = nombre-mes (`hatha300-oct26`).
  Ejemplo: `https://fullnesscampinternacional.com/programas/hatha-vinyasa-yoga-y-meditacion?utm_source=instagram&utm_medium=social&utm_campaign=hatha300-oct26`
- **Coherencia anuncio ↔ página:** el título de la landing debe parecerse a la promesa del anuncio.
- **Eventos** (ya se envían a `window.dataLayer`, listos para Google Tag Manager, GA4 y el píxel de Meta, que se instalan
  después con el consentimiento que corresponda): `view_item`, `add_to_cart` (con la ubicación del botón: portada,
  inscripción, barra fija o cierre), `begin_checkout`, `add_payment_info`, `purchase`, `generate_lead`, `lead_confirmed` y
  `view_magazine`.

## Embudo

1. **Atraer:** anuncio, publicación o búsqueda → landing del programa.
2. **Convencer:** portada, prueba social, docentes, temario, revista.
3. **Convertir:** «Inscribirme ahora» → checkout (nombre, cédula, correo) → pago → correo con el enlace para crear la
   contraseña → campus.
4. **Rescatar:** quien aún duda deja sus datos (formulario corto) o escribe por WhatsApp; recibe un correo de confirmación
   y queda en *Personas interesadas*. Quien visita un programa «próximamente» entra a la lista de espera.
5. **Medir:** qué campaña trae interesadas y cuáles se convierten en inscripciones.

## SEO

Título y descripción propios por programa, canónica, Open Graph, datos estructurados (curso con oferta, ruta de navegación y
preguntas frecuentes) y lista de cursos en `/programas`. Google indica que el marcado de cursos sigue vigente
(documentación actualizada el 8 de septiembre de 2026). Lighthouse en celular sobre el sitio compilado (simulación de red
lenta): rendimiento 91–96, accesibilidad 100, buenas prácticas 100, SEO 100.

## Lo que se recomienda para la siguiente etapa

- **Más reseñas y testimonios en video** (de 30–60 segundos) por programa, con nombre y resultado. Hoy solo se usan reseñas reales de Google.
- **Fechas reales de cada cohorte** y cupos limitados **solo si son verdad**: la urgencia inventada resta confianza.
- **Una página de reembolsos y cancelación** clara, publicada junto a las políticas legales.
- **Pruebas A/B** de un solo cambio por mes (título, foto de la portada, texto del botón), midiendo inscripciones y no solo clics.
