"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
const LINKS = [["/#packs", "Packs"], ["/#market", "Buy"], ["/#me", "My cards"], ["/about", "How it works"], ["/traction", "Traction"]] as const;
export function Nav() {
  const path = usePathname();
  const [hash, setHash] = useState("");
  useEffect(() => { const f = () => setHash(window.location.hash); f(); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return <>{LINKS.map(([href, label]) => <Link key={href} href={href} className="seg" data-active={href.startsWith("/#") ? path === "/" && hash === href.slice(1) : path === href}>{label}</Link>)}</>;
}
