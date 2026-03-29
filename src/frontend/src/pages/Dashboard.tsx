import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Clock,
  Image,
  Layers,
  Loader2,
  MessageSquare,
  Music,
  Scissors,
  Star,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { FeedbackModal } from "../components/FeedbackModal";
import { Footer } from "../components/Footer";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { useGetCredits, useGetUsageHistory } from "../hooks/useQueries";

const TOOLS = [
  {
    icon: <Scissors className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.22 262), oklch(0.50 0.25 290))",
    title: "Background Remover",
    to: "/tools/background-remover",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.50 0.20 195), oklch(0.45 0.22 220))",
    title: "Watermark Remover",
    to: "/tools/watermark-remover",
  },
  {
    icon: <Music className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.25 310), oklch(0.50 0.22 330))",
    title: "Audio Editor",
    to: "/tools/audio-editor",
  },
  {
    icon: <Image className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.20 145), oklch(0.50 0.22 165))",
    title: "Background Changer",
    to: "/tools/background-changer",
  },
  {
    icon: <MessageSquare className="w-5 h-5" />,
    color: "linear-gradient(135deg, oklch(0.55 0.22 40), oklch(0.50 0.22 60))",
    title: "Text to Speech",
    to: "/tools/text-to-speech",
  },
];

function formatDate(timestamp: bigint): string {
  try {
    const ms = Number(timestamp) / 1_000_000;
    return new Date(ms).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Arriving soon!";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(s).padStart(2, "0"),
  ].join(":");
}

