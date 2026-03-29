import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LogOut, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Navbar() {
  const { isLoggedIn, user, credits, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 backdrop-blur-md"
      style={{ background: "oklch(0.10 0.022 260 / 0.95)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2" data-ocid="nav.link">
            <div className="w-8 h-8 rounded-lg gradient-btn flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">
              AIToolsHub
            </span>
          </Link>

          {/* Center links */}
          <div className="hidden md:flex items-center gap-8">
            <a
              href="/#tools"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              All Tools
            </a>
            <a
              href="/#features"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              Features
            </a>
            <Link
              to="/pricing"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-ocid="nav.link"
            >
              Pricing
            </Link>
            {isLoggedIn && (
              <Link
                to="/dashboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-ocid="nav.dashboard_link"
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Right section */}
          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <>
                <div
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border border-primary/30 bg-primary/10 text-primary"
                  data-ocid="nav.credits_pill"
                >
                  <Zap className="w-3 h-3" />
                  {credits} credits
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="outline-none">
                      <Avatar className="w-8 h-8 cursor-pointer">
                        <AvatarFallback className="text-xs gradient-btn text-white">
                          {user?.username?.slice(0, 2).toUpperCase() ?? "AI"}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="bg-card border-border"
                  >
                    <DropdownMenuItem
                      className="text-muted-foreground text-xs"
                      disabled
                    >
                      {user?.email}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => navigate({ to: "/dashboard" })}
                      data-ocid="nav.dashboard_link"
                    >
                      <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive"
                      data-ocid="nav.logout_button"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="border-border/60 text-muted-foreground hover:text-foreground"
                >
                  <Link to="/login" data-ocid="nav.login_button">
                    Login
                  </Link>
                </Button>
                <Button
                  size="sm"
                  asChild
                  className="gradient-btn border-0 text-white hover:opacity-90"
                >
                  <Link to="/signup" data-ocid="nav.signup_button">
                    Sign Up
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
