import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { loadCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const coupon = await loadCoupon(params.id);
  if (!coupon || coupon.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "Cupón no encontrado" }, { status: 404 });
  }
  if (coupon.creatorId !== session.memberId) {
    return NextResponse.json({ detail: "Solo quien creó el cupón puede borrarlo" }, { status: 403 });
  }

  await prisma.coupon.delete({ where: { id: coupon.id } });
  return new NextResponse(null, { status: 204 });
}
