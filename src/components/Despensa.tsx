"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Item { id: string; nombre: string; costo: number; comprado: boolean; compradoAt?: string | null; }
interface DiaGrupo { fecha: string; total: number; items: Item[]; }

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const hoyISO = () => new Date().toISOString().slice(0, 10);
const haceDiasISO = (d: number) => new Date(Date.now() - d * 86400000).toISOString().slice(0, 10);

// "2026-10-05" -> "5 oct 2026"
function fechaBonita(iso: string): string {
  if (iso === "sin-fecha") return "Sin fecha";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

export function Despensa() {
  const router = useRouter();
  const [pendientes, setPendientes] = useState<Item[]>([]);
  const [porDia, setPorDia] = useState<DiaGrupo[]>([]);
  const [totalRango, setTotalRango] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verComprados, setVerComprados] = useState(false);

  // rango de fechas: por defecto, este mes
  const [desde, setDesde] = useState(() => hoyISO().slice(0, 8) + "01");
  const [hasta, setHasta] = useState(hoyISO());

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [comprando, setComprando] = useState<string | null>(null);
  const [costoInput, setCostoInput] = useState("");

  const cargar = useCallback(async () => {
    const params = new URLSearchParams({ desde, hasta });
    const res = await fetch(`/api/despensa?${params}`);
    if (res.status === 401) { router.push("/login"); return; }
    if (res.ok) {
      const data = await res.json();
      setPendientes(data.pendientes);
      setPorDia(data.porDia);
      setTotalRango(data.totalRango);
    }
    setLoading(false);
  }, [router, desde, hasta]);

  useEffect(() => { void cargar(); }, [cargar]);

  const agregar = async () => {
    setError(null);
    if (!nombre.trim()) { setError("Escribe el nombre del artículo"); return; }
    const res = await fetch("/api/despensa", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail ?? "No se pudo agregar"); return; }
    setNombre(""); await cargar();
  };

  const iniciarCompra = (id: string, costoActual: number) => { setComprando(id); setCostoInput(costoActual ? String(costoActual) : ""); };
  const confirmarCompra = async (id: string) => {
    await fetch(`/api/despensa/${id}/comprar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprado: true, costo: costoInput ? Number(costoInput) : 0 }),
    });
    setComprando(null); setCostoInput(""); await cargar();
  };
  const regresarAPendiente = async (id: string) => {
    await fetch(`/api/despensa/${id}/comprar`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprado: false }),
    });
    await cargar();
  };
  const borrar = async (id: string) => { await fetch(`/api/despensa/${id}`, { method: "DELETE" }); await cargar(); };
  const logout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); router.refresh(); };

  const rangoRapido = (dias: number) => { setDesde(haceDiasISO(dias)); setHasta(hoyISO()); };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-emerald-600">Despensa</h1>
        <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">Salir</button>
      </header>

      <nav className="mt-4 flex gap-2">
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600">Cupones</Link>
        <span className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">Despensa</span>
      </nav>

      {/* Agregar */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)} onKeyDown={(e) => e.key === "Enter" && agregar()}
            placeholder="Artículo (p. ej. Leche)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800" />
          <button onClick={agregar} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">Agregar</button>
        </div>
        <p className="mt-2 text-xs text-slate-400">El costo se captura al marcar el artículo como comprado.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Por comprar */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-slate-500">Por comprar ({pendientes.length})</h2>
        <div className="space-y-2">
          {pendientes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-emerald-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
              No hay artículos por comprar 🛒
            </div>
          ) : pendientes.map((i) => (
            <div key={i.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={false} onChange={() => iniciarCompra(i.id, i.costo)} className="h-5 w-5 rounded accent-emerald-600" title="Marcar comprado" />
                <span className="flex-1 text-slate-800 dark:text-slate-100">{i.nombre}</span>
                <button onClick={() => borrar(i.id)} className="text-slate-400 hover:text-red-600">×</button>
              </div>
              {comprando === i.id && (
                <div className="mt-2 flex items-center gap-2 pl-8">
                  <span className="text-sm text-slate-500">¿Cuánto costó?</span>
                  <input value={costoInput} onChange={(e) => setCostoInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && confirmarCompra(i.id)}
                    inputMode="decimal" placeholder="0.00" autoFocus className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
                  <button onClick={() => confirmarCompra(i.id)} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700">Comprado</button>
                  <button onClick={() => setComprando(null)} className="text-sm text-slate-400">Cancelar</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Historial con rango de fechas */}
      <section className="mt-8">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-emerald-600">Gastado en el rango</p>
              <p className="mt-1 text-3xl font-semibold text-emerald-700 dark:text-emerald-400">{money(totalRango)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <label className="flex flex-col text-xs text-slate-500">Desde
                <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
              </label>
              <label className="flex flex-col text-xs text-slate-500">Hasta
                <input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)}
                  className="rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
              </label>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => rangoRapido(0)} className="rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300">Hoy</button>
            <button onClick={() => rangoRapido(7)} className="rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300">Últimos 7 días</button>
            <button onClick={() => rangoRapido(30)} className="rounded-lg border border-emerald-300 px-3 py-1 text-xs text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300">Últimos 30 días</button>
          </div>
        </div>

        {/* Comprados agrupados por día */}
        <div className="mt-4">
          <button onClick={() => setVerComprados((v) => !v)} className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            {verComprados ? "Ocultar" : "Ver"} detalle por día
          </button>
          {verComprados && (
            <div className="mt-3 space-y-4">
              {porDia.length === 0 ? (
                <p className="text-sm text-slate-400">No hay compras en este rango.</p>
              ) : porDia.map((dia) => (
                <div key={dia.fecha}>
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1 dark:border-slate-700">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fechaBonita(dia.fecha)}</span>
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{money(dia.total)}</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {dia.items.map((i) => (
                      <div key={i.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/40">
                        <input type="checkbox" checked readOnly onChange={() => regresarAPendiente(i.id)} className="h-4 w-4 rounded accent-emerald-600" title="Regresar a pendientes" />
                        <span className="flex-1 text-slate-500 line-through">{i.nombre}</span>
                        <span className="text-slate-400">{money(i.costo)}</span>
                        <button onClick={() => borrar(i.id)} className="text-slate-300 hover:text-red-600">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
