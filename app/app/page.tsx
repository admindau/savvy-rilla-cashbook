"use client";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
import RequireAuth from "@/components/RequireAuth";
export default function Dashboard(){ return <RequireAuth><h1 className="text-2xl">Dashboard Placeholder v3.3</h1></RequireAuth>; }
