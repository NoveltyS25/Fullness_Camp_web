"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-primary">
      Imprimir o guardar como PDF
    </button>
  );
}
