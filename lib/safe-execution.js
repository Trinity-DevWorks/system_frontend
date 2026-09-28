/**
 * Runs a contract call through a Safe from the connected owner wallet, without the
 * Safe Transaction Service (so public pages need no API key). A OneOwnerSafe
 * (Anvil) executes directly. A Safe{Wallet} collects owner approvals on chain
 * (`approveHash`); the owner whose click reaches the threshold executes.
 */
import { decodeFunctionResult, encodeFunctionData, getAddress } from "viem";

const SAFE_ABI = [
  {
    type: "function",
    name: "getOwners",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "exec",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
  },
];

export class SafeExecutionError extends Error {
  /**
   * @param {"invalid_safe" | "not_safe_owner" | "pending_confirmations" | "rejected" | "failed"} code
   */
  constructor(code) {
    super(code);
    this.name = "SafeExecutionError";
    this.code = code;
  }
}

/**
 * @typedef {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }} Eip1193Provider
 */

/**
 * @param {Eip1193Provider} ethereum
 * @param {string} to
 * @param {"getOwners" | "owner"} functionName
 */
async function readSafeFunction(ethereum, to, functionName) {
  const data = encodeFunctionData({ abi: SAFE_ABI, functionName });
  const result = await ethereum.request({ method: "eth_call", params: [{ to, data }, "latest"] });
  return decodeFunctionResult({ abi: SAFE_ABI, functionName, data: /** @type {`0x${string}`} */ (result) });
}

/**
 * @param {Eip1193Provider} ethereum
 * @param {string} address
 * @returns {Promise<{ kind: "safe" | "one_owner" | null; owners: string[] }>} kind is null for a plain wallet
 */
async function readSafe(ethereum, address) {
  const to = String(address ?? "").toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(to)) return { kind: null, owners: [] };

  const code = await ethereum.request({ method: "eth_getCode", params: [to, "latest"] });
  if (typeof code !== "string" || code === "" || code === "0x" || code === "0x0") {
    return { kind: null, owners: [] };
  }

  try {
    const owners = await readSafeFunction(ethereum, to, "getOwners");
    return { kind: "safe", owners: owners.map((owner) => String(owner).toLowerCase()) };
  } catch {
    // OneOwnerSafe has no getOwners(); try owner() next.
  }
  try {
    const owner = await readSafeFunction(ethereum, to, "owner");
    return { kind: "one_owner", owners: [String(owner).toLowerCase()] };
  } catch {
    return { kind: null, owners: [] };
  }
}

/**
 * Lowercase owners of a Safe; empty for a plain wallet or an unreadable contract.
 * @param {Eip1193Provider} ethereum
 * @param {string} address
 */
export async function readSafeOwners(ethereum, address) {
  return (await readSafe(ethereum, address)).owners;
}

/**
 * @param {unknown} error
 * @returns {never}
 */
function rethrow(error) {
  if (error instanceof SafeExecutionError) throw error;
  const code = error && typeof error === "object" && "code" in error ? error.code : null;
  if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") throw new SafeExecutionError("rejected");
  throw new SafeExecutionError("failed");
}

/**
 * The connected wallet must already be on the right chain.
 *
 * @param {{ ethereum: Eip1193Provider; from: string; safeAddress: string; to: string; data: string }} params
 * @returns {Promise<{ status: "executed" | "proposed"; txHash: string; confirmations?: number; threshold?: number }>}
 *   "proposed" means this owner's on-chain approval was recorded; more owners must confirm.
 */
export async function executeThroughSafe({ ethereum, from, safeAddress, to, data }) {
  const safe = await readSafe(ethereum, safeAddress);
  if (safe.kind === null) throw new SafeExecutionError("invalid_safe");
  const signer = String(from ?? "").toLowerCase();
  if (!safe.owners.includes(signer)) throw new SafeExecutionError("not_safe_owner");

  try {
    if (safe.kind === "one_owner") {
      const hash = await ethereum.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: signer,
            to: safeAddress.toLowerCase(),
            data: encodeFunctionData({ abi: SAFE_ABI, functionName: "exec", args: [getAddress(to), data] }),
            gas: "0x7a120",
          },
        ],
      });
      if (typeof hash !== "string" || hash === "") throw new SafeExecutionError("failed");
      return { status: "executed", txHash: hash };
    }

    const protocolMod = await import("@safe-global/protocol-kit");
    const Safe = protocolMod.default ?? protocolMod.Safe ?? protocolMod;
    const protocolKit = await Safe.init({
      provider: ethereum,
      signer: getAddress(signer),
      safeAddress: getAddress(safeAddress),
    });

    const safeTransaction = await protocolKit.createTransaction({
      transactions: [{ to: getAddress(to), value: "0", data }],
    });
    const safeTxHash = await protocolKit.getTransactionHash(safeTransaction);
    const threshold = Number(await protocolKit.getThreshold());
    const approvedBy = (await protocolKit.getOwnersWhoApprovedTx(safeTxHash)).map((owner) =>
      String(owner).toLowerCase(),
    );
    const alreadyApproved = approvedBy.includes(signer);

    if (approvedBy.length + (alreadyApproved ? 0 : 1) >= threshold) {
      const executed = await protocolKit.executeTransaction(safeTransaction);
      const hash = executed && typeof executed === "object" && "hash" in executed ? String(executed.hash) : "";
      if (hash === "") throw new SafeExecutionError("failed");
      return { status: "executed", txHash: hash };
    }

    if (alreadyApproved) throw new SafeExecutionError("pending_confirmations");

    const approval = await protocolKit.approveTransactionHash(safeTxHash);
    const hash = approval && typeof approval === "object" && "hash" in approval ? String(approval.hash) : "";
    if (hash === "") throw new SafeExecutionError("failed");
    return { status: "proposed", txHash: hash, confirmations: approvedBy.length + 1, threshold };
  } catch (error) {
    rethrow(error);
  }
}
