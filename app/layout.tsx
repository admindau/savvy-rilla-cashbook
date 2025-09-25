import "./globals.css";
import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Savvy Rilla Cashbook",
  description: "Track income and expenses with ease."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-white/10">
          <div className="container flex items-center gap-4 py-4">
            <Image src="/logo.png" alt="Savvy Rilla" width={36} height={36} className="rounded" />
            <Link href="/" className="font-semibold text-lg">Savvy Rilla Cashbook</Link>
            <nav className="ml-auto flex items-center gap-4">
              <Link href="/app" className="btn">Open App</Link>
              <Link href="https://cashbook.savvyrilla.tech" className="text-white/70 hover:text-white">Subdomain</Link>
            </nav>
          </div>
        </header>
        <main className="container py-8">{children}</main>
        <footer className="container py-12 text-center text-white/50">
          © {new Date().getFullYear()} Savvy Gorilla Technologies
        </footer>
      </body>
    </html>
  );
}
