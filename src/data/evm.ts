/**
 * EVM deployment guides — ERC-20, ERC-721, ERC-1155, ERC-404/DN404.
 * Covers Ethereum, Base, Arbitrum, Optimism, Polygon.
 */

import type { DeployGuide } from "./solana.js";

export const EVM_GUIDES: DeployGuide[] = [
  // ─── ERC-20 Token ───────────────────────────────────────────────────
  {
    id: "evm-erc20-hardhat",
    chain: "evm",
    category: "token",
    standard: "ERC-20",
    title: "Deploy an ERC-20 Token (Hardhat + OpenZeppelin)",
    description:
      "Deploy a standard ERC-20 fungible token on any EVM chain using Hardhat and OpenZeppelin contracts. Works on Ethereum, Base, Arbitrum, Optimism, Polygon, and any EVM-compatible chain.",
    prerequisites: [
      "Node.js 18+ installed",
      "A funded wallet with native gas token (ETH for Ethereum/Base/Arb/OP, MATIC for Polygon)",
      "RPC URL for your target chain (Alchemy, Infura, or public RPC)",
      "Block explorer API key for contract verification (Etherscan, Basescan, etc.)",
    ],
    estimatedCost:
      "Ethereum: ~0.005-0.02 ETH ($15-60). L2s (Base/Arb/OP): ~0.0001-0.001 ETH ($0.30-3). Polygon: ~0.01-0.05 MATIC ($0.01-0.05). L2s are 10-100x cheaper than L1.",
    steps: [
      {
        order: 1,
        title: "Initialize Hardhat project",
        command: `mkdir my-token && cd my-token
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install @openzeppelin/contracts
npx hardhat init
# Select "Create a TypeScript project"`,
        explanation: "Sets up the project with Hardhat toolchain and OpenZeppelin's audited contract library.",
      },
      {
        order: 2,
        title: "Write the ERC-20 contract",
        code: `// contracts/MyToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyToken is ERC20, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply
    ) ERC20(name, symbol) Ownable(msg.sender) {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    // Optional: allow owner to mint more tokens
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}`,
        explanation:
          "Minimal ERC-20 with fixed initial supply minted to deployer. `Ownable` gives the deployer admin rights. Remove `mint()` and `Ownable` for a fixed-supply token.",
      },
      {
        order: 3,
        title: "Configure Hardhat for your target chain",
        code: `// hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: [process.env.PRIVATE_KEY!],
    },
    arbitrum: {
      url: process.env.ARB_RPC_URL || "https://arb1.arbitrum.io/rpc",
      accounts: [process.env.PRIVATE_KEY!],
    },
    optimism: {
      url: process.env.OP_RPC_URL || "https://mainnet.optimism.io",
      accounts: [process.env.PRIVATE_KEY!],
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
      accounts: [process.env.PRIVATE_KEY!],
    },
    ethereum: {
      url: process.env.ETH_RPC_URL || "",
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      base: process.env.BASESCAN_API_KEY || "",
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      optimisticEthereum: process.env.OPSCAN_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
    },
  },
};

export default config;`,
        explanation:
          "Multi-chain config. Set PRIVATE_KEY and RPC URLs in a .env file. Never commit .env to git.",
      },
      {
        order: 4,
        title: "Write deployment script",
        code: `// scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const name = "My Token";
  const symbol = "MTKN";
  const initialSupply = 1_000_000_000; // 1 billion tokens

  const Token = await ethers.getContractFactory("MyToken");
  const token = await Token.deploy(name, symbol, initialSupply);
  await token.waitForDeployment();

  const address = await token.getAddress();
  console.log(\`Token deployed to: \${address}\`);
  console.log(\`Total supply: \${initialSupply} \${symbol}\`);

  // Wait for block confirmations before verifying
  console.log("Waiting for block confirmations...");
  await token.deploymentTransaction()?.wait(5);

  // Verify on block explorer
  console.log("Verifying contract...");
  await hre.run("verify:verify", {
    address,
    constructorArguments: [name, symbol, initialSupply],
  });
}

main().catch(console.error);`,
        explanation: "Deploys the contract, waits for confirmations, then auto-verifies on the block explorer.",
      },
      {
        order: 5,
        title: "Deploy to your target chain",
        command: `# Deploy to Base:
npx hardhat run scripts/deploy.ts --network base

# Deploy to Arbitrum:
npx hardhat run scripts/deploy.ts --network arbitrum

# Deploy to Polygon:
npx hardhat run scripts/deploy.ts --network polygon

# Test on local fork first:
npx hardhat run scripts/deploy.ts`,
        explanation: "Always test locally or on a testnet first. L2s are cheap enough to deploy directly.",
      },
      {
        order: 6,
        title: "Verify on block explorer (if auto-verify failed)",
        command: `npx hardhat verify --network base <CONTRACT_ADDRESS> "My Token" "MTKN" 1000000000`,
        explanation:
          "Manual verification. Constructor args must match exactly what was passed during deployment.",
      },
    ],
    gotchas: [
      "NEVER commit your private key or .env file. Use `dotenv` and add .env to .gitignore.",
      "OpenZeppelin v5 (for Solidity ^0.8.20) changed `Ownable` — constructor now requires `initialOwner` parameter",
      "Gas prices on L1 Ethereum vary wildly — check gas before deploying. L2s have stable low fees.",
      "Contract verification on L2 block explorers sometimes fails — retry or use `--force` flag",
      "If you want a fixed supply with no minting: remove `Ownable` and `mint()`, just use the constructor `_mint`",
      "ERC-20 has no built-in tax/fee mechanism — that requires a custom `_transfer` override (and DEXes may blacklist tax tokens)",
      "Renouncing ownership (`renounceOwnership()`) is permanent — do it only when you're sure",
    ],
    resources: [
      "OpenZeppelin ERC-20: https://docs.openzeppelin.com/contracts/5.x/erc20",
      "Hardhat docs: https://hardhat.org/docs",
      "Base deployment guide: https://docs.base.org/building-with-base/guides/deploy-smart-contracts",
      "Etherscan verification: https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify",
    ],
  },

  // ─── ERC-20 Token (Foundry) ─────────────────────────────────────────
  {
    id: "evm-erc20-foundry",
    chain: "evm",
    category: "token",
    standard: "ERC-20",
    title: "Deploy an ERC-20 Token (Foundry / forge)",
    description:
      "Deploy an ERC-20 token using Foundry (forge/cast). Foundry is faster than Hardhat for compilation, testing, and deployment. Preferred by advanced Solidity developers.",
    prerequisites: [
      "Foundry installed: `curl -L https://foundry.paradigm.xyz | bash && foundryup`",
      "A funded wallet with native gas token",
      "RPC URL and block explorer API key",
    ],
    estimatedCost: "Same as Hardhat ERC-20 — gas cost depends on chain, not toolchain.",
    steps: [
      {
        order: 1,
        title: "Initialize Foundry project",
        command: `forge init my-token && cd my-token
forge install OpenZeppelin/openzeppelin-contracts`,
        explanation: "Creates the project structure and installs OpenZeppelin as a git submodule.",
      },
      {
        order: 2,
        title: "Configure remappings",
        command: `echo '@openzeppelin/=lib/openzeppelin-contracts/' > remappings.txt`,
        explanation: "Maps the OpenZeppelin import path to the local installation.",
      },
      {
        order: 3,
        title: "Write the contract (same Solidity as Hardhat version)",
        explanation:
          "Place your MyToken.sol in `src/MyToken.sol`. Same OpenZeppelin imports, same contract code.",
      },
      {
        order: 4,
        title: "Deploy with forge create",
        command: `# Deploy to Base:
forge create src/MyToken.sol:MyToken \\
  --rpc-url https://mainnet.base.org \\
  --private-key $PRIVATE_KEY \\
  --constructor-args "My Token" "MTKN" 1000000000 \\
  --verify \\
  --etherscan-api-key $BASESCAN_API_KEY

# Or use a deploy script:
forge script script/Deploy.s.sol --rpc-url $RPC_URL --broadcast --verify`,
        explanation:
          "forge create does one-shot deployment with optional verification. For complex deploys, use Foundry scripts.",
      },
    ],
    gotchas: [
      "Foundry uses git submodules for dependencies, not npm — `forge install` instead of `npm install`",
      "Remappings.txt must match your import paths exactly",
      "`forge create` uses `--private-key` by default — use `--ledger` or `--keystore` for production",
      "Foundry scripts use `vm.broadcast()` — read the docs carefully for multi-step deployments",
    ],
    resources: [
      "Foundry Book: https://book.getfoundry.sh",
      "forge create: https://book.getfoundry.sh/reference/forge/forge-create",
      "Foundry with OpenZeppelin: https://docs.openzeppelin.com/contracts/5.x/foundry",
    ],
  },

  // ─── ERC-721 NFT ────────────────────────────────────────────────────
  {
    id: "evm-erc721",
    chain: "evm",
    category: "nft",
    standard: "ERC-721",
    title: "Deploy an ERC-721 NFT Collection",
    description:
      "Deploy a standard ERC-721 NFT collection with metadata on IPFS. Includes allowlist minting, reveal mechanics, and royalty enforcement (EIP-2981).",
    prerequisites: [
      "Hardhat or Foundry project set up",
      "OpenZeppelin Contracts v5",
      "IPFS/Pinata account for metadata hosting",
      "Funded wallet on target chain",
    ],
    estimatedCost:
      "Contract deployment: ~0.01-0.05 ETH on L1, ~0.0005-0.002 ETH on L2s. Per-mint gas: ~0.002-0.005 ETH on L1, ~0.0001-0.0005 ETH on L2s. IPFS hosting: free via Pinata (up to 500MB) or ~$20/mo for larger collections.",
    steps: [
      {
        order: 1,
        title: "Write the ERC-721 contract",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyNFT is ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981, Ownable {
    uint256 private _nextTokenId;
    uint256 public maxSupply;
    uint256 public mintPrice;
    string private _baseTokenURI;
    bool public mintingActive;

    constructor(
        string memory name,
        string memory symbol,
        uint256 _maxSupply,
        uint256 _mintPrice,
        string memory baseURI
    ) ERC721(name, symbol) Ownable(msg.sender) {
        maxSupply = _maxSupply;
        mintPrice = _mintPrice;
        _baseTokenURI = baseURI;
        // 5% royalty to deployer
        _setDefaultRoyalty(msg.sender, 500);
    }

    function mint(uint256 quantity) external payable {
        require(mintingActive, "Minting not active");
        require(msg.value >= mintPrice * quantity, "Insufficient payment");
        require(_nextTokenId + quantity <= maxSupply, "Exceeds max supply");

        for (uint256 i = 0; i < quantity; i++) {
            _safeMint(msg.sender, _nextTokenId);
            _nextTokenId++;
        }
    }

    function setMintingActive(bool active) external onlyOwner {
        mintingActive = active;
    }

    function setBaseURI(string memory baseURI) external onlyOwner {
        _baseTokenURI = baseURI;
    }

    function withdraw() external onlyOwner {
        (bool success, ) = payable(owner()).call{value: address(this).balance}("");
        require(success, "Withdraw failed");
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    // Required overrides for multiple inheritance
    function _update(address to, uint256 tokenId, address auth)
        internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC721Enumerable, ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}`,
        explanation:
          "Full-featured NFT contract with: fixed supply, paid minting, EIP-2981 royalties, enumerable (for marketplaces), URI storage, and owner controls.",
      },
      {
        order: 2,
        title: "Prepare metadata on IPFS",
        code: `// Each token's metadata JSON (e.g., 0.json, 1.json):
{
  "name": "My NFT #0",
  "description": "An amazing NFT",
  "image": "ipfs://QmXxx.../0.png",
  "attributes": [
    { "trait_type": "Background", "value": "Blue" },
    { "trait_type": "Rarity", "value": "Rare" }
  ]
}

// Upload folder to Pinata/IPFS:
// npx pinata upload ./metadata/
// This gives you a CID like QmXxx...
// Set baseURI to: ipfs://QmXxx.../`,
        explanation:
          "ERC-721 metadata follows the OpenSea metadata standard. Upload images first, then generate JSON files pointing to the image CIDs, then upload the JSON folder.",
      },
      {
        order: 3,
        title: "Deploy the contract",
        command: `npx hardhat run scripts/deploy.ts --network base
# Constructor args: name, symbol, maxSupply, mintPrice (in wei), baseURI

# Example: 10K collection, 0.01 ETH mint, IPFS base URI:
# "My NFTs", "MNFT", 10000, "10000000000000000", "ipfs://QmXxx.../"`,
        explanation: "Deploy to your target chain. The baseURI should end with `/` so tokenURI becomes `{baseURI}{tokenId}`.",
      },
      {
        order: 4,
        title: "Enable minting and verify",
        command: `# Enable minting via etherscan or cast:
cast send <CONTRACT> "setMintingActive(bool)" true --rpc-url $RPC_URL --private-key $KEY

# Verify contract:
npx hardhat verify --network base <CONTRACT> "My NFTs" "MNFT" 10000 "10000000000000000" "ipfs://QmXxx.../"`,
        explanation: "Two-step: deploy with minting off, then activate when ready.",
      },
    ],
    gotchas: [
      "ERC721Enumerable adds ~50% more gas per mint — remove it if you don't need on-chain enumeration",
      "EIP-2981 royalties are NOT enforceable — marketplaces can ignore them. Only OpenSea's Operator Filter enforces creator royalties (and it's controversial).",
      "IPFS CIDs are immutable — once you set the baseURI, metadata can't change (unless you use a mutable URI pattern for reveals)",
      "For reveal mechanics: deploy with a placeholder URI, then call `setBaseURI()` with the real URI after reveal",
      "Batch minting (ERC721A by Azuki) is much more gas-efficient for minting multiple NFTs — consider it for collections",
      "OpenZeppelin v5 changed the internal mint/burn APIs — don't mix v4 and v5 examples",
    ],
    resources: [
      "OpenZeppelin ERC-721: https://docs.openzeppelin.com/contracts/5.x/erc721",
      "ERC721A (gas optimized): https://www.erc721a.org",
      "Pinata IPFS: https://www.pinata.cloud",
      "OpenSea metadata standard: https://docs.opensea.io/docs/metadata-standards",
    ],
  },

  // ─── ERC-1155 Multi-Token ───────────────────────────────────────────
  {
    id: "evm-erc1155",
    chain: "evm",
    category: "nft",
    standard: "ERC-1155",
    title: "Deploy an ERC-1155 Multi-Token Contract",
    description:
      "ERC-1155 supports both fungible and non-fungible tokens in a single contract. Perfect for gaming items, editions, memberships, or any scenario where you need multiple token types. Much more gas-efficient than deploying separate ERC-20 and ERC-721 contracts.",
    prerequisites: [
      "Hardhat or Foundry project",
      "OpenZeppelin Contracts v5",
      "Metadata JSON hosted on IPFS (one per token ID)",
    ],
    estimatedCost:
      "Deployment: ~0.005-0.03 ETH on L1, ~0.0003-0.001 ETH on L2s. Batch minting is significantly cheaper than ERC-721 per-item.",
    steps: [
      {
        order: 1,
        title: "Write the ERC-1155 contract",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyMultiToken is ERC1155, Ownable {
    // Token IDs
    uint256 public constant GOLD = 0;       // Fungible: in-game currency
    uint256 public constant SILVER = 1;     // Fungible: in-game currency
    uint256 public constant SWORD = 2;      // Non-fungible: 1 supply each
    uint256 public constant SHIELD = 3;

    constructor(string memory uri) ERC1155(uri) Ownable(msg.sender) {
        // Mint initial supply of fungible tokens
        _mint(msg.sender, GOLD, 1_000_000, "");
        _mint(msg.sender, SILVER, 10_000_000, "");
        // Mint 100 swords
        _mint(msg.sender, SWORD, 100, "");
        // Mint 50 shields
        _mint(msg.sender, SHIELD, 50, "");
    }

    function mint(address to, uint256 id, uint256 amount) external onlyOwner {
        _mint(to, id, amount, "");
    }

    function mintBatch(address to, uint256[] memory ids, uint256[] memory amounts) external onlyOwner {
        _mintBatch(to, ids, amounts, "");
    }

    function setURI(string memory newuri) external onlyOwner {
        _setURI(newuri);
    }
}`,
        explanation:
          "ERC-1155 uses a single URI template with `{id}` substitution. E.g., URI `ipfs://Qm.../metadata/{id}.json` — the `{id}` is replaced with the hex token ID.",
      },
      {
        order: 2,
        title: "Prepare metadata (one JSON per token ID)",
        code: `// 0.json (for GOLD token):
{
  "name": "Gold Coin",
  "description": "In-game currency",
  "image": "ipfs://Qm.../gold.png",
  "decimals": 0,
  "properties": { "type": "fungible" }
}

// 2.json (for SWORD):
{
  "name": "Legendary Sword",
  "description": "A powerful weapon",
  "image": "ipfs://Qm.../sword.png",
  "attributes": [
    { "trait_type": "Damage", "value": 50 },
    { "trait_type": "Rarity", "value": "Legendary" }
  ]
}`,
        explanation:
          "Token ID 0 maps to `0.json`, token ID 2 maps to `2.json`. Use hex format (`0000...0002.json`) per the ERC-1155 metadata spec if your URI uses `{id}` substitution.",
      },
      {
        order: 3,
        title: "Deploy",
        command: `npx hardhat run scripts/deploy.ts --network base
# Constructor arg: the URI template
# "ipfs://QmXxx.../metadata/{id}.json"`,
        explanation: "The `{id}` in the URI is substituted by clients (wallets, marketplaces) with the actual token ID.",
      },
    ],
    gotchas: [
      "ERC-1155 URI uses `{id}` substitution — the `{id}` must be the lowercase hex representation, zero-padded to 64 characters",
      "Batch transfers (`safeBatchTransferFrom`) are much more gas-efficient than individual transfers",
      "Not all marketplaces handle ERC-1155 well — OpenSea supports it, but display can be inconsistent for fungible types",
      "No built-in per-token royalties — you need to add ERC-2981 manually (OpenZeppelin provides it)",
      "The `uri()` function returns the SAME template for all token IDs — if you need per-token URIs, override it",
    ],
    resources: [
      "OpenZeppelin ERC-1155: https://docs.openzeppelin.com/contracts/5.x/erc1155",
      "EIP-1155 spec: https://eips.ethereum.org/EIPS/eip-1155",
      "ERC-1155 metadata URI spec: https://eips.ethereum.org/EIPS/eip-1155#metadata",
    ],
  },

  // ─── ERC-404 / DN404 ───────────────────────────────────────────────
  {
    id: "evm-erc404-dn404",
    chain: "evm",
    category: "token",
    standard: "ERC-404 / DN404",
    title: "Deploy a Hybrid ERC-404 or DN404 Token",
    description:
      "ERC-404/DN404 tokens are hybrid fungible+NFT tokens. Buying 1 full token automatically mints an NFT to your wallet. Selling fractions burns the NFT. Popularized by Pandora ($PANDORA). DN404 is the gas-optimized community implementation.",
    prerequisites: [
      "Foundry or Hardhat project",
      "DN404 library: `forge install Vectorized/dn404`",
      "Understanding of the dual-token model (ERC-20 + ERC-721 in one contract)",
    ],
    estimatedCost:
      "Deployment: ~0.02-0.05 ETH on L1, ~0.001-0.005 ETH on L2s. Higher than standard ERC-20 due to dual-token logic.",
    steps: [
      {
        order: 1,
        title: "Install DN404 (recommended over ERC-404)",
        command: `# Foundry:
forge install Vectorized/dn404

# Or Hardhat:
npm install dn404`,
        explanation:
          "DN404 (Divisible NFT-404) by Vectorized is the optimized implementation. Original ERC-404 by Pandora had gas issues and edge cases. DN404 fixes these.",
      },
      {
        order: 2,
        title: "Write the DN404 contract",
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "dn404/src/DN404.sol";
import "dn404/src/DN404Mirror.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MyHybridToken is DN404, Ownable {
    string private _name;
    string private _symbol;
    string private _baseURI;

    constructor(
        string memory name_,
        string memory symbol_,
        uint96 initialSupply,
        string memory baseURI_
    ) Ownable(msg.sender) {
        _name = name_;
        _symbol = symbol_;
        _baseURI = baseURI_;

        // Deploy the mirror ERC-721 contract
        address mirror = address(new DN404Mirror(msg.sender));

        // Initialize with supply (each 1e18 = 1 token = 1 NFT)
        _initializeDN404(initialSupply * 1e18, msg.sender, mirror);
    }

    function name() public view override returns (string memory) { return _name; }
    function symbol() public view override returns (string memory) { return _symbol; }
    function tokenURI(uint256 id) public view override returns (string memory) {
        return string(abi.encodePacked(_baseURI, _toString(id), ".json"));
    }

    function setBaseURI(string memory baseURI_) external onlyOwner {
        _baseURI = baseURI_;
    }
}`,
        explanation:
          "DN404 deploys TWO contracts: the main DN404 (ERC-20 interface) and DN404Mirror (ERC-721 interface). When a wallet accumulates 1 full token, an NFT is auto-minted. When they sell below 1, the NFT burns.",
      },
      {
        order: 3,
        title: "Deploy",
        command: `forge create src/MyHybridToken.sol:MyHybridToken \\
  --rpc-url $RPC_URL \\
  --private-key $PRIVATE_KEY \\
  --constructor-args "My Hybrid" "MHYB" 10000 "ipfs://QmXxx.../"`,
        explanation:
          "Deploys 10,000 tokens/NFTs. The deployer gets all tokens and their corresponding NFTs.",
      },
    ],
    gotchas: [
      "Use DN404, NOT the original ERC-404. ERC-404 is unaudited and has known gas/reentrancy issues.",
      "Each transfer triggers NFT mint/burn logic — gas costs are 2-3x a normal ERC-20 transfer",
      "DEX router interactions can cause unexpected NFT mints/burns. Many DN404 tokens exempt DEX pools from NFT minting.",
      "The Mirror contract (ERC-721) is a separate address — users and marketplaces interact with it for NFT operations",
      "Liquidity pools should be added to the `_setSkipNFT()` list to avoid unnecessary NFT minting for LP positions",
      "Token IDs are sequential and tied to fractional balance — they're not stable (selling/buying reshuffles them)",
    ],
    resources: [
      "DN404 repo: https://github.com/Vectorized/dn404",
      "EIP-404 discussion: https://eips.ethereum.org/EIPS/eip-7631",
      "Pandora (first ERC-404): https://www.pandora.build",
    ],
  },

  // ─── Contract Verification ──────────────────────────────────────────
  {
    id: "evm-contract-verification",
    chain: "evm",
    category: "tooling",
    standard: "Block Explorer Verification",
    title: "Verify Smart Contracts on Block Explorers",
    description:
      "Verify your deployed contract source code on Etherscan, Basescan, Arbiscan, etc. Verification makes your contract readable and trustworthy, and is required for users to interact via the block explorer UI.",
    prerequisites: [
      "Deployed contract address",
      "Block explorer API key (free tier available on all explorers)",
      "Exact same compiler version and settings used for deployment",
    ],
    estimatedCost: "Free. All block explorers offer free API keys for verification.",
    steps: [
      {
        order: 1,
        title: "Get API keys (all free)",
        command: `# Sign up and get API keys from:
# Ethereum: https://etherscan.io/apis
# Base: https://basescan.org/apis
# Arbitrum: https://arbiscan.io/apis
# Optimism: https://optimistic.etherscan.io/apis
# Polygon: https://polygonscan.com/apis`,
        explanation: "Each explorer has its own API key. Free tier is sufficient for verification.",
      },
      {
        order: 2,
        title: "Verify with Hardhat",
        command: `npx hardhat verify --network base <CONTRACT_ADDRESS> "arg1" "arg2" ...

# For contracts with complex args, use a file:
# Create verify-args.ts:
# module.exports = ["My Token", "MTKN", 1000000000];
npx hardhat verify --network base --constructor-args verify-args.ts <CONTRACT_ADDRESS>`,
        explanation: "Constructor arguments must match EXACTLY what was used during deployment, in the same order.",
      },
      {
        order: 3,
        title: "Verify with Foundry",
        command: `forge verify-contract <CONTRACT_ADDRESS> src/MyToken.sol:MyToken \\
  --chain base \\
  --etherscan-api-key $BASESCAN_API_KEY \\
  --constructor-args $(cast abi-encode "constructor(string,string,uint256)" "My Token" "MTKN" 1000000000)`,
        explanation:
          "Foundry uses `cast abi-encode` to format constructor args. The `--chain` flag auto-selects the correct explorer URL.",
      },
    ],
    gotchas: [
      "Constructor args must be ABI-encoded in the exact same order as the constructor parameters",
      "If using OpenZeppelin imports, the explorer must be able to resolve them — flattening can help",
      "Proxy contracts need separate verification of both the proxy and implementation",
      "Some L2 explorers have delays — verification may fail immediately after deployment. Wait 30 seconds.",
      "If you get 'Already Verified' error, your contract may have been auto-verified by Sourcify",
    ],
    resources: [
      "Hardhat verify plugin: https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify",
      "Foundry verify: https://book.getfoundry.sh/reference/forge/forge-verify-contract",
      "Sourcify (open verification): https://sourcify.dev",
    ],
  },
];
