import { useEffect, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import {
  Switch,
  Route,
  Redirect,
  useLocation,
  Router as WouterRouter,
} from "wouter";
import {
  QueryClientProvider,
  useQueryClient,
} from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useRemoteUser } from "@/hooks/useApiLibrary";

import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Library from "@/pages/library";
import Upload from "@/pages/upload";
import Generate from "@/pages/generate";
import BookDetail from "@/pages/book-detail";
import Position from "@/pages/position";
import Experience from "@/pages/experience";
import Comic from "@/pages/comic";
import Help from "@/pages/help";
import Onboarding from "@/pages/onboarding";
import SetupBook from "@/pages/setup-book";
import Playback from "@/pages/playback";
import Discover from "@/pages/discover";
import Account from "@/pages/account";

// In production the Clerk proxy runs on the current host; derive the
// publishable key from window.location so the same build serves multiple
// custom domains. In development the proxy isn't active, so use the
// configured dev publishable key directly (falls back to Clerk's CDN).
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const clerkPubKey = clerkProxyUrl
  ? publishableKeyFromHost(
      window.location.hostname,
      import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
    )
  : import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in .env file");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(40, 80%, 60%)",
    colorForeground: "hsl(40, 25%, 92%)",
    colorMutedForeground: "hsl(40, 18%, 65%)",
    colorDanger: "hsl(0, 70%, 60%)",
    colorBackground: "hsl(240, 12%, 7%)",
    colorInput: "hsl(240, 10%, 12%)",
    colorInputForeground: "hsl(40, 25%, 92%)",
    colorNeutral: "hsl(240, 10%, 22%)",
    fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox:
      "bg-[hsl(240,12%,9%)] border border-[hsl(240,10%,18%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl shadow-amber-500/5",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle:
      "font-serif text-2xl font-bold text-[hsl(40,25%,95%)]",
    headerSubtitle: "text-[hsl(40,18%,68%)] text-sm",
    socialButtonsBlockButton:
      "border-[hsl(240,10%,22%)] hover:bg-[hsl(240,10%,14%)] transition-colors",
    socialButtonsBlockButtonText:
      "text-[hsl(40,25%,92%)] font-medium",
    formFieldLabel: "text-[hsl(40,22%,82%)] font-medium",
    formFieldInput:
      "bg-[hsl(240,10%,12%)] border-[hsl(240,10%,22%)] text-[hsl(40,25%,92%)]",
    formButtonPrimary:
      "bg-[hsl(40,80%,55%)] hover:bg-[hsl(40,80%,62%)] text-[hsl(240,15%,8%)] font-semibold transition-colors",
    footerActionLink:
      "text-[hsl(40,80%,65%)] hover:text-[hsl(40,80%,75%)] font-medium",
    footerActionText: "text-[hsl(40,18%,68%)]",
    footerAction: "border-t border-[hsl(240,10%,18%)] pt-4",
    dividerLine: "bg-[hsl(240,10%,22%)]",
    dividerText: "text-[hsl(40,18%,55%)] text-xs uppercase tracking-wider",
    identityPreviewEditButton: "text-[hsl(40,80%,65%)]",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-[hsl(40,25%,92%)]",
    alert: "bg-[hsl(0,40%,15%)] border-[hsl(0,40%,30%)]",
    logoBox: "mb-2",
    logoImage: "h-10 w-auto",
    otpCodeFieldInput:
      "bg-[hsl(240,10%,12%)] border-[hsl(240,10%,22%)] text-[hsl(40,25%,92%)]",
    formFieldRow: "space-y-2",
    main: "px-6 py-2",
  },
};

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background dark px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-background dark px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const id = user?.id ?? null;
      if (prevRef.current !== undefined && prevRef.current !== id) {
        qc.clear();
      }
      prevRef.current = id;
    });
    return unsubscribe;
  }, [addListener, qc]);
  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <SignedInHome />
      </Show>
      <Show when="signed-out">
        <Home />
      </Show>
    </>
  );
}

function SignedInHome() {
  const { data, isLoading } = useRemoteUser();
  if (isLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background dark text-foreground">
        <span className="text-sm text-muted-foreground">Loading…</span>
      </div>
    );
  }
  if (!data?.onboarded) return <Redirect to="/onboarding" />;
  return <Redirect to="/library" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Redirect to="/sign-in" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey!}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <Switch>
            <Route path="/" component={HomeRedirect} />
            <Route path="/sign-in/*?" component={SignInPage} />
            <Route path="/sign-up/*?" component={SignUpPage} />
            <Route path="/onboarding">
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            </Route>
            <Route path="/account/*?" component={Account} />
            <Route path="/library" component={Library} />
            <Route path="/discover" component={Discover} />
            <Route path="/upload" component={Upload} />
            <Route path="/setup-book" component={SetupBook} />
            <Route path="/generate" component={Generate} />
            <Route path="/book/:id" component={BookDetail} />
            <Route path="/position/:id" component={Position} />
            <Route path="/experience/:id" component={Experience} />
            <Route path="/comic/:id" component={Comic} />
            <Route path="/playback/:id" component={Playback} />
            <Route path="/help" component={Help} />
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
