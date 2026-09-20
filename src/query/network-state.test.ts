/**
 * The one judgement call in the online bridge: what an unknown network state
 * means.
 */
import { isOnline } from "./network-state";

describe("isOnline", () => {
  it("is offline only when the device says so", () => {
    expect(isOnline({ isConnected: false, isInternetReachable: false })).toBe(false);
    expect(isOnline({ isConnected: false })).toBe(false);
    expect(isOnline({ isConnected: true, isInternetReachable: false })).toBe(false);
  });

  it("treats a connected device as online", () => {
    expect(isOnline({ isConnected: true, isInternetReachable: true })).toBe(true);
  });

  it("treats an unanswered field as online rather than offline", () => {
    // `isInternetReachable` is undefined until the platform has probed, and on
    // web `isConnected` can be too. Reading either as offline would pause every
    // query behind a radio the device never said was down.
    expect(isOnline({ isConnected: true })).toBe(true);
    expect(isOnline({})).toBe(true);
  });
});
