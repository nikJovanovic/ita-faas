"use client";

import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AuthForm } from "@/app/components/custom/custom-auth-form";
import { Dashboard } from "@/app/components/custom/custom-dashboard";
import { Spinner } from "@/components/ui/spinner";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  if (!session) return <AuthForm />;

  return <Dashboard user={session.user} />;
}
