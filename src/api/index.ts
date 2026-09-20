// The only module above this folder anyone imports. It picks the adapter from
// EXPO_PUBLIC_API_MODE and re-exports the API functions behind one interface,
// so swapping the mock for HTTP in step 14 is a change here and nowhere else.
export {};
