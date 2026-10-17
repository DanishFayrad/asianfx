import Link from 'next/link';
import HomeNav from '@/components/home/HomeNav';
import LivePerformance from '@/components/home/LivePerformance';
import ContactForm from '@/components/home/ContactForm';
import ReferralCapture from '@/components/home/ReferralCapture';
import { SITE, PRICING } from '@/config/site';
import styles from './home.module.css';

export const metadata = {
    title: 'AsianFX Signals | Gold, Silver, Forex & Crypto Trading Signals',
    description: `Real-time trading signals for Gold (XAU/USD), Silver, Forex and Crypto with clear Entry, Take Profit and Stop Loss. $${PRICING.signalFee} per signal — free replacement after a Stop Loss.`,
    keywords: 'trading signals, gold signals, xauusd signals, forex signals, silver signals, crypto signals, asianfx',
};

// Small inline icons (no image requests).
const Icon = ({ d, size = 22 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d={d} />
    </svg>
);

const ICONS = {
    target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
    clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
    chart: 'M3 3v18h18M7 15l4-4 3 3 5-6',
    shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    gift: 'M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z',
    users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    check: 'M20 6 9 17l-5-5',
};

const MARKETS = [
    { code: 'XAU', name: 'Gold', pair: 'XAU/USD', note: 'Our flagship market — the most actively signalled pair.', color: 'var(--t-accent)' },
    { code: 'XAG', name: 'Silver', pair: 'XAG/USD', note: 'Precious-metal setups with tight, defined risk.', color: '#c0c7d1' },
    { code: 'FX', name: 'Forex', pair: 'Major pairs', note: 'EUR/USD, GBP/USD, USD/JPY and other majors.', color: '#60a5fa' },
    { code: '₿', name: 'Crypto', pair: 'BTC/USDT', note: 'Bitcoin signals for 24/7 market opportunities.', color: '#f7931a' },
];

const FEATURES = [
    ['target', 'Exact Entry, TP & SL', 'Every signal comes with a precise entry price, take-profit target and stop-loss — no guesswork.'],
    ['bell', 'Instant live alerts', 'New signals pop up on your dashboard the second they are published. No refreshing needed.'],
    ['clock', 'Timed releases', 'Upcoming signals show a live countdown so you are ready at the right moment.'],
    ['lock', 'Private signals', 'Selected members can receive signals sent only to them by our analysts.'],
    ['chart', 'Full signal history', 'Every signal you take is saved with its result, so you always know where you stand.'],
    ['shield', 'Risk defined upfront', 'A stop-loss on every trade means you know your maximum risk before you enter.'],
];

const STEPS = [
    ['Create your account', 'Sign up with your email and verify it with a 6-digit code. Takes under a minute.'],
    ['Fund your wallet', `Deposit USDT (TRC20) — minimum $${PRICING.minDeposit}. Upload your payment proof and we credit your wallet after verification.`],
    ['Get live signals', 'Signals appear on your dashboard in real time with Entry, Target and Stop Loss.'],
    ['Take the trade', `Unlock a signal for $${PRICING.signalFee} and place it with your own broker. Your account, your control.`],
];

const FAQ = [
    ['What markets do you cover?', 'Mainly Gold (XAU/USD), plus Silver (XAG/USD), major Forex pairs and Bitcoin.'],
    ['How much does a signal cost?', `Each signal costs $${PRICING.signalFee}, deducted from your AsianFX wallet when you choose to take it. You only pay for the signals you take.`],
    ['What happens if a signal hits Stop Loss?', 'Every member who took that signal automatically receives a free signal credit — your next signal costs nothing.'],
    ['How do I deposit?', `Send USDT on the TRC20 network to the address shown in the deposit window (minimum $${PRICING.minDeposit}), then upload a screenshot of the transfer. An admin verifies it and credits your wallet.`],
    ['Do you trade with my money?', 'No. We provide signals only. You place trades in your own brokerage account and stay in full control of your funds.'],
    ['Is profit guaranteed?', 'No. Trading carries real risk and no signal provider can guarantee profits. Only trade with money you can afford to lose.'],
];

export default function Home() {
    const whatsappUrl = SITE.whatsapp ? `https://wa.me/${SITE.whatsapp}` : null;

    return (
        <div className={styles.page}>
            <ReferralCapture />
            <HomeNav />

            {/* HERO */}
            <section className={styles.hero}>
                <div className={`${styles.container} ${styles.heroGrid}`}>
                    <div>
                        <span className={styles.eyebrow}>
                            <i className={styles.liveDot} aria-hidden="true" /> Live trading signals
                        </span>
                        <h1 className={styles.heroTitle}>
                            Gold, Forex &amp; Crypto signals — <span className={styles.gold}>delivered live.</span>
                        </h1>
                        <p className={styles.heroText}>
                            Clear Entry, Take Profit and Stop Loss on every signal, pushed to your dashboard the moment
                            our analysts publish it. Just <strong>${PRICING.signalFee} per signal</strong> — and if a signal
                            hits Stop Loss, your next one is <strong>free</strong>.
                        </p>
                        <div className={styles.heroCtas}>
                            <Link href="/register" className={`${styles.btnGold} ${styles.btnLg}`}>Start receiving signals</Link>
                            <a href="#how" className={`${styles.btnGhost} ${styles.btnLg}`}>How it works</a>
                        </div>
                        <ul className={styles.heroPoints}>
                            <li><Icon d={ICONS.check} size={16} /> ${PRICING.minDeposit} minimum deposit</li>
                            <li><Icon d={ICONS.check} size={16} /> Pay only for signals you take</li>
                            <li><Icon d={ICONS.check} size={16} /> USDT (TRC20) wallet</li>
                        </ul>
                    </div>

                    {/* Illustrative signal card — clearly labelled as an example */}
                    <div className={styles.signalMock} aria-label="Example of a signal">
                        <div className={styles.mockTop}>
                            <span className={styles.mockTag}>Example signal</span>
                            <span className={styles.mockLive}><i className={styles.liveDot} aria-hidden="true" /> Live</span>
                        </div>
                        <div className={styles.mockPair}>
                            <span className={styles.mockBadge}>XAU</span>
                            <div>
                                <strong>XAU/USD</strong>
                                <small>Gold</small>
                            </div>
                            <span className={styles.mockSide}>BUY</span>
                        </div>
                        <div className={styles.mockLevels}>
                            <div><small>Entry</small><b>2350.50</b></div>
                            <div><small>Take Profit</small><b className={styles.win}>2360.00</b></div>
                            <div><small>Stop Loss</small><b className={styles.loss}>2344.00</b></div>
                        </div>
                        <svg className={styles.mockChart} viewBox="0 0 300 80" preserveAspectRatio="none" aria-hidden="true">
                            <defs>
                                <linearGradient id="mockFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="var(--t-accent)" stopOpacity="0.35" />
                                    <stop offset="100%" stopColor="var(--t-accent)" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path d="M0 60 L30 55 L60 62 L90 48 L120 52 L150 38 L180 42 L210 28 L240 32 L270 18 L300 12 L300 80 L0 80 Z" fill="url(#mockFill)" />
                            <path d="M0 60 L30 55 L60 62 L90 48 L120 52 L150 38 L180 42 L210 28 L240 32 L270 18 L300 12" fill="none" stroke="var(--t-accent)" strokeWidth="2" />
                        </svg>
                        <div className={styles.mockFoot}>
                            <span>Signal fee</span>
                            <b>${PRICING.signalFee}.00</b>
                        </div>
                    </div>
                </div>
            </section>

            {/* MARKETS */}
            <section id="markets" className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>Markets</span>
                        <h2>Signals for the markets that move</h2>
                        <p>Focused coverage where volatility creates opportunity.</p>
                    </div>
                    <div className={styles.marketGrid}>
                        {MARKETS.map((m) => (
                            <div key={m.name} className={styles.marketCard}>
                                <span className={styles.marketBadge} style={{ color: m.color, borderColor: m.color }}>{m.code}</span>
                                <h3>{m.name}</h3>
                                <span className={styles.marketPair}>{m.pair}</span>
                                <p>{m.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* FEATURES */}
            <section className={`${styles.section} ${styles.sectionAlt}`}>
                <div className={styles.container}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>What you get</span>
                        <h2>Everything you need in every signal</h2>
                    </div>
                    <div className={styles.featureGrid}>
                        {FEATURES.map(([icon, title, text]) => (
                            <div key={title} className={styles.featureCard}>
                                <span className={styles.featureIcon}><Icon d={ICONS[icon]} /></span>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS */}
            <section id="how" className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>How it works</span>
                        <h2>From sign-up to your first signal in minutes</h2>
                    </div>
                    <ol className={styles.steps}>
                        {STEPS.map(([title, text], i) => (
                            <li key={title} className={styles.step}>
                                <span className={styles.stepNum}>{String(i + 1).padStart(2, '0')}</span>
                                <h3>{title}</h3>
                                <p>{text}</p>
                            </li>
                        ))}
                    </ol>
                </div>
            </section>

            {/* LIVE TRACK RECORD */}
            <section id="performance" className={`${styles.section} ${styles.sectionAlt}`}>
                <div className={styles.container}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>Track record</span>
                        <h2>Real results, straight from our signal desk</h2>
                        <p>These numbers are pulled live from our database — wins and losses included.</p>
                    </div>
                    <LivePerformance />
                </div>
            </section>

            {/* PRICING + REFERRAL */}
            <section id="pricing" className={styles.section}>
                <div className={styles.container}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>Pricing</span>
                        <h2>Simple, pay-per-signal pricing</h2>
                        <p>No subscriptions. No lock-in. Pay only for the signals you decide to take.</p>
                    </div>
                    <div className={styles.pricingGrid}>
                        <div className={`${styles.priceCard} ${styles.priceMain}`}>
                            <span className={styles.priceLabel}>Per signal</span>
                            <div className={styles.price}>${PRICING.signalFee}<small>/signal</small></div>
                            <ul className={styles.checkList}>
                                <li><Icon d={ICONS.check} size={16} /> Entry, Take Profit &amp; Stop Loss</li>
                                <li><Icon d={ICONS.check} size={16} /> Real-time dashboard alerts</li>
                                <li><Icon d={ICONS.check} size={16} /> Free replacement after a Stop Loss</li>
                                <li><Icon d={ICONS.check} size={16} /> Personal signal history</li>
                                <li><Icon d={ICONS.check} size={16} /> Minimum deposit just ${PRICING.minDeposit}</li>
                            </ul>
                            <Link href="/register" className={`${styles.btnGold} ${styles.btnBlock}`}>Create free account</Link>
                        </div>

                        <div className={styles.priceSide}>
                            <div className={styles.priceCard}>
                                <span className={styles.featureIcon}><Icon d={ICONS.gift} /></span>
                                <h3>Loss? Next signal is free.</h3>
                                <p>If a signal you took closes at Stop Loss, a free signal credit is added to your account automatically.</p>
                            </div>
                            <div className={styles.priceCard}>
                                <span className={styles.featureIcon}><Icon d={ICONS.users} /></span>
                                <h3>Refer &amp; earn {PRICING.referralPercent}%</h3>
                                <p>Share your referral link and earn {PRICING.referralPercent}% commission on every approved deposit your referrals make.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section id="faq" className={`${styles.section} ${styles.sectionAlt}`}>
                <div className={`${styles.container} ${styles.narrow}`}>
                    <div className={styles.sectionHead}>
                        <span className={styles.kicker}>FAQ</span>
                        <h2>Questions, answered</h2>
                    </div>
                    <div className={styles.faq}>
                        {FAQ.map(([q, a]) => (
                            <details key={q} className={styles.faqItem}>
                                <summary>{q}</summary>
                                <p>{a}</p>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* CONTACT */}
            <section id="contact" className={styles.section}>
                <div className={`${styles.container} ${styles.contactGrid}`}>
                    <div>
                        <span className={styles.kicker}>Contact</span>
                        <h2 className={styles.contactTitle}>Have a question before you start?</h2>
                        <p className={styles.muted}>Send us a message and our team will get back to you.</p>
                        <div className={styles.contactLinks}>
                            {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>WhatsApp us</a>}
                            {SITE.telegram && <a href={SITE.telegram} target="_blank" rel="noopener noreferrer" className={styles.btnGhost}>Telegram channel</a>}
                            {SITE.email && <a href={`mailto:${SITE.email}`} className={styles.btnGhost}>{SITE.email}</a>}
                        </div>
                    </div>
                    <ContactForm />
                </div>
            </section>

            {/* RISK + FOOTER */}
            <footer className={styles.footer}>
                <div className={styles.container}>
                    <div className={styles.risk}>
                        <strong>Risk warning:</strong> Trading Forex, metals and crypto involves substantial risk and may not be
                        suitable for every investor. Signals are for informational purposes only and are not financial advice.
                        Past performance does not guarantee future results. Never trade with money you cannot afford to lose.
                    </div>
                    <div className={styles.footerRow}>
                        <div className={styles.brand}>
                            <img src="/images/logo-mark.svg" alt="" width={28} height={28} />
                            <span>Asian<b>FX</b></span>
                        </div>
                        <nav className={styles.footerLinks}>
                            <a href="#markets">Markets</a>
                            <a href="#how">How it works</a>
                            <a href="#performance">Track record</a>
                            <a href="#pricing">Pricing</a>
                            <Link href="/login">Log in</Link>
                        </nav>
                        <span className={styles.muted}>&copy; {new Date().getFullYear()} AsianFX. All rights reserved.</span>
                    </div>
                </div>
            </footer>
        </div>
    );
}
