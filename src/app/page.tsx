"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      router.replace(user ? "/notes" : "/login");
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-lg">Nacitani...</p>
    </div>
  );
}
