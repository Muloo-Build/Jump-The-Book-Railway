import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/library" component={Library} />
      <Route path="/upload" component={Upload} />
      <Route path="/generate" component={Generate} />
      <Route path="/book/:id" component={BookDetail} />
      <Route path="/position/:id" component={Position} />
      <Route path="/experience/:id" component={Experience} />
      <Route path="/comic/:id" component={Comic} />
      <Route path="/help" component={Help} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
