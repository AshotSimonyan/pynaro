const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

// The iOS 27 SDK refuses to launch an app that has not adopted the UIScene life
// cycle: "UIScene life cycle is required for apps built with this SDK", a SIGTRAP
// in _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption. See
// expo/expo#46664. Expo's generated AppDelegate still starts React Native from
// application(_:didFinishLaunchingWithOptions:), so the app has to adopt scenes
// itself until Expo does it in the template.
//
// Declaring the manifest alone is NOT enough. UIKit then creates the scene and
// the process survives, but the window AppDelegate builds with
// UIWindow(frame: UIScreen.main.bounds) is never attached to that scene and the
// app renders black. The window has to be created FROM the UIWindowScene, which
// means moving React Native's startup into a scene delegate.
//
// This plugin does NOT generate a scene delegate. expo 57.0.23 backported one
// into the runtime -- ExpoAppSceneDelegate, exposed to Objective-C as
// EXExpoAppSceneDelegate -- and we point the manifest at that. It creates the
// window from the scene, starts React Native into it, and re-feeds scene URL,
// user-activity and quick-action events through the ExpoAppDelegate subscriber
// chain.
//
// Routing through the subscriber chain is the part that matters. The widely
// copied workaround in expo/expo#50179 calls RCTLinkingManager straight from its
// own scene delegate, which never populates ExpoLinkingRegistry -- and on iOS
// that registry, not React Native's Linking, is what expo-router's
// getInitialURL() reads. A link that cold-starts the app then silently lands on
// the home route. ExpoAppSceneDelegate also rebuilds the cold-start launch
// options from connectionOptions, which is where UIKit delivers them under the
// scene life cycle.
//
// All this plugin has to do is meet that runtime halfway: declare the manifest,
// conform AppDelegate to ExpoReactNativeFactoryProvider so the scene delegate can
// reach the factory, and take the window creation and startReactNative call out
// of didFinishLaunchingWithOptions.
//
// TEMPORARY. Remove once Expo ships scene adoption in the prebuild template; see
// docs/ios-scene-delegate.md.

const MARKER = "// pynaro-scene-delegate";

const SCENE_DELEGATE_CLASS_NAME = "EXExpoAppSceneDelegate";

// Matched separately rather than as one block: other config plugins inject their
// own lines between them (@react-native-firebase/app drops FirebaseApp.configure()
// right after the window is created), and that code still has to run at
// didFinishLaunching time.
const WINDOW_RE = /^[ \t]*window = UIWindow\(frame: UIScreen\.main\.bounds\)\r?\n/m;
const START_RN_RE =
  /^[ \t]*factory\.startReactNative\(\r?\n[\s\S]*?launchOptions: launchOptions\)\r?\n/m;

// Both removed lines sit inside the template's platform guard. Once they are gone
// the guard wraps nothing, so replace the whole thing with the note below rather
// than leave an empty #if behind. If another plugin injected code between the two
// lines the guard is not empty, this does not match, and the guard correctly stays
// -- along with whatever that plugin needs to run at didFinishLaunching time.
const EMPTY_PLATFORM_GUARD_RE =
  /^[ \t]*#if os\(iOS\) \|\| os\(tvOS\)\r?\n(?:[ \t]*\r?\n)*[ \t]*#endif\r?\n/m;

const CLASS_DECL_RE = /^class AppDelegate: ExpoAppDelegate \{$/m;

const REMOVAL_NOTE =
  "    // Window creation and startReactNative moved to ExpoAppSceneDelegate:\n" +
  "    // under the UIScene life cycle the window must be created from the\n" +
  "    // UIWindowScene. See plugins/with-ios-scene-delegate.js.\n";

const fail = (message) =>
  new Error(`with-ios-scene-delegate: ${message}`);

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== "swift") {
      throw fail(
        `expected a Swift AppDelegate, got "${cfg.modResults.language}"`,
      );
    }

    let contents = cfg.modResults.contents;
    if (contents.includes(MARKER)) {
      return cfg;
    }

    for (const [re, what] of [
      [CLASS_DECL_RE, "AppDelegate class declaration"],
      [WINDOW_RE, "window creation"],
      [START_RN_RE, "startReactNative call"],
    ]) {
      if (!re.test(contents)) {
        throw fail(
          `AppDelegate.swift does not contain the expected ${what}; ` +
            "the Expo template changed and this plugin needs updating",
        );
      }
    }

    // ExpoAppSceneDelegate reads the factory back off the app delegate through
    // this protocol, and assigns the window it creates to the `window` property
    // AppDelegate already declares.
    contents = contents.replace(
      CLASS_DECL_RE,
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
    );

    contents = contents
      .replace(WINDOW_RE, "")
      .replace(START_RN_RE, "")
      .replace(EMPTY_PLATFORM_GUARD_RE, REMOVAL_NOTE);

    cfg.modResults.contents = `${MARKER}\n${contents}`;
    return cfg;
  });

const withSceneManifest = (config) =>
  withInfoPlist(config, (cfg) => {
    const existing = cfg.modResults.UIApplicationSceneManifest;
    const existingClass =
      existing?.UISceneConfigurations?.UIWindowSceneSessionRoleApplication?.[0]
        ?.UISceneDelegateClassName;

    if (existing && existingClass !== SCENE_DELEGATE_CLASS_NAME) {
      throw fail(
        "Info.plist already declares a UIApplicationSceneManifest owned by " +
          "something else; refusing to overwrite it",
      );
    }

    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE_CLASS_NAME,
          },
        ],
      },
    };
    return cfg;
  });

module.exports = (config) => withSceneManifest(withSceneAppDelegate(config));
