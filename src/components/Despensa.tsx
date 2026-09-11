"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Item {
  id: string;
  nombre: string;
  costo: number;
  comprado: boolean;
}

const money = (n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function Despensa() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [totalComprado, setTotalComprado] = useState(0);
  const [totalPendiente, setTotalPendiente] = useState(0);
  const [loading, setLoading] = useState(true);
  const [verComprados, setVerComprados] = useState(false);

  const [nombre, setNombre] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Para capturar el costo al marcar comprado
  const [comprando, setComprando] = useState<string | null>(null);
  const [costoInput, setCostoInput] = useState("");

  const cargar = useCallback(async () => {
    const res = await fetch("/api/despensa");
    if (res.status === 401) { router.push("/login"); return; }
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
      setTotalComprado(data.totalComprado);
      setTotalPendiente(data.totalPendiente);
    }
    setLoading(false);
  }, [router]);

  useEffect(() => { void cargar(); }, [cargar]);

  const agregar = async () => {
    setError(null);
    if (!nombre.trim()) { setError("Escribe el nombre del artículo"); return; }
    const res = await fetch("/api/despensa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nombre.trim() }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.detail ?? "No se pudo agregar"); return; }
    setNombre("");
    await cargar();
  };

  // Al pulsar la casilla de un pendiente: abrir el campo de costo.
  const iniciarCompra = (id: string, costoActual: number) => {
    setComprando(id);
    setCostoInput(costoActual ? String(costoActual) : "");
  };

  const confirmarCompra = async (id: string) => {
    await fetch(`/api/despensa/${id}/comprar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprado: true, costo: costoInput ? Number(costoInput) : 0 }),
    });
    setComprando(null); setCostoInput("");
    await cargar();
  };

  const regresarAPendiente = async (id: string) => {
    await fetch(`/api/despensa/${id}/comprar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comprado: false }),
    });
    await cargar();
  };

  const borrar = async (id: string) => {
    await fetch(`/api/despensa/${id}`, { method: "DELETE" });
    await cargar();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login"); router.refresh();
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</div>;

  const pendientes = items.filter((i) => !i.comprado);
  const comprados = items.filter((i) => i.comprado);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-emerald-600">Despensa</h1>
        <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">Salir</button>
      </header>

      <nav className="mt-4 flex gap-2">
        <Link href="/" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600">
          Cupones
        </Link>
        <span className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white">Despensa</span>
      </nav>

      {/* Agregar artículo: solo el nombre. El costo se captura al comprar. */}
      <div className="mt-6 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
        <div className="flex flex-wrap gap-2">
          <input value={nombre} onChange={(e) => setNombre(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && agregar()}
            placeholder="Artículo (p. ej. Leche)"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-800" />
          <button onClick={agregar} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
            Agregar
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">El costo se captura al marcar el artículo como comprado.</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>

      {/* Totales */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
          <p className="text-xs uppercase text-slate-400">Por comprar</p>
          <p className="mt-1 text-2xl font-semibold text-slate-700 dark:text-slate-200">{pendientes.length} art.</p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="text-xs uppercase text-emerald-600">Total gastado</p>
          <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-400">{money(totalComprado)}</p>
        </div>
      </div>

      {/* Pendientes */}
      <section className="mt-6 space-y-2">
        {pendientes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-emerald-200 p-8 text-center text-slate-500 dark:border-slate-700">
            No hay artículos por comprar. Agrega el primero 🛒
          </div>
        ) : (
          pendientes.map((i) => (
            <div key={i.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <input type="checkbox" checked={false} onChange={() => iniciarCompra(i.id, i.costo)}
                  className="h-5 w-5 rounded accent-emerald-600" title="Marcar como comprado" />
                <span className="flex-1 text-slate-800 dark:text-slate-100">{i.nombre}</span>
                <button onClick={() => borrar(i.id)} className="text-slate-400 hover:text-red-600" title="Eliminar">×</button>
              </div>
              {/* Al marcar, aparece el campo de costo */}
              {comprando === i.id && (
                <div className="mt-2 flex items-center gap-2 pl-8">
                  <span className="text-sm text-slate-500">¿Cuánto costó?</span>
                  <input value={costoInput} onChange={(e) => setCostoInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && confirmarCompra(i.id)}
                    inputMode="decimal" placeholder="0.00" autoFocus
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800" />
                  <button onClick={() => confirmarCompra(i.id)} className="rounded-lg bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700">
                    Comprado
                  </button>
                  <button onClick={() => setComprando(null)} className="text-sm text-slate-400 hover:text-slate-600">Cancelar</button>
                </div>
              )}
            </div>
          ))
        )}
      </section>

      {/* Comprados: ocultos tras un botón */}
      {comprados.length > 0 && (
        <div className="mt-6">
          <button onClick={() => setVerComprados((v) => !v)}
            className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            {verComprados ? "Ocultar" : "Ver"} comprados ({comprados.length})
          </button>
          {verComprados && (
            <section className="mt-3 space-y-2">
              {comprados.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <input type="checkbox" checked readOnly onChange={() => regresarAPendiente(i.id)}
                    className="h-5 w-5 rounded accent-emerald-600" title="Regresar a pendientes" />
                  <span className="flex-1 text-slate-400 line-through">{i.nombre}</span>
                  <span className="text-slate-400 line-through">{money(i.costo)}</span>
                  <button onClick={() => borrar(i.id)} className="text-slate-300 hover:text-red-600" title="Eliminar">×</button>
                </div>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
