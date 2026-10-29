'use client';

import { useState, type FormEvent } from 'react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import toast from 'react-hot-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { IconUsers } from '@/components/admin/AdminIcons';
import { useMyInfluencerApplication, queryKeys } from '@/hooks/queries';
import influencerService from '@/services/influencerService';
import { errorMessage } from '@/lib/supabaseClient';
import type { Profile } from '@/types';

const PLATFORMS = ['Instagram', 'YouTube', 'TikTok', 'Facebook', 'Telegram', 'X (Twitter)', 'Other'];

/** Example profile link shown in the link field for the chosen platform. */
const LINK_PLACEHOLDERS: Record<string, string> = {
    Instagram: 'https://instagram.com/yourname',
    YouTube: 'https://youtube.com/@yourchannel',
    TikTok: 'https://tiktok.com/@yourname',
    Facebook: 'https://facebook.com/yourpage',
    Telegram: 'https://t.me/yourchannel',
    'X (Twitter)': 'https://x.com/yourname',
    Other: 'https://your-profile-link.com',
};

/**
 * Refer & Earn card on the member dashboard. Only approved influencers get a working referral
 * link and commission; everyone else sees it locked with an "Apply" button that opens a form.
 */
export default function ReferEarnSection({ user }: { user: Profile | null }) {
    const queryClient = useQueryClient();
    const isInfluencer = !!user?.is_influencer;
    const applicationQuery = useMyInfluencerApplication(user?.id, !!user && !isInfluencer);
    const application = applicationQuery.data ?? null;
    const isPending = !isInfluencer && application?.status === 'pending';
    const wasRejected = !isInfluencer && application?.status === 'rejected';

    const [linkCopied, setLinkCopied] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [platform, setPlatform] = useState('');
    // Phone with country code (+92…); `phoneHasNumber` is false while only the dial code is filled in.
    const [phone, setPhone] = useState(user?.phone?.startsWith('+') ? user.phone : '');
    const [phoneHasNumber, setPhoneHasNumber] = useState(!!user?.phone?.startsWith('+'));

    const baseUrl = typeof window !== 'undefined' && !window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://www.asianfxsignals.com';
    const referralLink = `${baseUrl}/register?ref=${user?.referral_code || ''}`;
    const percent = Number(user?.commission_percent || 0);

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(referralLink);
            setLinkCopied(true);
            toast.success('Link copied!');
            setTimeout(() => setLinkCopied(false), 2000);
        } catch {
            toast.error('Could not copy — please select and copy it manually.');
        }
    };

    const apply = useMutation({
        mutationFn: influencerService.apply,
        onSuccess: (res) => {
            toast.success(res.message);
            setIsFormOpen(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.myInfluencerApplication(user?.id) });
        },
        onError: (e) => toast.error(errorMessage(e, 'Could not submit your application')),
    });

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const followers = Number(f.get('followers'));
        apply.mutate({
            full_name: String(f.get('full_name') || '').trim(),
            platform: String(f.get('platform') || ''),
            profile_url: String(f.get('profile_url') || '').trim(),
            followers: Number.isFinite(followers) && followers > 0 ? Math.round(followers) : null,
            phone: phoneHasNumber ? phone : '',
            message: String(f.get('message') || '').trim(),
        });
    };

    return (
        <section className={`mdb-refer ${isInfluencer ? '' : 'mdb-refer--locked'}`}>
            <div className="mdb-refer-main" inert={!isInfluencer} aria-hidden={!isInfluencer}>
                <div className="mdb-refer-head">
                    <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconUsers size={18} /></span>
                    <div>
                        <h3>Refer &amp; Earn</h3>
                        {isInfluencer ? (
                            <p>Earn <strong>{percent}%</strong> commission on every deposit your referrals make.</p>
                        ) : (
                            <p>Are you an influencer? <strong>Apply</strong> to unlock your referral link and earn commission on every deposit your followers make.</p>
                        )}
                    </div>
                </div>
                <div className="mdb-refer-link" aria-disabled={!isInfluencer}>
                    <input
                        readOnly
                        disabled={!isInfluencer}
                        aria-label="Your referral link"
                        value={isInfluencer ? referralLink : 'Available after your influencer application is approved'}
                        onFocus={(e) => e.target.select()}
                    />
                    <button
                        type="button"
                        onClick={copyLink}
                        disabled={!isInfluencer}
                        style={linkCopied ? { background: '#22c55e', color: '#fff' } : undefined}
                    >{linkCopied ? 'Copied ✓' : 'Copy link'}</button>
                </div>
            </div>

            <div className="mdb-refer-stats" inert={!isInfluencer} aria-hidden={!isInfluencer}>
                <div>
                    <span>Referrals</span>
                    <strong>{user?.referral_count || 0}</strong>
                </div>
                <div>
                    <span>Their deposits</span>
                    <strong>${Number(user?.total_referral_deposits || 0).toFixed(2)}</strong>
                </div>
                <div className="mdb-refer-commission">
                    <span>Your commission</span>
                    <strong>${Number(user?.affiliate_balance || 0).toFixed(2)}</strong>
                    {isInfluencer ? (
                        <button type="button" onClick={() => toast.error('Minimum withdrawal is $10')}>Withdraw</button>
                    ) : isPending ? (
                        <span className="mdb-refer-status" title="We are reviewing your application">⏳ Under review</span>
                    ) : (
                        <button type="button" className="mdb-refer-apply" onClick={() => setIsFormOpen(true)}>
                            {wasRejected ? 'Apply again' : 'Apply as influencer'}
                        </button>
                    )}
                </div>
            </div>

            {/* Not an influencer yet: the section is blurred, with one centred call to action. */}
            {!isInfluencer && (
                <div className="mdb-refer-gate">
                    <span className="mdb-kpi-icon mdb-kpi-icon--gold"><IconUsers size={20} /></span>
                    <h3>Refer &amp; Earn</h3>
                    <p>Are you an influencer? Apply to unlock your referral link and earn commission on every deposit your followers make.</p>
                    {isPending ? (
                        <span className="mdb-refer-status" title="We are reviewing your application">⏳ Application under review</span>
                    ) : (
                        <button type="button" className="mdb-refer-gate-btn" onClick={() => setIsFormOpen(true)}>
                            {wasRejected ? 'Apply again' : 'Apply as influencer'}
                        </button>
                    )}
                </div>
            )}

            {isFormOpen && (
                <div className="ifl-overlay" onClick={() => { if (!apply.isPending) setIsFormOpen(false); }}>
                    <form className="ifl-card" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="ifl-title">
                        <div className="ifl-head">
                            <div>
                                <h2 id="ifl-title">Apply as an influencer</h2>
                                <p>Tell us about your audience. Once approved you get your own referral link and a commission on every deposit your referrals make.</p>
                            </div>
                            <button type="button" className="ifl-close" onClick={() => setIsFormOpen(false)} aria-label="Close" disabled={apply.isPending}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
                            </button>
                        </div>

                        <label>
                            <span>Full name <em>*</em></span>
                            <input name="full_name" required maxLength={100} defaultValue={user?.name || ''} placeholder="Your name" />
                        </label>
                        <div className="ifl-row">
                            <label>
                                <span>Main platform <em>*</em></span>
                                <select name="platform" required value={platform} onChange={(e) => setPlatform(e.target.value)}>
                                    <option value="" disabled>Choose…</option>
                                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </label>
                            <label>
                                <span>Followers</span>
                                <input name="followers" type="number" min={0} placeholder="e.g. 25000" />
                            </label>
                        </div>
                        <label>
                            <span>Profile / channel link <em>*</em></span>
                            <input name="profile_url" type="url" required maxLength={300} placeholder={LINK_PLACEHOLDERS[platform] || 'Choose a platform first, then paste your profile link'} />
                        </label>
                        {/* div, not label: the phone field has its own country-picker button */}
                        <div className="ifl-field">
                            <span>WhatsApp / phone</span>
                            <PhoneInput
                                className="ifl-phone"
                                defaultCountry="pk"
                                value={phone}
                                onChange={(value, meta) => {
                                    setPhone(value);
                                    setPhoneHasNumber(meta.inputValue.replace(/\D/g, '').length > meta.country.dialCode.length);
                                }}
                                inputProps={{ 'aria-label': 'WhatsApp / phone number' }}
                            />
                        </div>
                        <label>
                            <span>How will you promote AsianFX?</span>
                            <textarea name="message" rows={3} maxLength={1000} placeholder="Your audience, content, countries…" />
                        </label>

                        <div className="ifl-actions">
                            <button type="button" className="btn-cancel" onClick={() => setIsFormOpen(false)} disabled={apply.isPending}>Cancel</button>
                            <button type="submit" className="ifl-submit" disabled={apply.isPending}>
                                {apply.isPending ? 'Submitting…' : 'Submit application'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    );
}
