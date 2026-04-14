import React from 'react';
import '../styles/style.css';


export default function Home() {
    return (
        <>
<header className="navbar">
  <div className="nav-container">
    <div className="logo">
      <img src="/images/Background (2).png" alt="Logo" />
      Asian fx Signal
    </div>

    <div className="hamburger" id="hamburger">

    </div>

    <nav id="navLinks">
      <a href="#home">Home</a>
      <a href="#about">About</a>
      <a href="#trade">Trading</a>
      <a href="#why">Why Choose Us</a>
      <button   className="btn-yellow">Get Started</button>
      <button   className="btn-yellow">Log in</button>
    </nav>
  </div>
</header>
{/*  HERO  */}
<section id="home" className="hero">
  <div className="hero-inner">

    <p className="badge">Professional Trading Management</p>

    <h1>
      <span>Earn Money Safely</span><br />
      Your Wealth, Our Strategy
    </h1>

    <p className="hero-text">
     Trade with confidence using our professional stock market trading signals. For just $5 per signal, you will receive carefully<br />analyzed signals designed to help you make smarter <br />trading decisions. If a signal results in a loss, you don’t need to worry — we will provide you with a replacement signal completely free.This process continues until your trade reaches profit. Once your trade becomes profitable, you can simply purchase a new signal to continue trading with our guidance. Our goal is to provide a fair, reliable, and stress-free trading experience for every trader.
    </p>

    <div className="hero-buttons">
      <button className="btn-yellow">Deposit</button>
      <button className="btn-outline">See How It Works</button>
    </div>
        <div className="stats">
   <div className="stat-card">
  <img src="/images/SVG (2).png" className="stat-icon" />
  <h3>60-70%</h3>
  <p>Your Profit Share</p>
</div>

<div className="stat-card">
  <img src="/images/SVG (1).png" className="stat-icon" />
  <h3>100%</h3>
  <p>Account Ownership</p>
</div>

<div className="stat-card">
  <img src="/images/SVG (9).png" className="stat-icon" />
  <h3>0%</h3>
  <p> Fee Without Profit</p>
</div>
</div>
   <div className="hero-logo">
      <img src="/images/Container (1).png" alt="Hero Logo" />
    </div>
  </div>
</section>


{/*  ABOUT  */}
<section id="about" className="about">
  <div className="container">

    <h2>About <span>Earn Money Safely</span></h2>

    <p className="about-desc">
    We're not just another trading service. We're your strategic partner in building wealth through<br />
safe, professional Stock Market & Share Market trading management with complete<br />
transparency.
    </p>

    <div className="about-row">

      <div className="about-image">
        <img src="/images/About_img.jpg" />
      </div>

      <div className="about-text">

        <h3>Your Success is Our Mission</h3>

        <p>
          At Earn Money Safely, we understand that both Stock Market and Share
Market trading can be complex and risky. That's why we've created a system<br />
where you don't have to be a trading expert to benefit from the financial
markets.<br />
        </p>

        <p>
          Our experienced traders handle all the complexities of both markets while<br />
you maintain full control of your account. We only succeed when you do -<br />
earning our share exclusively from the profits we generate for you.
        </p>
          
        <ul className="custom-list">
          <li>Transparent profit-sharing model with no hidden fees</li>
          <li>Real-time monitoring and detailed performance reports</li>
          <li>Low-risk trading approach focused on sustainable growth</li>
        </ul>

      </div>

    </div>


    {/*  FEATURES  */}
    <div className="features">

      <div className="feature-card">
        <img src="/images/Expert_trading_stratagies.png" />
        <h4>Expert Trading Strategies</h4>
        <p>
          Our team of professional
traders uses proven strategies
backed by years of market
experience and data analysis.
        </p>
      </div>

      <div className="feature-card">
        <img src="/images/data_driven_decisions.png" />
        <h4>Data Driven Decisions</h4>
        <p>
         Every trade is based on
comprehensive market
research, technical analysis,
and real-time data to maximize
returns.
        </p>
      </div>

      <div className="feature-card">
        <img src="/images/client_account_ownership.png" />
        <h4>Client Account Ownership</h4>
        <p>
          You maintain 100% ownership
of your trading account. We
only manage trades - your
money stays under your
control.
        </p>
      </div>

      <div className="feature-card">
        <img src="/images/risk_management.png" />
        <h4>Risk Management First</h4>
        <p>
          We prioritize capital
preservation with strict risk
management protocols,
ensuring your investments are
protected.
        </p>
      </div>

    </div>

  </div>
</section>
<section id="trade" className="trade-section">
  <div className="container">

    <h2>
      We Trade in <span>Both Markets</span>
    </h2>

    <p className="subtitle">
      Whether you're interested in Stock Market or Share Market investments, our expert team<br />
      manages both with equal expertise and precision.
    </p>

    <div className="cards">

      {/*  Card 1  */}
      <div className="card card1" >
        <div className="card-header">
          <div className="icon-box">
            <img src="/images/Background (1).png" alt="icon" />
          </div>
          <h3>Stock Market Trading</h3>
        </div>

        <p>
          Professional management of individual stocks, equity trading,<br />
          and stock portfolio optimization. We identify high-potential stocks<br />
          and execute strategic trades to maximize your returns.
        </p>

        <ul className="custom-list">
          <li>Blue-chip stocks & growth stocks</li>
          <li>Intraday & swing trading strategies</li>
          <li>Technical & fundamental analysis</li>
          <li>Real-time market monitoring</li>
        </ul>

        <div className="trade-stats">
          <span><strong>85%</strong><br /> Success Rate</span>
          <span><strong>500+</strong><br /> Stock Trades/Month</span>
        </div>
      </div>

      {/*  Card 2  */}
      <div className="card card2" >
        <div className="card-header">
          <div className="icon-box">
            <img src="/images/Background.png" alt="icon" />
          </div>
          <h3>Share Market Trading</h3>
        </div>

        {/*  ✅ FIX: paragraph close  */}
        <p>
          Expert share trading across multiple exchanges, including equity
          shares, preference shares, and diversified portfolio management
          for optimal wealth creation.
        </p>

        <ul className="custom-list">
          <li>Equity & preference shares</li>
          <li>Multi-exchange trading</li>
          <li>Diversified portfolio strategy</li>
          <li>Risk-adjusted selection</li>
        </ul>

        <div className="trade-stats">
          <span><strong>90%</strong><br /> Client Satisfaction</span>
          <span><strong>350+</strong><br /> Share Trades/Month</span>
        </div>
      </div>

    </div>

    {/*  Bottom Box  */}
    <div className="bottom-box">
      <h3>Dual Market Expertise</h3>

      {/*  ✅ FIX: paragraph properly closed  */}
      <p>
        Our team of certified traders specializes in both Stock Market and Share Market trading, giving
        you access to comprehensive market opportunities. We analyze market trends across both
        segments to maximize your returns while minimizing risk exposure.
      </p>

      <div className="tags">
        <span>NSE Trading</span>
        <span>BSE Trading</span>
        <span>Equity Shares</span>
        <span>Derivatives</span>
        <span>Mutual Funds</span>
      </div>
    </div>

  </div>
</section>
<section id="system" className="system">
  <div className="container">

    <h2>How Our <span>System Works</span></h2>
    <p className="desc">
      A simple, transparent process designed to maximize your returns while minimizing your <br />involvement and risk.
    </p>

    <div className="steps">
      {/*  Box 1  */}
      <div className="box">
        <div className="num">01</div>
        <img className="icon" src="/images/Overlay+Border.png" alt="Icon 1" />
        <h3>Open Your Trading Account</h3>
        <p>
          Create your own brokerage account with our recommended partners. You maintain 100% ownership and control of your funds at all times.
        </p>
      </div>

      <div className="line"></div>

      {/*  Box 2  */}
      <div className="box">
        <div className="num">02</div>
        <img className="icon" src="/images/Overlay+Border (1).png" alt="Icon 2" />
        <h3>We Manage Trades Professionally</h3>
        <p>
          Our expert traders execute strategic trades on your behalf using proven methodologies and advanced risk management techniques.
        </p>
      </div>

      <div className="line"></div>

      {/*  Box 3  */}
      <div className="box">
        <div className="num">03</div>
        <img className="icon" src="/images/Overlay+Border (2).png" alt="Icon 3" />
        <h3>Weekly/Monthly Profit Sharing</h3>
        <p>
          Profits are distributed transparently - you keep 60–70% of net profits, we earn 30–40% equity share. No profit means no fees for us.
        </p>
      </div>

      <div className="line"></div>

      {/*  Box 4  */}
      <div className="box">
        <div className="num">04</div>
        <img className="icon" src="/images/Overlay+Border (3).png" alt="Icon 4" />
        <h3>Live Dashboard & Reports</h3>
        <p>
          Monitor your account performance in real-time through our dashboard. Receive detailed weekly reports on all trading activity and results.
        </p>
      </div>
    </div>

    {/*  CTA  */}
    <div className="cta">
      <h3>Ready to Get Started?</h3>
      <p>
        Join hundreds of satisfied clients who trust us to manage their trading portfolios.<br /> Start your journey to financial growth today.
      </p>
      <button>Book Free Consultation</button>
    </div>

  </div>
</section>
<section id="why" className="ems-why-section">

<div className="ems-container">

<h2 className="ems-heading">
Why Choose <span>Earn Money Safely</span>?
</h2>

<p className="ems-subtitle">
We're different from traditional trading services. Here's what makes us the trusted choice for smart investors.
</p>

{/*  FEATURES  */}
<div className="ems-cards">

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (10).png" className="ems-icon-img" />   
</div>
<div className="ems-card-content">
<h3>Safe & Stress-Free Trading</h3>
<p className="ems-p1">No need to monitor markets 24/7.
We handle all trading decisions
while you focus on your life.</p>
</div>
</div>

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (3).png" className="ems-icon-img" />  
</div>
<div className="ems-card-content">
<h3>Full Account Ownership</h3>
<p className="ems-p2">Your money stays in your<br />
account. You can withdraw
anytime and maintain complete
control of your funds.</p>
</div>
</div>

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (4).png" className="ems-icon-img" /> 
</div>
<div className="ems-card-content">
<h3>AI + Human Expertise</h3>
<p className="ems-p3">We combine cutting-edge AI
analytics with experienced
human traders for optimal
decision-making.</p>
</div>
</div>

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (5).png" className="ems-icon-img" /> 
</div>
<div className="ems-card-content">
<h3>No Hidden Fees</h3>
<p className="ems-p4">Zero upfront costs. We only earn
when you profit. Complete
transparency in all transactions
and fees.</p>
</div>
</div>

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (6).png" className="ems-icon-img" /> 
</div>
<div className="ems-card-content">
<h3>Consistent Growth Focus</h3>
<p className="ems-p5">Our strategies prioritize
sustainable, long-term growth
over risky short-term gains.</p>
</div>
</div>

<div className="ems-card">
<div className="ems-icon-box">
<img src="/images/SVG (7).png" className="ems-icon-img" /> 
</div>
<div className="ems-card-content">
<h3>No False Promises</h3>
<p className="ems-p6">
We provide realistic expectations based on market conditions. Honesty and transparency are<br /> our foundation.
</p>
</div>
</div>

</div>

{/*  STATS  */}
<div className="ems-stats">

<div className="ems-stat-box">
<h4><span className="ems-counter" data-target="500">500</span>+</h4>
<p>Active Clients</p>
</div>

<div className="ems-stat-box">
<h4>$<span className="ems-counter" data-target="2">2</span>M+</h4>
<p>Funds Managed</p>
</div>

<div className="ems-stat-box">
<h4><span className="ems-counter" data-target="98">98</span>%</h4>
<p>Client Satisfaction</p>
</div>

<div className="ems-stat-box">
<h4><span className="ems-counter" data-target="5">5</span>+ Years</h4>
<p>Market Experience</p>
</div>

</div>

</div>
</section>

     {/*  PROFIT CALCULATOR SECTION  */}

<section className="pc-section" id="pc-section">
  <div className="pc-container">

    <h2 className="pc-heading">Profit Calculator</h2>
    <p className="pc-subtext">
      See your potential returns from Stock Market & Share Market trading.
      Adjust the parameters below to estimate your earnings with our professional trading service.
    </p>

    <div className="pc-main">

      {/*  LEFT  */}
      <div className="pc-left">

        <h3 className="pc-title">Calculate Your Returns</h3>

        <div>
          <div className="pc-field">
            <div className="pc-top">
              <label>Investment Amount</label>
              <span>$10,000</span>
            </div>
            <div className="pc-line"></div>
            <small>
              <span>$1,000</span>
              <span>$100,000</span>
            </small>
          </div>

          <div className="pc-field">
            <div className="pc-top">
              <label>Expected Monthly Return</label>
              <span>8%</span>
            </div>
            <div className="pc-line"></div>
            <small>
              <span>3%</span>
              <span>15%</span>
            </small>
          </div>

          <div className="pc-field">
            <div className="pc-top">
              <label>Duration (Months)</label>
              <span>6 months</span>
            </div>
            <div className="pc-line"></div>
            <small>
              <span>1 month</span>
              <span>24 months</span>
            </small>
          </div>
        </div>

        <p className="pc-note">
          * These are projected estimates based on historical performance.
          Actual returns may vary based on market conditions.
        </p>

      </div>

      {/*  RIGHT  */}
      <div className="pc-right">

        <div className="pc-box gold">
           <span style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
            <img src="/images/dollar (1).png" style={{width: "18px", height: "18px"}} />
            Total Portfolio Value</span>
          <h3>$15,868.74</h3>
        </div>

        <div className="pc-box">
          <span style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
            <img src="/images/arrow.png" style={{width: "18px", height: "18px"}} />Total Profit Generated</span>
          <h3>$5,868.74</h3>
        </div>

        <div className="pc-box green">
          <span style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
            <img src="/images/percentage_green.png" style={{width: "18px", height: "18px"}} />Your Share (65%)</span>
          <h3>$3,814.68</h3>
        </div>

        <div className="pc-box dim">
          <span style={{display: "inline-flex", alignItems: "center", gap: "6px"}}>
            <img src="/images/percentage_grey.png" style={{width: "18px", height: "18px"}} />Our Share (35%)</span>
          <h3>$2,054.06</h3>
        </div>

        <button className="pc-btn">Start Earning Today</button>

      </div>

    </div>
  </div>
</section>

{/*  CLIENT SUCCESS STORIES  */}
<section className="cs-section" id="cs-section">
  <div className="cs-container">

    <h2 className="cs-heading">
      <span>Client</span> Success Stories
    </h2>

    <p className="cs-subtitle">
      Don't just take our word for it. Here's what our clients have to say about their experience with<br /> Earn Money Safely.
    </p>

    <div className="cs-grid">

      {/*  CARD 1  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote">
           <img src="/images/SVG (8).png" className="quote" /> 
          </span>
          <span className="cs-stars">
          <img src="/images/Container.png" className="stars" /></span>
        </div>
        <p className="cs-text">
          "I've been with Earn Money Safely for 8
           months and my portfolio has grown by
           47%. The transparency and
           professionalism are unmatched. I finally
           found a trading service I can trust."
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
             <img src="/images/👨_💼 (2).png" className="avatar" />   
          </div>
          <div>
            <h4>Michael Rodriguez</h4>
            <span>Business Owner</span>
          </div>
        </div>
      </div>

      {/*  CARD 2  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote">
             <img src="/images/SVG (8).png" className="quote" /> 
          </span>
          <span className="cs-stars">
            <img src="/images/Container.png" className="stars" /></span></div>
        <p className="cs-text">
          "As someone with no trading experience,<br />
           this service has been a game-changer.
           They handle everything while I keep full
           control of my account. I've earned over
           $12,000 in profit so far.""
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
         <img src="/images/2.png" className="avatar" /> 
          </div>
          <div>
            <h4>Sarah Chen</h4>
            <span>Software Engineer</span>
          </div>
        </div>
      </div>

      {/*  CARD 3  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote"> 
          <img src="/images/SVG (8).png" className="quote" /> </span>
          <span className="cs-stars">
            <img src="/images/Container.png" className="stars" />
          </span>
        </div>
        <p className="cs-text">
         "The risk management approach gives me<br />
          peace of mind. Unlike other services that<br />
          promise unrealistic returns, EMS provides<br />
          honest, data-driven results. My $25k
          investment has grown consistently."
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
             <img src="/images/👨_💼 (2).png" className="avatar" /> 
          </div>
          <div>
            <h4>David Thompson</h4>
            <span>Investor</span>
          </div>
        </div>
      </div>

      {/*  CARD 4  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote"><img src="/images/SVG (8).png" className="quote" /></span>
          <span className="cs-stars">
            <img src="/images/Container.png" className="stars" />
          </span>
        </div>
        <p className="cs-text">
          "I love the weekly reports and live
           dashboard. I can monitor everything in
           real-time without spending hours
           analyzing charts. The profit-sharing model<br />
           is fair and transparent."
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
                 <img src="/images/👩_⚕️.png" className="avatar" />
          </div>
          <div>
            <h4>Priya Patel</h4>
            <span>Healthcare Professional</span>
          </div>
        </div>
      </div>

      {/*  CARD 5  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote"><img src="/images/SVG (8).png" className="quote" /></span>
          <span className="cs-stars">
            <img src="/images/Container.png" className="stars" />
          </span>
        </div>
        <p className="cs-text">
          "Started with $10,000 as a test. Six
           months later, I've increased my
           investment to $50,000. The team's
           expertise and the AI-driven strategies
           have exceeded my expectations."
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
        <img src="/images/👨_💼 (2).png" className="avatar" /> 
          </div>
          <div>
            <h4>James Wilson</h4>
            <span>Entrepreneur</span>
          </div>
        </div>
      </div>

      {/*  CARD 6  */}
      <div className="cs-card">
        <div className="cs-top">
          <span className="cs-quote"><img src="/images/SVG (8).png" className="quote" /></span>
          <span className="cs-stars">
            <img src="/images/Container.png" className="stars" />
          </span>
        </div>
        <p className="cs-text">
          "Finally, a trading service that doesn't
           require upfront fees! The fact that they
           only earn when I profit shows they're
           genuinely invested in my success. Highly<br />
           recommend!"
        </p>
        <div className="cs-user">
          <div className="cs-avatar">
              <img src="/images/3.png" className="avatar" /> 
          </div>
          <div>
            <h4>Emma Martinez</h4>
            <span>Marketing Director</span>
          </div>
        </div>
      </div>

    </div>

    {/*  STATS BOX  */}
    <div className="cs-stats">
      <div>
        <h3>4.9/5</h3>
        <p>Average Rating</p>
      </div>
      <div>
        <h3>500+</h3>
        <p>Happy Clients</p>
      </div>
      <div>
        <h3>$3.2M+</h3>
        <p>Profits Generated</p>
      </div>
    </div>

  </div>
</section>
<section className="k-section" id="risk">
    <div className="k-container">
      <div className="k-header">
        <div className="k-icon">
          <img src="/images/image1kk.png" alt="" />
        </div>
        <h2 className="k-title">Legal &amp; <span>Risk Disclaimer</span></h2>
      </div>
      <div className="k-card">
        <div className="k-notice-box">
          <div className="k-notice-header">
            <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 2L16 15H2L9 2Z" stroke="#F0B100" strokeWidth="1.5" strokeLinejoin="round" />
              <line x1="9" y1="8" x2="9" y2="11" stroke="#F0B100" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="9" cy="13" r="0.75" fill="#F0B100" />
            </svg>
            <span className="k-notice-title">Important Notice</span>
          </div>
          <p className="k-notice-text">Trading in financial markets involves substantial risk and may not be suitable for
            all investors. Past performance is not indicative of future results.</p>
        </div>

        <div className="k-disclosure-block">
          <div className="k-block-header">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="#D4AF37" strokeWidth="1.3" />
              <line x1="5" y1="6" x2="11" y2="6" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="9" x2="9" y2="9" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="k-block-title">Risk Disclosure</span>
          </div>
          <ul className="k-block-list">
            <li>All trading involves market risk. The value of investments can go down as well as up.</li>
            <li>There are no guaranteed returns. Profit projections are estimates based on historical data and market
              conditions.</li>
            <li>You could lose some or all of your initial investment. Never invest more than you can afford to lose.
            </li>
            <li>Past performance of our trading strategies does not guarantee future results.</li>
          </ul>
        </div>

        <div className="k-disclosure-block">
          <div className="k-block-header">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="12" height="12" rx="2" stroke="#D4AF37" strokeWidth="1.3" />
              <line x1="5" y1="6" x2="11" y2="6" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="5" y1="9" x2="9" y2="9" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            <span className="k-block-title">Profit Sharing Agreement</span>
          </div>
          <ul className="k-block-list">
            <li>Our compensation is earned exclusively from profits generated on your account.</li>
            <li>Profit sharing ranges from 30-40% equity for Earn Money Safely, with 60-70% retained by the client.</li>
            <li>If no profit is generated in a given period, no fees are charged to the client.</li>
            <li>All profit calculations are based on net profit after accounting for any trading losses.</li>
          </ul>
        </div>

        <div className="k-block-header">
          <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="#D4AF37" strokeWidth="1.3" />
            <line x1="5" y1="6" x2="11" y2="6" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
            <line x1="5" y1="9" x2="9" y2="9" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="k-block-title">Client Responsibilities</span>
        </div>
        <ul className="k-block-list">
          <li>You maintain full ownership and control of your brokerage account at all times.</li>
          <li>You are responsible for understanding the risks associated with trading and your account activity.</li>
          <li>Figma Make and Earn Money Safely are not intended for collecting personally identifiable information (PII)
            or securing highly sensitive data.</li>
          <li>You should only invest funds that you can afford to lose without affecting your financial stability.</li>
        </ul>
        <div className="k-bottom-box">

          <p className="k-footer-note">
            Earn Money Safely operates as a trading consultancy service. We recommend consulting with a financial
            advisor
            before making investment decisions. This website and its content do not constitute financial advice and
            should
            not be relied upon as such.
          </p>
        </div>

      </div>
    </div>
  </section>

  <section className="k-consultation-section" id="consultation">
    <div className="k-consult-container">
      <div className="k-consult-heading">
        <h2 className="k-consult-title">Book Your <span>Free Consultation</span></h2>
        <p className="k-consult-subtitle">Ready to start your journey in Stock Market & Share Market trading? Get in touch
          with us today for a free consultation. No obligations, just honest advice.</p>
      </div>
      <div className="fee-box">
  <h3>Registration Fee</h3>
  <p>Your registration fee is <strong>$5</strong> (one-time).</p>
  <p>Each signal costs <strong>$1</strong>.</p>
  <p>If a signal results in <strong>LOSS</strong>, the next signal is <strong>FREE</strong>.</p>
</div>
      <div className="k-consult-columns">
        <div className="k-consult-left">

          <div className="k-contact-card k-whatsapp-card">
            <div className="k-contact-icon k-whatsapp-icon">
              <img src="/images/whatsappkk.png" alt="" />
            </div>
            <div className="k-contact-info">
              <h3 className="k-contact-title">WhatsApp Chat</h3>
              <p className="k-contact-detail">Get instant responses to your questions</p>
            </div>
          </div>

          <div className="k-contact-card k-email-card">
            <div className="k-contact-icon k-email-icon">
              <img src="/images/emailak.png" alt="" />
            </div>
            <div className="k-contact-info">
              <h3 className="k-contact-title">Email Us</h3>
              <p className="k-contact-detail">contact@earnmoneysafely.com</p>
            </div>
          </div>

          <div className="k-contact-card k-call-card">
            <div className="k-contact-icon k-call-icon">
              <img src="/images/contactk.png" alt="" />
            </div>
            <div className="k-contact-info">
              <h3 className="k-contact-title">Call Us</h3>
              <p className="k-contact-detail">+1 (555) 123-4567</p>
            </div>
          </div>

          <div className="k-expect-card">
            <h3 className="k-expect-title">What to Expect</h3>
            <ul className="k-expect-list">
              <li>
                <svg className="k-check-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#D4AF37" strokeWidth="1.3" />
                  <path d="M6 10l3 3 5-5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"
                    strokeLinejoin="round" />
                </svg>
                Free 30-minute consultation with our trading experts
              </li>
              <li>
                <svg className="k-check-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#D4AF37" strokeWidth="1.3" />
                  <path d="M6 10l3 3 5-5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"
                    strokeLinejoin="round" />
                </svg>
                Personalized trading strategy assessment
              </li>
              <li>
                <svg className="k-check-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#D4AF37" strokeWidth="1.3" />
                  <path d="M6 10l3 3 5-5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"
                    strokeLinejoin="round" />
                </svg>
                No high-pressure sales, just honest guidance
              </li>
              <li>
                <svg className="k-check-icon" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#D4AF37" strokeWidth="1.3" />
                  <path d="M6 10l3 3 5-5" stroke="#D4AF37" strokeWidth="1.5" strokeLinecap="round"
                    strokeLinejoin="round" />
                </svg>
                Clear explanation of our profit-sharing model
              </li>
            </ul>
          </div>

        </div>

        <form className="k-consult-right" id="consultForm">
          <div className="k-form-group">
            <label className="k-form-label">Full Name <span className="k-required">*</span></label>
            <input type="text" className="k-form-input" placeholder="John Doe" id="fullName" />
          </div>
          <div className="k-form-group">
            <label className="k-form-label">Email Address <span className="k-required">*</span></label>
            <input type="email" className="k-form-input" placeholder="john@example.com" id="emailAddress" />
          </div>
          <div className="k-form-group">
            <label className="k-form-label">Phone Number</label>
            <input type="tel" className="k-form-input" placeholder="+1 (555) 123-4567" id="phoneNumber" />
          </div>
          <div className="k-form-group">
            <label className="k-form-label">Password</label>
           <input type="password" className="k-form-input"  placeholder="Enter a Password" id="password" />
           </div>
        
          <div className="k-form-group">
            <label className="k-form-label">Message</label>
            <textarea className="k-form-input k-form-textarea" placeholder="Tell us about your trading goals..."
              id="message" rows="4"></textarea>
          </div>
         <button type="submit" className="k-submit-btn" id="submitBtn">
            <svg viewBox="0 0 20 20" fill="none" width="18" height="18">
              <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M2 7l8 5 8-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            Create Your Account
          </button>
          <p className="k-form-disclaimer">By submitting this form, you agree to be contacted by Earn Money Safely
            regarding our services.</p>
        </form>
      </div>
    </div>
  </section>

  <footer className="k-footer">
    <div className="k-footer-container">
      <div className="k-footer-top">

        <div className="k-footer-brand">
          <div className="k-footer-logo">
            <div className="k-footer-logo-icon"><span>ES</span></div>
            <span className="k-footer-logo-text">Asian fx Signal</span>
          </div>
          <p className="k-footer-brand-desc">Professional trading management services with transparent profit-sharing. Your
            wealth, our strategy.</p>
          {/*  <div className="k-footer-socials">
            <a href="#" className="k-social-btn" aria-label="Facebook">
              <img src="/images/Link.png" alt="Facebook" width="40" height="40" />
            </a>
            <a href="#" className="k-social-btn" aria-label="Twitter">
              <img src="/images/Link (1).png" alt="Twitter" width="40" height="40" />
            </a>
            <a href="#" className="k-social-btn" aria-label="LinkedIn">
              <img src="/images/Link (2).png" alt="LinkedIn" width="40" height="40" />
            </a>
            <a href="#" className="k-social-btn" aria-label="Instagram">
              <img src="/images/Link (3).png" alt="Instagram" width="40" height="40" />
            </a>
          </div>  */}
        </div>

        <div className="k-footer-col">
          <h4 className="k-footer-heading">Quick Links</h4>
          <ul className="k-footer-links">
            <li><a href="#about">About Us</a></li>
            <li><a href="#system">How It Works</a></li>
            <li><a href="#pc-section">Profit Calculator</a></li>
            <li><a href="#cs-section">Testimonials</a></li>
            <li><a href="#consultation">Contact Us</a></li>
          </ul>
        </div>

        <div className="k-footer-col">
          <h4 className="k-footer-heading">Our Services</h4>
          <ul className="k-footer-links">
            <li><a href="#trade">Stock Market Trading</a></li>
            <li><a href="#trade">Share Market Trading</a></li>
            <li><a href="#risk">Risk Assessment</a></li>
            <li><a href="#">Portfolio Monitoring</a></li>
            <li><a href="#trade">Market Analysis</a></li>
            <li><a href="#pc-section">Profit Optimization</a></li>
          </ul>
        </div>

        <div className="k-footer-col">
          <h4 className="k-footer-heading">Contact Info</h4>
          <ul className="k-footer-contact">
            <li>
              <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                <rect x="1" y="3" width="14" height="10" rx="2" stroke="#D4AF37" strokeWidth="1.2" />
                <path d="M1 6l7 4 7-4" stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>contact@earnmoneysafely.com</span>
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                <path
                  d="M4.4 7.2c.93 1.87 2.53 3.4 4.4 4.4l1.47-1.47c.2-.2.47-.27.67-.13.73.27 1.53.4 2.4.4.4 0 .67.27.67.67v2.33c0 .4-.27.67-.67.67C5.73 14 2 10.27 2 5.67c0-.4.27-.67.67-.67H5c.4 0 .67.27.67.67 0 .87.13 1.67.4 2.4.13.2.07.47-.13.67L4.4 7.2z"
                  stroke="#D4AF37" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>+1 (555) 123-4567</span>
            </li>
            <li>
              <svg viewBox="0 0 16 16" fill="none" width="16" height="16">
                <path
                  d="M8 1.5C5.52 1.5 3.5 3.52 3.5 6c0 3.75 4.5 8.5 4.5 8.5s4.5-4.75 4.5-8.5c0-2.48-2.02-4.5-4.5-4.5z"
                  stroke="#D4AF37" strokeWidth="1.2" />
                <circle cx="8" cy="6" r="1.5" stroke="#D4AF37" strokeWidth="1.2" />
              </svg>
              <span>123 Financial District<br />New York, NY 10004</span>
            </li>
          </ul>
        </div>

      </div>

      <div className="k-footer-divider"></div>

      <div className="k-footer-bottom">
        <p className="k-footer-copyright">&copy; 2026 Earn Money Safely. All rights reserved.</p>
        <div className="k-footer-legal">
          <a href="#">Privacy Policy</a>
          <a href="#">Terms of Service</a>
          <a href="#">Risk Disclosure</a>
        </div>
      </div>
    </div>
  </footer>
        </>
    );
}
