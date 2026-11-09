"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import signalService, {
  getSignalLevelError,
} from "../../../services/signalService";
import { serverTimeOffset } from "../../../services/serverTime";
import { connectRealtime } from "../../../services/realtimeService";
import { useCurrentUser, useLogout } from "@/hooks/useAuth";
import { useAdminStats, useSignalsDashboard } from "@/hooks/queries";
import toast from "react-hot-toast";
import ThemeToggle from "@/components/ThemeToggle";
import AdminSidebar from "../../../components/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import Skeleton from "@/components/Skeleton";
import { IconTrash } from "@/components/admin/AdminIcons";
import ConfirmDialog from "@/components/ConfirmDialog";
import "../../../styles/adminSignals.css";
import { errorMessage, supabase } from "@/lib/supabaseClient";
import type { Signal } from "@/types";
import { ASSETS as assets, type Asset } from "@/config/assets";
import AssetBadge, { AssetGlyph as AssetIcon } from "@/components/AssetBadge";

/** Cards shown at first in the signals list, and how many more each "Show more" adds. */
const SIGNALS_PAGE = 9;

/** Filter tabs for the signals list. */
const SIGNAL_FILTERS = [
  {
    key: "active",
    label: "Active",
    hint: "Open signals you still need to close",
  },
  { key: "profit", label: "Profit Trade", hint: "Signals closed as profit (TP Hit)" },
  { key: "loss", label: "Lose Trade", hint: "Signals closed as loss (Stop Loss)" },
  { key: "recent", label: "Recent", hint: "Signals sent in the last 24 hours" },
  { key: "weekly", label: "Weekly", hint: "Signals sent in the last 7 days" },
] as const;
type SignalFilter = (typeof SIGNAL_FILTERS)[number]["key"];
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

const isProfitSignal = (s: Signal) => String(s.status || "").includes("Hit");
const isLossSignal = (s: Signal) => String(s.status || "").includes("Stop");

