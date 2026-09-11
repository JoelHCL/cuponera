import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Alterna comprado <-> pendiente. Al marcar comprado se puede fijar el costo real.
// Body: { comprado: boolean, costo?: number }
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const item = await prisma.despensaItem.findUnique({ where: { id: params.id } });
  if (!item || item.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "No encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { comprado?: boolean; costo?: number };
  const comprado = typeof body.comprado === "boolean" ? body.comprado : !item.comprado;

  const actualizado = await prisma.despensaItem.update({
    where: { id: item.id },
    data: {
      comprado,
      compradoAt: comprado ? new Date() : null,
      // Si viene un costo al marcar comprado, se guarda; si no, se conserva el que tenía.
      ...(comprado && typeof body.costo === "number" ? { costo: body.costo } : {}),
    },
  });
  return NextResponse.json(actualizado);
}
