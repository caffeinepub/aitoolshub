import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Check, Image, Layers, Music, Scissors, Zap } from "lucide-react";
import { motion } from "motion/react";
import { Footer } from "../components/Footer";

const TOOLS = [
  {
    icon: <Scissors className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.22 262), oklch(0.50 0.25 290))",
    title: "Background Remover",
    description:
      "Remove any background from images in seconds with AI precision.",
    to: "/tools/background-remover",
  },
  {
    icon: <Layers className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.50 0.20 195), oklch(0.45 0.22 220))",
    title: "Watermark Remover",
    description:
      "Clean your images by removing unwanted watermarks seamlessly.",
    to: "/tools/watermark-remover",
  },
  {
    icon: <Music className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.25 310), oklch(0.50 0.22 330))",
    title: "Audio Editor",
    description: "Trim, cut, and enhance audio files with powerful AI tools.",
    to: "/tools/audio-editor",
  },
  {
    icon: <Image className="w-5 h-5" />,
    color:
      "linear-gradient(135deg, oklch(0.55 0.20 145), oklch(0.50 0.22 165))",
    title: "Background Changer",
    description:
      "Replace your image background with beautiful presets or custom colors.",
    to: "/tools/background-changer",
  },
];

const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "5 credits on signup",
      "All tools access",
      "Standard processing speed",
      "Community support",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Weekly",
    price: "$0.12",
    period: "/ week",
    features: [
      "50 credits / week",
      "All tools access",
      "Priority processing",
      "Email support",
      "HD downloads",
    ],
    cta: "Coming Soon",
    popular: true,
  },
  {
    name: "2-Month",
    price: "$0.60",
    period: "/ 2 months",
    features: [
      "200 credits",
      "All tools access",
      "Priority processing",
      "Email support",
      "HD downloads",
    ],
    cta: "Coming Soon",
    popular: false,
  },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 hero-bg">
        {/* Geometric lines */}
        <div className="geo-lines" aria-hidden="true">
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1200 800"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            role="presentation"
          >
            <title>Decorative background</title>
            <line
              x1="200"
              y1="0"
              x2="600"
              y2="800"
              stroke="oklch(0.55 0.20 262 / 0.08)"
              strokeWidth="1"
            />
            <line
              x1="400"
              y1="0"
              x2="900"
              y2="800"
              stroke="oklch(0.55 0.24 290 / 0.08)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="200"
              x2="1200"
              y2="600"
              stroke="oklch(0.55 0.18 195 / 0.06)"
              strokeWidth="1"
            />
            <line
              x1="0"
              y1="400"
              x2="1200"
              y2="200"
              stroke="oklch(0.55 0.20 262 / 0.05)"
              strokeWidth="1"
            />
            <line
              x1="800"
              y1="0"
              x2="300"
              y2="800"
              stroke="oklch(0.55 0.24 290 / 0.07)"
              strokeWidth="1"
            />
            <polygon
              points="600,100 750,300 450,300"
              fill="none"
              stroke="oklch(0.55 0.20 262 / 0.06)"
              strokeWidth="1"
            />
            <polygon
              points="300,400 500,200 500,600"
              fill="none"
              stroke="oklch(0.55 0.24 290 / 0.05)"
              strokeWidth="1"
            />
            <polygon
              points="900,300 1050,100 1050,500"
              fill="none"
              stroke="oklch(0.55 0.18 195 / 0.05)"
              strokeWidth="1"
            />
          </svg>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 px-4 py-1.5 bg-primary/15 border-primary/30 text-primary text-xs">
              <Zap className="w-3 h-3 mr-1.5" /> 4 Powerful AI Tools — All in
              One Place
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              All AI Tools <span className="gradient-text">in One Place</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-3 font-light">
              Fast, Easy, Affordable
            </p>
            <p className="text-base text-muted-foreground mb-10 max-w-xl mx-auto">
              Remove backgrounds, erase watermarks, edit audio, and swap
              backgrounds — powered by AI. Start free with 5 credits.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                asChild
                className="gradient-btn border-0 text-white px-8 h-12 text-base hover:opacity-90"
                data-ocid="hero.primary_button"
              >
                <Link to="/signup">Get Started for Free</Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-border/60 text-muted-foreground hover:text-foreground px-8 h-12 text-base"
                data-ocid="hero.secondary_button"
              >
                <a href="#tools">Browse AI Tools</a>
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <div className="w-6 h-10 rounded-full border-2 border-border/40 flex items-start justify-center p-1.5">
            <div className="w-1 h-2 bg-muted-foreground rounded-full" />
          </div>
        </div>
      </section>

      {/* Tools section */}
      <section id="tools" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Popular AI Tools
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Everything you need to transform your images and audio — no
              technical skills required.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" id="features">
            {TOOLS.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="group bg-card border border-border/60 rounded-2xl p-6 hover:border-border transition-all duration-200 card-glow"
                data-ocid={`tools.item.${i + 1}`}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4"
                  style={{ background: tool.color }}
                >
                  {tool.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{tool.title}</h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {tool.description}
                </p>
                <Button
                  size="sm"
                  asChild
                  className="gradient-btn border-0 text-white text-xs px-4 py-1.5 h-auto rounded-full hover:opacity-90"
                >
                  <Link to={tool.to} data-ocid={`tools.try_button.${i + 1}`}>
                    Try Now →
                  </Link>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing section */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-muted-foreground">
              No hidden fees. Cancel anytime.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className={`relative bg-card border rounded-2xl p-6 ${
                  plan.popular
                    ? "border-primary/50 card-glow-accent"
                    : "border-border/60 card-glow"
                }`}
                data-ocid={`pricing.item.${i + 1}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary/90 text-white text-xs px-3 py-0.5 border-0">
                      Popular
                    </Badge>
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold gradient-text">
                      {plan.price}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {plan.period}
                    </span>
                  </div>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                      <span className="text-muted-foreground">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full ${
                    plan.cta === "Coming Soon"
                      ? "bg-muted text-muted-foreground cursor-not-allowed"
                      : "gradient-btn border-0 text-white hover:opacity-90"
                  }`}
                  disabled={plan.cta === "Coming Soon"}
                  asChild={plan.cta !== "Coming Soon"}
                  data-ocid={`pricing.button.${i + 1}`}
                >
                  {plan.cta === "Coming Soon" ? (
                    <span>{plan.cta}</span>
                  ) : (
                    <Link to="/signup">{plan.cta}</Link>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
