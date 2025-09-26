import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "Savvy Rilla Cashbook" };

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10 bg-white/5">
          <div className="container flex items-center justify-between py-3">
            <Link href="/" className="flex items-center gap-2">
              <Image src="/logo.png" alt="Logo" width={28} height={28} />
              <span className="font-semibold">Savvy Rilla Cashbook</span>
            </Link>
          </div>
        </header>
        <main className="container py-6">{children}</main>
        <footer className="text-center text-white/50 text-sm py-6">
          © 2025 Savvy Rilla Cashbook
        </footer>
      </body>
    </html>
  );
}
