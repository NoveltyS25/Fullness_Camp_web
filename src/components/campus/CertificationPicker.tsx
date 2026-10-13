/** Casillas para elegir las certificaciones en las que una docente dicta. Va dentro de un <form>. */
export function CertificationPicker({ options, selected }: { options: { slug: string; title: string }[]; selected: string[] }) {
  return (
    <fieldset className="space-y-3">
      <legend className="mb-2 text-lg font-medium">¿En qué certificaciones eres docente?</legend>
      <input type="hidden" name="programs_present" value="1" />
      {options.map((o) => (
        <label key={o.slug} className="flex items-start gap-3 text-lg">
          <input type="checkbox" name="programs" value={o.slug} defaultChecked={selected.includes(o.slug)} className="mt-1.5 h-5 w-5 shrink-0 accent-[#7a4a45]" />
          <span>{o.title}</span>
        </label>
      ))}
    </fieldset>
  );
}
