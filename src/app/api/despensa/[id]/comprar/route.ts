import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Alterna comprado <-> pendiente. Body opcional { comprado: boolean }.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const item = await prisma.despensaItem.findUnique({ where: { id: params.id } });
  if (!item || item.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "No encontrado" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { comprado?: boolean };
  const comprado = typeof body.comprado === "boolean" ? body.comprado : !item.comprado;

  const actualizado = await prisma.despensaItem.update({
    where: { id: item.id },
    data: { comprado, compradoAt: comprado ? new Date() : null },
  });
  return NextResponse.json(actualizado);
}
