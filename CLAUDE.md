# Pynaro Mobile

Production React Native app built from the React prototype in `reference/pynaro-mvp/`.

Architecture: `docs/architecture.md`. Read it before any structural work.
Step plan: `docs/implementation-plan.md`. We work through it one step at a time.

## Stack

Expo (latest SDK, New Architecture), TypeScript strict, Expo Router,
TanStack Query, react-native-maps, Zustand for the few client stores.

Approved runtime dependencies. Ask before adding anything else:

expo-router, @tanstack/react-query, zustand, react-native-maps,
expo-location, expo-task-manager, expo-notifications, expo-image-picker,
expo-secure-store, expo-constants, expo-font, expo-network, react-hook-form,
zod, @gorhom/bottom-sheet, react-native-reanimated,
react-native-gesture-handler, @shopify/flash-list,
react-native-svg, lucide-react-native.

## Scope

The mobile app is customer and technician only. The business dispatch and
admin surfaces in the prototype belong to the separate Next.js dashboard and
are not built here.

## Hard rules

- No backend exists yet. All data comes from the mock adapter in `src/api/mock/`.
- Nothing above `src/api` may know which adapter is running. No mock imports
  in screens, hooks or components.
- Money is integer cents everywhere. Format only at render.
- The mock owns the job state machine and enforces its guards. Screens send
  intents, never a target status. No optimistic status updates.
- `reference/pynaro-mvp/` is a UI and UX reference only. Port layout, copy and
  flow. Never copy its shadcn, Radix, Tailwind or Leaflet code.
- Colors, spacing and radii come from `src/theme`. No literal hex in a component.
- TypeScript strict. No `any` in `src/api`.
- The prototype's role picker is a demo control and does not ship. Role comes
  from the session.

## Working agreement

One step at a time. Do the step, run typecheck and lint, then stop and report
what you created. Do not start the next step.
