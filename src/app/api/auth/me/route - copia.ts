import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const space = await prisma.space.findUnique({
    where: { id: session.spaceId },
    include: { members: true },
  });
  if (!space) return NextResponse.json({ detail: "Espacio no encontrado" }, { status: 404 });

  const me = space.members.find((m) => m.id === session.memberId);
  const partner = space.members.find((m) => m.id !== session.memberId);
  if (!me || !partner) return NextResponse.json({ detail: "Miembro no encontrado" }, { status: 404 });

  return NextResponse.json({
    spaceName: space.name,
    me: { id: me.id, displayName: me.displayName },
    partner: { id: partner.id, displayName: partner.displayName },
  });
}
