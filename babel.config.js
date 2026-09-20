/**
 * Added for Jest, which needs an explicit Babel config to strip TypeScript.
 *
 * `babel-preset-expo` is what Metro already applies by default, so this changes
 * nothing about how the app itself is bundled — it only makes that default
 * explicit where Babel is invoked outside Metro.
 */
module.exports = function babelConfig(api) {
  api.cache(true);
  return { presets: ["babel-preset-expo"] };
};
