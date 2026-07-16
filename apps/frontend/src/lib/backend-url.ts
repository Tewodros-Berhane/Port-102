const loopbackHosts = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function isFrontendSelfReference(backendApiUrl: string, frontendPort: string) {
  const url = new URL(backendApiUrl);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  return loopbackHosts.has(url.hostname) && port === frontendPort;
}
