import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { couponCreateSchema } from "@/lib/validation";
import { toDTO } from "@/lib/coupons";

export const dynamic = "force-dynamic";

const ORDER = { disponible: 0, solicitado: 1, cobrado: 2 } as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const coupons = await prisma.coupon.findMany({
    where: { spaceId: session.spaceId },
    include: { creator: true, recipient: true },
    orderBy: { createdAt: "desc" },
  });

  const dto = coupons
    .map(toDTO)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  return NextResponse.json(dto);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const parsed = couponCreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 422 });
  }

  // El destinatario es la otra persona del espacio.
  const partner = await prisma.member.findFirst({
    where: { spaceId: session.spaceId, id: { not: session.memberId } },
  });
  if (!partner) return NextResponse.json({ detail: "No hay pareja en el espacio" }, { status: 400 });

  const { title, description, expiresAt } = parsed.data;
  const created = await prisma.coupon.create({
    data: {
      spaceId: session.spaceId,
      title,
      description: description ? description : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      creatorId: session.memberId,
      recipientId: partner.id,
      status: "disponible",
    },
    include: { creator: true, recipient: true },
  });

  return NextResponse.json(toDTO(created), { status: 201 });
}
