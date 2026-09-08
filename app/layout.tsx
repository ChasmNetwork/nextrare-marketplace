import type { Metadata } from "next";
import { Sora, Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { Providers } from "./providers";
import { WalletButton } from "@/components/wallet-button";
import { Nav } from "@/components/nav";
import { Track } from "@/components/track";
import { Feedback } from "@/components/feedback";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = { title: "NextRare · List once, sell two ways", description: "TCG listings that earn while they wait. Solana devnet." };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", "antialiased", sora.variable, "font-sans", geist.variable)}>
      <body className="min-h-full">
        <div className="mesh" aria-hidden>
          <img src="/cards/card0.jpg" alt="" style={{ left: "-6vw", top: "8vh" }} />
          <img src="/cards/card5.jpg" alt="" style={{ right: "-4vw", top: "-6vh" }} />
          <img src="/cards/card8.jpg" alt="" style={{ left: "35vw", bottom: "-14vh" }} />
        </div>
        <Providers>
          <header className="fixed inset-x-0 top-4 z-20 flex justify-center px-4">
            <div className="glass flex max-w-full flex-wrap items-center justify-center gap-1 rounded-3xl p-1.5 sm:flex-nowrap sm:rounded-full sm:pl-5">
              <Link href="/" className="flex shrink-0 items-center px-2 py-1.5 sm:mr-2"><img src="/nextrare-logo-dark.svg" alt="NextRare" className="h-5 w-auto" /></Link>
              <Nav />
              <span className="mx-2 hidden rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-zinc-600 sm:inline">devnet</span>
              <WalletButton />
            </div>
          </header>
          <main className="w-full overflow-x-hidden px-3 pb-10 pt-36 sm:px-5 sm:pt-24 md:pt-20 2xl:px-8">{children}</main>
          <Track />
          <Feedback />
        </Providers>
      </body>
    </html>
  );
}
