import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Copy,
  Database,
  FileWarning,
  History,
  RefreshCw,
  Search,
  Trash2,
  Undo2,
  UserRoundPen,
} from "lucide-react"
import {
  avisarCambioDatos,
  campoError,
  mensajeError,
  useCambiosDatos,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import type { DuplicadoPendiente, FilaConError, Importacion } from "@/contracts"
import type {
  ColumnaCatalogo,
  FilaGuardada,
  FilaProcesada,
  Paciente,
  TipoCampo,
} from "@/domain/model"
import { formatearFecha } from "@/domain/dates"
import { formatearCLP } from "@/domain/format"
import { procesarFila, tieneErrores } from "@/domain/rules"
import { useCarga, useRetardo } from "@/shared/hooks"
import { resumenConteos, tiempoRelativo } from "@/shared/presentacion"
import {
  Aviso,
  Boton,
  Campo,
  Casilla,
  Dialogo,
  EncabezadoPagina,
  Entrada,
  Esqueleto,
  Insignia,
  Paginacion,
  Pestanas,
  Tarjeta,
  Vacio,
  cn,
  useNotificar,
} from "@/shared/ui"
import { crudoATexto, etiquetaDe, mostrarValor, tipoDe } from "../valores"

type Pestana = "registros" | "errores" | "duplicados" | "incompletos" | "historial"
const PESTANAS: Pestana[] = [
  "registros",
  "errores",
  "duplicados",
  "incompletos",
  "historial",
]

export default function GestionDatos() {
  const s = useServicios()
  const { token } = useUsuario()
  const [params, setParams] = useSearchParams()
  const pestana = PESTANAS.includes(params.get("pestana") as Pestana)
    ? params.get("pestana") as Pestana
    : "registros"
  const estado = useCarga(() => s.datos.estado(token), [s, token])
  const catalogo = useCarga(() => s.datos.columnas(token), [s, token])
  const refrescar = useCallback(() => estado.recargar(true), [estado.recargar])
  useCambiosDatos(refrescar)
  const e = estado.datos

  return (
    <div className="animar-aparecer">
      <EncabezadoPagina
        titulo="Datos"
        descripcion="Lo que está guardado, lo que falta revisar y el historial de cargas."
      />
      <Pestanas
        className="mb-5"
        valor={pestana}
        alCambiar={(p) =>
          setParams(p === "registros" ? {} : { pestana: p }, { replace: true })
        }
        pestanas={[
          {
            valor: "registros",
            etiqueta: "Registros",
            icono: <Database className="size-4" />,
            contador: e?.filas,
          },
          {
            valor: "errores",
            etiqueta: "Con errores",
            icono: <FileWarning className="size-4" />,
            contador: e?.filasConError,
          },
          {
            valor: "duplicados",
            etiqueta: "Duplicados",
            icono: <Copy className="size-4" />,
            contador: e?.duplicadosPendientes,
          },
          {
            valor: "incompletos",
            etiqueta: "Pacientes incompletos",
            icono: <UserRoundPen className="size-4" />,
            contador: e?.pacientesIncompletos,
          },
          {
            valor: "historial",
            etiqueta: "Historial",
            icono: <History className="size-4" />,
          },
        ]}
      />
      {pestana === "registros" && <Registros catalogo={catalogo.datos} />}
      {pestana === "errores" && <Errores catalogo={catalogo.datos} />}
      {pestana === "duplicados" && <Duplicados catalogo={catalogo.datos} />}
      {pestana === "incompletos" && <Incompletos catalogo={catalogo.datos} />}
      {pestana === "historial" && <Historial />}
    </div>
  )
}

type ConCatalogo = { catalogo: ColumnaCatalogo[] | null }

function CargandoLista() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <Esqueleto key={i} className="h-24" />
      ))}
    </div>
  )
}

function ErrorLista({
  error,
  alReintentar,
}: {
  error: unknown
  alReintentar: () => void
}) {
  return (
    <Tarjeta>
      <Vacio
        titulo="No pudimos cargar esta sección"
        accion={
          <Boton
            icono={<RefreshCw className="size-4" />}
            onClick={alReintentar}
          >
            Reintentar
          </Boton>
        }
      >
        {mensajeError(error)}
      </Vacio>
    </Tarjeta>
  )
}

