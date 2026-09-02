const MAX_DAILY_ACCOUNTS = 20;

function envPair(index: number): { keyName: string; domainName: string } {
  if (index === 1) {
    return { keyName: "DAILY_API_KEY", domainName: "DAILY_DOMAIN" };
  }
  return {
    keyName: `DAILY_API_KEY_${index}`,
    domainName: `DAILY_DOMAIN_${index}`,
  };
}

/** Daily domains from env pairs (no Mongo). Safe for next.config.ts. */
export function listDailyDomainsFromEnv(): string[] {
  const domains: string[] = [];
  for (let i = 1; i <= MAX_DAILY_ACCOUNTS; i++) {
    const { keyName, domainName } = envPair(i);
    const apiKey = process.env[keyName]?.trim();
    const domain = process.env[domainName]?.trim();
    if (!apiKey || !domain) continue;
    domains.push(domain);
  }
  return domains;
}

export function listDailyOriginsFromEnv(): string[] {
  return listDailyDomainsFromEnv().map((domain) => `https://${domain}`);
}
