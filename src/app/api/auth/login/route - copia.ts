import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = loginSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: "Datos inválidos" }, { status: 422 });
  }
  const member = await prisma.member.findUnique({ where: { id: parsed.data.memberId } });
  if (!member || !(await bcrypt.compare(parsed.data.pin, member.pinHash))) {
    return NextResponse.json({ detail: "PIN incorrecto" }, { status: 401 });
  }
  await createSession({ memberId: member.id, spaceId: member.spaceId });
  return NextResponse.json({ ok: true });
}
