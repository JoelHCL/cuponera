import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { loadCoupon, toDTO } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const coupon = await loadCoupon(params.id);
  if (!coupon || coupon.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "Cupón no encontrado" }, { status: 404 });
  }
  if (coupon.recipientId !== session.memberId) {
    return NextResponse.json({ detail: "Solo quien solicitó puede cancelar" }, { status: 403 });
  }
  if (coupon.status !== "solicitado") {
    return NextResponse.json({ detail: "No hay solicitud que cancelar" }, { status: 409 });
  }

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { status: "disponible", requestNote: null, requestedAt: null },
    include: { creator: true, recipient: true },
  });
  return NextResponse.json(toDTO(updated));
}
