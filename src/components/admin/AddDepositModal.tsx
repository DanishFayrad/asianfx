'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import transactionService from '@/services/transactionService';
import { useAdminUsers } from '@/hooks/queries';
import { displayUserId } from '@/lib/memberId';
import { errorMessage } from '@/lib/supabaseClient';
import { searchText } from '@/lib/tables';

const METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank transfer' },
    { value: 'USDT_TRC20', label: 'USDT TRC20' },
    { value: 'manual', label: 'Other' },
];

/**
 * Admin adds a deposit by hand for a member (paid outside the site). It is approved at once,
 * so the wallet is credited and the first-deposit bonus / commission apply like any deposit.
 */
export default function AddDepositModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
    const usersQuery = useAdminUsers(true);
    const [query, setQuery] = useState('');
    const [memberId, setMemberId] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [method, setMethod] = useState('cash');
    const [saving, setSaving] = useState(false);

    const members = useMemo(() => (usersQuery.data ?? []).filter((u) => !u.is_admin), [usersQuery.data]);
    const selected = members.find((m) => m.id === memberId) || null;
    const matches = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return members.slice(0, 6);
        return members
            .filter((m) => searchText(m.name, m.email, displayUserId(m.user_id)).toLowerCase().includes(q))
            .slice(0, 6);
    }, [members, query]);

    const value = parseFloat(amount);
    const canSave = !!selected && Number.isFinite(value) && value > 0 && !saving;

    const save = async () => {
        if (!selected || !canSave) return;
        setSaving(true);
        try {
            await transactionService.addManualDeposit(selected.id, value, method);
            toast.success(`$${value.toLocaleString()} deposit added for ${selected.name || selected.email}`);
            onAdded();
            onClose();
        } catch (e) {
            toast.error(errorMessage(e, 'Could not add the deposit'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="atx-modal-overlay" role="dialog" aria-modal="true" aria-label="Add deposit" onClick={onClose}>
            <div className="atx-modal" onClick={(e) => e.stopPropagation()}>
                <h2>Add deposit</h2>
                <p className="atx-modal-sub">
                    For a member who paid outside the site. It is approved at once and credited to their wallet.
                </p>

                <label className="atx-field">
                    <span>Member</span>
                    {selected ? (
                        <div className="atx-picked">
                            <div>
                                <strong>{selected.name || 'Member'}</strong>
                                <small>{selected.email} · ID: {displayUserId(selected.user_id)}</small>
                            </div>
                            <button type="button" className="atx-link" onClick={() => setMemberId(null)}>Change</button>
                        </div>
                    ) : (
                        <>
                            <input
                                type="search"
                                autoFocus
                                placeholder="Search name, email or ID…"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <div className="atx-pick-list">
                                {usersQuery.isPending ? (
                                    <small className="atx-pick-empty">Loading members…</small>
                                ) : matches.length ? matches.map((m) => (
                                    <button key={m.id} type="button" className="atx-pick" onClick={() => setMemberId(m.id)}>
                                        <strong>{m.name || 'Member'}</strong>
                                        <small>{m.email} · ID: {displayUserId(m.user_id)}</small>
                                    </button>
                                )) : (
                                    <small className="atx-pick-empty">No member found</small>
                                )}
                            </div>
                        </>
                    )}
                </label>

                <div className="atx-field-row">
                    <label className="atx-field">
                        <span>Amount ($)</span>
                        <input
                            type="number"
                            min="0"
                            step="any"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                        />
                    </label>
                    <label className="atx-field">
                        <span>Method</span>
                        <select value={method} onChange={(e) => setMethod(e.target.value)}>
                            {METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                        </select>
                    </label>
                </div>

                {selected && Number(selected.deposit_count || 0) === 0 && (
                    <p className="atx-modal-note">
                        First deposit for this member: the $5 bonus and their influencer&apos;s commission (if any) will be added too.
                    </p>
                )}

                <div className="atx-modal-actions">
                    <button type="button" className="atx-btn" onClick={onClose} disabled={saving}>Cancel</button>
                    <button type="button" className="atx-btn atx-btn--approve" onClick={save} disabled={!canSave}>
                        {saving ? 'Adding…' : 'Add & approve'}
                    </button>
                </div>
            </div>
        </div>
    );
}
