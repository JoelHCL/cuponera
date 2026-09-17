import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { despensaCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * GET admite ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD para filtrar los COMPRADOS por
 * fecha de compra. Los pendientes siempre se devuelven completos (no tienen fecha).
 * Devuelve además el historial de comprados agrupado por día.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const url = new URL(req.url);
  const desdeStr = url.searchParams.get("desde");
  const hastaStr = url.searchParams.get("hasta");
  const desde = desdeStr ? new Date(`${desdeStr}T00:00:00`) : null;
  const hasta = hastaStr ? new Date(`${hastaStr}T23:59:59`) : null;

  const items = await prisma.despensaItem.findMany({
    where: { spaceId: session.spaceId },
    orderBy: [{ comprado: "asc" }, { createdAt: "desc" }],
  });

  const pendientes = items.filter((i: { comprado: boolean; compradoAt: Date | null; costo: number }) => !i.comprado);

  // Comprados dentro del rango (si se pidió). Sin rango, todos.
  const compradosEnRango = items.filter((i: { comprado: boolean; compradoAt: Date | null; costo: number }) => {
    if (!i.comprado) return false;
    if (!i.compradoAt) return !desde && !hasta; // sin fecha solo cuenta si no hay filtro
    const f = new Date(i.compradoAt);
    if (desde && f < desde) return false;
    if (hasta && f > hasta) return false;
    return true;
  });

  const totalRango = compradosEnRango.reduce((s: number, i: { costo: number }) => s + i.costo, 0);

  // Agrupar comprados por día (clave YYYY-MM-DD).
  const porDiaMap = new Map<string, { fecha: string; total: number; items: typeof items }>();
  for (const i of compradosEnRango) {
    const clave = i.compradoAt ? new Date(i.compradoAt).toISOString().slice(0, 10) : "sin-fecha";
    if (!porDiaMap.has(clave)) porDiaMap.set(clave, { fecha: clave, total: 0, items: [] });
    const g = porDiaMap.get(clave)!;
    g.total += i.costo;
    g.items.push(i);
  }
  const porDia = [...porDiaMap.values()].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return NextResponse.json({
    pendientes,
    porDia,
    totalRango,
    totalPendienteCount: pendientes.length,
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const parsed = despensaCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 422 });
  }

  const item = await prisma.despensaItem.create({
    data: { spaceId: session.spaceId, nombre: parsed.data.nombre, costo: 0 },
  });
  return NextResponse.json(item, { status: 201 });
}
