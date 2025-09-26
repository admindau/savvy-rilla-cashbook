import "./globals.css";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
const HeaderRight = dynamic(() => import("@/components/HeaderRight"), { ssr: false });

export const metadata = { title: "Savvy Rilla Cashbook", description: "Track income & expenses" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="p-4 border-b border-white/20 flex justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Logo" width={32} height={32}/>
            <Link href="/" className="font-bold">Savvy Rilla Cashbook</Link>
          </div>
          <HeaderRight/>
        </header>
        <main className="p-4">{children}</main>
      </body>
    </html>
  );
}
