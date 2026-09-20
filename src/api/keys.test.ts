/**
 * The key factory's two invariants: a namespace's `all` is a prefix of
 * everything under it, and a list can never be mistaken for a detail.
 *
 * Both are invisible at runtime when broken. A `setQueryData` on a key no query
 * uses writes happily to nothing, and an invalidation with the wrong prefix
 * matches nothing and reports no error — the screen just keeps showing what it
 * had.
 */
import { keys } from "./keys";

/** The same prefix match Query uses to decide whether a filter hits a key. */
function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  return prefix.every(
    (segment, index) => JSON.stringify(segment) === JSON.stringify(key[index]),
  );
}

describe("keys", () => {
  it("sweeps every job query from jobs.all", () => {
    expect(isPrefixOf(keys.jobs.all, keys.jobs.list())).toBe(true);
    expect(isPrefixOf(keys.jobs.all, keys.jobs.list({ status: ["requested"] }))).toBe(
      true,
    );
    expect(isPrefixOf(keys.jobs.all, keys.jobs.detail("job_1"))).toBe(true);
  });

  it("sweeps every list but no detail from jobs.lists()", () => {
    expect(isPrefixOf(keys.jobs.lists(), keys.jobs.list({ limit: 5 }))).toBe(true);
    expect(isPrefixOf(keys.jobs.lists(), keys.jobs.detail("job_1"))).toBe(false);
  });

  it("keeps a business id and a business filter in different namespaces", () => {
    // Without the "list"/"detail" segment these two would be ['catalog',
    // 'businesses', x] and could collide.
    expect(isPrefixOf(keys.catalog.businesses(), keys.catalog.business("biz_1"))).toBe(
      false,
    );
    expect(isPrefixOf(keys.catalog.all, keys.catalog.business("biz_1"))).toBe(true);
    expect(isPrefixOf(keys.catalog.all, keys.catalog.categories())).toBe(true);
  });

  it("hashes a filter by value, so an inline object is stable across renders", () => {
    expect(keys.jobs.list({ status: ["requested"] })).toEqual(
      keys.jobs.list({ status: ["requested"] }),
    );
    expect(keys.jobs.list()).toEqual(keys.jobs.list({}));
  });

  it("separates availability from the catalog", () => {
    expect(isPrefixOf(keys.catalog.all, keys.availability.list())).toBe(false);
    expect(isPrefixOf(keys.availability.all, keys.availability.detail("tech_1"))).toBe(
      true,
    );
  });
});
