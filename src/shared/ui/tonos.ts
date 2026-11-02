export type Tono = "neutro" | "acento" | "peligro" | "aviso" | "exito" | "info"
export const TONOS: Record<Tono, string> = {
  neutro: "bg-superficie-3 text-suave",
  acento: "bg-acento-tenue text-acento",
  peligro: "bg-peligro-tenue text-peligro",
  aviso: "bg-aviso-tenue text-aviso",
  exito: "bg-exito-tenue text-exito",
  info: "bg-info-tenue text-info",
}
