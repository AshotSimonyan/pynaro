/**
 * The one QueryClientProvider, mounted in the root layout above every group.
 *
 * It sits above the session gate rather than inside it, because logout has to
 * be able to call `queryClient.clear()` (§5) and a provider that unmounts with
 * the session would take the cache with it before anyone could.
 */
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

import { useAppStateFocus } from "./app-focus";
import { createQueryClient } from "./client";
import { useNetworkOnline } from "./online";

export function QueryProvider({ children }: { children: ReactNode }) {
  // Held in state rather than built at module scope, so a fast refresh that
  // remounts the tree cannot leave two clients writing into one screen.
  const [queryClient] = useState(createQueryClient);
  useAppStateFocus();
  useNetworkOnline();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
