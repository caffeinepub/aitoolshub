import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { hashPassword } from "../utils/crypto";

export function Signup() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { actor } = useActor();
  const { login, setCredits, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoggedIn) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoggedIn, navigate]);

  // Return null immediately if already logged in to prevent form flicker
  if (isLoggedIn) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actor) {
      toast.error("Not connected to backend");
      return;
    }
    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      await actor.register(username, email, passwordHash);
      const user = await actor.login(email, passwordHash);
      const credentials = { email, passwordHash };
      login(user, credentials);
      // Fetch the real credit count so dashboard shows correct value immediately
      try {
        const creditCount = await actor.getCredits(email, passwordHash);
        setCredits(Number(creditCount));
      } catch {
        // fallback: leave credits as set by login()
      }
      toast.success("Account created!", {
        description: "You've received 5 free credits to get started.",
      });
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      const msg = (
        err?.message ??
        err?.toString?.() ??
        String(err ?? "")
      ).toLowerCase();
      if (
        msg.includes("already registered") ||
        msg.includes("already in use")
      ) {
        toast.error("Email already in use", {
          description:
            "An account with this email exists. Redirecting to login...",
        });
        setTimeout(() => navigate({ to: "/login" }), 1500);
      } else {
        const displayMsg =
          err?.message ??
          err?.toString?.() ??
          "Something went wrong. Please try again.";
        toast.error("Signup failed", {
          description: displayMsg,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border/60 rounded-2xl p-8 card-glow">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-btn flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl">AIToolsHub</span>
          </div>

          <h1 className="text-2xl font-bold text-center mb-1">
            Create your account
          </h1>
          <p className="text-sm text-muted-foreground text-center mb-2">
            Start with 5 free credits
          </p>
          <div className="flex items-center justify-center gap-1.5 mb-8">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-medium">
              5 credits on signup — no card required
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="yourusername"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="bg-input border-border"
                data-ocid="signup.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-input border-border"
                data-ocid="signup.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="bg-input border-border"
                data-ocid="signup.input"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-btn border-0 text-white h-11 hover:opacity-90"
              disabled={loading || !actor}
              data-ocid="signup.submit_button"
            >
              {!actor && !loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating
                  account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-primary font-semibold hover:underline"
              data-ocid="signup.link"
            >
              Log in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
