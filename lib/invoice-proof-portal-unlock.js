/**
 * Buyer-portal view lock: connect the customer wallet and personal_sign the
 * server challenge. Approve (EIP-712) stays in invoice-registry-buyer-approval.
 */

import { BuyerApprovalError } from "@/lib/invoice-registry-buyer-approval";

/**
 * Provider used for the last successful unlock signature.
 * @type {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> } | null}
 */
let unlockProvider = null;

/**
 * @param {unknown} provider
 * @returns {provider is { request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }}
 */
function isEthereumProvider(provider) {
  return Boolean(provider && typeof provider === "object" && typeof provider.request === "function");
}

/**
 * @returns {Array<{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> }>}
 */
function collectInjectedProviders() {
  if (typeof window === "undefined") return [];
  const found = [];
  const add = (provider) => {
    if (isEthereumProvider(provider) && !found.includes(provider)) {
      found.push(provider);
    }
  };

  const ethereum = window.ethereum;
  add(ethereum);
  if (ethereum && typeof ethereum === "object" && Array.isArray(ethereum.providers)) {
    ethereum.providers.forEach(add);
  }
  return found;
}

/**
 * Prefer MetaMask when several wallets share window.ethereum.
 * @returns {{ request: (args: { method: string, params?: unknown[] }) => Promise<unknown> } | null}
 */
function getEthereum() {
  const providers = collectInjectedProviders();
  const metaMask = providers.find(
    (provider) => provider.isMetaMask === true && provider.isBraveWallet !== true,
  );
  return metaMask || unlockProvider || providers[0] || null;
}

/**
 * @param {number} chainId
 */
function toHexChainId(chainId) {
  return `0x${Number(chainId).toString(16)}`;
}

/**
 * @param {string} message
 */
function utf8ToHex(message) {
  const bytes = new TextEncoder().encode(message);
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * @param {unknown} address
 */
export function normalizeAddress(address) {
  const raw = String(address ?? "").trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(raw)) return "";
  return raw;
}

/**
 * @param {{
 *   buyerWallet: string;
 *   chainId?: number | null;
 *   message: string;
 * }} input
 * @returns {Promise<{ address: string; signature: string }>}
 */
/**
 * Sign in to the buyer invoice list. Any connected account may sign;
 * the server rejects a wallet that is not a customer of this company.
 *
 * @param {{
 *   chainId?: number | null;
 *   message: string;
 * }} input
 * @returns {Promise<{ address: string; signature: string }>}
 */
export async function signBuyerHistory(input) {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  if (!normalizeAddress(from)) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const chainId = Number(input.chainId);
  if (Number.isFinite(chainId) && chainId > 0) {
    const expectedChain = toHexChainId(chainId).toLowerCase();
    let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    if (currentChain !== expectedChain) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHexChainId(chainId) }],
        });
        currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null;
        if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
          throw new BuyerApprovalError("rejected");
        }
        throw new BuyerApprovalError("wrong_network");
      }
    }
    if (currentChain !== expectedChain) {
      throw new BuyerApprovalError("wrong_network");
    }
  }

  const message = typeof input.message === "string" ? input.message : "";
  if (message === "") {
    throw new BuyerApprovalError("failed");
  }

  try {
    const signature = await ethereum.request({
      method: "personal_sign",
      params: [utf8ToHex(message), from],
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
      throw new BuyerApprovalError("failed");
    }
    unlockProvider = ethereum;
    return { address: from, signature };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
      throw new BuyerApprovalError("rejected");
    }
    if (error instanceof BuyerApprovalError) throw error;
    throw new BuyerApprovalError("failed");
  }
}

export async function signProofPortalUnlock(input) {
  const ethereum = getEthereum();
  if (!ethereum) {
    throw new BuyerApprovalError("missing_wallet");
  }

  const expectedWallet = normalizeAddress(input.buyerWallet);
  if (!expectedWallet) {
    throw new BuyerApprovalError("failed");
  }

  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  const from = Array.isArray(accounts) && typeof accounts[0] === "string" ? accounts[0] : "";
  const connected = normalizeAddress(from);
  if (!connected || connected !== expectedWallet) {
    throw new BuyerApprovalError("wallet_mismatch");
  }

  const chainId = Number(input.chainId);
  if (Number.isFinite(chainId) && chainId > 0) {
    const expectedChain = toHexChainId(chainId).toLowerCase();
    let currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
    if (currentChain !== expectedChain) {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: toHexChainId(chainId) }],
        });
        currentChain = String(await ethereum.request({ method: "eth_chainId" })).toLowerCase();
      } catch (error) {
        const code = error && typeof error === "object" && "code" in error ? error.code : null;
        if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
          throw new BuyerApprovalError("rejected");
        }
        throw new BuyerApprovalError("wrong_network");
      }
    }
    if (currentChain !== expectedChain) {
      throw new BuyerApprovalError("wrong_network");
    }
  }

  try {
    const signature = await ethereum.request({
      method: "personal_sign",
      params: [utf8ToHex(input.message), from],
    });
    if (typeof signature !== "string" || !/^0x[0-9a-f]{130}$/i.test(signature)) {
      throw new BuyerApprovalError("failed");
    }
    unlockProvider = ethereum;
    return { address: from, signature };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : null;
    if (code === 4001 || code === "4001" || code === "ACTION_REJECTED") {
      throw new BuyerApprovalError("rejected");
    }
    if (error instanceof BuyerApprovalError) throw error;
    throw new BuyerApprovalError("failed");
  }
}

