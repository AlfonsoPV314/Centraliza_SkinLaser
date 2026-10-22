import { useState } from "react"
import { Link, useNavigate } from "react-router"
import {
  Copy,
  FileChartColumn,
  FileSpreadsheet,
  FileText,
  LayoutGrid,
  List,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react"
import {
  campoError,
  mensajeError,
  useInformarError,
  useServicios,
  useUsuario,
} from "@/application"
import type { FiltroPlantillas } from "@/contracts"
import { tipoSalida, type Plantilla } from "@/domain/templates"
import { useCarga, useRetardo } from "@/shared/hooks"
import { tiempoRelativo } from "@/shared/presentacion"
import {
  Boton,
  Dialogo,
  EncabezadoPagina,
  Entrada,
  Esqueleto,
  Insignia,
  Paginacion,
  Segmentado,
  Selector,
  Tarjeta,
  Vacio,
  cn,
  useNotificar,
} from "@/shared/ui"

function IconoFormatos({ p }: { p: Pick<Plantilla, "archivos"> }) {
  const t = tipoSalida(p)
  return (
    <div className="flex gap-1">
      {(t === "excel" || t === "ambos") && (
        <Insignia tono="exito" icono={<FileSpreadsheet className="size-3" />}>
          Excel
        </Insignia>
      )}
      {(t === "pdf" || t === "ambos") && (
        <Insignia tono="peligro" icono={<FileText className="size-3" />}>
          PDF
        </Insignia>
      )}
      {!t && <Insignia>Sin archivos</Insignia>}
    </div>
  )
}

export default function Plantillas() {
  const s = useServicios()
  const { token, usuario } = useUsuario()
  const navegar = useNavigate()
  const notificar = useNotificar()
  const informar = useInformarError()
  const [q, setQ] = useState("")
  const [tipo, setTipo] = useState<FiltroPlantillas["tipo"]>("todos")
  const [orden, setOrden] = useState<FiltroPlantillas["orden"]>("recientes")
  const [pagina, setPagina] = useState(1)
  const [vista, setVista] = useState(usuario.preferencias.vistaPlantillas)
  const [eliminando, setEliminando] = useState<Plantilla | null>(null)
  const [ocupado, setOcupado] = useState<string | null>(null)
  const busqueda = useRetardo(q)
  const porPagina = usuario.preferencias.porPagina
  const lista = useCarga(
    () =>
      s.plantillas.listar(token, {
        q: busqueda,
        tipo,
        campo: null,
        orden,
        pagina,
        porPagina,
      }),
    [s, token, busqueda, tipo, orden, pagina, porPagina],
  )
  const filtrando = !!q || tipo !== "todos"

  const duplicar = async (p: Plantilla) => {
    setOcupado(p.id)
    try {
      const {
        id: _id,
        uso: _uso,
        creadaEn: _c,
        actualizadaEn: _a,
        eliminadaEn: _e,
        ...datos
      } = p
      let nombre = `${p.nombre} (copia)`
      for (let i = 2; i < 20; i++) {
        try {
          const nueva = await s.plantillas.crear(token, { ...datos, nombre })
          notificar({
            tono: "exito",
            titulo: "Plantilla duplicada",
            detalle: `Se creó «${nueva.nombre}».`,
            accion: {
              etiqueta: "Editar",
              alHacer: () => navegar(`/reportes/${nueva.id}/editar`),
            },
          })
          lista.recargar(true)
          return
        } catch (e) {
          if (campoError(e) !== "nombre") throw e
          nombre = `${p.nombre} (copia ${i})`
        }
      }
    } catch (e) {
      informar(e, "No se pudo duplicar")
    } finally {
      setOcupado(null)
    }
  }

  const eliminar = async () => {
    if (!eliminando) return
    const p = eliminando
    setOcupado(p.id)
    try {
      await s.plantillas.eliminar(token, [p.id])
      setEliminando(null)
      lista.recargar(true)
      notificar({
        tono: "info",
        titulo: `Se eliminó «${p.nombre}»`,
        duracion: 8000,
        accion: {
          etiqueta: "Deshacer",
          alHacer: () => void s.plantillas.restaurar(token, [p.id]).then(
              () => lista.recargar(true),
              (e) => informar(e),
            ),
        },
      })
    } catch (e) {
      informar(e, "No se pudo eliminar")
    } finally {
      setOcupado(null)
    }
  }

  const acciones = (p: Plantilla) => (
    <>
      <Boton
        tamano="sm"
        variante="fantasma"
        soloIcono
        aria-label={`Editar «${p.nombre}»`}
        title="Editar"
        icono={<Pencil className="size-3.5" />}
        onClick={() => navegar(`/reportes/${p.id}/editar`)}
      />
      <Boton
        tamano="sm"
        variante="fantasma"
        soloIcono
        aria-label={`Duplicar «${p.nombre}»`}
        title="Duplicar"
        icono={<Copy className="size-3.5" />}
        cargando={ocupado === p.id}
        onClick={() => duplicar(p)}
      />
      <Boton
        tamano="sm"
        variante="fantasma"
        soloIcono
        aria-label={`Eliminar «${p.nombre}»`}
        title="Eliminar"
        icono={<Trash2 className="size-3.5" />}
        onClick={() => setEliminando(p)}
      />
    </>
  )

  const usos = (p: Plantilla) =>
    p.uso.veces
      ? `Usada ${p.uso.veces} ${
          p.uso.veces === 1 ? "vez" : "veces"
        } · última ${tiempoRelativo(p.uso.ultimoUso)}`
      : "Aún no se ha usado"

  return (
    <div className="animar-aparecer">
      <EncabezadoPagina
        titulo="Reportes"
        descripcion="Cada plantilla define qué archivos Excel o PDF se generan y qué contienen. Elija una y genere el reporte del período que necesite."
        acciones={
          <Link to="/reportes/nueva">
            <Boton variante="primario" icono={<Plus className="size-4" />}>
              Nueva plantilla
            </Boton>
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Entrada
          className="w-full max-w-xs"
          prefijo={<Search className="size-4" />}
          placeholder="Buscar plantilla"
          value={q}
          onChange={(e) => (setQ(e.target.value), setPagina(1))}
          aria-label="Buscar plantilla"
        />
        <Segmentado
          etiqueta="Formato"
          valor={tipo}
          alCambiar={(t) => (setTipo(t), setPagina(1))}
          opciones={[
            { valor: "todos", etiqueta: "Todas" },
            { valor: "excel", etiqueta: "Excel" },
            { valor: "pdf", etiqueta: "PDF" },
            { valor: "ambos", etiqueta: "Ambos" },
          ]}
        />
        <div className="ml-auto flex items-center gap-2">
          <Selector
            className="w-44"
            value={orden}
            onChange={(e) =>
              setOrden(e.target.value as FiltroPlantillas["orden"])
            }
            aria-label="Ordenar"
          >
            <option value="recientes">Más recientes</option>
            <option value="mas_usadas">Más usadas</option>
            <option value="nombre">Por nombre</option>
          </Selector>
          <Segmentado
            etiqueta="Vista"
            valor={vista}
            alCambiar={setVista}
            opciones={[
              {
                valor: "tarjetas",
                etiqueta: <LayoutGrid className="size-4" />,
                titulo: "Tarjetas",
              },
              {
                valor: "filas",
                etiqueta: <List className="size-4" />,
                titulo: "Lista",
              },
            ]}
          />
        </div>
      </div>

      {lista.cargando && !lista.datos ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Esqueleto key={i} className="h-44" />
          ))}
        </div>
      ) : lista.error ? (
        <Tarjeta>
          <Vacio
            titulo="No pudimos cargar las plantillas"
            accion={
              <Boton
                icono={<RefreshCw className="size-4" />}
                onClick={() => lista.recargar()}
              >
                Reintentar
              </Boton>
            }
          >
            {mensajeError(lista.error)}
          </Vacio>
        </Tarjeta>
      ) : !lista.datos?.items.length ? (
        <Tarjeta>
          <Vacio
            icono={<FileChartColumn className="size-5" />}
            titulo={
              filtrando ? "Ninguna plantilla coincide" : "Aún no hay plantillas"
            }
            accion={
              filtrando ? (
                <Boton onClick={() => (setQ(""), setTipo("todos"))}>
                  Quitar filtros
                </Boton>
              ) : (
                <Link to="/reportes/nueva">
                  <Boton
                    variante="primario"
                    icono={<Plus className="size-4" />}
                  >
                    Crear la primera
                  </Boton>
                </Link>
              )
            }
          >
            {filtrando
              ? "Pruebe con otra búsqueda o formato."
              : "Una plantilla guarda el diseño de un reporte para generarlo con un clic cada vez."}
          </Vacio>
        </Tarjeta>
      ) : vista === "tarjetas" ? (
        <div
          className={cn(
            "grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
            lista.cargando && "opacity-60",
          )}
        >
          {lista.datos.items.map((p) => (
            <Tarjeta key={p.id} className="group flex flex-col">
              <div className="mb-2 flex items-start justify-between gap-2">
                <IconoFormatos p={p} />
                <div className="-mt-1 -mr-2 flex opacity-70 transition-opacity group-hover:opacity-100">
                  {acciones(p)}
                </div>
              </div>
              <Link
                to={`/reportes/${p.id}/generar`}
                className="text-[15.5px] font-semibold tracking-tight hover:text-acento"
              >
                {p.nombre}
              </Link>
              <p className="mt-1 line-clamp-2 flex-1 text-[13px] text-suave">
                {p.descripcion || "Sin descripción."}
              </p>
              <div className="mt-4 flex items-end justify-between gap-2 border-t border-borde pt-3">
                <p className="text-[12px] text-tenue">
                  {p.archivos.length}{" "}
                  {p.archivos.length === 1 ? "archivo" : "archivos"} · {usos(p)}
                </p>
                <Boton
                  tamano="sm"
                  variante="primario"
                  icono={<Play className="size-3.5" />}
                  onClick={() => navegar(`/reportes/${p.id}/generar`)}
                >
                  Generar
                </Boton>
              </div>
            </Tarjeta>
          ))}
        </div>
      ) : (
        <Tarjeta
          relleno={false}
          className={cn(
            "divide-y divide-borde overflow-hidden transition-opacity",
            lista.cargando && "opacity-60",
          )}
        >
          {lista.datos.items.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-4 px-5 py-3.5"
            >
              <div className="min-w-0 flex-1">
                <Link
                  to={`/reportes/${p.id}/generar`}
                  className="text-[14.5px] font-semibold hover:text-acento"
                >
                  {p.nombre}
                </Link>
                <p className="truncate text-[12.5px] text-tenue">
                  {usos(p)} · editada {tiempoRelativo(p.actualizadaEn)}
                </p>
              </div>
              <IconoFormatos p={p} />
              <div className="flex">{acciones(p)}</div>
              <Boton
                tamano="sm"
                variante="primario"
                icono={<Play className="size-3.5" />}
                onClick={() => navegar(`/reportes/${p.id}/generar`)}
              >
                Generar
              </Boton>
            </div>
          ))}
        </Tarjeta>
      )}
      {lista.datos && (
        <Paginacion
          className="mt-4"
          pagina={lista.datos.pagina}
          total={lista.datos.total}
          porPagina={porPagina}
          alCambiar={setPagina}
        />
      )}

      <Dialogo
        abierto={!!eliminando}
        alCerrar={() => !ocupado && setEliminando(null)}
        ancho="sm"
        titulo={`¿Eliminar «${eliminando?.nombre}»?`}
        descripcion="Los reportes ya generados no se ven afectados. Podrá deshacerlo justo después."
        pie={
          <>
            <Boton onClick={() => setEliminando(null)} disabled={!!ocupado}>
              Cancelar
            </Boton>
            <Boton variante="peligro" cargando={!!ocupado} onClick={eliminar}>
              Eliminar
            </Boton>
          </>
        }
      />
    </div>
  )
}
