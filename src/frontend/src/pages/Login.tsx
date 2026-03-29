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

function parseLoginError(err: any): string {
  const msg = err?.message ?? "";
  if (msg.includes("User not found"))
    return "No account found with this email.";
  if (msg.includes("Invalid password"))
    return "Incorrect password. Please try again.";
  if (msg.includes("not connected") || !msg)
    return "Connection error. Please try again.";
  return "Login failed. Please check your credentials.";
}

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { actor, isFetching: actorLoading } = useActor();
  const { login, isLoggedIn } = useAuth();
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
      toast.error("Not connected to backend", {
        description: "Please wait a moment and try again.",
      });
      return;
    }
    setLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      const user = await actor.login(email, passwordHash);
      const credentials = { email, passwordHash };
      login(user, credentials);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      const friendlyMessage = parseLoginError(err);
      const isUserNotFound = (err?.message ?? "").includes("User not found");
      toast.error("Login failed", {
        description: isUserNotFound
          ? `${friendlyMessage} Redirecting you to signup...`
          : friendlyMessage,
      });
      if (isUserNotFound) {
        setTimeout(() => navigate({ to: "/signup" }), 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const isConnecting = actorLoading && !actor;

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

          <h1 className="text-2xl font-bold text-center mb-1">Welcome back</h1>
          <p className="text-sm text-muted-foreground text-center mb-8">
            Log in to your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                data-ocid="login.input"
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
                className="bg-input border-border"
                data-ocid="login.input"
              />
            </div>

            <Button
              type="submit"
              className="w-full gradient-btn border-0 text-white h-11 hover:opacity-90"
              disabled={loading || isConnecting}
              data-ocid="login.submit_button"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Connecting...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Logging
                  in...
                </>
              ) : (
                "Log In"
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-primary hover:underline"
              data-ocid="login.link"
            >
              Sign up for free
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
