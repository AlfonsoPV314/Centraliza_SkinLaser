import { useEffect, useMemo, useRef, useState, type DragEvent } from "react"
import { Link } from "react-router"
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  FileWarning,
  ListChecks,
  Rows3,
  Upload,
  X,
} from "lucide-react"
import {
  avisarCambioDatos,
  mensajeError,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import type {
  AccionDuplicado,
  Importacion,
  PeticionImportacion,
} from "@/contracts"
import { EXTENSIONES_PERMITIDAS, LIMITE_ARCHIVO_MB } from "@/config/features"
import { claveDuplicado } from "@/domain/duplicates"
import { formatearFecha } from "@/domain/dates"
import type { FilaProcesada } from "@/domain/model"
import { tieneErrores } from "@/domain/rules"
import {
  analizarArchivo,
  olvidarArchivo,
  procesarHoja,
  reanalizarHoja,
  validarArchivo,
} from "@/infrastructure/ingesta/lector"
import { resumenConteos } from "@/shared/presentacion"
import {
  Aviso,
  Boton,
  Dato,
  EncabezadoPagina,
  Insignia,
  Selector,
  Tarjeta,
  cn,
  useNotificar,
} from "@/shared/ui"
import { MapeoHoja, type HojaElegida } from "./MapeoHoja"
import {
  armarPeticion,
  clasificar,
  columnasExtraDe,
  problemasMapeo,
  type Lote,
} from "./preparar"

type Paso = "columnas" | "procesando" | "revisar" | "guardando" | "listo"

const ACCIONES: { valor: AccionDuplicado; etiqueta: string }[] = [
  { valor: "decidir_despues", etiqueta: "Decidir después" },
  { valor: "conservar_anterior", etiqueta: "Conservar la anterior" },
  { valor: "conservar_nueva", etiqueta: "Usar la nueva" },
  { valor: "guardar_ambas", etiqueta: "Guardar ambas" },
]

const PASOS = [
  { id: "columnas", etiqueta: "Archivos y columnas" },
  { id: "revisar", etiqueta: "Revisión" },
  { id: "listo", etiqueta: "Listo" },
] as const

export default function CargarArchivos() {
  const s = useServicios()
  const { token } = useUsuario()
  const informar = useInformarError()
  const notificar = useNotificar()
  const [hojas, setHojas] = useState<HojaElegida[]>([])
  const [leyendo, setLeyendo] = useState<string[]>([])
  const [rechazos, setRechazos] = useState<string[]>([])
  const [paso, setPaso] = useState<Paso>("columnas")
  const [progreso, setProgreso] = useState(0)
  const [lote, setLote] = useState<Lote | null>(null)
  const [archivosLote, setArchivosLote] =
    useState<PeticionImportacion["archivos"]>([])
  const [resultado, setResultado] = useState<Importacion | null>(null)
  const [reanalizando, setReanalizando] = useState<string | null>(null)
  const [arrastrando, setArrastrando] = useState(false)
  const entrada = useRef<HTMLInputElement>(null)

  // Libera la memoria del worker al salir de la pantalla.
  const ids = useRef(new Set<string>())
  useEffect(
    () => () =>
      ids.current.forEach((id) => void olvidarArchivo(id).catch(() => {})),
    [],
  )

  const incluidas = hojas.filter((h) => h.incluir)
  const bloqueos = incluidas.flatMap((h) =>
    problemasMapeo(h.mapeo, h.tipoPlanilla),
  )
  const varias = (archivoId: string) =>
    hojas.filter((h) => h.archivoId === archivoId).length > 1

  const agregar = async (lista: FileList | File[]) => {
    const archivos = [...lista]
    const nuevosRechazos: string[] = []
    const aceptados = archivos.filter((f) => {
      const motivo =
        validarArchivo(f) ??
        (hojas.some((h) => h.archivo === f.name)
          ? `«${f.name}» ya está en la lista.`
          : null)
      if (motivo) nuevosRechazos.push(motivo)
      return !motivo
    })
    setRechazos(nuevosRechazos)
    setLeyendo((l) => [...l, ...aceptados.map((f) => f.name)])
    await Promise.all(
      aceptados.map(async (f) => {
        try {
          const a = await analizarArchivo(f)
          ids.current.add(a.archivoId)
          setHojas((h) => [
            ...h,
            ...a.hojas.map<HojaElegida>((hoja) => ({
              archivoId: a.archivoId,
              archivo: a.nombre,
              analisis: hoja,
              incluir: hoja.totalFilas > 0,
              tipoPlanilla: hoja.tipoPlanilla,
              mapeo: hoja.mapeo,
            })),
          ])
        } catch (e) {
          setRechazos((r) => [...r, `«${f.name}»: ${mensajeError(e)}`])
        } finally {
          setLeyendo((l) => l.filter((n) => n !== f.name))
        }
      }),
    )
  }

  const quitarArchivo = (archivoId: string) => {
    setHojas((h) => h.filter((x) => x.archivoId !== archivoId))
    ids.current.delete(archivoId)
    void olvidarArchivo(archivoId).catch(() => {})
  }

  const cambiarEncabezado = async (h: HojaElegida, fila: number) => {
    const clave = `${h.archivoId}/${h.analisis.nombre}`
    setReanalizando(clave)
    try {
      const analisis = await reanalizarHoja(
        h.archivoId,
        h.analisis.nombre,
        fila,
      )
      setHojas((todas) =>
        todas.map((x) =>
          x === h
            ? {
                ...x,
                analisis,
                mapeo: analisis.mapeo,
                tipoPlanilla: analisis.tipoPlanilla,
              }
            : x,
        ),
      )
    } catch (e) {
      informar(e, "No se pudo releer la hoja")
    } finally {
      setReanalizando(null)
    }
  }

  const procesar = async () => {
    setPaso("procesando")
    setProgreso(0)
    try {
      let filas: FilaProcesada[] = []
      const archivos: PeticionImportacion["archivos"] = []
      for (const [i, h] of incluidas.entries()) {
        const r = await procesarHoja(
          h.archivoId,
          h.analisis.nombre,
          h.analisis.filaEncabezado,
          h.mapeo,
          h.tipoPlanilla,
          (p) => setProgreso((i + p) / incluidas.length),
        )
        filas = filas.concat(r)
        archivos.push({
          nombre: varias(h.archivoId)
            ? `${h.archivo} (${h.analisis.nombre})`
            : h.archivo,
          tipoPlanilla: h.tipoPlanilla,
          filas: r.length,
        })
      }
      if (!filas.length) {
        notificar({
          tono: "peligro",
          titulo: "No se encontraron filas con datos",
          detalle: "Revise la fila de títulos elegida.",
        })
        return setPaso("columnas")
      }
      const claves = [
        ...new Set(
          filas
            .filter((f) => !tieneErrores(f))
            .map(claveDuplicado)
            .filter((k): k is string => !!k),
        ),
      ]
      const guardadas = await s.datos.buscarPorClaves(token, claves)
      setLote(clasificar(filas, guardadas))
      setArchivosLote(archivos)
      setPaso("revisar")
    } catch (e) {
      informar(e, "No se pudieron leer las planillas")
      setPaso("columnas")
    }
  }

  const confirmar = async () => {
    if (!lote) return
    setPaso("guardando")
    try {
      const imp = await s.ingesta.confirmar(
        token,
        armarPeticion(
          lote,
          archivosLote,
          columnasExtraDe(incluidas.map((h) => h.mapeo)),
        ),
      )
      setResultado(imp)
      setPaso("listo")
      avisarCambioDatos()
    } catch (e) {
      informar(e, "No se pudo guardar la importación")
      setPaso("revisar")
    }
  }

  const reiniciar = () => {
    new Set(hojas.map((h) => h.archivoId)).forEach(quitarArchivo)
    setHojas([])
    setLote(null)
    setResultado(null)
    setRechazos([])
    setPaso("columnas")
  }

  const soltar = (e: DragEvent) => {
    e.preventDefault()
    setArrastrando(false)
    if (e.dataTransfer.files.length) void agregar(e.dataTransfer.files)
  }

  const indicePaso =
    paso === "listo" ? 2 : paso === "revisar" || paso === "guardando" ? 1 : 0

  return (
    <div className="animar-aparecer mx-auto max-w-5xl">
      <EncabezadoPagina
        titulo="Cargar planillas"
        descripcion="Importe las planillas exportadas desde PhilaxMed. Nada se guarda hasta que confirme."
      />

      <ol
        className="mb-6 flex items-center gap-2 text-[13px]"
        aria-label="Pasos"
      >
        {PASOS.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2">
            {i > 0 && (
              <span
                className={cn(
                  "h-px w-6 sm:w-10",
                  i <= indicePaso ? "bg-acento" : "bg-borde",
                )}
              />
            )}
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[12px] font-semibold",
                i < indicePaso
                  ? "bg-acento text-sobre-acento"
                  : i === indicePaso
                    ? "bg-acento-tenue text-acento ring-1 ring-acento"
                    : "bg-superficie-3 text-tenue",
              )}
            >
              {i < indicePaso ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                i === indicePaso ? "font-medium text-texto" : "text-tenue",
                "hidden sm:inline",
              )}
              aria-current={i === indicePaso ? "step" : undefined}
            >
              {p.etiqueta}
            </span>
          </li>
        ))}
      </ol>

      {(paso === "columnas" || paso === "procesando") && (
        <div className="space-y-4">
          <div
            onDragOver={(e) => (e.preventDefault(), setArrastrando(true))}
            onDragLeave={() => setArrastrando(false)}
            onDrop={soltar}
            className={cn(
              "rounded-2xl border-2 border-dashed px-6 transition-colors",
              hojas.length ? "py-5" : "py-14",
              arrastrando
                ? "border-acento bg-acento-tenue"
                : "border-borde-fuerte bg-superficie",
            )}
          >
            <div
              className={cn(
                "flex items-center gap-4",
                hojas.length ? "flex-row" : "flex-col text-center",
              )}
            >
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-2xl bg-acento-tenue text-acento",
                  hojas.length ? "size-10" : "size-14",
                )}
              >
                <Upload className={hojas.length ? "size-5" : "size-6"} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold">
                  {hojas.length
                    ? "¿Más planillas?"
                    : "Arrastre aquí sus planillas"}
                </p>
                <p className="text-[13px] text-tenue">
                  {EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(", ")} ·
                  hasta {LIMITE_ARCHIVO_MB} MB cada una · puede elegir varias
                </p>
              </div>
              <Boton
                variante={hojas.length ? "secundario" : "primario"}
                onClick={() => entrada.current?.click()}
                disabled={paso === "procesando"}
              >
                Elegir archivos
              </Boton>
              <input
                ref={entrada}
                type="file"
                multiple
                hidden
                accept={EXTENSIONES_PERMITIDAS.map((e) => `.${e}`).join(",")}
                onChange={(e) => {
                  if (e.target.files) void agregar(e.target.files)
                  e.target.value = ""
                }}
              />
            </div>
          </div>

          {rechazos.length > 0 && (
            <Aviso
              tono="peligro"
              titulo={
                rechazos.length === 1
                  ? "Un archivo no se pudo agregar"
                  : `${rechazos.length} archivos no se pudieron agregar`
              }
            >
              <ul className="mt-1 space-y-0.5">
                {rechazos.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </Aviso>
          )}

          {leyendo.map((n) => (
            <Tarjeta key={n} className="flex items-center gap-3">
              <span className="size-4 animate-spin rounded-full border-2 border-acento border-t-transparent" />
              <span className="text-[13.5px]">Leyendo «{n}»…</span>
            </Tarjeta>
          ))}

          {[...new Set(hojas.map((h) => h.archivoId))].map((id) => (
            <div key={id} className="relative space-y-3">
              {hojas
                .filter((h) => h.archivoId === id)
                .map((h) => (
                  <MapeoHoja
                    key={`${id}/${h.analisis.nombre}`}
                    hoja={h}
                    varias={varias(id)}
                    ocupada={
                      reanalizando === `${id}/${h.analisis.nombre}` ||
                      paso === "procesando"
                    }
                    alCambiar={(n) =>
                      setHojas((todas) => todas.map((x) => (x === h ? n : x)))
                    }
                    alCambiarEncabezado={(f) => cambiarEncabezado(h, f)}
                  />
                ))}
              {paso === "columnas" && (
                <button
                  type="button"
                  onClick={() => quitarArchivo(id)}
                  className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border border-borde bg-superficie text-tenue shadow-sm hover:text-peligro"
                  aria-label={`Quitar ${hojas.find((h) => h.archivoId === id)?.archivo}`}
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          ))}

          {hojas.length > 0 && (
            <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-borde bg-superficie/95 px-5 py-3.5 shadow-lg backdrop-blur">
              {paso === "procesando" ? (
                <div className="flex-1">
                  <p className="mb-1.5 text-[13px]">
                    Leyendo y validando filas… {Math.round(progreso * 100)}%
                  </p>
                  <div className="h-1.5 overflow-hidden rounded-full bg-superficie-3">
                    <div
                      className="h-full rounded-full bg-acento transition-[width]"
                      style={{ width: `${Math.max(4, progreso * 100)}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-[13px] text-suave">
                    {incluidas.length
                      ? `${incluidas.length} ${
                          incluidas.length === 1 ? "hoja" : "hojas"
                        } · ${incluidas.reduce((n, h) => n + h.analisis.totalFilas, 0).toLocaleString("es-CL")} filas`
                      : "Marque al menos una hoja para importar."}
                    {bloqueos.length > 0 && (
                      <span className="text-peligro">
                        {" "}
                        · Corrija las columnas marcadas
                      </span>
                    )}
                  </p>
                  <Boton
                    variante="primario"
                    disabled={
                      !incluidas.length ||
                      bloqueos.length > 0 ||
                      leyendo.length > 0
                    }
                    onClick={procesar}
                  >
                    Revisar filas
                  </Boton>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {(paso === "revisar" || paso === "guardando") && lote && (
        <Revision
          lote={lote}
          setLote={setLote}
          archivos={archivosLote}
          guardando={paso === "guardando"}
          alVolver={() => setPaso("columnas")}
          alConfirmar={confirmar}
        />
      )}

      {paso === "listo" && resultado && (
        <Listo imp={resultado} alReiniciar={reiniciar} />
      )}
    </div>
  )
}

function Revision({
  lote,
  setLote,
  archivos,
  guardando,
  alVolver,
  alConfirmar,
}: {
  lote: Lote
  setLote: (l: Lote) => void
  archivos: PeticionImportacion["archivos"]
  guardando: boolean
  alVolver: () => void
  alConfirmar: () => void
}) {
  const [verTodos, setVerTodos] = useState(false)
  const total = lote.validas.length + lote.conError.length
  const listas = lote.validas.length - lote.duplicados.length
  const conAdvertencia = lote.validas.filter(
    (f) => f.problemas.length > 0,
  ).length
  const porRegla = useMemo(() => {
    const m = new Map<string, { mensaje: string; n: number }>()
    for (const f of lote.conError)
      for (const p of f.problemas)
        if (p.severidad === "error")
          m.set(p.regla, {
            mensaje: m.get(p.regla)?.mensaje ?? p.mensaje,
            n: (m.get(p.regla)?.n ?? 0) + 1,
          })
    return [...m].sort((a, b) => b[1].n - a[1].n)
  }, [lote.conError])
  const visibles = verTodos ? lote.duplicados : lote.duplicados.slice(0, 20)
  const fijarTodas = (accion: AccionDuplicado) =>
    setLote({
      ...lote,
      duplicados: lote.duplicados.map((d) => ({ ...d, accion })),
    })
  const fijarUna = (i: number, accion: AccionDuplicado) =>
    setLote({
      ...lote,
      duplicados: lote.duplicados.map((d, j) =>
        j === i ? { ...d, accion } : d,
      ),
    })
  const nombreFila = (f: FilaProcesada) =>
    f.campos.nombre_completo?.o || f.doc || `Fila ${f.numero}`

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Dato
          etiqueta="Filas leídas"
          valor={total.toLocaleString("es-CL")}
          detalle={`${archivos.length} ${
            archivos.length === 1 ? "hoja" : "hojas"
          }`}
          icono={<Rows3 className="size-4" />}
        />
        <Dato
          etiqueta="Listas para guardar"
          valor={listas.toLocaleString("es-CL")}
          detalle={
            conAdvertencia
              ? `${conAdvertencia} con advertencias menores`
              : "Sin observaciones"
          }
          tono="exito"
          icono={<CheckCircle2 className="size-4" />}
        />
        <Dato
          etiqueta="Con errores"
          valor={lote.conError.length.toLocaleString("es-CL")}
          detalle="Quedan para corregir"
          tono={lote.conError.length ? "peligro" : undefined}
          icono={<FileWarning className="size-4" />}
        />
        <Dato
          etiqueta="Posibles duplicados"
          valor={lote.duplicados.length.toLocaleString("es-CL")}
          detalle="Decida abajo"
          tono={lote.duplicados.length ? "aviso" : undefined}
          icono={<Copy className="size-4" />}
        />
      </div>

      {lote.conError.length > 0 && (
        <Tarjeta>
          <p className="mb-1 text-[14.5px] font-semibold">Filas con errores</p>
          <p className="mb-3 text-[13px] text-tenue">
            No se guardarán ahora; quedarán en Datos › Con errores para que las
            corrija una por una.
          </p>
          <ul className="divide-y divide-borde text-[13px]">
            {porRegla.slice(0, 6).map(([regla, r]) => (
              <li
                key={regla}
                className="flex items-start justify-between gap-4 py-2"
              >
                <span className="text-suave">{r.mensaje}</span>
                <Insignia tono="peligro">{r.n}</Insignia>
              </li>
            ))}
          </ul>
        </Tarjeta>
      )}

      {lote.duplicados.length > 0 && (
        <Tarjeta relleno={false} className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="text-[14.5px] font-semibold">Posibles duplicados</p>
              <p className="text-[13px] text-tenue">
                Mismo paciente y misma fecha y hora de registro que otra fila.
              </p>
            </div>
            <label className="flex items-center gap-2 text-[13px] text-tenue">
              Para todos
              <Selector
                tamano="sm"
                className="w-48"
                value=""
                onChange={(e) =>
                  e.target.value &&
                  fijarTodas(e.target.value as AccionDuplicado)
                }
                aria-label="Aplicar a todos los duplicados"
              >
                <option value="">Elegir…</option>
                {ACCIONES.map((a) => (
                  <option key={a.valor} value={a.valor}>
                    {a.etiqueta}
                  </option>
                ))}
              </Selector>
            </label>
          </div>
          <ul className="divide-y divide-borde border-t border-borde">
            {visibles.map((d, i) => {
              const nueva = lote.validas[d.indice]
              return (
                <li
                  key={nueva.uid}
                  className="flex flex-wrap items-center gap-3 px-5 py-3 text-[13px]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {nombreFila(nueva)}{" "}
                      <span className="font-normal text-tenue">
                        · {formatearFecha(nueva.fechaRegistro)}
                      </span>
                    </p>
                    <p className="text-[12.5px] text-tenue">
                      {nueva.archivo}, fila {nueva.numero} ·{" "}
                      {d.contra.origen === "guardado"
                        ? `coincide con un registro guardado (${d.contra.fila.archivo})`
                        : `repite la fila ${lote.validas[d.contra.indice].numero} de ${lote.validas[d.contra.indice].archivo}`}
                    </p>
                  </div>
                  <Selector
                    tamano="sm"
                    className="w-48"
                    value={d.accion}
                    onChange={(e) =>
                      fijarUna(i, e.target.value as AccionDuplicado)
                    }
                    aria-label="Qué hacer con este duplicado"
                  >
                    {ACCIONES.map((a) => (
                      <option key={a.valor} value={a.valor}>
                        {a.etiqueta}
                      </option>
                    ))}
                  </Selector>
                </li>
              )
            })}
          </ul>
          {lote.duplicados.length > 20 && (
            <div className="border-t border-borde px-5 py-2.5 text-center">
              <Boton
                variante="enlace"
                tamano="sm"
                onClick={() => setVerTodos(!verTodos)}
              >
                {verTodos
                  ? "Mostrar menos"
                  : `Ver los ${lote.duplicados.length}`}
              </Boton>
            </div>
          )}
        </Tarjeta>
      )}

      {listas === 0 && lote.duplicados.length === 0 && (
        <Aviso tono="aviso">
          Ninguna fila está lista para guardar. Si confirma, todas quedarán
          pendientes de corrección.
        </Aviso>
      )}

      <div className="flex flex-wrap justify-between gap-2">
        <Boton
          icono={<ArrowLeft className="size-4" />}
          onClick={alVolver}
          disabled={guardando}
        >
          Volver a las columnas
        </Boton>
        <Boton
          variante="primario"
          icono={<ListChecks className="size-4" />}
          cargando={guardando}
          onClick={alConfirmar}
        >
          Confirmar importación
        </Boton>
      </div>
    </div>
  )
}

function Listo({
  imp,
  alReiniciar,
}: {
  imp: Importacion
  alReiniciar: () => void
}) {
  const c = imp.conteos
  return (
    <Tarjeta className="animar-aparecer mx-auto max-w-xl py-10 text-center">
      <span className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-exito-tenue text-exito">
        <CheckCircle2 className="size-7" />
      </span>
      <h2 className="text-[20px] font-semibold tracking-tight">
        Importación guardada
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] text-suave">
        {resumenConteos(c)}.
      </p>
      <p className="mt-1 text-[12.5px] text-tenue">
        Si algo salió mal, puede deshacerla desde Datos › Historial.
      </p>
      {(c.conError > 0 || c.pendientes > 0) && (
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {c.conError > 0 && (
            <Link to="/datos?pestana=errores">
              <Insignia tono="peligro">
                Corregir {c.conError} con error
              </Insignia>
            </Link>
          )}
          {c.pendientes > 0 && (
            <Link to="/datos?pestana=duplicados">
              <Insignia tono="aviso">
                Revisar {c.pendientes} duplicados
              </Insignia>
            </Link>
          )}
        </div>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <Boton onClick={alReiniciar}>Cargar otras planillas</Boton>
        <Link to="/reportes">
          <Boton variante="primario">Generar un reporte</Boton>
        </Link>
      </div>
    </Tarjeta>
  )
}