/**
 * @param {unknown} accounts
 * @returns {string[]}
 */
function toAccountList(accounts) {
  if (Array.isArray(accounts)) {
    return accounts.filter((account) => typeof account === "string");
  }
  if (typeof accounts === "string") return [accounts];
  return [];
}

/**
 * @param {object | null} provider
 * @param {string[] | null} accountsHint
 * @returns {Promise<string | null>} null when the wallet cannot be read
 */
async function readActiveAddress(provider, accountsHint) {
  const fromEvent = accountsHint != null;
  let accounts = fromEvent ? toAccountList(accountsHint) : null;
  if (accounts == null && isEthereumProvider(provider)) {
    try {
      const result = await provider.request({ method: "eth_accounts" });
      accounts = toAccountList(result);
    } catch {
      return null;
    }
  }

  const first = normalizeAddress(accounts?.[0]);
  if (fromEvent) return first;

  const selected = normalizeAddress(provider && "selectedAddress" in provider ? provider.selectedAddress : "");
  if (selected && first && selected !== first) return selected;
  return selected || first;
}

/**
 * @param {object} provider
 * @param {(accounts: unknown) => void} handler
 * @returns {() => void}
 */
function listenAccountsChanged(provider, handler) {
  if (typeof provider.on === "function") {
    provider.on("accountsChanged", handler);
    return () => {
      if (typeof provider.removeListener === "function") {
        provider.removeListener("accountsChanged", handler);
        return;
      }
      if (typeof provider.off === "function") {
        provider.off("accountsChanged", handler);
      }
    };
  }
  if (typeof provider.addListener === "function") {
    provider.addListener("accountsChanged", handler);
    return () => provider.removeListener?.("accountsChanged", handler);
  }
  if (typeof provider.addEventListener === "function") {
    provider.addEventListener("accountsChanged", handler);
    return () => provider.removeEventListener?.("accountsChanged", handler);
  }
  return () => {};
}

/**
 * While the invoice is unlocked, lock it again as soon as the selected wallet
 * is no longer the buyer (account switch, disconnect, or empty accounts).
 * @param {string} expectedWallet
 * @param {() => void} onMismatch
 * @returns {() => void}
 */
export function watchProofPortalAccount(expectedWallet, onMismatch) {
  const expected = normalizeAddress(expectedWallet);
  let stopped = false;
  let fired = false;
  const seen = new Set();
  const unsubscribers = [];

  let emptyStreak = 0;

  const fire = () => {
    if (stopped || fired) return;
    fired = true;
    onMismatch();
  };

  const check = async (provider, accountsHint) => {
    if (stopped || fired || !provider) return;
    const active = await readActiveAddress(provider, accountsHint);
    if (stopped || fired || active == null) return;
    if (active === "") {
      if (accountsHint != null || emptyStreak >= 1) {
        fire();
        return;
      }
      emptyStreak += 1;
      return;
    }
    emptyStreak = 0;
    if (expected !== "" && active !== expected) {
      fire();
    }
  };

  const attach = (provider) => {
    if (!isEthereumProvider(provider) || seen.has(provider)) return;
    seen.add(provider);
    const handler = (accounts) => {
      void check(provider, toAccountList(accounts));
    };
    unsubscribers.push(listenAccountsChanged(provider, handler));
    void check(provider, null);
  };

  attach(unlockProvider);
  attach(getEthereum());
  collectInjectedProviders()
    .filter((provider) => provider.isMetaMask === true || provider === unlockProvider)
    .forEach(attach);

  const onAnnounce = (event) => {
    const detail = event && typeof event === "object" ? event.detail : null;
    const info = detail && typeof detail === "object" ? detail.info : null;
    const rdns = info && typeof info === "object" ? String(info.rdns ?? "") : "";
    const provider = detail && typeof detail === "object" ? detail.provider : null;
    if (
      rdns === "io.metamask" ||
      rdns === "io.metamask.flask" ||
      (isEthereumProvider(provider) && provider.isMetaMask === true)
    ) {
      attach(provider);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.dispatchEvent(new Event("eip6963:requestProvider"));
    unsubscribers.push(() => window.removeEventListener("eip6963:announceProvider", onAnnounce));
  }

  const poll = () => {
    const provider = unlockProvider || getEthereum();
    attach(provider);
    void check(provider, null);
  };
  const intervalId = setInterval(poll, 500);
  const onFocus = () => poll();
  if (typeof window !== "undefined") {
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
  }

  return () => {
    stopped = true;
    clearInterval(intervalId);
    if (typeof window !== "undefined") {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    }
    unsubscribers.forEach((unsubscribe) => unsubscribe());
  };
}