/* ───────────── Registros ───────────── */

function Registros({ catalogo }: ConCatalogo) {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const [q, setQ] = useState("")
  const [pagina, setPagina] = useState(1)
  const busqueda = useRetardo(q)
  const porPagina = usuario.preferencias.porPagina
  const lista = useCarga(
    () => s.datos.listarFilas(token, busqueda, { pagina, porPagina }),
    [s, token, busqueda, pagina, porPagina],
  )
  const [detalle, setDetalle] = useState<FilaGuardada | null>(null)
  useCambiosDatos(useCallback(() => lista.recargar(true), [lista.recargar]))

  return (
    <>
      <div className="mb-4 max-w-md">
        <Entrada
          prefijo={<Search className="size-4" />}
          placeholder="Buscar por RUN, nombre, prestación o archivo"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPagina(1))}
          aria-label="Buscar registros"
        />
      </div>
      <Tarjeta relleno={false} className="overflow-hidden">
        {lista.cargando && !lista.datos ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <Esqueleto key={i} className="h-10" />
            ))}
          </div>
        ) : lista.error ? (
          <Vacio
            titulo="No pudimos cargar los registros"
            accion={<Boton onClick={() => lista.recargar()}>Reintentar</Boton>}
          >
            {mensajeError(lista.error)}
          </Vacio>
        ) : !lista.datos?.items.length ? (
          <Vacio
            icono={<Database className="size-5" />}
            titulo={
              q ? "Ningún registro coincide" : "Aún no hay datos guardados"
            }
          >
            {q
              ? "Pruebe con otra búsqueda."
              : "Cargue sus planillas de PhilaxMed para empezar."}
          </Vacio>
        ) : (
          <div
            className={cn(
              "overflow-x-auto transition-opacity",
              lista.cargando && "opacity-60",
            )}
          >
            <table className="w-full min-w-[760px] text-left text-[13.5px]">
              <thead className="border-b border-borde bg-superficie-2 text-[12px] text-tenue">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Registro</th>
                  <th className="px-4 py-2.5 font-medium">Paciente</th>
                  <th className="px-4 py-2.5 font-medium">Prestación</th>
                  <th className="px-4 py-2.5 text-right font-medium">Monto</th>
                  <th className="px-4 py-2.5 font-medium">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borde">
                {lista.datos.items.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => setDetalle(f)}
                    className="cursor-pointer transition-colors hover:bg-superficie-2/60"
                  >
                    <td className="num px-4 py-3 whitespace-nowrap">
                      {formatearFecha(f.fechaRegistro) || (
                        <span className="text-tenue">Sin fecha</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">
                        {f.campos.nombre_completo?.o ||
                          [f.campos.nombres?.o, f.campos.apellido_paterno?.o]
                            .filter(Boolean)
                            .join(" ") || (
                            <span className="text-tenue">Sin nombre</span>
                          )}
                      </p>
                      <p className="num text-[12px] text-tenue">
                        {mostrarValor("documento", { o: f.doc, n: f.doc })}
                      </p>
                    </td>
                    <td className="max-w-56 truncate px-4 py-3 text-suave">
                      {f.campos.concepto?.o || "—"}
                    </td>
                    <td className="num px-4 py-3 text-right">
                      {f.monto !== null ? formatearCLP(f.monto) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="max-w-48 truncate text-[12.5px]">
                        {f.archivo}
                      </p>
                      <p className="text-[12px] text-tenue">
                        Fila {f.numero} ·{" "}
                        {f.tipoPlanilla === "pagos" ? "Pagos" : "Pacientes"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
      {lista.datos && (
        <Paginacion
          className="mt-4"
          pagina={pagina}
          total={lista.datos.total}
          porPagina={porPagina}
          alCambiar={setPagina}
        />
      )}

      <Dialogo
        abierto={!!detalle}
        alCerrar={() => setDetalle(null)}
        titulo="Detalle del registro"
        descripcion={
          detalle
            ? `${detalle.archivo} · fila ${detalle.numero} · guardado ${tiempoRelativo(detalle.creadaEn)}`
            : undefined
        }
      >
        {detalle && (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {Object.entries(detalle.campos)
              .filter(([, v]) => v.o)
              .map(([clave, v]) => (
                <div key={clave} className="min-w-0">
                  <dt className="text-[12px] text-tenue">
                    {etiquetaDe(clave, catalogo)}
                  </dt>
                  <dd className="text-[14px] break-words">
                    {mostrarValor(tipoDe(clave, catalogo), v)}
                  </dd>
                </div>
              ))}
          </dl>
        )}
      </Dialogo>
    </>
  )
}

/* ───────────── Filas con error ───────────── */

function Errores({ catalogo }: ConCatalogo) {
  const s = useServicios()
  const { token } = useUsuario()
  const lista = useCarga(() => s.datos.filasConError(token), [s, token])
  const quitar = (id: string) =>
    lista.setDatos((d) => d?.filter((x) => x.id !== id) ?? null)

  if (lista.cargando && !lista.datos) return <CargandoLista />
  if (lista.error)
    return (
      <ErrorLista error={lista.error} alReintentar={() => lista.recargar()} />
    )
  if (!lista.datos?.length)
    return (
      <Tarjeta>
        <Vacio
          icono={<CheckCircle2 className="size-5" />}
          titulo="No hay filas con errores"
        >
          Todas las filas cargadas pasaron las validaciones.
        </Vacio>
      </Tarjeta>
    )
  return (
    <div className="space-y-4">
      <Aviso tono="info">
        Estas filas no se guardaron. Corrija los campos marcados y revíselas
        otra vez, o descártelas si no corresponden.
      </Aviso>
      {lista.datos.map((r) => (
        <FilaError
          key={r.id}
          registro={r}
          catalogo={catalogo}
          alTerminar={() => quitar(r.id)}
        />
      ))}
    </div>
  )
}

function FilaError({
  registro,
  catalogo,
  alTerminar,
}: {
  registro: FilaConError
  catalogo: ColumnaCatalogo[] | null
  alTerminar: () => void
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const notificar = useNotificar()
  const informar = useInformarError()
  const original = registro.fila
  const [fila, setFila] = useState<FilaProcesada>(original)
  const camposEditables = useMemo(
    () => [...new Set(original.problemas.map((p) => p.campo))],
    [original],
  )
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      camposEditables.map((c) => [c, crudoATexto(original.crudos[c])]),
    ),
  )
  const [pasaporte, setPasaporte] = useState(!!original.forzarPasaporte)
  const [ocupado, setOcupado] = useState<"guardar" | "descartar" | null>(null)
  const tiposExtra = useMemo(
    () =>
      Object.fromEntries(
        (catalogo ?? [])
          .filter((c) => c.origen === "extra")
          .map((c) => [c.clave, c.tipo]),
      ) as Record<string, TipoCampo>,
    [catalogo],
  )
  const errores = fila.problemas.filter((p) => p.severidad === "error")
  const advertencias = fila.problemas.filter(
    (p) => p.severidad === "advertencia",
  )
  const problemaDoc = original.problemas.some((p) => p.campo === "documento")

  const revisar = async () => {
    const nueva = procesarFila({ ...original.crudos, ...valores }, {
      uid: original.uid,
      archivo: original.archivo,
      hoja: original.hoja,
      numero: original.numero,
      tipoPlanilla: original.tipoPlanilla,
      tiposExtra,
      forzarPasaporte: pasaporte,
    })
    setFila(nueva)
    if (tieneErrores(nueva)) return
    setOcupado("guardar")
    try {
      const r = await s.datos.corregirFila(token, registro.id, nueva)
      notificar(
        r === "guardada"
          ? { tono: "exito", titulo: "Fila guardada" }
          : {
              tono: "info",
              titulo: "La fila coincide con un registro existente",
              detalle: "Quedó en Duplicados para que decida cuál conservar.",
            },
      )
      avisarCambioDatos()
      alTerminar()
    } catch (e) {
      informar(e, "No se pudo guardar la fila")
      setOcupado(null)
    }
  }

  const descartar = async () => {
    setOcupado("descartar")
    try {
      await s.datos.descartarFilaConError(token, registro.id)
      notificar({ tono: "info", titulo: "Fila descartada" })
      avisarCambioDatos()
      alTerminar()
    } catch (e) {
      informar(e)
      setOcupado(null)
    }
  }

  return (
    <Tarjeta>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14.5px] font-semibold">
            {original.archivo}
          </p>
          <p className="text-[12.5px] text-tenue">
            {original.hoja ? `Hoja «${original.hoja}» · ` : ""}Fila{" "}
            {original.numero} ·{" "}
            {original.tipoPlanilla === "pagos" ? "Pagos" : "Pacientes"} ·{" "}
            {tiempoRelativo(registro.creadaEn)}
          </p>
        </div>
        {errores.length > 0 ? (
          <Insignia tono="peligro">
            {errores.length === 1 ? "1 error" : `${errores.length} errores`}
          </Insignia>
        ) : (
          <Insignia tono="exito">Sin errores</Insignia>
        )}
      </div>
      <ul className="mb-4 space-y-1.5">
        {fila.problemas.map((p, i) => (
          <li key={`${p.regla}-${i}`} className="flex gap-2 text-[13px]">
            <AlertTriangle
              className={cn(
                "mt-0.5 size-3.5 shrink-0",
                p.severidad === "error" ? "text-peligro" : "text-aviso",
              )}
            />
            <span>
              <span className="font-medium">
                {etiquetaDe(p.campo, catalogo)}:
              </span>{" "}
              {p.mensaje}
            </span>
          </li>
        ))}
        {!fila.problemas.length && (
          <li className="text-[13px] text-exito">Todo correcto.</li>
        )}
      </ul>
      <div className="grid gap-3 sm:grid-cols-2">
        {camposEditables.map((c) => (
          <Campo
            key={c}
            etiqueta={etiquetaDe(c, catalogo)}
            htmlFor={`${registro.id}-${c}`}
          >
            <Entrada
              id={`${registro.id}-${c}`}
              value={valores[c] ?? ""}
              onChange={(e) => setValores({ ...valores, [c]: e.target.value })}
              invalido={errores.some((p) => p.campo === c)}
            />
          </Campo>
        ))}
      </div>
      {problemaDoc && (
        <Casilla
          className="mt-3"
          marcada={pasaporte}
          alCambiar={setPasaporte}
          descripcion="Márquelo si el documento no es un RUN chileno."
        >
          Es un pasaporte extranjero
        </Casilla>
      )}
      {advertencias.length > 0 && errores.length === 0 && (
        <p className="mt-3 text-[12.5px] text-tenue">
          Las advertencias no impiden guardar.
        </p>
      )}
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-borde pt-4">
        <Boton
          variante="fantasma"
          icono={<Trash2 className="size-4" />}
          cargando={ocupado === "descartar"}
          disabled={!!ocupado}
          onClick={descartar}
        >
          Descartar fila
        </Boton>
        <Boton
          variante="primario"
          cargando={ocupado === "guardar"}
          disabled={!!ocupado}
          onClick={revisar}
        >
          Revisar y guardar
        </Boton>
      </div>
    </Tarjeta>
  )
}

/* ───────────── Duplicados ───────────── */

function Duplicados({ catalogo }: ConCatalogo) {
  const s = useServicios()
  const { token } = useUsuario()
  const lista = useCarga(() => s.datos.duplicadosPendientes(token), [s, token])
  const quitar = (id: string) =>
    lista.setDatos((d) => d?.filter((x) => x.id !== id) ?? null)

  if (lista.cargando && !lista.datos) return <CargandoLista />
  if (lista.error)
    return (
      <ErrorLista error={lista.error} alReintentar={() => lista.recargar()} />
    )
  if (!lista.datos?.length)
    return (
      <Tarjeta>
        <Vacio
          icono={<CheckCircle2 className="size-5" />}
          titulo="No hay duplicados pendientes"
        >
          Cuando una fila coincida con otra ya guardada y elija decidir después,
          aparecerá aquí.
        </Vacio>
      </Tarjeta>
    )
  return (
    <div className="space-y-4">
      <Aviso tono="info">
        Dos filas son duplicadas cuando tienen el mismo paciente, fecha y hora
        de registro y prestación. Elija cuál conservar.
      </Aviso>
      {lista.datos.map((d) => (
        <TarjetaDuplicado
          key={d.id}
          dup={d}
          catalogo={catalogo}
          alTerminar={() => quitar(d.id)}
        />
      ))}
    </div>
  )
}

function TarjetaDuplicado({
  dup,
  catalogo,
  alTerminar,
}: {
  dup: DuplicadoPendiente
  catalogo: ColumnaCatalogo[] | null
  alTerminar: () => void
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const notificar = useNotificar()
  const informar = useInformarError()
  const [ocupado, setOcupado] = useState<string | null>(null)
  const claves = [
    ...new Set([
      ...Object.keys(dup.existente.campos),
      ...Object.keys(dup.nueva.campos),
    ]),
  ].filter((c) => dup.existente.campos[c]?.o || dup.nueva.campos[c]?.o)
  const distinto = (c: string) =>
    (dup.existente.campos[c]?.n ?? dup.existente.campos[c]?.o ?? "") !==
    (dup.nueva.campos[c]?.n ?? dup.nueva.campos[c]?.o ?? "")
  const diferencias = claves.filter(distinto).length

  const resolver = async (
    accion: "conservar_anterior" | "conservar_nueva" | "guardar_ambas",
  ) => {
    setOcupado(accion)
    try {
      await s.datos.resolverDuplicado(token, dup.id, accion)
      notificar({
        tono: "exito",
        titulo:
          accion === "conservar_anterior"
            ? "Se conservó el registro anterior"
            : accion === "conservar_nueva"
              ? "Se reemplazó por la fila nueva"
              : "Se guardaron ambas filas",
      })
      avisarCambioDatos()
      alTerminar()
    } catch (e) {
      informar(e)
      setOcupado(null)
    }
  }

  return (
    <Tarjeta relleno={false} className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-borde px-5 py-3.5">
        <p className="text-[14px] font-semibold">
          {dup.nueva.campos.nombre_completo?.o ||
            mostrarValor("documento", {
              o: dup.nueva.doc ?? "",
              n: dup.nueva.doc,
            })}{" "}
          <span className="font-normal text-tenue">
            · {formatearFecha(dup.nueva.fechaRegistro)}
          </span>
        </p>
        <Insignia tono={diferencias ? "aviso" : "neutro"}>
          {diferencias
            ? `${diferencias} ${
                diferencias === 1 ? "diferencia" : "diferencias"
              }`
            : "Idénticas"}
        </Insignia>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="bg-superficie-2 text-[12px] text-tenue">
            <tr>
              <th className="w-1/4 px-5 py-2 font-medium">Campo</th>
              <th className="px-5 py-2 font-medium">
                Guardada ·{" "}
                {"archivo" in dup.existente ? dup.existente.archivo : ""}
              </th>
              <th className="px-5 py-2 font-medium">
                Nueva · {dup.nueva.archivo}, fila {dup.nueva.numero}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-borde">
            {claves.map((c) => {
              const t = tipoDe(c, catalogo)
              return (
                <tr key={c} className={cn(distinto(c) && "bg-aviso-tenue/40")}>
                  <td className="px-5 py-2 text-tenue">
                    {etiquetaDe(c, catalogo)}
                  </td>
                  <td className="px-5 py-2">
                    {mostrarValor(t, dup.existente.campos[c]) || (
                      <span className="text-tenue">—</span>
                    )}
                  </td>
                  <td className={cn("px-5 py-2", distinto(c) && "font-medium")}>
                    {mostrarValor(t, dup.nueva.campos[c]) || (
                      <span className="text-tenue">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-end gap-2 border-t border-borde px-5 py-3.5">
        <Boton
          disabled={!!ocupado}
          cargando={ocupado === "guardar_ambas"}
          onClick={() => resolver("guardar_ambas")}
        >
          Guardar ambas
        </Boton>
        <Boton
          disabled={!!ocupado}
          cargando={ocupado === "conservar_anterior"}
          onClick={() => resolver("conservar_anterior")}
        >
          Conservar la guardada
        </Boton>
        <Boton
          variante="primario"
          disabled={!!ocupado}
          cargando={ocupado === "conservar_nueva"}
          onClick={() => resolver("conservar_nueva")}
        >
          Usar la nueva
        </Boton>
      </div>
    </Tarjeta>
  )
}

/* ───────────── Pacientes incompletos ───────────── */

function Incompletos({ catalogo }: ConCatalogo) {
  const s = useServicios()
  const { token } = useUsuario()
  const lista = useCarga(() => s.datos.pacientesIncompletos(token), [s, token])
  const [q, setQ] = useState("")

  if (lista.cargando && !lista.datos) return <CargandoLista />
  if (lista.error)
    return (
      <ErrorLista error={lista.error} alReintentar={() => lista.recargar()} />
    )
  if (!lista.datos?.length)
    return (
      <Tarjeta>
        <Vacio
          icono={<CheckCircle2 className="size-5" />}
          titulo="Todos los pacientes tienen sus datos base completos"
        />
      </Tarjeta>
    )
  const nq = q.trim().toLowerCase()
  const visibles = lista.datos.filter(
    (p) =>
      !nq ||
      `${p.doc} ${p.campos.nombre_completo?.o ?? ""}`
        .toLowerCase()
        .includes(nq),
  )
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13.5px] text-suave">
          {lista.datos.length}{" "}
          {lista.datos.length === 1 ? "paciente tiene" : "pacientes tienen"}{" "}
          datos base vacíos. Complételos para que los reportes sean precisos.
        </p>
        <Entrada
          className="max-w-xs"
          prefijo={<Search className="size-4" />}
          placeholder="Buscar paciente"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar paciente"
        />
      </div>
      <Tarjeta
        relleno={false}
        className="divide-y divide-borde overflow-hidden"
      >
        {visibles.slice(0, 100).map((p) => (
          <FilaPaciente
            key={p.doc}
            paciente={p}
            catalogo={catalogo}
            alGuardar={() => lista.recargar(true)}
          />
        ))}
        {!visibles.length && <Vacio titulo="Ningún paciente coincide" />}
      </Tarjeta>
      {visibles.length > 100 && (
        <p className="text-center text-[12.5px] text-tenue">
          Se muestran los primeros 100. Use la búsqueda para encontrar otros.
        </p>
      )}
    </div>
  )
}

function FilaPaciente({
  paciente,
  catalogo,
  alGuardar,
}: {
  paciente: Paciente & { faltantes: string[] }
  catalogo: ColumnaCatalogo[] | null
  alGuardar: () => void
}) {
  const s = useServicios()
  const { token } = useUsuario()
  const notificar = useNotificar()
  const [abierto, setAbierto] = useState(false)
  const [valores, setValores] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<{
    campo: string | null
    mensaje: string
  } | null>(null)
  const nombre =
    paciente.campos.nombre_completo?.o ||
    [paciente.campos.nombres?.o, paciente.campos.apellido_paterno?.o]
      .filter(Boolean)
      .join(" ")

  const guardar = async () => {
    if (!Object.values(valores).some((v) => v.trim()))
      return setError({ campo: null, mensaje: "Complete al menos un campo." })
    setGuardando(true)
    setError(null)
    try {
      await s.datos.actualizarPaciente(token, paciente.doc, valores)
      notificar({ tono: "exito", titulo: "Paciente actualizado" })
      avisarCambioDatos()
      setAbierto(false)
      setValores({})
      alGuardar()
    } catch (e) {
      setError({ campo: campoError(e), mensaje: mensajeError(e) })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium">
            {nombre || <span className="text-tenue">Sin nombre</span>}
          </p>
          <p className="num text-[12.5px] text-tenue">
            {mostrarValor("documento", { o: paciente.doc, n: paciente.doc })}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {paciente.faltantes.map((f) => (
            <Insignia key={f} tono="aviso">
              {etiquetaDe(f, catalogo)}
            </Insignia>
          ))}
        </div>
        <Boton tamano="sm" onClick={() => setAbierto(!abierto)}>
          {abierto ? "Cerrar" : "Completar"}
        </Boton>
      </div>
      {abierto && (
        <div className="animar-aparecer mt-3 rounded-lg bg-superficie-2 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {paciente.faltantes.map((f) => (
              <Campo
                key={f}
                etiqueta={etiquetaDe(f, catalogo)}
                htmlFor={`${paciente.doc}-${f}`}
                error={error?.campo === f ? error.mensaje : null}
                ayuda={
                  tipoDe(f, catalogo) === "fecha"
                    ? "Día-mes-año, por ejemplo 04-03-1985"
                    : undefined
                }
              >
                <Entrada
                  id={`${paciente.doc}-${f}`}
                  type={f === "email" ? "email" : "text"}
                  value={valores[f] ?? ""}
                  onChange={(e) =>
                    setValores({ ...valores, [f]: e.target.value })
                  }
                  invalido={error?.campo === f}
                />
              </Campo>
            ))}
          </div>
          {error && !error.campo && (
            <p className="mt-2 text-[12.5px] text-peligro">{error.mensaje}</p>
          )}
          <div className="mt-3 flex justify-end">
            <Boton
              variante="primario"
              tamano="sm"
              cargando={guardando}
              onClick={guardar}
            >
              Guardar
            </Boton>
          </div>
        </div>
      )}
    </div>
  )
}

/* ───────────── Historial ───────────── */

function Historial() {
  const s = useServicios()
  const { token } = useUsuario()
  const notificar = useNotificar()
  const informar = useInformarError()
  const lista = useCarga(() => s.ingesta.listar(token, 50), [s, token])
  const [deshaciendo, setDeshaciendo] = useState<Importacion | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const deshacer = async () => {
    if (!deshaciendo) return
    setOcupado(true)
    try {
      await s.ingesta.deshacer(token, deshaciendo.id)
      notificar({
        tono: "exito",
        titulo: "Importación deshecha",
        detalle: "Los datos volvieron a como estaban antes de esa carga.",
      })
      setDeshaciendo(null)
      avisarCambioDatos()
      lista.recargar(true)
    } catch (e) {
      informar(e, "No se pudo deshacer")
    } finally {
      setOcupado(false)
    }
  }

  if (lista.cargando && !lista.datos) return <CargandoLista />
  if (lista.error)
    return (
      <ErrorLista error={lista.error} alReintentar={() => lista.recargar()} />
    )
  if (!lista.datos?.length)
    return (
      <Tarjeta>
        <Vacio
          icono={<History className="size-5" />}
          titulo="Aún no hay cargas"
        >
          Cada vez que confirme una carga de planillas, quedará registrada aquí.
        </Vacio>
      </Tarjeta>
    )
  return (
    <>
      <ol className="relative space-y-3 border-l border-borde pl-5">
        {lista.datos.map((imp) => (
          <li key={imp.id} className="relative">
            <span
              className={cn(
                "absolute top-5 -left-[26px] size-2.5 rounded-full ring-4 ring-fondo",
                imp.estado === "activa" ? "bg-acento" : "bg-borde-fuerte",
              )}
            />
            <Tarjeta className={cn(imp.estado === "deshecha" && "opacity-60")}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-semibold">
                    {imp.archivos.map((a) => a.nombre).join(", ")}
                  </p>
                  <p className="text-[12.5px] text-tenue">
                    {imp.usuario} · {formatearFecha(imp.creadaEn)} (
                    {tiempoRelativo(imp.creadaEn)})
                  </p>
                  <p className="mt-2 text-[13px] text-suave">
                    {resumenConteos(imp.conteos)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {imp.estado === "deshecha" ? (
                    <Insignia>Deshecha</Insignia>
                  ) : (
                    <Insignia tono="exito">Activa</Insignia>
                  )}
                  {imp.estado === "activa" && imp.sePuedeDeshacer && (
                    <Boton
                      tamano="sm"
                      icono={<Undo2 className="size-3.5" />}
                      onClick={() => setDeshaciendo(imp)}
                    >
                      Deshacer
                    </Boton>
                  )}
                </div>
              </div>
            </Tarjeta>
          </li>
        ))}
      </ol>
      <Dialogo
        abierto={!!deshaciendo}
        alCerrar={() => !ocupado && setDeshaciendo(null)}
        ancho="sm"
        titulo="¿Deshacer esta importación?"
        descripcion="Se quitarán las filas que agregó, se restaurarán las que reemplazó y se borrarán sus pendientes de revisión."
        pie={
          <>
            <Boton onClick={() => setDeshaciendo(null)} disabled={ocupado}>
              Cancelar
            </Boton>
            <Boton
              variante="peligro"
              cargando={ocupado}
              icono={<ArrowRight className="size-4" />}
              onClick={deshacer}
            >
              Deshacer
            </Boton>
          </>
        }
      />
    </>
  )
}
