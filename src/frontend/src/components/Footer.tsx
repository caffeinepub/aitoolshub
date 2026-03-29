import { Link } from "@tanstack/react-router";
import { Zap } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";

  return (
    <footer className="border-t border-border/40 mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-lg">AIToolsHub</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              All AI tools in one place. Fast, easy, and affordable for
              everyone.
            </p>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Tools</h4>
            <ul className="space-y-2">
              {[
                {
                  label: "Background Remover",
                  to: "/tools/background-remover",
                },
                { label: "Watermark Remover", to: "/tools/watermark-remover" },
                { label: "Audio Editor", to: "/tools/audio-editor" },
                {
                  label: "Background Changer",
                  to: "/tools/background-changer",
                },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold mb-4">Company</h4>
            <ul className="space-y-2">
              {[
                { label: "Pricing", to: "/pricing" },
                { label: "Dashboard", to: "/dashboard" },
                { label: "Sign Up", to: "/signup" },
              ].map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {year}. Built with ❤️ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
