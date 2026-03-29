import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AdminCreditGuard } from "./components/AdminCreditGuard";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { Dashboard } from "./pages/Dashboard";
import { Landing } from "./pages/Landing";
import { Login } from "./pages/Login";
import { Pricing } from "./pages/Pricing";
import { Signup } from "./pages/Signup";
import { AudioEditor } from "./pages/tools/AudioEditor";
import { BackgroundChanger } from "./pages/tools/BackgroundChanger";
import { BackgroundRemover } from "./pages/tools/BackgroundRemover";
import { TextToSpeech } from "./pages/tools/TextToSpeech";
import { WatermarkRemover } from "./pages/tools/WatermarkRemover";

const rootRoute = createRootRoute({
  component: () => (
    <AuthProvider>
      <AdminCreditGuard />
      <div className="font-jakarta">
        <Navbar />
        <Outlet />
        <Toaster richColors position="bottom-right" />
      </div>
    </AuthProvider>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Landing,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: Login,
});

const signupRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signup",
  component: Signup,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  ),
});

const pricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pricing",
  component: Pricing,
});

const bgRemoverRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/background-remover",
  component: () => (
    <ProtectedRoute>
      <BackgroundRemover />
    </ProtectedRoute>
  ),
});

const watermarkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/watermark-remover",
  component: () => (
    <ProtectedRoute>
      <WatermarkRemover />
    </ProtectedRoute>
  ),
});

const audioRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/audio-editor",
  component: () => (
    <ProtectedRoute>
      <AudioEditor />
    </ProtectedRoute>
  ),
});

const bgChangerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/background-changer",
  component: () => (
    <ProtectedRoute>
      <BackgroundChanger />
    </ProtectedRoute>
  ),
});

const ttsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tools/text-to-speech",
  component: () => (
    <ProtectedRoute>
      <TextToSpeech />
    </ProtectedRoute>
  ),
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,
  pricingRoute,
  bgRemoverRoute,
  watermarkRoute,
  audioRoute,
  bgChangerRoute,
  ttsRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
