import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { setupSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const existing = await prisma.space.findFirst();
  if (existing) {
    return NextResponse.json(
      { detail: "Ya existe un espacio. Esta instancia es para una sola pareja." },
      { status: 409 },
    );
  }

  const parsed = setupSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ detail: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 422 });
  }
  const { spaceName, memberA, memberB } = parsed.data;

  const space = await prisma.space.create({
    data: {
      name: spaceName,
      members: {
        create: [
          { displayName: memberA.displayName, pinHash: await bcrypt.hash(memberA.pin, 10) },
          { displayName: memberB.displayName, pinHash: await bcrypt.hash(memberB.pin, 10) },
        ],
      },
    },
    include: { members: true },
  });

  // Auto-login como la primera persona (quien hace el setup).
  await createSession({ memberId: space.members[0].id, spaceId: space.id });

  return NextResponse.json({ ok: true });
}
