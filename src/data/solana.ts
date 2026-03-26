/**
 * Solana deployment guides — SPL tokens, Token-2022, NFTs, compressed NFTs.
 */

export interface DeployGuide {
  id: string;
  chain: string;
  category: string;
  standard: string;
  title: string;
  description: string;
  prerequisites: string[];
  estimatedCost: string;
  steps: DeployStep[];
  contractTemplate?: string;
  gotchas: string[];
  resources: string[];
}

export interface DeployStep {
  order: number;
  title: string;
  command?: string;
  code?: string;
  explanation: string;
}

export const SOLANA_GUIDES: DeployGuide[] = [
  // ─── SPL Token (Classic) ─────────────────────────────────────────────
  {
    id: "solana-spl-token",
    chain: "solana",
    category: "token",
    standard: "SPL Token",
    title: "Deploy an SPL Token on Solana",
    description:
      "Create a fungible SPL token using the spl-token CLI. This is the original Solana token standard used by USDC, BONK, JUP, and most traded tokens.",
    prerequisites: [
      "Solana CLI installed: `sh -c \"$(curl -sSfL https://release.anza.xyz/stable/install)\"`",
      "spl-token CLI installed: `cargo install spl-token-cli` or via Solana Tool Suite",
      "A funded Solana wallet (keypair): `solana-keygen new` or import existing",
      "SOL for rent (~0.0025 SOL for mint + metadata)",
    ],
    estimatedCost: "~0.005 SOL (~$0.75 at $150/SOL) for mint account + first token account + metadata",
    steps: [
      {
        order: 1,
        title: "Configure CLI to your preferred cluster",
        command: `solana config set --url mainnet-beta
# Or for testing:
solana config set --url devnet`,
        explanation: "Sets the RPC endpoint. Use devnet for testing (free airdrop SOL via `solana airdrop 2`).",
      },
      {
        order: 2,
        title: "Create the token mint",
        command: `spl-token create-token --decimals 9`,
        explanation:
          "Creates a new mint account. Returns the mint address. Decimals: 9 = SOL-like, 6 = USDC-like, 0 = NFT-like. The mint authority is your wallet by default.",
      },
      {
        order: 3,
        title: "Create a token account to hold your tokens",
        command: `spl-token create-account <MINT_ADDRESS>`,
        explanation:
          "Creates an Associated Token Account (ATA) for your wallet. This is where minted tokens will land.",
      },
      {
        order: 4,
        title: "Mint tokens to your account",
        command: `spl-token mint <MINT_ADDRESS> 1000000000`,
        explanation:
          "Mints 1 billion tokens (if decimals=9, the raw amount is 1000000000 * 10^9). Adjust for your tokenomics.",
      },
      {
        order: 5,
        title: "Add token metadata (name, symbol, image)",
        command: `# Install Metaplex token-metadata CLI or use the JS SDK:
# Option A: Using metaboss (recommended CLI tool)
cargo install metaboss
metaboss create metadata \\
  --account <MINT_ADDRESS> \\
  --name "My Token" \\
  --symbol "MTKN" \\
  --uri "https://arweave.net/<METADATA_JSON_TX_ID>"

# Option B: Using @metaplex-foundation/mpl-token-metadata JS SDK
# See resources below for full JS example`,
        explanation:
          "On-chain metadata (name, symbol, URI) is stored via the Metaplex Token Metadata program. The URI should point to a JSON file (on Arweave, IPFS, or Shadow Drive) containing name, symbol, description, and image URL.",
      },
      {
        order: 6,
        title: "(Optional) Revoke mint authority to cap supply",
        command: `spl-token authorize <MINT_ADDRESS> mint --disable`,
        explanation:
          "Permanently disables minting. Once revoked, no one can ever mint more tokens. This is expected for credible fixed-supply tokens.",
      },
      {
        order: 7,
        title: "(Optional) Revoke freeze authority",
        command: `spl-token authorize <MINT_ADDRESS> freeze --disable`,
        explanation:
          "Removes the ability to freeze token accounts. Signals that you can't rug-pull by freezing holders' tokens.",
      },
    ],
    gotchas: [
      "Mint authority is NOT the same as freeze authority — revoke both for a fully decentralized token",
      "Metadata is off-chain JSON pointed to by an on-chain URI — if the URI host goes down, metadata disappears. Use Arweave for permanence.",
      "Token accounts cost rent (~0.00203 SOL each). Every holder needs one.",
      "The `spl-token` CLI uses your default keypair. Use `--owner <KEYPAIR>` to specify a different signer.",
      "Decimals are immutable after mint creation — choose carefully (9 is standard for fungible tokens).",
    ],
    resources: [
      "SPL Token docs: https://spl.solana.com/token",
      "Metaplex Token Metadata: https://developers.metaplex.com/token-metadata",
      "Metaboss CLI: https://metaboss.rs",
      "Solana Cookbook - Create Token: https://solanacookbook.com/references/token.html",
    ],
  },

  // ─── Token-2022 (Token Extensions) ──────────────────────────────────
  {
    id: "solana-token-2022",
    chain: "solana",
    category: "token",
    standard: "Token-2022 (Token Extensions)",
    title: "Deploy a Token-2022 Token with Extensions",
    description:
      "Token-2022 is Solana's next-gen token program with built-in extensions: transfer fees, interest-bearing, confidential transfers, permanent delegate, transfer hooks, and more. Growing adoption — used by PayPal's PYUSD on Solana.",
    prerequisites: [
      "Solana CLI (v1.18+) and spl-token CLI (v4+)",
      "A funded Solana wallet",
      "Understanding of which extensions you need (they're set at mint creation and can't be added later)",
    ],
    estimatedCost: "~0.005-0.015 SOL depending on extensions enabled (more extensions = larger account = more rent)",
    steps: [
      {
        order: 1,
        title: "Create a Token-2022 mint with transfer fee extension",
        command: `# Basic Token-2022 mint (same as SPL but uses Token-2022 program):
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb --decimals 9

# With transfer fee (1% fee, max 1000 tokens per tx):
spl-token create-token \\
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  --decimals 9 \\
  --transfer-fee 100 1000000000000

# With interest-bearing (5% APR):
spl-token create-token \\
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  --decimals 9 \\
  --interest-rate 500

# With non-transferable (soulbound):
spl-token create-token \\
  --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \\
  --enable-non-transferable`,
        explanation:
          "Extensions must be specified at creation time. Transfer fee basis points: 100 = 1%. The fee goes to a withheld account that the fee authority can harvest.",
      },
      {
        order: 2,
        title: "Create token account and mint",
        command: `spl-token create-account <MINT_ADDRESS> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
spl-token mint <MINT_ADDRESS> 1000000000`,
        explanation: "Same flow as classic SPL, but must specify the Token-2022 program ID.",
      },
      {
        order: 3,
        title: "Harvest transfer fees (if using transfer fee extension)",
        command: `spl-token harvest-withheld-tokens <MINT_ADDRESS> --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`,
        explanation:
          "Collects accumulated transfer fees from all token accounts into the mint's withheld balance, then withdraw to your account.",
      },
    ],
    gotchas: [
      "Extensions are IMMUTABLE after mint creation — you cannot add or remove them later. Plan carefully.",
      "Not all DEXes support Token-2022 yet. Jupiter does. Raydium CLMM does. Raydium AMM v4 does NOT.",
      "Transfer hooks require deploying a separate on-chain program — the hook program is called on every transfer",
      "Confidential transfers use zero-knowledge proofs and significantly increase transaction size",
      "NonTransferable and TransferFeeConfig are incompatible (conflicting behaviors)",
      "ConfidentialTransfer and TransferHook are incompatible — check extension compatibility before combining",
      "Token-2022 accounts are larger (more rent) than classic SPL accounts — extensions add data to the mint",
      "Full extension list: TransferFee, MintCloseAuthority, ConfidentialTransfer, DefaultAccountState, ImmutableOwner, MemoTransfer, NonTransferable, InterestBearing, CpiGuard, PermanentDelegate, TransferHook, MetadataPointer, TokenMetadata, GroupPointer, TokenGroup, GroupMemberPointer, TokenGroupMember, ConfidentialMintBurn, ScaledUiAmount, Pausable",
      "Some wallets still don't display Token-2022 tokens properly — Phantom and Solflare both support it now",
    ],
    resources: [
      "Token-2022 docs: https://spl.solana.com/token-2022",
      "Extension guide: https://spl.solana.com/token-2022/extensions",
      "Solana Cookbook Token-2022: https://solanacookbook.com/references/token2022.html",
    ],
  },

  // ─── Metaplex NFT (Standard) ────────────────────────────────────────
  {
    id: "solana-metaplex-nft",
    chain: "solana",
    category: "nft",
    standard: "Metaplex NFT Standard",
    title: "Mint NFTs on Solana (Metaplex)",
    description:
      "Create and mint NFTs using Metaplex's token metadata standard. For collections, use Candy Machine with Sugar CLI. For 1-of-1s, use direct minting.",
    prerequisites: [
      "Solana CLI installed and configured",
      "Sugar CLI: `bash <(curl -sSf https://sugar.metaplex.com/install.sh)`",
      "Assets (images, metadata JSON) uploaded to Arweave, IPFS, or Shadow Drive",
      "SOL for minting (~0.012 SOL per NFT for rent)",
    ],
    estimatedCost:
      "~0.012 SOL per NFT (mint account + metadata + master edition). For collections: ~0.015 SOL base + 0.012 per mint. Storage: Arweave ~$0.01/image via Bundlr, IPFS via Pinata free tier.",
    steps: [
      {
        order: 1,
        title: "Prepare your assets directory",
        command: `mkdir my-nft-collection && cd my-nft-collection
# Create numbered pairs: 0.png + 0.json, 1.png + 1.json, etc.
# Each JSON file follows the Metaplex metadata standard:`,
        code: `{
  "name": "My NFT #0",
  "symbol": "MNFT",
  "description": "Part of my amazing collection",
  "image": "0.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Common" }
  ],
  "properties": {
    "files": [{ "uri": "0.png", "type": "image/png" }],
    "category": "image",
    "creators": [
      { "address": "YOUR_WALLET_ADDRESS", "share": 100 }
    ]
  },
  "seller_fee_basis_points": 500
}`,
        explanation:
          "Each NFT needs an image and a JSON metadata file. `seller_fee_basis_points: 500` = 5% royalty on secondary sales.",
      },
      {
        order: 2,
        title: "Configure Candy Machine with Sugar",
        command: `sugar config create
# Interactive wizard asks:
# - Price (SOL or SPL token)
# - Number of items
# - Go-live date
# - Creator splits
# - Upload method (Bundlr/Arweave, AWS, IPFS, etc.)`,
        explanation: "Sugar generates a `config.json` with all your Candy Machine settings.",
      },
      {
        order: 3,
        title: "Upload assets",
        command: `sugar upload`,
        explanation:
          "Uploads images and JSON to your chosen storage. For Arweave via Bundlr: costs ~0.00001-0.001 SOL per file depending on size.",
      },
      {
        order: 4,
        title: "Deploy the Candy Machine",
        command: `sugar deploy`,
        explanation: "Creates the on-chain Candy Machine account. Returns the Candy Machine ID.",
      },
      {
        order: 5,
        title: "Verify the deployment",
        command: `sugar verify`,
        explanation: "Checks that all uploaded assets match the on-chain state.",
      },
      {
        order: 6,
        title: "Mint NFTs",
        command: `# Mint one:
sugar mint

# Or create a mint site:
# Use Metaplex Candy Machine UI or a custom frontend with @metaplex-foundation/mpl-candy-machine SDK`,
        explanation:
          "Each mint creates a new SPL token (supply=1, decimals=0) with associated metadata and master edition accounts.",
      },
    ],
    gotchas: [
      "Metaplex enforces royalties via the pNFT (Programmable NFT) standard — legacy NFTs have optional royalties",
      "Sugar CLI version must match your Candy Machine version (v3 is current)",
      "Arweave uploads are permanent and immutable — double-check metadata before uploading",
      "Collection NFTs need a separate collection mint that you then set as the collection authority",
      "Candy Machine guards (allowlists, mint limits, start date) are configured separately from the core CM",
      "Each NFT costs ~0.012 SOL in rent — for 10K collection that's ~120 SOL upfront",
    ],
    resources: [
      "Sugar CLI docs: https://developers.metaplex.com/candy-machine/sugar/installation",
      "Metaplex NFT standard: https://developers.metaplex.com/token-metadata",
      "Candy Machine v3 guards: https://developers.metaplex.com/candy-machine/guards",
      "Metaplex JS SDK: https://developers.metaplex.com/umi",
    ],
  },

  // ─── Compressed NFTs (Bubblegum) ────────────────────────────────────
  {
    id: "solana-compressed-nft",
    chain: "solana",
    category: "nft",
    standard: "Compressed NFT (Bubblegum)",
    title: "Mint Compressed NFTs (cNFTs) on Solana",
    description:
      "Compressed NFTs use state compression (Merkle trees) to reduce cost per NFT from ~0.012 SOL to ~0.000005 SOL. Perfect for large collections (100K+), loyalty programs, and mass airdrops. Used by DRiP, Helium, and Dialect.",
    prerequisites: [
      "Solana CLI installed and configured",
      "@metaplex-foundation/mpl-bubblegum JS SDK",
      "A funded wallet (cost depends on tree size, not number of NFTs)",
      "Helius or Triton RPC (DAS API needed to read cNFTs)",
    ],
    estimatedCost:
      "Tree sizing: maxDepth=14 (~16K cNFTs) costs ~0.68 SOL, maxDepth=20 (~1M cNFTs) costs ~7.7 SOL. Per-mint cost: ~0.000005 SOL (just the transaction fee). At scale: 10K cNFTs = ~$0.00003/each, 1M cNFTs = ~$0.000005/each. Compare: 1M standard NFTs would cost ~12,000 SOL.",
    steps: [
      {
        order: 1,
        title: "Install dependencies",
        command: `npm install @metaplex-foundation/mpl-bubblegum @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults @solana/web3.js`,
        explanation: "Bubblegum is the Metaplex program for compressed NFTs. Umi is Metaplex's framework.",
      },
      {
        order: 2,
        title: "Create a Merkle tree",
        code: `import { createTree } from '@metaplex-foundation/mpl-bubblegum';
import { generateSigner, keypairIdentity } from '@metaplex-foundation/umi';
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults';

const umi = createUmi('https://api.mainnet-beta.solana.com');
// ... set up identity

const merkleTree = generateSigner(umi);

// maxDepth=14, maxBufferSize=64 supports ~16,384 cNFTs
// maxDepth=20, maxBufferSize=256 supports ~1,048,576 cNFTs
await createTree(umi, {
  merkleTree,
  maxDepth: 14,
  maxBufferSize: 64,
}).sendAndConfirm(umi);`,
        explanation:
          "The Merkle tree is the on-chain account that stores compressed proofs. Larger trees cost more rent but support more NFTs. Choose maxDepth based on collection size: 2^maxDepth = max NFTs.",
      },
      {
        order: 3,
        title: "Mint compressed NFTs into the tree",
        code: `import { mintV1 } from '@metaplex-foundation/mpl-bubblegum';

await mintV1(umi, {
  leafOwner: recipientPublicKey,
  merkleTree: merkleTree.publicKey,
  metadata: {
    name: 'My cNFT #1',
    symbol: 'MCNFT',
    uri: 'https://arweave.net/<METADATA_JSON>',
    sellerFeeBasisPoints: 500,
    collection: { key: collectionMint, verified: false },
    creators: [{ address: umi.identity.publicKey, verified: true, share: 100 }],
  },
}).sendAndConfirm(umi);`,
        explanation:
          "Each mint adds a leaf to the Merkle tree. The actual metadata is off-chain (URI), but the hash is stored in the tree. Minting is extremely cheap (~5000 lamports per mint).",
      },
      {
        order: 4,
        title: "Read compressed NFTs (requires DAS API)",
        code: `// Standard RPC cannot read cNFTs — you need a DAS-compatible RPC (Helius, Triton)
const response = await fetch('https://mainnet.helius-rpc.com/?api-key=YOUR_KEY', {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'getAssetsByOwner',
    params: { ownerAddress: 'WALLET_ADDRESS', page: 1, limit: 100 }
  })
});`,
        explanation:
          "cNFTs don't exist as regular accounts — they're leaves in a Merkle tree. Only DAS-compatible RPCs (Helius, Triton) can index and serve them.",
      },
    ],
    gotchas: [
      "Tree creation is the big upfront cost — choose the right size. You CANNOT resize a tree after creation.",
      "Standard Solana RPC CANNOT read cNFTs. You MUST use a DAS-compatible RPC (Helius, Triton, etc.)",
      "cNFTs cannot be listed on most NFT marketplaces yet. Tensor supports them. Magic Eden has partial support.",
      "Transferring a cNFT requires a Merkle proof — the proof is fetched from the DAS API, not stored on-chain",
      "Tree canopy depth affects RPC proof size. Higher canopy = smaller proofs but more rent",
      "You cannot burn or modify a cNFT without the Merkle proof (which requires DAS API)",
    ],
    resources: [
      "Bubblegum docs: https://developers.metaplex.com/bubblegum",
      "State Compression guide: https://solana.com/developers/guides/javascript/compressed-nfts",
      "Helius DAS API: https://docs.helius.dev/solana-compression/digital-asset-standard-das-api",
      "Tree cost calculator: https://compressed.app",
    ],
  },

  // ─── Pump.fun Token Launch ──────────────────────────────────────────
  {
    id: "solana-pumpfun",
    chain: "solana",
    category: "token",
    standard: "Pump.fun Bonding Curve",
    title: "Launch a Token via Pump.fun",
    description:
      "Pump.fun is the dominant memecoin launchpad on Solana. Tokens start on a bonding curve and automatically graduate to Raydium once the curve is filled (~$69K market cap). No upfront liquidity needed.",
    prerequisites: [
      "A Solana wallet with ~0.02 SOL",
      "Token image (square, PNG/JPG)",
      "Browser wallet (Phantom, Solflare) or Pump.fun SDK",
    ],
    estimatedCost:
      "~0.02 SOL creation fee to Pump.fun. No liquidity required — the bonding curve IS the liquidity. Graduation to Raydium is automatic and free for the creator.",
    steps: [
      {
        order: 1,
        title: "Go to pump.fun and connect wallet",
        command: `# Browser: https://pump.fun
# Or use the API programmatically:
# POST https://pumpportal.fun/api/trade-local`,
        explanation:
          "Pump.fun provides both a web UI and an API. The web UI is simpler for one-off launches.",
      },
      {
        order: 2,
        title: "Fill in token details",
        explanation:
          "Name, ticker symbol, description, image, and optional social links (Twitter, Telegram, website). The image becomes the token's on-chain metadata image.",
      },
      {
        order: 3,
        title: "Create the token",
        explanation:
          "Pump.fun creates the SPL token mint and deploys a bonding curve contract. The token starts trading immediately on the bonding curve. Initial price is near zero.",
      },
      {
        order: 4,
        title: "Token graduates to Raydium",
        explanation:
          "When the bonding curve reaches ~$69K market cap (~85 SOL in the curve), the token automatically migrates to a Raydium AMM pool with the accumulated SOL as liquidity. The LP tokens are burned (locked forever).",
      },
    ],
    gotchas: [
      "Creator has NO special privileges — no mint authority, no freeze authority, no admin keys. Fully decentralized from launch.",
      "Bonding curve means early buyers get exponentially more tokens per SOL. Price increases sharply as more SOL is deposited.",
      "~98% of Pump.fun tokens never graduate — most go to zero. The platform is dominated by speculation.",
      "Pump.fun takes a 1% fee on all trades on the bonding curve",
      "After graduation, trading moves to Raydium and the bonding curve is closed",
      "Snipers use bots to buy in the same block as token creation — your buy may get frontrun",
    ],
    resources: [
      "Pump.fun: https://pump.fun",
      "Pump.fun API docs: https://docs.pump.fun",
      "PumpPortal API: https://pumpportal.fun/api",
    ],
  },
];
