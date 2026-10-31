"use client";
import { useCallback, useEffect, useState } from "react";
type Provider = { id: string; name: string; configured: boolean; missing: string[] };
type Account = { id: string; provider: string; provider_account_id: string; account_name: string | null; account_handle: string | null; scopes: string[]; status: string; token_expires_at: string | null; created_at: string };
const MARKS: Record<string, string> = { youtube: "▶", tiktok: "♪", instagram: "◎", facebook: "f" };
export function ConnectionsManager() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/oauth/connections", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load connected accounts.");
      setProviders(data.providers || []); setAccounts(data.accounts || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load connections."); setIsError(true); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    void load();
    const params = new URLSearchParams(window.location.search);
    const result = params.get("connection");
    const provider = params.get("provider") || "social platform";
    if (result === "connected") { setMessage(`${provider} connected successfully.`); setIsError(false); }
    else if (result === "missing_config") { setMessage(`Add the required server environment variables for ${provider}: ${params.get("missing") || "provider credentials"}.`); setIsError(true); }
    else if (result) { const messages: Record<string, string> = { authorization_denied: "Authorization was cancelled or declined.", state_mismatch: "The security check failed. Start the connection again.", callback_failed: "The provider could not complete the connection. Check app permissions and redirect URI.", admin_required: "Only workspace owners and admins can connect social accounts.", login_required: "Please sign in again before connecting an account." }; setMessage(messages[result] || "The connection could not be completed."); setIsError(true); }
    if (result) { params.delete("connection"); params.delete("provider"); params.delete("count"); params.delete("missing"); const clean = `${window.location.pathname}${params.toString() ? `?${params}` : ""}${window.location.hash}`; window.history.replaceState({}, "", clean); }
  }, [load]);
  async function disconnect(account: Account) {
    if (!window.confirm(`Disconnect ${account.account_name || account.provider}? Sorich Studio will delete its stored tokens.`)) return;
    setBusyId(account.id); setMessage("");
    try {
      const response = await fetch(`/api/oauth/connections/${account.id}`, { method: "DELETE" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not disconnect account.");
      setAccounts((current) => current.filter((item) => item.id !== account.id)); setMessage("Account disconnected and stored credentials removed."); setIsError(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not disconnect account."); setIsError(true); }
    finally { setBusyId(""); }
  }
  async function refresh(account: Account) {
    setBusyId(account.id); setMessage("");
    try {
      const response = await fetch(`/api/oauth/connections/${account.id}/refresh`, { method: "POST" });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Could not refresh account.");
      setMessage("Account authorization refreshed."); setIsError(false); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not refresh account."); setIsError(true); }
    finally { setBusyId(""); }
  }
  return <section className="card wide" id="connections">
    <div className="connections-head"><div><span className="eyebrow">PUBLISHING ACCOUNTS</span><h2>Social connections</h2><p className="muted">Connect your channels securely. You stay in control of access and can disconnect at any time.</p></div><span className="badge">{accounts.length} connected</span></div>
    {message && <p className={isError ? "error" : "notice"} role={isError ? "alert" : "status"}>{message}</p>}
    <div className="oauth-provider-grid">
      {providers.map((provider) => {
        const count = accounts.filter((account) => account.provider === provider.id).length;
        return <article className="oauth-provider" key={provider.id}>
          <div className={`oauth-mark ${provider.id}`} aria-hidden="true">{MARKS[provider.id] || provider.name.slice(0, 1)}</div>
          <div className="oauth-provider-info"><b>{provider.name}</b><small>{count ? `${count} ${count === 1 ? "account" : "accounts"} connected` : provider.configured ? "Ready to connect" : "Developer setup required"}</small></div>
          <span className={`badge ${provider.configured ? "green" : ""}`}>{provider.configured ? "Ready" : "Setup needed"}</span>
          {provider.configured ? <a className="btn primary" href={`/api/oauth/${provider.id}`}>Connect</a> : <div className="oauth-missing"><small>Missing: {provider.missing.join(", ")}</small></div>}
        </article>;
      })}
    </div>
    <div className="connections-list-head"><h3>Connected accounts</h3><button type="button" className="btn" onClick={() => void load()} disabled={loading}>↻ Refresh list</button></div>
    {loading ? <p className="notice">Loading connected accounts…</p> : accounts.length === 0 ? <div className="oauth-empty"><b>No accounts connected yet</b><p className="muted">Choose a platform above to start its official authorization flow.</p></div> : <div className="oauth-account-list">{accounts.map((account) => {
      const expired = account.token_expires_at ? new Date(account.token_expires_at).getTime() < Date.now() : false;
      return <article className="oauth-account" key={account.id}><div className={`oauth-mark small ${account.provider}`}>{MARKS[account.provider] || "•"}</div><div className="oauth-account-info"><b>{account.account_name || account.provider_account_id}</b><small>{account.account_handle || account.provider} · {account.scopes?.length || 0} permissions granted</small><small>{account.token_expires_at ? `Token expiry: ${new Date(account.token_expires_at).toLocaleString()}` : "Provider-managed token expiry"}</small></div><span className={`badge ${expired || account.status !== "connected" ? "red" : "green"}`}>{expired ? "Expired" : account.status}</span><div className="oauth-account-actions"><button type="button" className="btn" onClick={() => void refresh(account)} disabled={busyId === account.id}>{busyId === account.id ? "Working…" : "Refresh"}</button><button type="button" className="btn" onClick={() => void disconnect(account)} disabled={busyId === account.id}>Disconnect</button></div></article>;
    })}</div>}
    <p className="oauth-security-note"> <b>Security:</b> OAuth tokens are encrypted on the server. Client secrets and access tokens are never returned to this page. Only workspace owners and admins can connect, refresh or disconnect accounts.</p>
  </section>;
}
