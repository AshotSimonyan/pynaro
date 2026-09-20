/**
 * Parses the freshness table out of §4 of docs/architecture.md.
 *
 * Test-only, like `section-6.ts`, and for the same reason: the doc is the spec
 * while there is no backend, so a number in `src/query/policy.ts` that no
 * longer matches the table is a silent divergence between what the team agreed
 * and what the app does.
 *
 * Everything it returns is derived from prose. It deliberately does not know
 * the names in `policy.ts` — matching the two up is the test's job.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ARCHITECTURE = join(__dirname, "..", "..", "docs", "architecture.md");

export type DocumentedFreshness = {
  /** The first cell, verbatim, e.g. `Job detail, active`. */
  query: string;
  /**
   * Milliseconds, or the literal `"static"`. The doc writes TanStack's own
   * value there rather than the word "infinite", because the two behave
   * differently and the table is what stops the weaker one being written back
   * in — so this parser passes it straight through instead of flattening it to
   * a number.
   */
  staleTime: number | "static";
  /** Milliseconds, from a "poll N s" phrase in the third cell. Null if it does not poll. */
  pollInterval: number | null;
  /** The third cell, verbatim. */
  refetch: string;
};

function section4(): string {
  const md = readFileSync(ARCHITECTURE, "utf8");
  const after = md.split("## 4. Server state vs client state")[1];
  if (after === undefined) throw new Error("§4 not found in docs/architecture.md");
  const body = after.split("\n## 5.")[0];
  if (body === undefined) throw new Error("§5 not found; cannot bound §4");
  return body;
}

const UNIT_MS: Record<string, number> = {
  s: 1000,
  min: 60 * 1000,
  h: 60 * 60 * 1000,
};

function durationMs(text: string): number {
  const match = /^(\d+)\s*(s|min|h)$/.exec(text);
  if (match === null) throw new Error(`unparseable duration in §4: ${text}`);
  const unit = UNIT_MS[match[2] as string];
  if (unit === undefined) throw new Error(`unknown unit in §4: ${text}`);
  return Number(match[1]) * unit;
}

/**
 * A staleTime cell: a duration, or the backticked literal `"static"`.
 *
 * "infinite" is deliberately not accepted. It is the word the table used to
 * carry, and the one that invites `Infinity` back into the code, so spelling it
 * again fails loudly rather than parsing to something the code no longer says.
 */
function staleTimeOf(text: string): number | "static" {
  const literal = /^`"(.+)"`$/.exec(text)?.[1];
  if (literal === "static") return "static";
  if (literal !== undefined) throw new Error(`unknown staleTime literal in §4: ${text}`);
  if (text === "infinite") {
    throw new Error(
      '§4 says "infinite"; it should say `"static"`, which is what the code sets. ' +
        "See the note under the table.",
    );
  }
  return durationMs(text);
}

/** `poll 15 s while the map screen is focused` -> 15000. */
function pollMs(refetch: string): number | null {
  const match = /poll (\d+)\s*(s|min|h)\b/.exec(refetch);
  if (match === null) return null;
  return durationMs(`${match[1]} ${match[2]}`);
}

/** Three-cell rows only, and not the header or its separator. */
export function documentedFreshness(): DocumentedFreshness[] {
  return section4()
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
        cells.length === 3 && cells[0] !== "Query" && !/^-+$/.test(cells[0] ?? ""),
    )
    .map((cells) => {
      const [query, staleTime, refetch] = cells as [string, string, string];
      return {
        query,
        staleTime: staleTimeOf(staleTime),
        pollInterval: pollMs(refetch),
        refetch,
      };
    });
}
