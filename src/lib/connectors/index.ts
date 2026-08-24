export * from "./types";
export * from "./registry";
export * from "./observations";

import { listConnectorDefinitions } from "./registry";

export function connectorCatalogSummary() {
  const connectors = listConnectorDefinitions();
  return {
    total: connectors.length,
    authenticated: connectors.filter((c) => c.status === "authenticated").length,
    available: connectors.filter((c) => c.status === "available").length,
    planned: connectors.filter((c) => c.status === "planned").length,
    categories: [...new Set(connectors.map((c) => c.category))].sort(),
  };
}
