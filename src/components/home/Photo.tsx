import Image from "next/image";

/** Foto que llena su contenedor (se recorta con object-cover). La forma (arco, círculo, esquinas) la da className. */
export function Photo({
  src,
  alt,
  position,
  className = "",
  sizes,
  priority = false,
}: {
  src: string;
  alt: string;
  position?: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={`relative overflow-hidden bg-clay-soft ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" style={{ objectPosition: position }} />
    </div>
  );
}
