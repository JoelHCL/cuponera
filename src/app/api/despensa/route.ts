import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { despensaCreateSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

// Pendientes primero (más recientes arriba), comprados después.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const items = await prisma.despensaItem.findMany({
    where: { spaceId: session.spaceId },
    orderBy: [{ comprado: "asc" }, { createdAt: "desc" }],
  });

  const totalComprado = items
    .filter((i: { comprado: boolean; costo: number }) => i.comprado)
    .reduce((sum: number, i: { costo: number }) => sum + i.costo, 0);
  const totalPendiente = items
    .filter((i: { comprado: boolean; costo: number }) => !i.comprado)
    .reduce((sum: number, i: { costo: number }) => sum + i.costo, 0);

  return NextResponse.json({ items, totalComprado, totalPendiente });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const parsed = despensaCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 422 });
  }

  const item = await prisma.despensaItem.create({
    data: {
      spaceId: session.spaceId,
      nombre: parsed.data.nombre,
      costo: parsed.data.costo ?? 0,
    },
  });
  return NextResponse.json(item, { status: 201 });
}
