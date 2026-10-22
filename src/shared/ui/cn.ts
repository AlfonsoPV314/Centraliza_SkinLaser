/** Une clases condicionales (ignora valores falsos). */
export const cn = (...clases: unknown[]) =>
  clases
    .filter((c): c is string => typeof c === "string" && c.length > 0)
    .join(" ")