function DailyCreditsCountdown() {
  const { actor, isFetching } = useActor();
  const [countdown, setCountdown] = useState<string | null>(null);
  const [firstTime, setFirstTime] = useState(false);

  useEffect(() => {
    if (!actor || isFetching) return;

    let interval: ReturnType<typeof setInterval>;

    actor
      .getLastDailyCreditTime()
      .then((raw: bigint) => {
        if (raw === -1n) {
          setFirstTime(true);
          setCountdown(null);
          return;
        }

        const nextMs = Number(raw / 1_000_000n) + 24 * 60 * 60 * 1000;

        const tick = () => {
          const remaining = nextMs - Date.now();
          setCountdown(formatCountdown(remaining));
        };

        tick();
        interval = setInterval(tick, 1000);
      })
      .catch(() => {
        setCountdown(null);
      });

    return () => clearInterval(interval);
  }, [actor, isFetching]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-card border border-border/60 rounded-2xl p-6 card-glow"
      data-ocid="dashboard.panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Daily Credits
        </h2>
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <Clock className="w-4 h-4 text-emerald-400" />
        </div>
      </div>

      {firstTime ? (
        <div>
          <p className="text-sm font-semibold text-emerald-400">
            Starting today — first credits in ~24 hours
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            You'll receive +5 credits every day automatically.
          </p>
        </div>
      ) : countdown === null ? (
        <div
          className="flex items-center gap-2 text-muted-foreground"
          data-ocid="dashboard.loading_state"
        >
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Checking schedule...</span>
        </div>
      ) : (
        <div>
          <p className="text-3xl font-bold tabular-nums text-emerald-400">
            {countdown}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <p className="text-xs text-muted-foreground">
              +5 credits arriving in
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { actor, isFetching } = useActor();
  const queryClient = useQueryClient();
  const { data: credits, isLoading: creditsLoading } = useGetCredits();
  const { data: history, isLoading: historyLoading } = useGetUsageHistory();
  const displayCredits = credits ?? 0;
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // One-time bonus: grant +5 credits on first visit (per device)
  useEffect(() => {
    if (!actor || isFetching || !user?.email) return;
    if (credits === undefined) return; // wait for credits to load
    if (localStorage.getItem("v24_bonus_granted")) return;

    const newTotal = BigInt(credits) + 5n;
    actor
      .adminSetCredits(user.email, newTotal)
      .then(() => {
        localStorage.setItem("v24_bonus_granted", "1");
        queryClient.invalidateQueries({ queryKey: ["credits"] });
      })
      .catch(() => {
        // silently ignore — will retry next visit
      });
  }, [actor, isFetching, user?.email, credits, queryClient]);

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-10 flex items-start justify-between"
        >
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back,{" "}
              <span className="text-foreground font-medium">
                {user?.username}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 border-border/50 hover:bg-muted/30"
            onClick={() => setFeedbackOpen(true)}
            data-ocid="dashboard.open_modal_button"
          >
            <Star className="w-4 h-4 text-yellow-400" />
            Feedback
          </Button>
        </motion.div>

        {/* Low credit alert */}
        {displayCredits <= 1 && !creditsLoading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-center gap-3"
            data-ocid="dashboard.error_state"
          >
            <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-300">
                Low credits!
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                You have {displayCredits} credit
                {displayCredits !== 1 ? "s" : ""} remaining.{" "}
                <Link to="/pricing" className="text-primary hover:underline">
                  Upgrade your plan
                </Link>
              </p>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Credits card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-card border border-border/60 rounded-2xl p-6 card-glow"
              data-ocid="dashboard.card"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Available Credits
                </h2>
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
              </div>
              {creditsLoading ? (
                <Loader2
                  className="w-8 h-8 animate-spin text-muted-foreground"
                  data-ocid="dashboard.loading_state"
                />
              ) : (
                <div>
                  <p className="text-6xl font-bold gradient-text">
                    {displayCredits}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    credits remaining
                  </p>
                </div>
              )}
              <div className="mt-6">
                <Button
                  asChild
                  size="sm"
                  className="gradient-btn border-0 text-white hover:opacity-90"
                  data-ocid="dashboard.primary_button"
                >
                  <Link to="/pricing">Get More Credits</Link>
                </Button>
              </div>
            </motion.div>

            {/* Daily credits countdown */}
            <DailyCreditsCountdown />

            {/* Usage history */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="bg-card border border-border/60 rounded-2xl p-6 card-glow"
            >
              <h2 className="text-lg font-semibold mb-5">Usage History</h2>
              {historyLoading ? (
                <div
                  className="flex items-center gap-2 text-muted-foreground"
                  data-ocid="dashboard.loading_state"
                >
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading history...</span>
                </div>
              ) : !history || history.length === 0 ? (
                <div
                  className="py-8 text-center"
                  data-ocid="dashboard.empty_state"
                >
                  <p className="text-muted-foreground text-sm">
                    No tools used yet. Try one below!
                  </p>
                </div>
              ) : (
                <Table data-ocid="dashboard.table">
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground text-xs">
                        Tool
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs">
                        Date
                      </TableHead>
                      <TableHead className="text-muted-foreground text-xs text-right">
                        Credits
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((entry, i) => (
                      <TableRow
                        key={String(entry.usageId)}
                        className="border-border/30"
                        data-ocid={`dashboard.row.${i + 1}`}
                      >
                        <TableCell className="text-sm font-medium capitalize">
                          {entry.toolName.replace(/-/g, " ")}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(entry.timestamp)}
                        </TableCell>
                        <TableCell className="text-sm text-right">
                          <span className="text-primary font-medium">
                            -{String(entry.creditsSpent)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </motion.div>
          </div>

          {/* Right column — quick access */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 }}
              className="bg-card border border-border/60 rounded-2xl p-6 card-glow"
            >
              <h2 className="text-lg font-semibold mb-5">Quick Access</h2>
              <div className="space-y-3">
                {TOOLS.map((tool, i) => (
                  <Link
                    key={tool.to}
                    to={tool.to}
                    className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border transition-all duration-150 hover:bg-muted/30"
                    data-ocid={`dashboard.item.${i + 1}`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white flex-shrink-0"
                      style={{ background: tool.color }}
                    >
                      {tool.icon}
                    </div>
                    <span className="text-sm font-medium">{tool.title}</span>
                  </Link>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      <Footer />
    </div>
  );
}
