/**
 * Step 4's acceptance criterion: every intent in §6 works, and illegal ones are
 * refused. "Illegal" has three shapes here and they are not interchangeable —
 * wrong state is a `409` carrying the job, wrong role is a `403`, and wrong
 * person is a `403` of a different code.
 */
import { ApiError, JobConflictError } from "../errors";
import type { CreateJobInput } from "../contract";
import type { EstimateItem, Job } from "../types";

import { mockApi as api, mockDevControls as dev } from "./index";

const CUSTOMER = { role: "customer", id: "arman" } as const;
const MARCUS = { role: "technician", id: "marcus" } as const; // Andy's Plumbing
const ELENA = { role: "technician", id: "elena" } as const; // Andy's Plumbing
const OMAR = { role: "technician", id: "omar" } as const; // SecureNow

const REQUEST: CreateJobInput = {
  categoryId: "plumbing",
  problem: "Water pooling under the kitchen sink since this morning.",
  urgency: "now",
  address: "1420 Ocean Park Blvd",
  unit: "3B",
  requestedBusinessId: "andys",
};

const ESTIMATE: EstimateItem[] = [
  { description: "Replace sink trap", quantity: 1, unitPrice: 12000 },
];

beforeEach(() => {
  dev.reset();
  // Latency is the thing under test in exactly one place; everywhere else it is
  // just slow.
  dev.setLatency(0);
});

/** Captures the error an awaited call throws, so its fields can be asserted. */
async function failure(run: () => Promise<unknown>): Promise<ApiError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("expected the call to fail, but it resolved");
}

/** Drives a fresh job as far as `arrived`, the fork in the machine. */
async function jobAtArrived(): Promise<Job> {
  dev.actAs(CUSTOMER);
  const created = await api.createJob(REQUEST);
  dev.actAs(MARCUS);
  await api.acceptJob(created.id);
  await api.departJob(created.id);
  return api.arriveJob(created.id);
}

describe("the catalog", () => {
  it("serves the prototype's seed data", async () => {
    expect(await api.listCategories()).toHaveLength(12);
    expect(await api.listBusinesses()).toHaveLength(5);
    expect(await api.listTechnicians()).toHaveLength(10);
  });

  it("quotes money in integer cents", async () => {
    const businesses = await api.listBusinesses();
    for (const business of businesses) {
      expect(Number.isInteger(business.serviceCallFee)).toBe(true);
      expect(business.currency).toBe("USD");
    }
    // The prototype says 75 dollars; the contract says cents.
    expect((await api.getBusiness("andys")).serviceCallFee).toBe(7500);
  });

  it("filters by trade", async () => {
    const plumbers = await api.listBusinesses({ categoryId: "plumbing" });
    expect(plumbers.map((b) => b.id)).toEqual(["andys"]);
    const andys = await api.listTechnicians({ businessId: "andys" });
    expect(andys.map((t) => t.id).sort()).toEqual(["daniel", "elena", "marcus"]);
  });

  it("serves the platform settings", async () => {
    expect(await api.getSettings()).toEqual({
      feePercent: 12,
      emergencyResponseSeconds: 120,
      immediateResponseSeconds: 300,
      preciseLocationAfterAcceptance: true,
    });
  });

  it("404s an unknown id", async () => {
    const error = await failure(() => api.getBusiness("nope"));
    expect(error.code).toBe("not_found");
    expect(error.status).toBe(404);
  });
});

