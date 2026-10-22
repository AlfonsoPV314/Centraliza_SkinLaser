// Informes en prosa SIN IA generativa: textos parametrizados con las medidas calculadas.
import { formatearCLP, formatearNumero, formatearPorcentaje } from "./format"
import type { ResultadoMedidas } from "./stats"

export const MARCADORES = [
  { clave: "periodo", descripcion: "Descripción del período elegido" },
  { clave: "filas", descripcion: "Cantidad de filas del reporte" },
  { clave: "pacientes", descripcion: "Pacientes distintos" },
  { clave: "campo", descripcion: "Nombre del campo analizado" },
  { clave: "conteo", descripcion: "Conteo de valores" },
  { clave: "suma", descripcion: "Suma" },
  { clave: "promedio", descripcion: "Promedio" },
  { clave: "mediana", descripcion: "Mediana" },
  { clave: "moda", descripcion: "Valor más frecuente" },
  { clave: "minimo", descripcion: "Mínimo" },
  { clave: "maximo", descripcion: "Máximo" },
  { clave: "desviacion", descripcion: "Desviación estándar" },
  { clave: "variacion", descripcion: "Variación vs. período anterior (%)" },
] as const

export const TEXTO_PROSA_PREDETERMINADO =
  "En el período ({periodo}) se registraron {filas} filas correspondientes a {pacientes} pacientes. El {campo} promedio fue {promedio}, con una mediana de {mediana}; el valor mínimo fue {minimo} y el máximo {maximo}. Respecto del período anterior de igual duración, la variación fue de {variacion}."

export interface ValoresProsa {
  periodo: string
  filas: number
  pacientes: number
  campo: string
  esMonto: boolean
  medidas: ResultadoMedidas
}

export function redactarProsa(texto: string, v: ValoresProsa): string {
  const num = (x: unknown) => {
    if (x === null || x === undefined) return "sin dato"
    if (typeof x === "string") return x
    return v.esMonto ? formatearCLP(x as number) : formatearNumero(x as number)
  }
  const mapa: Record<string, string> = {
    periodo: v.periodo,
    filas: formatearNumero(v.filas, 0),
    pacientes: formatearNumero(v.pacientes, 0),
    campo: v.campo.toLowerCase(),
    conteo: formatearNumero(v.medidas.conteo as number ?? null, 0),
    variacion:
      v.medidas.variacion === null || v.medidas.variacion === undefined
        ? "sin dato (no hay datos del período anterior)"
        : formatearPorcentaje(v.medidas.variacion as number),
  }
  return texto.replace(/\{(\w+)\}/g, (completo, clave: string) => {
    if (clave in mapa) return mapa[clave]
    if (clave in v.medidas)
      return num(v.medidas[(clave as keyof ResultadoMedidas)])
    return completo
  })
}
