"""
Convierte los PDF de cada certificación en imágenes ligeras para la revista del sitio (public/revistas/<slug>/).

  uv run --with pymupdf --with pillow python scripts/build-magazines.py <carpeta con los PDF>

Qué hace y por qué:
- Excluye las páginas con datos bancarios, precios antiguos o fechas vencidas (EXCLUIR). Las cuentas de banco
  y los nombres de sus titulares NUNCA se publican en la web.
- Si una página mezcla contenido útil con datos de pago, tapa la parte de pago con el color del fondo (TAPAR).
- Guarda WebP (más liviano que JPG) y un manifest.json con el tamaño de página y cuántas hay.

Cuando el equipo actualice un PDF, se vuelve a correr este script y la revista se actualiza sola.
"""
import json
import pathlib
import sys

import pymupdf
from PIL import Image

# slug -> (nombre del PDF, páginas a excluir (1 = primera), páginas a tapar desde un texto hacia abajo)
REVISTAS = {
    "hatha-vinyasa-yoga-y-meditacion": ("Hatha-Vinyasa-Yoga-y-Meditacion_compressed.pdf", [15, 16, 17], {}),
    "certificacion-de-yoga-y-pilates": ("certificacion-de-yoga-y-pilates.pdf", [], {9: "Inversión:"}),
    "certificacion-de-yoga-kids": ("CERTIFICACION-INTERNACIONAL-EN-YOGA-KIDS-2_compressed.pdf", [6], {}),
    "maestria-yogaayurveda-mujer": ("Certificacion-internacional-de-yoga-para-la-mujer-con-enfasis-en-Rasayana-1-2.pdf", [10, 12], {}),
    "inmersion-y-certificacion-de-yoga-en-colombia": ("hata-200-h.pdf", [2, 7], {}),
    "yoga-prenatal-nacimiento-consciente": ("taller-de-yoga-gestacional.pdf", [8], {}),
}

SALIDA = pathlib.Path(__file__).resolve().parent.parent / "public" / "revistas"


def color_de_fondo(img: Image.Image, y: int) -> tuple[int, int, int]:
    """Color típico del fondo en una franja delgada junto al borde izquierdo."""
    y = max(0, min(img.height - 1, y))
    franja = img.crop((2, y, 14, min(img.height, y + 6))).convert("RGB")
    pixeles = list(franja.getdata())
    pixeles.sort()
    return pixeles[len(pixeles) // 2]


def main(origen: pathlib.Path) -> None:
    for slug, (nombre, excluir, tapar) in REVISTAS.items():
        pdf = origen / nombre
        if not pdf.exists():
            print(f"[omitido] {slug}: no está {nombre}")
            continue
        doc = pymupdf.open(pdf)
        ancho_pdf, alto_pdf = doc[0].rect.width, doc[0].rect.height
        horizontal = ancho_pdf > alto_pdf
        ancho_px = 1280 if horizontal else 900

        carpeta = SALIDA / slug
        carpeta.mkdir(parents=True, exist_ok=True)
        for viejo in carpeta.glob("*.webp"):
            viejo.unlink()

        paginas = []
        n = 0
        for numero, pagina in enumerate(doc, start=1):
            if numero in excluir:
                print(f"  {slug}: se excluye la página {numero}")
                continue
            escala = ancho_px / pagina.rect.width
            pix = pagina.get_pixmap(matrix=pymupdf.Matrix(escala, escala))
            img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)

            if numero in tapar:
                aguja = tapar[numero]
                hallazgos = pagina.search_for(aguja)
                if not hallazgos:
                    raise SystemExit(f"{slug} p{numero}: no se encontró «{aguja}» para tapar el bloque de pago")
                y0 = int(min(r.y0 for r in hallazgos) * escala) - 6
                fondo = color_de_fondo(img, y0 - 12)
                img.paste(fondo, (0, y0, img.width, img.height))
                print(f"  {slug}: se tapa la página {numero} desde «{aguja}»")

            n += 1
            nombre_img = f"{n:02d}.webp"
            img.save(carpeta / nombre_img, "WEBP", quality=78, method=6)
            paginas.append(nombre_img)

        manifest = {
            "slug": slug,
            "paginas": paginas,
            "ancho": pix.width,
            "alto": pix.height,
            "horizontal": horizontal,
        }
        (carpeta / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        kb = sum(p.stat().st_size for p in carpeta.glob("*.webp")) // 1024
        print(f"{slug}: {len(paginas)} páginas, {kb} KB, {'horizontal' if horizontal else 'vertical'}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(pathlib.Path(sys.argv[1]))