describe("creating a job", () => {
  it("starts it requested, priced from the business, with a response window", async () => {
    dev.actAs(CUSTOMER);
    const job = await api.createJob(REQUEST);
    expect(job.status).toBe("requested");
    expect(job.serviceCallFee).toBe(7500);
    expect(job.estimateTotal).toBe(0);
    expect(job.businessId).toBeNull();
    expect(job.technicianId).toBeNull();
    expect(job.expiresAt).not.toBeNull();
    expect(job.events.map((e) => e.label)).toEqual(["Request created"]);
  });

  it("gives a scheduled job no countdown", async () => {
    dev.actAs(CUSTOMER);
    const job = await api.createJob({
      ...REQUEST,
      urgency: "scheduled",
      scheduledFor: new Date(Date.now() + 86_400_000).toISOString(),
    });
    expect(job.expiresAt).toBeNull();
  });

  it("refuses a business that does not serve the trade", async () => {
    dev.actAs(CUSTOMER);
    const error = await failure(() =>
      api.createJob({ ...REQUEST, requestedBusinessId: "roadready" }),
    );
    expect(error.code).toBe("validation_failed");
    expect(error.status).toBe(422);
    expect(error.field).toBe("requestedBusinessId");
  });

  it("names the field it rejected", async () => {
    dev.actAs(CUSTOMER);
    expect(
      (await failure(() => api.createJob({ ...REQUEST, problem: "leak" }))).field,
    ).toBe("problem");
    expect(
      (await failure(() => api.createJob({ ...REQUEST, categoryId: "nope" }))).field,
    ).toBe("categoryId");
    expect((await failure(() => api.createJob({ ...REQUEST, address: "x" }))).field).toBe(
      "address",
    );
    expect(
      (await failure(() => api.createJob({ ...REQUEST, urgency: "scheduled" }))).field,
    ).toBe("scheduledFor");
  });

  it("does not create twice for one idempotency key", async () => {
    dev.actAs(CUSTOMER);
    const before = (await api.listJobs({ limit: 100 })).data.length;
    const first = await api.createJob(REQUEST, { idempotencyKey: "abc" });
    const second = await api.createJob(REQUEST, { idempotencyKey: "abc" });
    expect(second.id).toBe(first.id);
    expect((await api.listJobs({ limit: 100 })).data).toHaveLength(before + 1);
  });
});

describe("the happy path", () => {
  it("runs every §6 intent from requested to paid", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);

    dev.actAs(MARCUS);
    expect((await api.acceptJob(created.id)).status).toBe("accepted");
    expect((await api.departJob(created.id)).status).toBe("en_route");
    expect((await api.arriveJob(created.id)).status).toBe("arrived");
    const estimated = await api.sendEstimate(created.id, ESTIMATE);
    expect(estimated.status).toBe("estimate_sent");
    expect(estimated.estimateTotal).toBe(12000);

    dev.actAs(CUSTOMER);
    expect((await api.approveEstimate(created.id)).status).toBe("approved");

    dev.actAs(MARCUS);
    expect((await api.startJob(created.id)).status).toBe("in_progress");
    expect((await api.completeJob(created.id)).status).toBe("completed");

    dev.actAs(CUSTOMER);
    const paid = await api.payJob(created.id, { tip: 3000 });
    expect(paid.status).toBe("paid");
    expect(paid.paymentStatus).toBe("paid");
  });

  it("assigns the accepting technician and their business, and stops the clock", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    dev.actAs(MARCUS);
    const accepted = await api.acceptJob(created.id);
    expect(accepted.technicianId).toBe("marcus");
    expect(accepted.businessId).toBe("andys");
    expect(accepted.expiresAt).toBeNull();
  });

  it("writes a timeline entry for every transition", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    dev.actAs(MARCUS);
    await api.acceptJob(created.id);
    await api.departJob(created.id);
    await api.arriveJob(created.id);
    await api.sendEstimate(created.id, ESTIMATE);
    dev.actAs(CUSTOMER);
    const job = await api.approveEstimate(created.id);
    expect(job.events.map((e) => e.label)).toEqual([
      "Request created",
      "Accepted by Andy's Plumbing",
      "Technician en route",
      "Technician arrived",
      "Estimate sent",
      "Estimate approved by customer",
    ]);
  });

  it("takes the platform fee from the pre-tip total, never from the tip", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    dev.actAs(MARCUS);
    await api.acceptJob(created.id);
    await api.departJob(created.id);
    await api.arriveJob(created.id);
    await api.sendEstimate(created.id, ESTIMATE);
    dev.actAs(CUSTOMER);
    await api.approveEstimate(created.id);
    dev.actAs(MARCUS);
    await api.startJob(created.id);
    await api.completeJob(created.id);
    dev.actAs(CUSTOMER);

    const paid = await api.payJob(created.id, { tip: 3000 });
    // 12000 estimate + 7500 service call = 19500 pre-tip; 12% of that is 2340.
    expect(paid.pynaroFee).toBe(2340);
    expect(paid.tip).toBe(3000);
    expect(Number.isInteger(paid.pynaroFee)).toBe(true);
  });
});

