// node --test module loader: swaps "react" for the local hooks shim and
// the real API client (which needs import.meta.env / axios / i18n) for a
// tiny stub exposing parseApiError. Lets the real useAsyncData.js run
// under plain node.
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "react") {
    return {
      url: pathToFileURL(path.join(dir, "react-shim.mjs")).href,
      shortCircuit: true,
    };
  }
  if (specifier.endsWith("services/api/client.js")) {
    return {
      url: pathToFileURL(path.join(dir, "api-client-stub.mjs")).href,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
