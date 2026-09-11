import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { SetupForm } from "@/components/SetupForm";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const space = await prisma.space.findFirst();
  if (space) redirect("/login");
  return <SetupForm />;
}