/** "1:05:09" / "12:30" style countdown until `iso`, from `now`. */
const countdown = (iso: string | null | undefined, now: Date) => {
  const total = Math.max(
    0,
    Math.floor((new Date(iso || 0).getTime() - now.getTime()) / 1000),
  );
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export default function AdminSignals() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const handleLogout = useLogout();
  const queryClient = useQueryClient();
  const isAdmin = !!user?.is_admin;
  const [mounted, setMounted] = useState(true); // protected page: AuthGuard renders it client-side only, so no hydration flash guard needed
  useEffect(() => {
    setMounted(true);
  }, []);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // "Close now" (take profit early): which signal is being closed and at what price.
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closePrice, setClosePrice] = useState("");
  const [type, setType] = useState("Buy");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    entry_price: "",
    target_price: "",
    stop_loss: "",
    signal_type: "free",
    timer_minutes: "",
    timer_seconds: "",
    close_minutes: "",
    close_seconds: "",
  });

  /** Pretty "2m 30s" / "45s" / "3m" for buttons and preview. */
  const formatDuration = (minutes: string, seconds: string) => {
    const m = parseInt(minutes, 10) || 0;
    const s = parseInt(seconds, 10) || 0;
    if (m <= 0 && s <= 0) return "";
    if (m > 0 && s > 0) return `${m}m ${s}s`;
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };
  const releaseLabel = formatDuration(formData.timer_minutes, formData.timer_seconds);
  const closeLabel = formatDuration(formData.close_minutes, formData.close_seconds);
  const closeTotalSec =
    (parseInt(formData.close_minutes, 10) || 0) * 60 +
    (parseInt(formData.close_seconds, 10) || 0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [comingSoonLoading, setComingSoonLoading] = useState(false);
  const [signalAudience, setSignalAudience] = useState<"all" | "deposited" | "not_deposited">("deposited");
  const [mailAudience, setMailAudience] = useState<"all" | "deposited" | "not_deposited">("all");
  const signalsQuery = useSignalsDashboard(user?.id, isAdmin);
  const recentSignals: Signal[] = signalsQuery.data?.active_signals ?? [];
  const signalsLoading = signalsQuery.isPending;
  const adminStats = useAdminStats(isAdmin).data ?? null;
  const [liveClientsCount, setLiveClientsCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(
      () => setCurrentTime(new Date(Date.now() + serverTimeOffset)),
      1000,
    );
    return () => clearInterval(timer);
  }, []);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  // Signals list: status filter + optional date/time range, a page of cards at a time.
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("recent");
  const [signalsShown, setSignalsShown] = useState(SIGNALS_PAGE);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  // A signal past its "Close after" time counts as closed even before the database catches up.
  const isSignalOpen = (s: Signal) =>
    s.status === "Active" &&
    !(s.close_at && new Date(s.close_at).getTime() <= currentTime.getTime());
  const openSignals = recentSignals.filter(isSignalOpen);
  const closedSignals = recentSignals.filter((s) => !isSignalOpen(s));
  const allSignals = [...openSignals, ...closedSignals];
  const sentSince = (ms: number) =>
    allSignals.filter(
      (s) => new Date(s.created_at).getTime() >= currentTime.getTime() - ms,
    );
  const signalLists: Record<SignalFilter, Signal[]> = {
    active: openSignals,
    profit: closedSignals.filter(isProfitSignal),
    loss: closedSignals.filter(isLossSignal),
    recent: sentSince(DAY_MS),
    weekly: sentSince(WEEK_MS),
  };
  const filteredSignals = signalLists[signalFilter].filter((s) => {
    const t = new Date(s.created_at).getTime();
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      if (!Number.isNaN(from) && t < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime();
      if (!Number.isNaN(to) && t > to) return false;
    }
    return true;
  });
  const changeSignalFilter = (key: SignalFilter) => {
    setSignalFilter(key);
    setSignalsShown(SIGNALS_PAGE);
  };
  const clearDateFilter = () => {
    setDateFrom("");
    setDateTo("");
    setSignalsShown(SIGNALS_PAGE);
  };

  // Signals or deposits changed: reload the signal list and the admin stats / badges.
  const fetchAllAdminData = () => {
    queryClient.invalidateQueries({ queryKey: ["signals"] });
    queryClient.invalidateQueries({ queryKey: ["admin"] });
  };

  useEffect(() => {
    // 🔒 Security Check: Only Super Admin can access this page
    if (user && !user.is_admin) {
      router.push("/dashboard");
      return;
    }

    // Select default asset
    if (assets.length > 0) setSelectedAsset(assets[1]); // Gold default

    // Set up Real-time listener for badges
    if (user?.is_admin) {
      const socket = connectRealtime(user);

      socket.on("connect", () => {
        console.log("Admin realtime connected");
      });

      socket.on("admin_notification", (notif) => {
        console.log("Admin page real-time update:", notif);
        fetchAllAdminData();
      });

      socket.on("active_clients_count", (count) => {
        setLiveClientsCount(count);
      });

      return () => socket.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.is_admin]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!selectedAsset) {
      setMessage("Please select a trading asset");
      setLoading(false);
      return;
    }
    if (closeTotalSec <= 0) {
      toast.error("Please set close timer (minutes and/or seconds)");
      setLoading(false);
      return;
    }

    try {
      const payload = {
        symbol: selectedAsset.symbol,
        type: type,
        entry_price: parseFloat(formData.entry_price),
        target_price: parseFloat(formData.target_price),
        stop_loss: parseFloat(formData.stop_loss),
        signal_type: formData.signal_type,
        timer_minutes: formData.timer_minutes,
        timer_seconds: formData.timer_seconds,
        close_minutes: formData.close_minutes,
        close_seconds: formData.close_seconds,
        description: `Signal for ${selectedAsset.name}`,
        audience: signalAudience,
      };

      const created = await signalService.createSignal(payload);
      if (created.email?.error)
        toast.error(`Signal sent, but email failed: ${created.email.error}`);
      else if (created.email?.sent)
        toast.success("Email sent to members");
      else toast.error("Signal sent, but no member is in the chosen audience, so no emails went out.");
      setMessage(
        releaseLabel
          ? `Signal scheduled for release in ${releaseLabel}`
          : "Signal broadcasted successfully!",
      );

      // Reset form
      setFormData({
        entry_price: "",
        target_price: "",
        stop_loss: "",
        signal_type: "free",
        timer_minutes: "",
        timer_seconds: "",
        close_minutes: "",
        close_seconds: "",
      });

      // Refresh recent list
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    } catch (error) {
      console.error("Error creating signal:", error);
      setMessage(errorMessage(error, "Error posting signal"));
    } finally {
      setLoading(false);
    }
  };

  // Delete asks for confirmation first: the trash button only opens the popup.
  const [signalToDelete, setSignalToDelete] = useState<Signal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmDeleteSignal = async () => {
    if (!signalToDelete) return;
    setIsDeleting(true);
    try {
      await signalService.deleteSignal(signalToDelete.id);
      toast.success(`${signalToDelete.symbol} signal deleted`);
      setSignalToDelete(null);
      fetchAllAdminData();
    } catch (e) {
      toast.error("Failed to delete signal");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="admin-layout">
      {/* SIDEBAR */}
      <AdminSidebar
        active="signals"
        user={mounted ? user : null}
        pendingDeposits={adminStats?.pending_deposits || 0}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* BACKDROP */}
      {isSidebarOpen && (
        <div
          className="admin-backdrop"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* MAIN CONTENT */}
      <main className="admin-main-content">
        <AdminHeader
          title="Broadcast Signal"
          subtitle="Create a signal, run a countdown and manage access requests"
          onMenu={toggleSidebar}
        >
          <span className="bsg-online" title="Members on the site right now">
            <i aria-hidden="true" /> {liveClientsCount} online
          </span>
        </AdminHeader>

        <div className="bsg">
          {/* ---------- NEW SIGNAL FORM ---------- */}
          <form onSubmit={handleSubmit} className="bsg-card bsg-form">
            <div className="bsg-card-head bsg-card-head--row">
              <div>
                <h2>New signal</h2>
                <p>Sent to every member instantly, or when the countdown ends.</p>
              </div>
              {/* Who receives this signal (popup, dashboard and email) */}
              <select
                className="bsg-audience"
                value={signalAudience}
                onChange={(e) =>
                  setSignalAudience(e.target.value as typeof signalAudience)
                }
                aria-label="Who receives this signal"
              >
                <option value="deposited">Deposited members</option>
                <option value="not_deposited">Not deposited</option>
                <option value="all">All members</option>
              </select>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Asset</span>
              <div className="bsg-assets">
                {assets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    className={`bsg-asset ${selectedAsset?.id === asset.id ? "is-active" : ""}`}
                    onClick={() => setSelectedAsset(asset)}
                    aria-pressed={selectedAsset?.id === asset.id}
                  >
                    <span
                      className="bsg-asset-icon"
                      style={{ background: asset.iconColor }}
                    >
                      <AssetIcon glyph={asset.glyph} />
                    </span>
                    <span className="bsg-asset-text">
                      <strong>{asset.name}</strong>
                      <small>{asset.displaySymbol}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Direction</span>
              <div className="bsg-dir">
                <button
                  type="button"
                  className={`bsg-dir-btn bsg-dir-btn--buy ${type === "Buy" ? "is-active" : ""}`}
                  onClick={() => setType("Buy")}
                >
                  ▲ Buy
                </button>
                <button
                  type="button"
                  className={`bsg-dir-btn bsg-dir-btn--sell ${type === "Sell" ? "is-active" : ""}`}
                  onClick={() => setType("Sell")}
                >
                  ▼ Sell
                </button>
              </div>
            </div>

            <div className="bsg-field">
              <span className="bsg-label">Price levels</span>
              <div className="bsg-levels">
                <label>
                  <small>Entry</small>
                  <input
                    type="number"
                    step="any"
                    name="entry_price"
                    value={formData.entry_price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    required
                  />
                </label>
                <label>
                  <small className="bsg-win">Take profit</small>
                  <input
                    type="number"
                    step="any"
                    name="target_price"
                    value={formData.target_price}
                    onChange={handleChange}
                    placeholder="Enter price"
                    required
                  />
                </label>
                <label>
                  <small className="bsg-loss">Stop loss</small>
                  <input
                    type="number"
                    step="any"
                    name="stop_loss"
                    value={formData.stop_loss}
                    onChange={handleChange}
                    placeholder="Enter price"
                    required
                  />
                </label>
              </div>
              <p className="bsg-hint">
                {type === "Buy"
                  ? "BUY → Take profit above Entry, Stop loss below Entry."
                  : "SELL → Take profit below Entry, Stop loss above Entry."}
              </p>
            </div>

            {/* Release delay and auto-close — minutes / seconds labels sit above each input */}
            <div className="bsg-timers">
              <div className="bsg-field">
                <span className="bsg-label">Release after</span>
                <div className="bsg-duration">
                  <label className="bsg-duration-part">
                    <span className="bsg-duration-unit">Minutes</span>
                    <input
                      type="number"
                      min="0"
                      name="timer_minutes"
                      autoComplete="off"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="bsg-input"
                      value={formData.timer_minutes}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </label>
                  <label className="bsg-duration-part">
                    <span className="bsg-duration-unit">Seconds</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      name="timer_seconds"
                      autoComplete="off"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="bsg-input"
                      value={formData.timer_seconds}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </label>
                </div>
              </div>
              <div className="bsg-field">
                <span className="bsg-label">Close after</span>
                <div className="bsg-duration">
                  <label className="bsg-duration-part">
                    <span className="bsg-duration-unit">Minutes</span>
                    <input
                      type="number"
                      min="0"
                      name="close_minutes"
                      autoComplete="off"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="bsg-input"
                      value={formData.close_minutes}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </label>
                  <label className="bsg-duration-part">
                    <span className="bsg-duration-unit">Seconds</span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      name="close_seconds"
                      autoComplete="off"
                      onWheel={(e) => e.currentTarget.blur()}
                      className="bsg-input"
                      value={formData.close_seconds}
                      onChange={handleChange}
                      placeholder="0"
                    />
                  </label>
                </div>
              </div>
            </div>
            <p className="bsg-hint">
              Close after: the signal closes automatically this long after
              release. Set minutes and/or seconds.
            </p>

            {getSignalLevelError({ type, ...formData }) && (
              <div role="alert" className="bsg-alert bsg-alert--error">
                {getSignalLevelError({ type, ...formData })}
              </div>
            )}
            {message && (
              <div
                role="status"
                className={`bsg-alert ${/success|scheduled/i.test(message) ? "bsg-alert--ok" : "bsg-alert--error"}`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              className="bsg-submit"
              disabled={loading || !!getSignalLevelError({ type, ...formData })}
            >
              {loading ? (
                <>
                  <span className="btn-spinner dark"></span>Broadcasting…
                </>
              ) : releaseLabel ? (
                `Schedule signal (${releaseLabel})`
              ) : (
                "Broadcast signal now"
              )}
            </button>
          </form>

          {/* ---------- RIGHT COLUMN ---------- */}
          <div className="bsg-side">
            {/* Live preview of what members will see */}
            <section className="bsg-card bsg-preview" aria-label="Preview">
              <div className="bsg-card-head">
                <h2>Preview</h2>
                <p>How the signal appears to members after they take it</p>
              </div>
              <div className="bsg-preview-top">
                <span
                  className="bsg-asset-icon"
                  style={{
                    background: selectedAsset?.iconColor || "var(--t-accent)",
                  }}
                >
                  <AssetIcon glyph={selectedAsset?.glyph || "?"} />
                </span>
                <div className="bsg-asset-text">
                  <strong>
                    {selectedAsset?.displaySymbol || "Choose an asset"}
                  </strong>
                  <small>
                    {selectedAsset?.name || "—"} ·{" "}
                    {formData.signal_type === "premium" ? "Premium" : "Free"}
                  </small>
                </div>
                <span
                  className={`bsg-pill ${type === "Buy" ? "bsg-pill--buy" : "bsg-pill--sell"}`}
                >
                  {type.toUpperCase()}
                </span>
              </div>
              <div className="bsg-preview-levels">
                <div>
                  <small>Entry</small>
                  <b>{formData.entry_price || "—"}</b>
                </div>
                <div>
                  <small>Target</small>
                  <b className="bsg-win">{formData.target_price || "—"}</b>
                </div>
                <div>
                  <small>Stop</small>
                  <b className="bsg-loss">{formData.stop_loss || "—"}</b>
                </div>
              </div>
              <p className="bsg-preview-foot">
                {releaseLabel
                  ? `⏳ Locked for ${releaseLabel} after broadcast`
                  : "⚡ Available instantly after broadcast"}
              </p>
              {closeLabel && (
                <p className="bsg-preview-foot">
                  ⏱ Closes automatically {closeLabel} after release
                </p>
              )}
            </section>

            {/* Coming-soon email: pick who receives it, then send. */}
            <div className={`bsg-mail-card${comingSoonLoading ? "" : " bsg-mail-card--on"}`}>
              <div className="bsg-mail-head">
                <span className="bsg-mail-alert-icon" aria-hidden="true">✉</span>
                <span className="bsg-mail-alert-text">
                  <strong>Send alert for mail</strong>
                  <small>Emails members: signal coming soon — get ready</small>
                </span>
              </div>
              <div className="bsg-mail-row">
                <label className="bsg-mail-field">
                  <select
                    value={mailAudience}
                    onChange={(e) =>
                      setMailAudience(e.target.value as typeof mailAudience)
                    }
                    aria-label="Who receives the alert email"
                  >
                    <option value="all">All members</option>
                    <option value="deposited">Deposited members</option>
                    <option value="not_deposited">Not deposited</option>
                  </select>
                </label>
                <button
                  type="button"
                  className="bsg-mail-send"
                  disabled={comingSoonLoading}
                  onClick={async () => {
                    setComingSoonLoading(true);
                    try {
                      const {
                        data: { session },
                      } = await supabase.auth.getSession();
                      const res = await fetch("/api/notify-coming", {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                          authorization: `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({
                          symbol: selectedAsset?.symbol,
                          type,
                          audience: mailAudience,
                        }),
                      });
                      const body = await res.json().catch(() => ({}));
                      if (!res.ok) {
                        toast.error(body.message || "Coming soon email failed");
                        return;
                      }
                      if (!body.sent) {
                        toast.error(
                          body.message || "No active members to email",
                        );
                        return;
                      }
                      toast.success("Coming soon alert emailed to members");
                    } catch (e) {
                      toast.error(errorMessage(e, "Coming soon email failed"));
                    } finally {
                      setComingSoonLoading(false);
                    }
                  }}
                >
                  {comingSoonLoading ? "Sending…" : "Send email"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT BROADCASTS SECTION */}
        <section className="admin-recent-section">
          <div className="asg-toolbar">
            <h3 className="asg-toolbar-title">
              Open &amp; Recent Signals{" "}
              <span>
                — close every open signal with its result
              </span>
            </h3>
            <div className="asg-filters">
              <label className="asg-filter">
                <span>From</span>
                <input
                  type="datetime-local"
                  className="asg-filter-date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setSignalsShown(SIGNALS_PAGE);
                  }}
                  aria-label="Filter from date and time"
                />
              </label>
              <label className="asg-filter">
                <span>To</span>
                <input
                  type="datetime-local"
                  className="asg-filter-date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setSignalsShown(SIGNALS_PAGE);
                  }}
                  aria-label="Filter to date and time"
                />
              </label>
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  className="asg-filter-clear"
                  onClick={clearDateFilter}
                >
                  Clear dates
                </button>
              )}
              <label className="asg-filter">
                <span>Show</span>
                <select
                  value={signalFilter}
                  onChange={(e) =>
                    changeSignalFilter(e.target.value as SignalFilter)
                  }
                  aria-label="Filter signals"
                  title={SIGNAL_FILTERS.find((f) => f.key === signalFilter)?.hint}
                >
                  {SIGNAL_FILTERS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <div className="admin-recent-grid">
            {filteredSignals.slice(0, signalsShown).map((sig, idx) => {
              const isBuy = String(sig.type || "").toLowerCase() === "buy";
              const isOpen = isSignalOpen(sig);
              const closesSoon = isOpen && !!sig.close_at;
              // Timer ended but no result yet: members can no longer buy it, but the trade may still be
              // running in the market, so the admin can still close it as Profit / Loss / Close now.
              const canSetResult =
                isOpen || sig.status === "Active" || sig.status === "Closed";
              const locked =
                isOpen &&
                sig.release_at &&
                new Date(sig.release_at) > currentTime; // closed signals stop counting down
              const statusClass = String(sig.status).includes("Hit")
                ? "win"
                : String(sig.status).includes("Stop")
                  ? "loss"
                  : "neutral";
              return (
                <div
                  key={sig.id || idx}
                  className={`asg-card ${isOpen ? "asg-card--open" : ""}`}
                >
                  <div className="asg-top">
                    <AssetBadge symbol={sig.symbol} size={34} />
                    <div className="asg-title">
                      <strong>{sig.symbol}</strong>
                      <small>
                        {new Date(sig.created_at).toLocaleString([], {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </small>
                    </div>
                    <span
                      className={`asg-side ${isBuy ? "asg-side--buy" : "asg-side--sell"}`}
                    >
                      {isBuy ? "BUY" : "SELL"}
                    </span>
                    <button
                      type="button"
                      className="asg-delete"
                      onClick={() => setSignalToDelete(sig)}
                      aria-label={`Delete ${sig.symbol} signal`}
                      title="Delete signal"
                    >
                      <IconTrash size={15} />
                    </button>
                  </div>

                  <div className="asg-levels">
                    <div>
                      <small>Entry</small>
                      <b>{sig.entry_price ?? "—"}</b>
                    </div>
                    <div>
                      <small>Target</small>
                      <b className="asg-win">{sig.target_price ?? "—"}</b>
                    </div>
                    <div>
                      <small>Stop loss</small>
                      <b className="asg-loss">{sig.stop_loss ?? "—"}</b>
                    </div>
                  </div>

                  <div className="asg-meta">
                    <span>{sig.total_taken || 0} purchased</span>
                    <span className="asg-dot" aria-hidden="true">
                      •
                    </span>
                    <span>{sig.target_user_id ? "Private" : "Broadcast"}</span>
                    {closesSoon && (
                      <>
                        <span className="asg-dot" aria-hidden="true">
                          •
                        </span>
                        <span
                          className="asg-timer"
                          title="This signal closes automatically"
                        >
                          ⏱ Closes in {countdown(sig.close_at, currentTime)}
                        </span>
                      </>
                    )}
                    {locked && (
                      <>
                        <span className="asg-dot" aria-hidden="true">
                          •
                        </span>
                        <span className="asg-timer">
                          ⏳{" "}
                          {(() => {
                            const totalSeconds = Math.max(
                              0,
                              Math.floor(
                                (new Date(sig.release_at || 0).getTime() -
                                  currentTime.getTime()) /
                                  1000,
                              ),
                            );
                            return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
                          })()}
                        </span>
                        <button
                          type="button"
                          className="asg-extend"
                          onClick={async () => {
                            try {
                              await signalService.extendSignalTimer(sig.id, 2);
                              fetchAllAdminData();
                              toast.success("Timer extended by 2 minutes");
                            } catch (e) {
                              toast.error("Failed to extend timer");
                            }
                          }}
                        >
                          +2 min
                        </button>
                      </>
                    )}
                  </div>

                  {/* Close the signal with its result — settles every member who took it. */}
                  <div className="asg-result">
                    {canSetResult && closingId === sig.id ? (
                      (() => {
                        // Close early in profit: admin enters the current price; it must be in profit.
                        const entry = Number(sig.entry_price);
                        const p = parseFloat(closePrice);
                        const gain = Number.isFinite(p) ? (isBuy ? p - entry : entry - p) : NaN;
                        const valid = Number.isFinite(gain) && gain > 0;
                        return (
                          <div className="asg-close-early">
                            <span className="asg-result-label">
                              Close now at price:
                            </span>
                            <div className="asg-close-early-row">
                              <input
                                type="number"
                                step="any"
                                inputMode="decimal"
                                autoFocus
                                placeholder="Current price"
                                value={closePrice}
                                onChange={(e) => setClosePrice(e.target.value)}
                                aria-label="Price to close the signal at"
                              />
                              <button
                                type="button"
                                className="asg-result-btn asg-result-btn--win"
                                disabled={!valid}
                                onClick={async () => {
                                  try {
                                    await signalService.closeInProfit(sig.id, p);
                                    toast.success(
                                      `${sig.symbol} closed in profit at ${p} — find it under Show: Recent`,
                                    );
                                    setClosingId(null);
                                    setClosePrice("");
                                    fetchAllAdminData();
                                  } catch (e) {
                                    toast.error(errorMessage(e, "Failed to close signal"));
                                  }
                                }}
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                className="asg-result-btn asg-result-btn--neutral"
                                onClick={() => {
                                  setClosingId(null);
                                  setClosePrice("");
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                            <small className={valid ? "asg-close-gain" : "asg-close-hint"}>
                              {!closePrice
                                ? `Entry ${sig.entry_price} — enter the price to lock the profit`
                                : valid
                                  ? `+${gain.toFixed(2)} profit from entry ${sig.entry_price}`
                                  : `Price must be ${isBuy ? "above" : "below"} entry ${sig.entry_price} to close in profit`}
                            </small>
                          </div>
                        );
                      })()
                    ) : canSetResult ? (
                      <>
                        <span className="asg-result-label">
                          {isOpen ? "Close with result:" : "Timer ended — set result:"}
                        </span>
                        <div className="asg-result-btns">
                          {/* Saved as 'TP Hit' / 'Stop Loss' — the database settles members' wins/losses from these. */}
                          {[
                            ["TP Hit", "win", "Profit Trade"],
                            ["Stop Loss", "loss", "Loss Trade"],
                          ].map(([status, kind, label]) => (
                            <button
                              key={status}
                              type="button"
                              className={`asg-result-btn asg-result-btn--${kind}`}
                              onClick={async () => {
                                try {
                                  await signalService.updateSignalStatus(
                                    sig.id,
                                    status,
                                  );
                                  toast.success(
                                    `${sig.symbol} marked as ${label} — find it under Show: Recent`,
                                  );
                                  fetchAllAdminData();
                                } catch (e) {
                                  toast.error("Failed to update signal");
                                }
                              }}
                            >
                              {label}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="asg-result-btn asg-result-btn--neutral"
                            title="Price is near TP and pulling back? Close the trade now and keep the profit."
                            onClick={() => {
                              setClosingId(sig.id);
                              setClosePrice("");
                            }}
                          >
                            Close now
                          </button>
                        </div>
                      </>
                    ) : (
                      <span className={`asg-status asg-status--${statusClass}`}>
                        {sig.status === "Early TP Hit"
                          ? `Profit · closed at ${sig.closed_price ?? "—"}`
                          : statusClass === "win"
                          ? "Profit"
                          : statusClass === "loss"
                            ? "Loss"
                            : "Expired"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {signalsLoading &&
              [0, 1].map((i) => (
                <div key={i} className="asg-card" aria-hidden="true">
                  <div className="asg-top">
                    <Skeleton width={44} height={44} radius={12} />
                    <div
                      className="asg-title"
                      style={{ flex: 1, display: "grid", gap: 6 }}
                    >
                      <Skeleton width="45%" height={16} />
                      <Skeleton width="65%" height={12} />
                    </div>
                  </div>
                  <div className="asg-levels">
                    {[0, 1, 2].map((j) => (
                      <div key={j}>
                        <Skeleton width="70%" height={20} radius={8} />
                      </div>
                    ))}
                  </div>
                  <Skeleton width="40%" height={12} />
                </div>
              ))}
            {!signalsLoading && filteredSignals.length === 0 && (
              <p style={{ color: "var(--admin-text-muted)" }}>
                {dateFrom || dateTo
                  ? "No signals in this date range."
                  : signalFilter === "active"
                    ? "No open signals — every signal has been closed."
                    : signalFilter === "profit"
                      ? "No profit trades yet."
                      : signalFilter === "loss"
                        ? "No lose trades yet."
                        : signalFilter === "weekly"
                          ? "No signals in the last 7 days."
                          : "No recent broadcasts found."}
              </p>
            )}
          </div>
          {filteredSignals.length > signalsShown && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                className="bsg-btn-ghost"
                onClick={() => setSignalsShown((n) => n + SIGNALS_PAGE)}
              >
                Show more ({filteredSignals.length - signalsShown} more)
              </button>
            </div>
          )}
        </section>
      </main>

      <ConfirmDialog
        open={!!signalToDelete}
        title="Delete this signal?"
        message={
          signalToDelete && (
            <>
              <strong>
                {signalToDelete.symbol}{" "}
                {String(signalToDelete.type || "").toUpperCase()}
              </strong>{" "}
              will be removed from the list and from members&apos; dashboards.
              This cannot be undone.
            </>
          )
        }
        busy={isDeleting}
        onConfirm={confirmDeleteSignal}
        onCancel={() => setSignalToDelete(null)}
      />
    </div>
  );
}