describe("the two decided branches", () => {
  it("returns a declined estimate to arrived and clears it for a revision", async () => {
    const arrived = await jobAtArrived();
    dev.actAs(MARCUS);
    await api.sendEstimate(arrived.id, ESTIMATE);

    dev.actAs(CUSTOMER);
    const declined = await api.declineEstimate(arrived.id);
    expect(declined.status).toBe("arrived");
    expect(declined.estimateTotal).toBe(0);
    expect(declined.estimateItems).toEqual([]);
    expect(declined.events.at(-1)?.label).toBe("Estimate declined");

    // The technician is still on site and can price it again.
    dev.actAs(MARCUS);
    const revised = await api.sendEstimate(arrived.id, [
      { description: "Replace sink trap and supply line", quantity: 1, unitPrice: 9000 },
    ]);
    expect(revised.status).toBe("estimate_sent");
    expect(revised.estimateTotal).toBe(9000);
  });

  it("completes from arrived with only the service call owed", async () => {
    const arrived = await jobAtArrived();
    dev.actAs(MARCUS);
    const completed = await api.completeJob(arrived.id);
    expect(completed.status).toBe("completed");
    expect(completed.estimateTotal).toBe(0);

    dev.actAs(CUSTOMER);
    const paid = await api.payJob(completed.id, { tip: 0 });
    // Nothing but the 7500 service call; 12% of it is 900.
    expect(paid.pynaroFee).toBe(900);
  });
});

describe("illegal intents", () => {
  it("refuses a wrong-state intent with a 409 carrying the current job", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    const error = await failure(() => api.payJob(created.id, { tip: 0 }));
    expect(error).toBeInstanceOf(JobConflictError);
    expect(error.code).toBe("illegal_transition");
    expect(error.status).toBe(409);
    // §6: the client replaces its cache with the state the server returned.
    expect((error as JobConflictError).job.status).toBe("requested");
    expect((error as JobConflictError).job.id).toBe(created.id);
  });

  it("refuses a wrong-role intent with a 403, not a conflict", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    // The transition exists from `requested`; a customer just may not cause it.
    const error = await failure(() => api.acceptJob(created.id));
    expect(error.code).toBe("forbidden_actor");
    expect(error.status).toBe(403);
    expect(error).not.toBeInstanceOf(JobConflictError);
  });

  it("refuses a technician acting on someone else's job", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST);
    dev.actAs(MARCUS);
    await api.acceptJob(created.id);

    // Elena is at the same business but is not on this job.
    dev.actAs(ELENA);
    const error = await failure(() => api.departJob(created.id));
    expect(error.code).toBe("not_owner");
    expect(error.status).toBe(403);
  });

  it("refuses a provider taking a request addressed to another", async () => {
    dev.actAs(CUSTOMER);
    const created = await api.createJob(REQUEST); // addressed to Andy's
    dev.actAs(OMAR); // SecureNow
    expect((await failure(() => api.acceptJob(created.id))).code).toBe("not_owner");
    dev.actAs(MARCUS);
    expect((await api.acceptJob(created.id)).businessId).toBe("andys");
  });

  it("refuses everything once a job is terminal", async () => {
    dev.actAs(CUSTOMER);
    const error = await failure(() => api.cancelJob("job-seed-paid"));
    expect(error.status).toBe(409);
    expect(error.message).toContain("finished");
  });

  it("validates an estimate before it reaches the machine", async () => {
    const arrived = await jobAtArrived();
    dev.actAs(MARCUS);
    expect((await failure(() => api.sendEstimate(arrived.id, []))).field).toBe("items");
    expect(
      (
        await failure(() =>
          api.sendEstimate(arrived.id, [
            { description: "x", quantity: 1, unitPrice: 100 },
          ]),
        )
      ).field,
    ).toBe("items");
    expect(
      (
        await failure(() =>
          api.sendEstimate(arrived.id, [
            { description: "Half a trap", quantity: 1.5, unitPrice: 100 },
          ]),
        )
      ).field,
    ).toBe("items");
    // Rejected input must not have moved the job.
    expect((await api.getJob(arrived.id)).status).toBe("arrived");
  });

  it("404s an intent against a job that does not exist", async () => {
    dev.actAs(CUSTOMER);
    expect((await failure(() => api.cancelJob("nope"))).status).toBe(404);
  });
});

describe("the response window", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("expires an unanswered request, without a timer", async () => {
    jest.useFakeTimers();
    dev.actAs(CUSTOMER);
    const created = await api.createJob({ ...REQUEST, urgency: "emergency" });
    expect(created.status).toBe("requested");

    // The backend expires it; nothing in the app decides this.
    jest.setSystemTime(Date.now() + 5 * 60_000);
    const seen = await api.getJob(created.id);
    expect(seen.status).toBe("expired");
    expect(seen.expiresAt).toBeNull();
    expect(seen.events.at(-1)?.label).toBe("Request expired");
  });

  it("leaves an expired request unacceptable", async () => {
    jest.useFakeTimers();
    dev.actAs(CUSTOMER);
    const created = await api.createJob({ ...REQUEST, urgency: "emergency" });
    jest.setSystemTime(Date.now() + 5 * 60_000);

    dev.actAs(MARCUS);
    const error = await failure(() => api.acceptJob(created.id));
    expect(error.status).toBe(409);
    expect((error as JobConflictError).job.status).toBe("expired");
  });

  it("does not expire a job somebody answered", async () => {
    jest.useFakeTimers();
    dev.actAs(CUSTOMER);
    const created = await api.createJob({ ...REQUEST, urgency: "emergency" });
    dev.actAs(MARCUS);
    await api.acceptJob(created.id);

    jest.setSystemTime(Date.now() + 60 * 60_000);
    expect((await api.getJob(created.id)).status).toBe("accepted");
  });
});

