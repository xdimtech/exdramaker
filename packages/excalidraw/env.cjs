const dotenv = require("dotenv");
const { readFileSync, existsSync } = require("fs");
const pkg = require("./package.json");
const parseEnvVariables = (filepath) => {
  // Check if file exists first (important for Vercel builds)
  if (!existsSync(filepath)) {
    console.warn(`Warning: Environment file ${filepath} not found, using empty env`);
    return {
      PKG_NAME: pkg.name,
      PKG_VERSION: pkg.version,
    };
  }

  const envVars = Object.entries(dotenv.parse(readFileSync(filepath))).reduce(
    (env, [key, value]) => {
      env[key] = value;
      return env;
    },
    {},
  );

  envVars.PKG_NAME = pkg.name;
  envVars.PKG_VERSION = pkg.version;

  return envVars;
};

module.exports = { parseEnvVariables };
