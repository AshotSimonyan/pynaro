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

Implements the eleven-state job machine with real guards, rejecting an illegal
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
into the wrong group does not render it — the guarded-off group is not in the
navigation state to be linked into (section 2).

### 7. Auth and onboarding screens

The three prototype screens: welcome, create account, permissions setup.
`signUp` and `signInWithProvider` join the contract, both backed by the mock.

**Onboarding is the tail of sign-up, not a first-run screen.** Creating an
account does not adopt the session; the setup screen does, on Continue. Section
2 explains why — a session existing is what unmounts `(auth)`, so a screen that
runs after sign-up and before the app has to live in front of that.

**Location asks for real, notifications do not.** The setup screen requests
foreground location through `expo-location`, and handles the third state as
well as the two obvious ones: denied-and-not-askable-again sends people to
Settings rather than to a button that silently does nothing. The notifications
switch stores a preference only — see step 10.

**Left open, for step 8 or 12.** `listJobs` and `getJob` in the mock are not
scoped to the caller: every session sees every seeded job. Step 7 surfaced it
by making accounts that own nothing, and it stays invisible until step 8 renders
a bookings list. Customer scoping is one line; technician scoping is not, since
"which jobs may a technician see" is the same question as step 12's nearby
requests. Whichever of the two lands first should settle both.

Done when: Get Started leads to an account that exists in the mock, the setup
screen prompts for location, and Continue lands in the customer group. Both
social buttons produce a real session through the same seam.

### 8. Customer home, bookings, account

Home with search, emergency card, category grid, active job card, recent
service. Bookings list. Account screen without the role picker.

### 9. Map screen

react-native-maps. Availability from the mock. Map and list toggle. Provider
sheet and provider profile screen.

### 10. Request wizard

Five steps: service, details, address, provider, review. Draft store scoped to
the wizard stack. Image picker, max five files, images and video.

**The two onboarding preferences land here.** Step 7's setup screen stores a
notification preference without ever showing an OS prompt, and a default
service address. This step reads both: the address prefills the wizard's address
step, and once the first request is sent — the first moment there is anything
worth being notified about — the app asks the system for notification
permission if the preference says yes. Asking during onboarding is how an app
collects a "no" before it has earned the "yes".

**Request again.** A job in `expired` or `cancelled` offers "Request again" on
the job detail screen. It opens the wizard prefilled from that job — trade,
problem, urgency, address, unit, access notes — with the provider selection
cleared, and ends by creating a new job.

Client-side only: no new state, no new intent, no link between the old job and
the new one. It is the wizard with a starting draft, not a transition, which is
what §6's no-lead-blasting rule requires — moving a job to another provider is
a fresh decision by the customer, so it has to produce a fresh request.

Clearing the provider is the point rather than a detail. Re-requesting from the
business that just failed to answer is the one outcome nobody wants, so the
provider step starts empty and has to be chosen again.

This is the promise the prototype's countdown makes and never keeps: at zero it
renders *"Response window ended — choose another pro"* and offers no way to do
so. Copy that line into the expired state, and make it a button.

### 11. Job detail

Waiting state with the response countdown, tracking, estimate approval,
payment, receipt and review.

The expired and cancelled states carry the "Request again" button specified in
step 10; whichever of the two steps lands second wires it up.

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

**Strip the mock from production builds.** `src/api/index.ts` imports both
adapters statically and picks between them at runtime, so today the mock, its
seed data and its dev controls are all in the shipped bundle. That is harmless
while the mock is the only adapter that works and every build points at it. It
stops being harmless the moment a real backend exists: a production app would
carry a second, fully functional data layer plus fixture customers and jobs,
reachable by anything that can flip `apiMode`.

Turning it into a build-time branch is the fix, so the unused adapter is never
in the graph rather than merely unreachable. Done when a production bundle
contains no string from `src/api/mock/seed.ts` — grep the output of
`expo export`, do not take the bundler's word for it.
