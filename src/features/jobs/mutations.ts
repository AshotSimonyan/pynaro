/**
 * Writing jobs. One hook per intent of the §6 table, and no hook anywhere that
 * sends a target status.
 *
 * Every one of them goes through `useJobWrite`, so the cache rules of §4 are
 * written once: write through from the response, never guess, and adopt the
 * job a `409` hands back.
 */
import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import {
  api,
  isJobConflictError,
  keys,
  type Cents,
  type CreateJobInput,
  type EstimateItem,
  type Job,
} from "@/api";
import { useIdempotencyKey } from "@/lib/idempotency";

/**
 * What every job write does to the cache, decided in one place.
 *
 * §4: "mutations write through, they do not guess". The response is the full
 * updated job, so the detail is seeded from it and the screen re-renders on the
 * server's own answer rather than on a prediction. `jobs.all` is then
 * invalidated because a status change moves the job between every list that
 * filters on status, and this is the only handle that reaches all of them.
 *
 * That sweep does mark the detail we just seeded, which refetches it once more.
 * It is a cheap backstop on an action the user just took — and it costs nothing
 * at all on the writes that finish a job, because a terminal detail is
 * `staleTime: "static"` and Query never refetches a static query.
 */
function adopt(queryClient: QueryClient, job: Job): void {
  queryClient.setQueryData(keys.jobs.detail(job.id), job);
  void queryClient.invalidateQueries({ queryKey: keys.jobs.all });
}

/**
 * The shared shape of a job write.
 *
 * `afterSuccess` exists for the idempotency key: the three writes that carry
 * one have to retire it when it has been spent.
 */
function useJobWrite<TVariables>(
  mutationFn: (variables: TVariables) => Promise<Job>,
  afterSuccess?: () => void,
): UseMutationResult<Job, Error, TVariables> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: (job) => {
      adopt(queryClient, job);
      afterSuccess?.();
    },
    onError: (error) => {
      // §6: conflicts are expected, not exceptional. A 409 carries the job's
      // current state, so adopting it replaces the stale affordance the user
      // just pressed with the truth. The error still propagates — the screen
      // has to say the job moved on, not just quietly redraw.
      if (isJobConflictError(error)) adopt(queryClient, error.job);
    },
  });
}

// ---------------------------------------------------------------------------
// Customer intents
// ---------------------------------------------------------------------------

export function useCreateJob() {
  const idempotency = useIdempotencyKey("create-job");
  return useJobWrite<CreateJobInput>(
    (input) => api.createJob(input, { idempotencyKey: idempotency.key }),
    idempotency.rotate,
  );
}

export function useCancelJob(id: string) {
  return useJobWrite<void>(() => api.cancelJob(id));
}

export function useApproveEstimate(id: string) {
  const idempotency = useIdempotencyKey(`approve-estimate:${id}`);
  return useJobWrite<void>(
    () => api.approveEstimate(id, { idempotencyKey: idempotency.key }),
    idempotency.rotate,
  );
}

export function useDeclineEstimate(id: string) {
  return useJobWrite<void>(() => api.declineEstimate(id));
}

export function usePayJob(id: string) {
  const idempotency = useIdempotencyKey(`pay:${id}`);
  return useJobWrite<{ tip: Cents }>(
    (input) => api.payJob(id, input, { idempotencyKey: idempotency.key }),
    idempotency.rotate,
  );
}

// ---------------------------------------------------------------------------
// Technician intents
// ---------------------------------------------------------------------------

export function useAcceptJob(id: string) {
  return useJobWrite<void>(() => api.acceptJob(id));
}

export function useDepartJob(id: string) {
  return useJobWrite<void>(() => api.departJob(id));
}

export function useArriveJob(id: string) {
  return useJobWrite<void>(() => api.arriveJob(id));
}

export function useSendEstimate(id: string) {
  return useJobWrite<readonly EstimateItem[]>((items) => api.sendEstimate(id, items));
}

export function useStartJob(id: string) {
  return useJobWrite<void>(() => api.startJob(id));
}

/**
 * Legal from `in_progress` and from `arrived` — a visit that ends with no
 * approved estimate (§6). One hook covers both: the server decides which
 * transition it is, and the screen does not need to know.
 */
export function useCompleteJob(id: string) {
  return useJobWrite<void>(() => api.completeJob(id));
}
