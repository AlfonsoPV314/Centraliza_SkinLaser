import type { ColumnaCatalogo, TipoCampo } from "@/domain/model"

export const tipoDe = (columnas: ColumnaCatalogo[], campo: string): TipoCampo =>
  columnas.find((c) => c.clave === campo)?.tipo ?? "texto"
