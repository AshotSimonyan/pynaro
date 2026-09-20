/**
 * Parses the job state machine out of §6 of docs/architecture.md.
 *
 * Test-only. Nothing in the app imports it, so it never reaches a bundle. It
 * lives here rather than inside one test file because two separate tables are
 * checked against §6: the app's affordance table in `src/domain`, and the
 * mock's authoritative machine in `src/api/mock`.
 *
 * Everything it returns is plain strings. It is reading prose, so it cannot
 * assume the doc names a state the code knows about — proving that it does is
 * the tests' job.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

export type DocumentedTransition = {
  from: string;
  trigger: string;
  to: string;
  actors: string[];
};

const ARCHITECTURE = join(__dirname, "..", "..", "docs", "architecture.md");

/** The path segment under `/jobs/{id}/`, mapped to the trigger it stands for. */
const ENDPOINT_TO_TRIGGER: Record<string, string> = {
  accept: "accept",
  cancel: "cancel",
  depart: "depart",
  arrive: "arrive",
  estimate: "estimate",
  "estimate/approve": "approve_estimate",
  "estimate/decline": "decline_estimate",
  start: "start",
  complete: "complete",
  pay: "pay",
};

/** How the doc's prose names each actor. */
const ACTOR_PHRASES = [
  { phrase: "technician", actor: "technician" },
  { phrase: "dispatcher", actor: "dispatcher" },
  { phrase: "customer", actor: "customer" },
  { phrase: "response timer", actor: "system" },
] as const;

export function section6(): string {
  const md = readFileSync(ARCHITECTURE, "utf8");
  const after = md.split("## 6. Job state machine")[1];
  if (after === undefined) throw new Error("§6 not found in docs/architecture.md");
  const body = after.split("\n## 7.")[0];
  if (body === undefined) throw new Error("§7 not found; cannot bound §6");
  return body;
}

/** Table rows only: four cells, and not the header or its separator. */
function tableRows(body: string): string[][] {
  return body
    .split("\n")
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim()),
    )
    .filter(
      (cells) =>
        cells.length === 4 && cells[0] !== "From" && !/^-+$/.test(cells[0] ?? ""),
    );
}

function triggerFrom(endpointCell: string): string {
  const quoted = /`([^`]+)`/.exec(endpointCell)?.[1];
  if (quoted === undefined) {
    throw new Error(`no backticked token in endpoint cell: ${endpointCell}`);
  }
  const path = /\/jobs\/\{id\}\/(.+)$/.exec(quoted)?.[1];
  // A row with no route is server-initiated; the token is the trigger itself.
  if (path === undefined) return quoted;
  const trigger = ENDPOINT_TO_TRIGGER[path];
  if (trigger === undefined) throw new Error(`unmapped endpoint: ${quoted}`);
  return trigger;
}

function actorsFrom(actorCell: string): string[] {
  return ACTOR_PHRASES.filter(({ phrase }) => actorCell.includes(phrase))
    .map(({ actor }) => actor)
    .sort();
}

export function documentedTransitions(): DocumentedTransition[] {
  return tableRows(section6()).map((cells) => {
    const [from, actor, endpoint, to] = cells as [string, string, string, string];
    return {
      from,
      trigger: triggerFrom(endpoint),
      to,
      actors: actorsFrom(actor),
    };
  });
}

/** `a --> b` edges from the mermaid diagram, `[*]` included. */
export function diagramEdges(): [string, string][] {
  const mermaid = section6().split("```mermaid")[1]?.split("```")[0] ?? "";
  return [...mermaid.matchAll(/^\s*(\S+) --> (\S+)$/gm)].map((m) => [
    m[1] as string,
    m[2] as string,
  ]);
}

/**
 * Compares a code table against §6, ignoring actor order. Returns the shape
 * both tests assert on.
 */
export function normalise(
  transition: Readonly<{
    from: string;
    trigger: string;
    to: string;
    actors: readonly string[];
  }>,
): DocumentedTransition {
  return {
    from: transition.from,
    trigger: transition.trigger,
    to: transition.to,
    actors: [...transition.actors].sort(),
  };
}
