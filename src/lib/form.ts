import { startTransition } from "react";

/**
 * Envía el formulario a una acción del servidor SIN que React lo vacíe después.
 * Con `<form action={...}>` React borra todos los campos tras cada envío, incluso si hubo un error
 * ("la contraseña no coincide") y la persona tendría que escribir todo otra vez.
 */
export function submitWith(formAction: (formData: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(() => formAction(formData));
  };
}
