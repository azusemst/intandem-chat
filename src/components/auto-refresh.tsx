"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (document.visibilityState === "visible" && navigator.onLine) router.refresh(); };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => { clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [router]);
  return <button className="button secondary compact" onClick={() => router.refresh()}>Refresh requests</button>;
}
