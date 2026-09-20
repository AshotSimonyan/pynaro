/**
 * Reading a network state, apart from the module that produces one.
 *
 * It is its own file so the judgement below can be tested. `expo-network` is a
 * native module and will not load in the Node test project, so a predicate
 * sitting next to the `import * as Network` in `online.ts` would be untestable
 * — and this is not a predicate worth taking on trust.
 *
 * The shape is structural rather than `expo-network`'s `NetworkState`, which
 * keeps the native module out of this file entirely.
 */
export type NetworkStateFields = {
  isConnected?: boolean;
  isInternetReachable?: boolean;
};

/**
 * Both fields are optional, and `isInternetReachable` is undefined until the
 * platform has probed, so only a definite "no" counts as offline.
 *
 * The asymmetry is the point. Query pauses every query while the online
 * manager says offline, so a false negative reads to the user as an app that
 * has hung, with no error and no spinner to explain it. A false positive costs
 * one failed request and a retry. The mistake worth making is the cheap one.
 */
export function isOnline(state: NetworkStateFields): boolean {
  if (state.isConnected === false) return false;
  if (state.isInternetReachable === false) return false;
  return true;
}
