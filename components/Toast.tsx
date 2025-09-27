"use client";
import { useEffect, useState } from "react";

export default function Toast({
  message,
  type = "success",
  onClose,
}: {
  message: string;
  type?: "success" | "error";
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  if (!visible) return null;

  const bg = type === "success" ? "bg-emerald-600" : "bg-red-600";

  return (
    <div
      className={`fixed bottom-6 right-6 ${bg} text-white px-4 py-2 rounded-lg shadow-lg z-50`}
    >
      {message}
    </div>
  );
}
