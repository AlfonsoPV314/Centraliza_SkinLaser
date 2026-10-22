import { limpiarOriginal } from "./text"

export type TipoDocumento = "run" | "pasaporte"

export interface ResultadoDocumento {
  ok: boolean
  tipo: TipoDocumento | null
  normalizado: string | null
  /** Motivo legible cuando ok = false. */
  motivo: "vacio" | "digito_verificador" | "formato" | null
  dvEsperado?: string
}

/** Dígito verificador por módulo 11. */
export function calcularDV(cuerpo: string): string {
  let suma = 0
  let multiplicador = 2
  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplicador
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1
  }
  const resto = 11 - (suma % 11)
  if (resto === 11) return "0"
  if (resto === 10) return "K"
  return String(resto)
}

/** ¿El valor tiene forma de RUN chileno? (7 u 8 dígitos + DV, con o sin puntos y guion). */
export function pareceRun(valor: string): boolean {
  const v = valor.toUpperCase().replace(/\s/g, "")
  if (/^\d{1,2}\.\d{3}\.\d{3}-?[\dK]$/.test(v)) return true
  return /^\d{7,8}-?[\dK]$/.test(v)
}

/**
 * Detecta si el valor es un RUN (y valida su DV) o un pasaporte extranjero.
 * Supuesto: todo valor con forma de RUN se valida como RUN; si su DV falla es un error,
 * salvo que el usuario fuerce explícitamente «es pasaporte».
 */
export function analizarDocumento(
  valor: unknown,
  opciones: { forzarPasaporte?: boolean } = {},
): ResultadoDocumento {
  const limpio = limpiarOriginal(valor)
  if (!limpio)
    return { ok: false, tipo: null, normalizado: null, motivo: "vacio" }

  if (!opciones.forzarPasaporte && pareceRun(limpio)) {
    const compacto = limpio.toUpperCase().replace(/[.\s-]/g, "")
    const cuerpo = compacto.slice(0, -1).replace(/^0+/, "")
    const dv = compacto.slice(-1)
    const esperado = calcularDV(cuerpo)
    if (dv !== esperado) {
      return {
        ok: false,
        tipo: "run",
        normalizado: null,
        motivo: "digito_verificador",
        dvEsperado: esperado,
      }
    }
    return {
      ok: true,
      tipo: "run",
      normalizado: `${cuerpo}-${dv}`,
      motivo: null,
    }
  }

  const pasaporte = limpio.toUpperCase().replace(/[\s.-]/g, "")
  if (/^[A-Z0-9]{5,15}$/.test(pasaporte)) {
    return { ok: true, tipo: "pasaporte", normalizado: pasaporte, motivo: null }
  }
  return { ok: false, tipo: null, normalizado: null, motivo: "formato" }
}

/** 12345678-5 → 12.345.678-5 (solo para mostrar). */
export function formatearRun(normalizado: string): string {
  const [cuerpo, dv] = normalizado.split("-")
  if (!dv) return normalizado
  return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${dv}`
}
