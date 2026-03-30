"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { usePlatform } from "@/components/platform-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

export default function LoginPage() {
  const { login } = usePlatform();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        className="glass w-full max-w-md rounded-2xl p-6 shadow-glow"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/20 p-2">
            <ShieldCheck className="h-6 w-6 text-indigo-300" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">FraudGuard AI</h1>
            <p className="text-sm text-slate-400">Secure risk operations workspace</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />

          <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/15 px-3 py-2">
            <div className="text-sm">
              <p className="font-medium">Remember Me</p>
              <p className="text-xs text-slate-400">Keep your session for this demo.</p>
            </div>
            <Switch checked={remember} onCheckedChange={setRemember} />
          </div>

          {error && <p className="text-xs text-red-300">{error}</p>}
          <Button
            onClick={() => {
              const ok = login(email, password);
              if (!ok) return setError("Enter a valid email and password");
              router.push("/dashboard");
            }}
            className="w-full gap-2 shadow-lg shadow-indigo-900/40"
          >
            <LockKeyhole className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