describe("listing jobs", () => {
  it("returns newest first", async () => {
    dev.actAs(CUSTOMER);
    const page = await api.listJobs({ limit: 100 });
    const dates = page.data.map((j) => j.createdAt);
    expect([...dates].sort().reverse()).toEqual(dates);
  });

  it("filters by status", async () => {
    dev.actAs(CUSTOMER);
    const page = await api.listJobs({ status: ["paid"], limit: 100 });
    expect(page.data.every((j) => j.status === "paid")).toBe(true);
    expect(page.data.length).toBeGreaterThan(0);
  });

  it("pages with a cursor and stops", async () => {
    dev.actAs(CUSTOMER);
    const first = await api.listJobs({ limit: 2 });
    expect(first.data).toHaveLength(2);
    expect(first.nextCursor).not.toBeNull();

    const second = await api.listJobs({ limit: 2, cursor: first.nextCursor });
    expect(second.data.map((j) => j.id)).not.toEqual(first.data.map((j) => j.id));
    expect(second.nextCursor).toBeNull();
  });

  it("rejects an unknown cursor rather than silently restarting", async () => {
    dev.actAs(CUSTOMER);
    const error = await failure(() => api.listJobs({ cursor: "nope" }));
    expect(error.code).toBe("validation_failed");
    expect(error.field).toBe("cursor");
  });
});

describe("the store's isolation", () => {
  it("does not let a caller mutate what it handed back", async () => {
    dev.actAs(CUSTOMER);
    const job = await api.getJob("job-seed-en-route");
    job.status = "paid";
    job.events.push({ id: "x", at: "now", label: "forged", detail: null });

    const refetched = await api.getJob("job-seed-en-route");
    expect(refetched.status).toBe("en_route");
    expect(refetched.events.map((e) => e.label)).not.toContain("forged");
  });

  it("restores the seed on reset", async () => {
    dev.actAs(CUSTOMER);
    await api.createJob(REQUEST);
    const grown = (await api.listJobs({ limit: 100 })).data.length;
    dev.reset();
    dev.setLatency(0);
    expect((await api.listJobs({ limit: 100 })).data).toHaveLength(grown - 1);
  });
});

describe("the dev controls", () => {
  it("forces the next call to fail, once", async () => {
    dev.failNext();
    const error = await failure(() => api.listCategories());
    expect(error.code).toBe("server_error");
    expect(error.status).toBe(500);
    // Cleared: the call after it goes through.
    expect(await api.listCategories()).toHaveLength(12);
  });

  it("can force an offline failure, which has no status", async () => {
    dev.failNext("network_error");
    const error = await failure(() => api.listCategories());
    expect(error.code).toBe("network_error");
    expect(error.status).toBe(0);
  });

  it("fails a write before it reaches the store", async () => {
    dev.actAs(CUSTOMER);
    const before = (await api.listJobs({ limit: 100 })).data.length;
    dev.failNext();
    await failure(() => api.createJob(REQUEST));
    expect((await api.listJobs({ limit: 100 })).data).toHaveLength(before);
  });

  it("fails everything at a rate of 1", async () => {
    dev.setFailureRate(1);
    expect((await failure(() => api.listCategories())).code).toBe("server_error");
    dev.setFailureRate(0);
    expect(await api.listCategories()).toHaveLength(12);
  });

  it("spends the latency it is given", async () => {
    dev.setLatency(60);
    const started = Date.now();
    await api.listCategories();
    // Generous lower bound: the point is that the delay happens at all.
    expect(Date.now() - started).toBeGreaterThanOrEqual(50);
  });

  it("reports and switches the acting role", () => {
    expect(dev.currentActor()).toEqual({ role: "customer", id: "arman" });
    dev.actAs(MARCUS);
    expect(dev.currentActor()).toEqual({ role: "technician", id: "marcus" });
  });
});
