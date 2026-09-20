# iOS UIScene adoption (temporary)

**Status: temporary workaround. Remove when Expo ships scene adoption in the
prebuild template.**

Owned by `plugins/with-ios-scene-delegate.js`, registered in `app.config.ts`.

## Why it exists

Apps built against the iOS 27 SDK must adopt the UIKit scene life cycle. An app
that does not trips an assertion at launch:

```
UIScene life cycle is required for apps built with this SDK
```

a `SIGTRAP` inside `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`.
Tracked upstream as [expo/expo#46664][46664].

Expo's generated `AppDelegate.swift` still creates the window and starts React
Native from `application(_:didFinishLaunchingWithOptions:)`, so through SDK 57 an
app has to adopt scenes itself.

Declaring `UIApplicationSceneManifest` on its own is not enough, and the way it
fails is easy to misread as progress:

| setup                        | result                                        |
| ---------------------------- | --------------------------------------------- |
| no manifest                  | `SIGTRAP` at launch                            |
| manifest only                | no crash, process alive, **black screen**      |
| manifest + a scene delegate  | React Native mounts and renders                |

The black screen is because the window `AppDelegate` builds with
`UIWindow(frame: UIScreen.main.bounds)` is never attached to the `UIWindowScene`.
The window has to be created *from* the scene, which means `startReactNative` has
to move there too.

## What the plugin does

It does **not** generate a scene delegate. `expo@57.0.23` backported one into the
runtime — `ExpoAppSceneDelegate`, exposed to Objective-C as
`EXExpoAppSceneDelegate` (`node_modules/expo/ios/AppDelegates/`) — and the plugin
points the manifest at that class. Three edits, all reversible by a prebuild:

1. **`Info.plist`** — adds `UIApplicationSceneManifest` naming
   `EXExpoAppSceneDelegate` as the delegate for the single window scene. It throws
   rather than overwrite a manifest some other plugin already wrote.
2. **`AppDelegate.swift`** — conforms `AppDelegate` to
   `ExpoReactNativeFactoryProvider`, the protocol the scene delegate uses to reach
   the `RCTReactNativeFactory` the app delegate still owns.
3. **`AppDelegate.swift`** — removes the window creation and the
   `startReactNative` call from `didFinishLaunchingWithOptions`. Factory creation
   stays put.

The plugin throws with a clear message if any anchor is missing, so a template
change surfaces at prebuild rather than as a black screen on a device.

## Why not the widely copied snippet

[expo/expo#50179][50179] carries a hand-rolled plugin that appends its own
`SceneDelegate` to `AppDelegate.swift` and forwards URLs by calling
`RCTLinkingManager` directly. That snippet has circulated widely and **silently
breaks cold-start deep links on expo-router**, as flagged later in that same
thread.

On iOS, expo-router's `getInitialURL()` does not read React Native's `Linking` at
all. `expo-router/build/link/linking.js` calls `Linking.getLinkingURL()`, which
reads `ExpoLinkingRegistry.shared.initialURL`, and the only thing that populates
that registry is the Expo app-delegate subscriber chain. Calling
`RCTLinkingManager` from a scene delegate bypasses the chain entirely: the
registry stays `nil`, expo-router falls back to `getRootURL()`, and a link that
cold-starts the app lands on the home route with no error and nothing in the logs.
Warm links still work, because those arrive as a React Native `url` event — which
is what makes it easy to miss.

`ExpoAppSceneDelegate` routes every scene event back through that subscriber
chain, and additionally rebuilds the cold-start launch options from
`connectionOptions` — under the scene life cycle UIKit delivers a launching URL
there, while `Linking.getInitialURL()` reads only the app delegate's launch
options. It also forwards user activities and cold-start quick actions.

This matters here because the app uses both expo-router and expo-dev-client; the
dev client receives its Metro URL over the same path.

## Removing this

Expo's own config plugin for this gap, `@config-plugins/expo-uiscene-lifecycle`
([expo/config-plugins#326][cp326]), is **not published to npm** as of
2026-09-19, which is why this lives in-tree.

Drop `plugins/with-ios-scene-delegate.js` and its entry in `app.config.ts`, then
run `pnpm prebuild`, once either:

- the Expo prebuild template adopts scenes itself (watch [#46664][46664]), or
- `@config-plugins/expo-uiscene-lifecycle` ships and we adopt it instead.

Check after any SDK upgrade. If the template has changed shape, prebuild will fail
loudly with a `with-ios-scene-delegate:` error naming the anchor it could not find.

[46664]: https://github.com/expo/expo/issues/46664
[50179]: https://github.com/expo/expo/issues/50179
[cp326]: https://github.com/expo/config-plugins/pull/326
