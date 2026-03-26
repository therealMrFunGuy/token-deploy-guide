#!/usr/bin/env node
/**
 * Token Deploy Guide MCP Server
 *
 * A comprehensive reference database for deploying tokens and NFTs
 * across Solana and EVM chains. Fully offline — no API keys needed.
 *
 * Tools:
 *   - deploy_guide: Get step-by-step deployment instructions for a specific standard
 *   - list_standards: List all supported token/NFT standards by chain
 *   - compare_chains: Compare deployment costs and features across chains
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import { SOLANA_GUIDES } from "./data/solana.js";
import { EVM_GUIDES } from "./data/evm.js";
import type { DeployGuide } from "./data/solana.js";

const ALL_GUIDES: DeployGuide[] = [...SOLANA_GUIDES, ...EVM_GUIDES];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatGuide(guide: DeployGuide): string {
  const lines: string[] = [];

  lines.push(`# ${guide.title}`);
  lines.push("");
  lines.push(`**Chain:** ${guide.chain.toUpperCase()} | **Standard:** ${guide.standard} | **Category:** ${guide.category}`);
  lines.push("");
  lines.push(guide.description);
  lines.push("");

  // Prerequisites
  lines.push("## Prerequisites");
  lines.push("");
  for (const prereq of guide.prerequisites) {
    lines.push(`- ${prereq}`);
  }
  lines.push("");

  // Cost
  lines.push("## Estimated Cost");
  lines.push("");
  lines.push(guide.estimatedCost);
  lines.push("");

  // Steps
  lines.push("## Steps");
  lines.push("");
  for (const step of guide.steps) {
    lines.push(`### Step ${step.order}: ${step.title}`);
    lines.push("");
    lines.push(step.explanation);
    lines.push("");
    if (step.command) {
      lines.push("```bash");
      lines.push(step.command);
      lines.push("```");
      lines.push("");
    }
    if (step.code) {
      const lang = step.code.includes("pragma solidity") ? "solidity" :
                   step.code.includes("import") ? "typescript" : "json";
      lines.push(`\`\`\`${lang}`);
      lines.push(step.code);
      lines.push("```");
      lines.push("");
    }
  }

  // Contract template
  if (guide.contractTemplate) {
    lines.push("## Contract Template");
    lines.push("");
    lines.push("```solidity");
    lines.push(guide.contractTemplate);
    lines.push("```");
    lines.push("");
  }

  // Gotchas
  lines.push("## Common Gotchas");
  lines.push("");
  for (const gotcha of guide.gotchas) {
    lines.push(`- ${gotcha}`);
  }
  lines.push("");

  // Resources
  lines.push("## Resources");
  lines.push("");
  for (const resource of guide.resources) {
    lines.push(`- ${resource}`);
  }

  return lines.join("\n");
}

function formatGuideList(): string {
  const lines: string[] = [];
  lines.push("# Token & NFT Deployment Standards");
  lines.push("");

  // Group by chain
  const byChain: Record<string, DeployGuide[]> = {};
  for (const g of ALL_GUIDES) {
    if (!byChain[g.chain]) byChain[g.chain] = [];
    byChain[g.chain].push(g);
  }

  for (const [chain, guides] of Object.entries(byChain)) {
    lines.push(`## ${chain.toUpperCase()}`);
    lines.push("");
    lines.push("| ID | Standard | Category | Title |");
    lines.push("|------|----------|----------|-------|");
    for (const g of guides) {
      lines.push(`| \`${g.id}\` | ${g.standard} | ${g.category} | ${g.title} |`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("Use `deploy_guide` with any ID above to get full step-by-step instructions.");

  return lines.join("\n");
}

function formatComparison(category: string): string {
  const lines: string[] = [];
  const filtered = ALL_GUIDES.filter(g =>
    category === "all" || g.category === category
  );

  lines.push(`# Deployment Comparison: ${category === "all" ? "All Standards" : category.toUpperCase()}`);
  lines.push("");
  lines.push("| Standard | Chain | Est. Cost | Key Advantage |");
  lines.push("|----------|-------|-----------|---------------|");

  for (const g of filtered) {
    const shortCost = g.estimatedCost.split(".")[0];
    const advantage = g.description.split(".").slice(0, 1).join(".");
    lines.push(`| **${g.standard}** | ${g.chain.toUpperCase()} | ${shortCost} | ${advantage} |`);
  }

  lines.push("");
  lines.push("## Chain Cost Comparison (Token Deployment)");
  lines.push("");
  lines.push("| Chain | Typical Deploy Cost | Tx Speed | Notes |");
  lines.push("|-------|--------------------:|----------|-------|");
  lines.push("| **Ethereum L1** | $15-60 | 12s blocks | Most liquid, highest gas |");
  lines.push("| **Base** | $0.30-3 | 2s blocks | Coinbase ecosystem, growing fast |");
  lines.push("| **Arbitrum** | $0.30-3 | 250ms blocks | Largest L2 TVL, Nitro stack |");
  lines.push("| **Optimism** | $0.30-3 | 2s blocks | OP Stack, Superchain ecosystem |");
  lines.push("| **Polygon PoS** | $0.01-0.05 | 2s blocks | Cheapest EVM, MATIC gas token |");
  lines.push("| **Solana** | $0.50-2 | 400ms slots | Non-EVM, parallel execution, cheapest NFTs |");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// MCP Server
// ---------------------------------------------------------------------------

const server = new McpServer({
  name: "token-deploy-guide",
  version: "1.0.0",
});

// Tool 1: Get a specific deployment guide
server.tool(
  "deploy_guide",
  "Get step-by-step instructions for deploying a specific token or NFT standard. Returns commands, code templates, costs, and gotchas. Use list_standards first to see available guides.",
  {
    query: z.string().describe(
      "Guide ID (e.g. 'solana-spl-token', 'evm-erc20-hardhat', 'evm-erc721') OR a search query like 'solana nft', 'erc20 base', 'compressed nft', 'pump.fun', 'dn404'"
    ),
  },
  async ({ query }) => {
    const q = query.toLowerCase().trim();

    // Exact ID match
    const exact = ALL_GUIDES.find(g => g.id === q);
    if (exact) {
      return { content: [{ type: "text", text: formatGuide(exact) }] };
    }

    // Fuzzy search: match against id, standard, title, description, chain
    const scored = ALL_GUIDES.map(g => {
      let score = 0;
      const fields = [g.id, g.standard, g.title, g.description, g.chain, g.category].map(f => f.toLowerCase());
      const words = q.split(/\s+/);
      for (const word of words) {
        for (const field of fields) {
          if (field.includes(word)) score++;
          if (field === word) score += 2;
        }
      }
      return { guide: g, score };
    }).filter(s => s.score > 0).sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        content: [{
          type: "text",
          text: `No guides found for "${query}". Use the \`list_standards\` tool to see all available guides.`
        }],
      };
    }

    if (scored.length === 1 || scored[0].score > scored[1].score + 2) {
      return { content: [{ type: "text", text: formatGuide(scored[0].guide) }] };
    }

    // Multiple matches — show list
    const lines = [`# Multiple guides match "${query}"\n`];
    for (const s of scored.slice(0, 5)) {
      lines.push(`- **\`${s.guide.id}\`** — ${s.guide.title} (${s.guide.chain.toUpperCase()}, ${s.guide.standard})`);
    }
    lines.push("\nUse `deploy_guide` with a specific ID for full instructions.");
    return { content: [{ type: "text", text: lines.join("\n") }] };
  }
);

// Tool 2: List all available standards
server.tool(
  "list_standards",
  "List all supported token and NFT deployment standards across Solana and EVM chains. Returns IDs you can use with deploy_guide.",
  {},
  async () => {
    return { content: [{ type: "text", text: formatGuideList() }] };
  }
);

// Tool 3: Compare chains and standards
server.tool(
  "compare_chains",
  "Compare deployment costs, speeds, and features across chains for tokens or NFTs. Helps choose the right chain and standard for your project.",
  {
    category: z.enum(["token", "nft", "all"]).describe("Filter by category: 'token', 'nft', or 'all'"),
  },
  async ({ category }) => {
    return { content: [{ type: "text", text: formatComparison(category) }] };
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

async function main() {
  const port = process.env.PORT;

  if (port) {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
    });

    await server.connect(transport);

    const httpServer = createServer((req, res) => {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

      if (url.pathname === "/health" || url.pathname === "/") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: "ok", server: "token-deploy-guide" }));
        return;
      }

      if (url.pathname === "/mcp") {
        transport.handleRequest(req, res);
        return;
      }

      res.writeHead(404);
      res.end("Not found");
    });

    httpServer.listen(Number(port), "0.0.0.0", () => {
      console.error(`Token Deploy Guide MCP server listening on port ${port}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Token Deploy Guide MCP server running on stdio");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
