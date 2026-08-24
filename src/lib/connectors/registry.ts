import type { ConnectorDefinition } from "./types";

const definitions: ConnectorDefinition[] = [
  ["github","GitHub","source-control","oauth2",["commits","pull_requests","workflows","code_ownership"]],
  ["gitlab","GitLab","source-control","oauth2",["repositories","commits","pipelines","merge_requests"]],
  ["bitbucket","Bitbucket","source-control","oauth2",["repositories","commits","pipelines"]],
  ["azure-devops","Azure DevOps","source-control","oauth2",["repos","builds","releases","work_items"]],
  ["circleci","CircleCI","ci-cd","token",["pipelines","workflows","artifacts"]],
  ["github-actions","GitHub Actions","ci-cd","oauth2",["workflows","runs","artifacts"]],
  ["jenkins","Jenkins","ci-cd","token",["jobs","builds","artifacts"]],
  ["aws","Amazon Web Services","cloud","service-account",["deployments","resources","identity","logs"]],
  ["azure","Microsoft Azure","cloud","service-account",["resources","deployments","identity","activity"]],
  ["gcp","Google Cloud","cloud","service-account",["resources","deployments","identity","logs"]],
  ["cloudflare","Cloudflare","cloud","api-key",["zones","workers","deployments","certificates"]],
  ["vercel","Vercel","cloud","token",["projects","deployments","domains","certificates"]],
  ["railway","Railway","cloud","token",["projects","deployments","services","environments"]],
  ["kubernetes","Kubernetes","containers","service-account",["workloads","deployments","images","events"]],
  ["docker","Docker","containers","token",["images","registries","builds"]],
  ["ecr","Amazon ECR","artifacts","service-account",["images","digests","vulnerabilities"]],
  ["ghcr","GitHub Container Registry","artifacts","oauth2",["images","digests","packages"]],
  ["npm","npm","packages","token",["packages","versions","owners"]],
  ["pypi","PyPI","packages","none",["packages","versions","metadata"]],
  ["maven-central","Maven Central","packages","none",["artifacts","versions","metadata"]],
  ["nuget","NuGet","packages","none",["packages","versions","metadata"]],
  ["snyk","Snyk","security","oauth2",["dependencies","vulnerabilities","projects"]],
  ["github-advisory","GitHub Advisory Database","security","none",["advisories","affected_packages"]],
  ["nvd","NVD","security","none",["cves","cvss","references"]],
  ["osv","OSV.dev","security","none",["vulnerabilities","packages","ecosystems"]],
  ["semgrep","Semgrep","security","token",["findings","rules","projects"]],
  ["trivy","Trivy","security","none",["images","dependencies","misconfigurations"]],
  ["dependabot","Dependabot","security","oauth2",["alerts","updates","dependencies"]],
  ["okta","Okta","identity","oauth2",["users","groups","applications","events"]],
  ["entra-id","Microsoft Entra ID","identity","oauth2",["identities","applications","signins"]],
  ["google-workspace","Google Workspace","identity","oauth2",["users","groups","audit"]],
  ["auth0","Auth0","identity","oauth2",["users","applications","logs"]],
  ["datadog","Datadog","observability","api-key",["services","deployments","incidents","monitors"]],
  ["sentry","Sentry","observability","token",["releases","issues","events","deployments"]],
  ["new-relic","New Relic","observability","api-key",["applications","deployments","alerts"]],
  ["servicenow","ServiceNow","itsm","oauth2",["assets","incidents","changes","cmdb"]],
  ["salesforce","Salesforce","saas","oauth2",["applications","users","metadata"]],
  ["jira","Jira","itsm","oauth2",["projects","issues","changes"]],
  ["confluence","Confluence","saas","oauth2",["spaces","pages","ownership"]],
  ["snowflake","Snowflake","data","oauth2",["databases","schemas","access"]],
  ["openai","OpenAI","ai","api-key",["models","projects","usage"]],
  ["google-ai","Google AI","ai","api-key",["models","projects","usage"]],
  ["anthropic","Anthropic","ai","api-key",["models","usage"]],
  ["hugging-face","Hugging Face","ai","token",["models","datasets","spaces"]],
  ["sbom","SBOM Ingest","evidence","none",["spdx","cyclonedx","dependencies"]],
  ["sigstore","Sigstore","evidence","none",["signatures","attestations","provenance"]],
  ["certificate-transparency","Certificate Transparency","evidence","none",["certificates","issuers","domains"]],
].map(([id, name, category, auth, capabilities]) => ({
  id, name, category, auth, capabilities,
  description: `${name} evidence connector`,
  status: "planned" as const,
}));

export const connectorRegistry = Object.freeze(definitions);

export function getConnectorDefinition(id: string): ConnectorDefinition | undefined {
  return connectorRegistry.find((connector) => connector.id === id);
}

export function listConnectorDefinitions(category?: ConnectorDefinition["category"]): ConnectorDefinition[] {
  return category ? connectorRegistry.filter((connector) => connector.category === category) : [...connectorRegistry];
}

export function connectorCounts() {
  return connectorRegistry.reduce<Record<string, number>>((counts, connector) => {
    counts[connector.category] = (counts[connector.category] ?? 0) + 1;
    return counts;
  }, {});
}
