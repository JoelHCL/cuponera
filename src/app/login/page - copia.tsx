import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");
  const space = await prisma.space.findFirst({ include: { members: true } });
  if (!space) redirect("/setup");

  const members = space.members.map((m) => ({ id: m.id, displayName: m.displayName }));
  return <LoginForm spaceName={space.name} members={members} />;
}
