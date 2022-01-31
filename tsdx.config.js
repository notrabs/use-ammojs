const workerLoader = require("rollup-plugin-web-worker-loader");
const url = require("@rollup/plugin-url");

module.exports = {
  // This function will run for each entry/format/env combination
  rollup(config, options) {
    config.plugins.unshift(
      url({
        include: ["**/*.wasm"],
        limit: 9999999,
        emitFiles: false,
      })
    );

    config.plugins.push(
      // https://github.com/darionco/rollup-plugin-web-worker-loader
      workerLoader({
        targetPlatform: "browser",
        extensions: [".js", ".ts"],
        external: [],
        sourcemap: true,
      })
    );

    // prevent web worker from being ignored
    const oldExternal = config.external;
    config.external = (id) => {
      if (id.startsWith("web-worker:")) {
        return false;
      }

      return oldExternal(id);
    };

    // console.log("rollup config: ", config, options);

    return config;
  },
};
