// bridge.js
// npm install ethers dotenv
const { ethers } = require("ethers");
require("dotenv").config();

const {
  PRIVATE_KEY,        // wallet private key (testnet)
  FROM_RPC,           // RPC url source chain (e.g. sepolia RPC)
  BRIDGE_ADDRESS,     // bridge contract address (on source chain)
  TOKEN_ADDRESS,      // token ERC20 address (or use zero address for native)
  TO_CHAIN_ID,        // destination chain id (as uint256 / per bridge impl)
  TO_RECIPIENT,       // recipient address on destination chain
  AMOUNT              // amount in token decimals (as string e.g. "1000000000000000000")
} = process.env;

if (!PRIVATE_KEY || !FROM_RPC || !BRIDGE_ADDRESS || !TO_CHAIN_ID || !TO_RECIPIENT || !AMOUNT) {
  console.error("Missing env var. See README in script header.");
  process.exit(1);
}

/**
 * IMPORTANT:
 * The ABI below is a GENERIC example. Replace with the real bridge ABI.
 * Typical functions: deposit / send / lock / transferToL2 etc.
 */
const BRIDGE_ABI = [
  // example: depositERC20(address token, uint256 amount, uint256 toChainId, address to)
  "function depositERC20(address token, uint256 amount, uint256 toChainId, address to) payable returns (bytes32)",
  // example: depositNative(uint256 toChainId, address to) payable
  "function depositNative(uint256 toChainId, address to) payable returns (bytes32)"
];

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(FROM_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, wallet);

  // If bridging ERC20:
  if (TOKEN_ADDRESS && TOKEN_ADDRESS !== "0x0") {
    // ensure allowance: approve token to bridge
    const erc20Abi = ["function approve(address spender, uint256 amount) public returns (bool)"];
    const token = new ethers.Contract(TOKEN_ADDRESS, erc20Abi, wallet);

    console.log("Approving token to bridge...");
    const approveTx = await token.approve(BRIDGE_ADDRESS, AMOUNT);
    console.log("Approve tx hash:", approveTx.hash);
    await approveTx.wait();
    console.log("Approve mined.");

    // call depositERC20 (example)
    console.log("Calling bridge.depositERC20...");
    const tx = await bridge.depositERC20(TOKEN_ADDRESS, AMOUNT, Number(TO_CHAIN_ID), TO_RECIPIENT);
    console.log("Bridge tx hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Receipt:", receipt.transactionHash);
    process.exit(0);
  } else {
    // bridging native ETH (example)
    console.log("Bridging native value...");
    const tx = await bridge.depositNative(Number(TO_CHAIN_ID), TO_RECIPIENT, {
      value: ethers.BigNumber.from(AMOUNT)
    });
    console.log("Bridge tx hash:", tx.hash);
    await tx.wait();
    console.log("Done.");
    process.exit(0);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
