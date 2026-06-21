#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import process from "node:process";

const root = process.cwd();
const outputDir = resolve(root, "dist/deploy/cumt-nexus-web");

const files = [
  {
    from: "docker-compose.prod.yml",
    to: "docker-compose.prod.yml",
  },
  {
    from: ".env.production.example",
    to: ".env.production.example",
  },
  {
    from: "deploy/Caddyfile.example",
    to: "Caddyfile.example",
  },
  {
    from: "docs/internal/engineering/server-docker-runbook.md",
    to: "server-docker-runbook.md",
  },
];

console.log("CUMT Nexus Web deploy bundle");
console.log("");

rmSync(outputDir, { force: true, recursive: true });
mkdirSync(outputDir, { recursive: true });

for (const file of files) {
  const source = resolve(root, file.from);
  const target = resolve(outputDir, file.to);

  if (!existsSync(source)) {
    console.error(`Missing source file: ${file.from}`);
    process.exit(1);
  }

  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
  console.log(`[COPY] ${file.from} -> ${relativeOutput(file.to)}`);
}

writeFileSync(
  resolve(outputDir, "README.md"),
  `# CUMT Nexus Web Deploy Bundle

This bundle contains the frontend files needed on a server that pulls a prebuilt Docker image.

Files:

- \`docker-compose.prod.yml\`
- \`.env.production.example\`
- \`Caddyfile.example\`
- \`server-docker-runbook.md\`

Server usage:

\`\`\`bash
cp .env.production.example .env.production
vim .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --no-build
\`\`\`

Copy \`Caddyfile.example\` to \`/etc/caddy/Caddyfile\` and replace \`nexus.example.com\` with the real domain.

After the server is reachable, run this from the frontend repo or CI:

\`\`\`bash
SITE_URL=https://<your-real-domain>
npm run check:post-deploy -- --site-url="$SITE_URL"
\`\`\`
`,
);

console.log(`[WRITE] ${relativeOutput("README.md")}`);
console.log("");
console.log(`Deploy bundle written to ${outputDir}`);

function relativeOutput(path) {
  return `dist/deploy/cumt-nexus-web/${path}`;
}
