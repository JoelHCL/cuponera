import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { requestSchema } from "@/lib/validation";
import { loadCoupon, toDTO } from "@/lib/coupons";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ detail: "No autenticado" }, { status: 401 });

  const coupon = await loadCoupon(params.id);
  if (!coupon || coupon.spaceId !== session.spaceId) {
    return NextResponse.json({ detail: "Cupón no encontrado" }, { status: 404 });
  }
  if (coupon.recipientId !== session.memberId) {
    return NextResponse.json({ detail: "Solo quien recibe el cupón puede solicitarlo" }, { status: 403 });
  }
  if (coupon.status !== "disponible") {
    return NextResponse.json({ detail: "El cupón no está disponible" }, { status: 409 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => ({})));
  const note = parsed.success && parsed.data.note ? parsed.data.note : null;

  const updated = await prisma.coupon.update({
    where: { id: coupon.id },
    data: { status: "solicitado", requestNote: note, requestedAt: new Date() },
    include: { creator: true, recipient: true },
  });
  return NextResponse.json(toDTO(updated));
}
