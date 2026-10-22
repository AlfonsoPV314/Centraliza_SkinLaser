// Requisitos de contraseña compartidos por la interfaz y el backend simulado.
export const REQUISITOS_CONTRASENA = [
  { clave: "largo", texto: "Al menos 10 caracteres" },
  { clave: "mayuscula", texto: "Una letra mayúscula" },
  { clave: "minuscula", texto: "Una letra minúscula" },
  { clave: "numero", texto: "Un número" },
  { clave: "simbolo", texto: "Un símbolo (por ejemplo # ! $ -)" },
] as const

export type RequisitoContrasena = typeof REQUISITOS_CONTRASENA[number]["clave"]

export function requisitosContrasena(
  c: string,
): Record<RequisitoContrasena, boolean> {
  return {
    largo: c.length >= 10,
    mayuscula: /[A-ZÁÉÍÓÚÑ]/.test(c),
    minuscula: /[a-záéíóúñ]/.test(c),
    numero: /\d/.test(c),
    simbolo: /[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ]/.test(c),
  }
}

export const contrasenaSegura = (c: string) =>
  Object.values(requisitosContrasena(c)).every(Boolean)
