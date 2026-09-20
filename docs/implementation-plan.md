# Implementation plan

Fourteen steps. One per session. Do the step, run typecheck and lint, stop and
report. Do not start the next step.

Steps 1 to 6 are the foundation and run in order. After that, 8 to 13 can be
reordered freely.

## The mock is not throwaway

It sits behind the exact interface the real HTTP client will have, so swapping
it later is a one-line change. Since the backend has no spec yet, this mock is
the contract we hand the backend developer in step 14.

```
src/api/index.ts      picks the adapter from EXPO_PUBLIC_API_MODE
src/api/types.ts      the contract, ported from the prototype
src/api/mock/         in-memory store, job state machine, latency, failures
src/api/http/         real adapter, empty until step 14
```

Everything above `src/api` never knows which one is running.

## Steps

### 1. Scaffold

Expo + TypeScript strict + Expo Router. `app.config.ts` with dev, staging and
production variants (distinct bundle ids, names, URL schemes). Path alias
`@/*` to `src/*`. ESLint and Prettier. The folder skeleton from the
architecture doc, with empty placeholder files. Local prebuild so the app runs
on iOS.

Done when: the app builds and boots to a blank screen.

### 2. Theme and UI primitives

Tokens ported from the prototype's `app/globals.css`: primary `#075cf2`,
ink `#071a3b`, background `#f3f6fb`, radius 14, plus the category accent
colors.

Primitives: Button, Input, Textarea, Card, Badge, Switch, Progress, Avatar,
Sheet, EmptyState, Toast.

Done when: a dev-only screen renders every primitive in every variant.

### 3. Domain types

Port `Category`, `Business`, `Technician`, `Job`, `EstimateItem`, `EventItem`,
`statusLabels` and the transition table from the prototype into
`src/api/types.ts`. Money in cents. Dates ISO 8601.

Done when: types compile and the transition table matches section 6 of the
architecture doc.

### 4. Mock adapter

In-memory store seeded from the prototype's `lib/pynaro-data.ts`: 12
categories, 5 businesses, 10 technicians, platform settings.

Implements the ten-state job machine with real guards, rejecting an illegal
intent the way the backend will. Artificial latency, and a toggle that forces
failures so error states can be built and tested.

Done when: the intents in section 6 of the architecture doc all work and
illegal ones are refused.

### 5. Query layer

QueryClient, the key factory, hooks over the API functions, and the polling
and staleTime rules from section 4 of the architecture doc.

Done when: hooks return mock data and polling stops on terminal job states.

### 6. Session and route groups

Mock sign-in returning a customer or technician session. SecureStore. Root
gate holding the splash while the session hydrates. The three route groups and
both tab bars.

Done when: signing in as either role lands in the right group, and a deep link
into the wrong group redirects.

### 7. Auth and onboarding screens

The three prototype screens: welcome, create account, permissions setup.

### 8. Customer home, bookings, account

Home with search, emergency card, category grid, active job card, recent
service. Bookings list. Account screen without the role picker.

### 9. Map screen

react-native-maps. Availability from the mock. Map and list toggle. Provider
sheet and provider profile screen.

### 10. Request wizard

Five steps: service, details, address, provider, review. Draft store scoped to
the wizard stack. Image picker, max five files, images and video.

### 11. Job detail

Waiting state with the response countdown, tracking, estimate approval,
payment, receipt and review.

### 12. Technician app

Dashboard with availability toggle and metrics, nearby requests, accept and
the status transitions, estimate creation, earnings.

### 13. Messages

Thin, backed by the mock. The prototype's version is a local array, so treat
this as new design rather than a port.

### 14. Handover

Generate an OpenAPI 3.1 document from `src/api/types.ts` and the mock's
routes. Give it to the backend developer alongside the decision table in the
architecture doc. Fill in `src/api/http/` behind the same interface.
