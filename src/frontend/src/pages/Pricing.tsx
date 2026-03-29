import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { motion } from "motion/react";
import { Footer } from "../components/Footer";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    features: [
      "5 credits on signup",
      "All tools access",
      "Standard processing speed",
      "Community support",
      "1 credit per tool use",
    ],
    cta: "Get Started",
    ctaLink: "/signup",
    popular: false,
  },
  {
    name: "Weekly",
    price: "$0.12",
    period: "/ week",
    features: [
      "50 credits / week",
      "All tools access",
      "Priority processing speed",
      "Email support",
      "HD downloads",
    ],
    cta: "Coming Soon",
    ctaLink: null,
    popular: true,
  },
  {
    name: "2-Month",
    price: "$0.60",
    period: "/ 2 months",
    features: [
      "200 credits total",
      "All tools access",
      "Priority processing speed",
      "Email support",
      "HD downloads",
    ],
    cta: "Coming Soon",
    ctaLink: null,
    popular: false,
  },
];

export function Pricing() {
  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-5xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-16"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-muted-foreground text-lg max-w-md mx-auto">
            Start free. Upgrade when you're ready. No surprises.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className={`relative bg-card border rounded-2xl p-7 ${
                plan.popular
                  ? "border-primary/50 card-glow-accent"
                  : "border-border/60 card-glow"
              }`}
              data-ocid={`pricing.item.${i + 1}`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary/90 text-white text-xs px-3 py-1 border-0">
                    Most Popular
                  </Badge>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-lg font-bold mb-2">{plan.name}</h2>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-bold gradient-text">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {plan.period}
                  </span>
                </div>
              </div>

              <ul className="space-y-3 mb-7">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-3">
                    <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>

              {plan.ctaLink ? (
                <Button
                  asChild
                  className="w-full gradient-btn border-0 text-white h-11 hover:opacity-90"
                  data-ocid={`pricing.primary_button.${i + 1}`}
                >
                  <Link to={plan.ctaLink}>{plan.cta}</Link>
                </Button>
              ) : (
                <Button
                  disabled
                  className="w-full bg-muted text-muted-foreground cursor-not-allowed h-11"
                  data-ocid={`pricing.button.${i + 1}`}
                >
                  {plan.cta}
                </Button>
              )}
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-16 text-center p-8 bg-card border border-border/60 rounded-2xl card-glow"
        >
          <h3 className="text-xl font-bold mb-2">
            Payment Integration Coming Soon
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            We're working on integrating secure payment processing. In the
            meantime, enjoy your free credits and check back soon!
          </p>
          <Button
            asChild
            className="mt-4 gradient-btn border-0 text-white hover:opacity-90"
            data-ocid="pricing.secondary_button"
          >
            <Link to="/signup">Start Free Today</Link>
          </Button>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
