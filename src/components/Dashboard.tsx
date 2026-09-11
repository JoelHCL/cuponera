"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import type { CouponDTO, MemberPublic } from "@/lib/types";
import { CouponCard } from "./CouponCard";
import { NewCouponModal } from "./NewCouponModal";

interface Me {
  spaceName: string;
  me: MemberPublic;
  partner: MemberPublic;
}

export function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCoupons = useCallback(async () => {
    const res = await fetch("/api/coupons");
    if (res.ok) setCoupons(await res.json());
  }, []);

  useEffect(() => {
    (async () => {
      const meRes = await fetch("/api/auth/me");
      if (meRes.status === 401) {
        router.push("/login");
        return;
      }
      if (meRes.ok) setMe(await meRes.json());
      await loadCoupons();
      setLoading(false);
    })();
  }, [router, loadCoupons]);

  const action = useCallback(
    async (path: string, method = "POST", body?: unknown) => {
      await fetch(path, {
        method,
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      await loadCoupons();
    },
    [loadCoupons],
  );

  const createCoupon = useCallback(
    async (body: { title: string; description: string; expiresAt: string }) => {
      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("create failed");
      await loadCoupons();
    },
    [loadCoupons],
  );

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading || !me) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Cargando…</div>;
  }

  // separación simple: lo que me toca actuar arriba
  const mine = coupons;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-rose-600">{me.spaceName}</h1>
          <p className="text-sm text-slate-500">
            Entraste como <strong>{me.me.displayName}</strong> · pareja: {me.partner.displayName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModalOpen(true)} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700">
            + Regalar cupón
          </button>
          <button onClick={logout} className="rounded-lg border border-slate-300 px-3 py-2 text-sm dark:border-slate-600">
            Salir
          </button>
        </div>
      </header>

      <nav className="mt-4 flex gap-2">
        <span className="rounded-lg bg-rose-600 px-4 py-1.5 text-sm font-medium text-white">Cupones</span>
        <Link href="/despensa" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-600">
          Despensa
        </Link>
      </nav>

      <section className="mt-6 space-y-3">
        {mine.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-rose-200 p-10 text-center text-slate-500 dark:border-slate-700">
            Aún no hay cupones. Regala el primero a {me.partner.displayName} 💝
          </div>
        ) : (
          mine.map((c) => <CouponCard key={c.id} coupon={c} myId={me.me.id} onAction={action} />)
        )}
      </section>

      <NewCouponModal open={modalOpen} partnerName={me.partner.displayName} onClose={() => setModalOpen(false)} onCreate={createCoupon} />
    </div>
  );
}
