import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { Despensa } from "@/components/Despensa";

export const dynamic = "force-dynamic";

export default async function DespensaPage() {
  const session = await getSession();
  if (!session) {
    const space = await prisma.space.findFirst();
    redirect(space ? "/login" : "/setup");
  }
  return <Despensa />;
}
