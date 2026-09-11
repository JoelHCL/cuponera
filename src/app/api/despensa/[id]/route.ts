import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const item = await prisma.despensaItem.findUnique({ where: { id: params.id } });
  if (!item || item.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "No encontrado" }, { status: 404 });
  }

  await prisma.despensaItem.delete({ where: { id: item.id } });
  return NextResponse.json({ ok: true });
}
