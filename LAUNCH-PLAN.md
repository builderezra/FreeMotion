> **Status: reference, not a commitment.** Ezra, 2026-08-12: "This doesn't have to be what we
> exactly do but save it for later when we may need the advice." Nothing in here is scheduled or
> agreed — it is kept for when launch planning actually starts.
>
> **Read [BEFORE-PUBLISHING.md](BEFORE-PUBLISHING.md) alongside this.** This plan's growth engine is
> App Store header video and TikTok before/after clips, i.e. publishing recordings of the UI. The UI
> is currently modelled on Alight Motion, so the identity work is a prerequisite for the FIRST VIDEO,
> not for the store submission.

---

# FreeMotion: App Store Launch & Advertising Plan

*Built August 2026. All benchmarks are 2025–2026 data, sourced at the bottom. All math was computed in code, not estimated.*

---

## The headline you need before anything else

**With the monetization model you described, paid advertising loses money on every single install, at every budget level, and no amount of optimization fixes it.**

I modeled it three ways (pessimistic / base / optimistic). Here is what one install is worth to you over 12 months versus what one costs:

| | Pessimistic | Base | Optimistic |
|---|---|---|---|
| Active days per install (365d) | 6.9 | 9.6 | 16.3 |
| Ad revenue per install | $0.06 | $0.19 | $0.68 |
| Remove-ads sub revenue per install (net of Apple's 30%) | $0.02 | $0.06 | $0.29 |
| **12-month LTV per install** | **$0.07** | **$0.24** | **$0.97** |

| Channel | Cost per install |
|---|---|
| Apple Ads, Photo & Video, US | **$3.13** |
| Apple Ads, global blended | $1.80 |
| Meta / TikTok paid social, US iOS | ~$4.50 |
| Creator UGC at $200/video, 60 installs | $3.33 |

You are **$2.89 underwater on every install** in the base case. Even in the optimistic case you are $2.16 underwater. To break even on Apple Ads in your category you would need an LTV of $3.13. You have $0.24.

### What that means for each budget tier

Three months of spend, base case:

| Tier | 3-mo spend | Installs | Still active D30 | Subs won | 12-mo revenue back | Net |
|---|---|---|---|---|---|---|
| **A. Under $500/mo** | $1,200 | ~460 | 19 | 3 | $113 | **–$1,087** |
| **B. $500–2k/mo** | $4,500 | ~1,550 | 65 | 9 | $379 | **–$4,121** |
| **C. $2k–10k/mo** | $18,000 | ~5,300 | 222 | 32 | $1,291 | **–$16,709** |
| **D. $10k+/mo** | $90,000 | ~21,400 | 900 | 129 | $5,227 | **–$84,773** |

Every tier recovers **6–9% of spend**. That is not a tuning problem. That is the model telling you the answer.

Put differently: at a $0.24 LTV, sustaining **$1,000/month in revenue requires ~4,100 new installs every month, forever.** $10,000/month requires ~41,000 installs a month, every month. At Apple Ads prices that's $128,000/month in spend to earn $10,000. You are not buying your way there.

### Sanity check on my own pessimism

Adapty's 2026 data (16k apps, $3B) puts **average Photo & Video install LTV at $0.82**, with North America roughly 2x, so ~$1.64. That is for apps with real, feature-gated subscriptions. Even those apps are underwater against a $3.13 CPI. Your model, where everything is unlocked and the only paid benefit is turning ads off, will land well below that. My $0.24 is the honest number, not a scare tactic.

---

## Where this leaves you

Two paths. Pick one before you spend a dollar.

**Path 1: Fix monetization first, then buy users.**
**Path 2: Accept the model, go organic, and treat ads as a research tool, not a growth engine.**

They are not mutually exclusive. Path 2 is what you do for the next 90 days regardless.

---

## Part 1: Fix monetization (do this before launch, it's free)

Here is what each fix does to LTV. Same retention, same everything else:

| Change | LTV/install | Gap to $3.13 CPI |
|---|---|---|
| Current plan (ads + remove-ads sub) | $0.24 | –$2.89 |
| **+ Rewarded video gate on export** (1.5 rewarded views/DAU @ $15 eCPM) | $0.42 | –$2.71 |
| + Raise sub to $7.99/mo or $29.99/yr | $0.45 | –$2.68 |
| + **Real freemium**: gate watermark removal, 4K export, premium packs | $0.78 | –$2.35 |
| + All of the above **and** lift retention to iOS all-category (D1 27%, D30 8%) | **$1.29** | –$1.84 |

Read that carefully. Even with **every** fix stacked and retention fixed, you are still $1.84 short of profitable Apple Ads in the US. You would be roughly break-even against global-blended Apple Ads at $1.80 CPI, which means expanding beyond US-only.

The three fixes worth making anyway, in order of return per hour of work:

1. **Rewarded video on export.** This is the single biggest ad-revenue lever for a creative tool. Export is high-intent: the user has already made something and wants it. Rewarded video eCPM on US iOS is $15–30, versus $6–14 for interstitials and under $1 for banners. Nearly doubles your ad LTV on its own.
2. **Kill the banners.** Realized banner eCPM on NA iOS is around $0.35. They earn almost nothing and they wreck the feel of a motion tool. The only defensible ad placements in your app are rewarded (at export) and one well-placed interstitial.
3. **Give the subscription something to sell besides silence.** "Pay to remove ads" is the weakest possible pitch. The only study that isolates it (AppLovin, n=5,000 US adults) found **67% of people would pay nothing at all** to remove ads. Attach watermark removal, 4K/60fps export, and a premium template or preset pack to the same tier. Photo & Video apps that gate real features hit ~4.3% install-to-paid. Remove-ads-only realistically sits under 1%.

A caution on price: Photo & Video has the **worst renewal rate of any category** (RevenueCat, April 2026: 23% first annual renewal, 48% first monthly). People treat these apps as pick-up-put-down utilities. Lean annual, and do not build a plan on recurring monthly revenue.

**Free money you should not skip:** since May 2025 (Epic ruling, upheld through the Supreme Court's cert denial in April 2026), **US apps can link out to external web checkout at 0% Apple commission.** That is a 30% raise on every US subscription. The court has remanded to set a "reasonable coordination fee," so build assuming a future 5–15% rate rather than 0% forever.

---

## Part 2: Pre-launch, weeks 0–4 (spend: $0)

You haven't submitted yet. This window is worth more than the first $10,000 of ad spend, and most of it is free.

### Apple's 2026 changes are unusually good for a motion tool

**WWDC26 shipped Creative Assets with iOS 27 this fall.** Rich images *and video* now appear in **product page headers and in organic search results**, separate from screenshots. Search results surface up to 3 screenshots or 3 app previews. For a motion-graphics app this is the whole ballgame: your product is a demo reel, and Apple now plays it before anyone taps.

Two constraints that will bite if you ignore them: **video is muted by default and must loop seamlessly**, so design silent-first with the poster frame doing the work. And **all App Store assets must meet a 4+ age rating** regardless of your app's own rating.

Also new: the **Asset Library** lets you submit assets for review independent of an app build. You can iterate creative weekly without shipping a binary.

### App Store Optimization, actually current

- **App name (30 chars) carries the most weight**, subtitle second, the 100-char keyword field third. Apple builds keyword combinations *across* fields, so **never repeat a word** you already used. It is an allocation problem, not a density problem.
- **Apple's search is now partly LLM-driven.** Apple published the paper in February 2026: they fine-tuned a model to generate millions of relevance labels on top of the behavioral ranker. Worldwide A/B test showed +0.24% conversion, **concentrated in tail queries**. Practical read: descriptive long-tail searches ("app that animates text over video") are winnable on semantic fit now, not just exact-match tokens. Write your description for what the app is *for*.
- **Custom Product Pages became organically searchable in July 2025, and the limit doubled to 70 in October 2025.** This is the most underused lever in the store. Build one CPP per use case (text animation, logo sting, social captions, transitions, kinetic typography) with a header video showing that exact output. Note you select from Apple-suggested keywords, you can't enter custom ones.
- **Product Page Optimization** lets you test 3 treatments against your default (icons, screenshots, previews, and now headers). Run it from day one. It doesn't work on Custom Product Pages.
- **Ratings are a hard gate for featuring:** 95% of featured apps are rated 4.0+, 65% are 4.6+. Prompt for reviews right after a successful export, never on launch.

### Nominate for featuring, right now

Apple's official nomination form is in App Store Connect (requires Account Holder, Admin, App Manager, or Marketing role). **Minimum 3 weeks lead time; Apple recommends up to 3 months.** Submit an "App Launch" nomination today, before you even submit the binary.

What Apple says it looks for: user experience, UI design, innovation, uniqueness, **accessibility**, **localization**, and product page quality. Accessibility and localization are the two most editors care about and the two indies most often skip. Ship VoiceOver support and 5+ languages and you meaningfully change your odds.

Attach a TestFlight public link in the supplemental URLs. You get up to 5.

Featuring is the only realistic way a solo app gets 6-figure downloads without a budget. One documented 2026 case: a US Game of the Day drove **+470% organic installs, +540% organic revenue.** (Ignore the "+1,747%" number floating around: it's from 2017 and is not current.)

### One trap to avoid

If you ship a social feed, a public template gallery, or content redistribution, you get auto-classified as **Social Media**, which forces a minimum **13+ rating** and pulls you into iOS 27 parental Time Allowances. A 4+ rating is better for featuring and reach. Keep the community gallery out, or gate it with the Declared Age Range API. Also, per the November 2025 guideline update (4.1c), **you cannot put another company's brand in your app name or icon**. No "CapCut templates," no "Reels maker," no "for TikTok."

---

## Part 3: The actual growth engine (organic short-form video)

This is where your users come from. Not from ads.

The math, using real platform data (TikTok median for sub-10k-follower accounts is ~620 views/video in Q1 2026):

| | 90 posts/mo | Views/mo | Installs/mo | Effective CPI at $8/video production |
|---|---|---|---|---|
| Low (0.1% view→install) | 90 | ~323,000 | ~320 | $2.23 |
| Mid (0.3%) | 90 | ~323,000 | ~970 | **$0.74** |
| High (1.0%) | 90 | ~323,000 | ~3,230 | **$0.22** |

Even the pessimistic case beats Apple Ads. The mid case beats it by 4x. That assumes 5% of posts break out to ~60k views, which is normal for a category where the product *is* the visual.

**Be honest about the uncertainty:** no credible published benchmark exists for view-to-install conversion. Anyone quoting you a clean number is making it up. The 0.1–1% range comes from scattered indie reports. **Track App Store referral traffic in App Analytics, not views.**

### The playbook that's documented to work in your exact category

PhotoRoom (photo editing, 50M installs) built a network of **100+ creators worldwide** using one method: **find people already organically posting about your app, then formalize the partnership.** That beats cold outreach on cost and on authenticity, and it's the highest-signal tactic in the whole research file for a creative tool.

They also deliberately targeted **under-served geos** (Japan, Taiwan, Germany, South America) instead of fighting for US/UK photo-app keywords. Given your CPI math, cheaper geos are not a downgrade, they're the strategy.

Cal AI's version of the same engine: **12+ TikTok accounts, 1,000+ videos, ~10.2M views → 700k monthly downloads.** Their $500k MrBeast deal returned about $400k. The celebrity money roughly broke even; the multi-account grind did the work. That is the lesson.

### Platform priority for a cold start

| Platform | Median views, <10k followers | Cold start |
|---|---|---|
| **TikTok** | 300–1,000 | Easiest. Every video gets a test pool. |
| YouTube Shorts | 100–400, delayed 24–72h, long tail | Moderate |
| Instagram Reels | 200–600 | Hardest. Social-graph gated. |

Start TikTok-first. Cross-post everything, but optimize for TikTok.

### Content formats that convert for a motion tool

- **Before/after in 3 seconds.** Boring clip, then the FreeMotion version. No talking.
- **Screen recording of the actual workflow**, sped up, with the result at the end. People install tools when they believe they could do that too.
- **"How they made this"** teardowns of effects people already recognize from Instagram/TikTok.
- **Template drops.** "New preset, free, link in bio." Gives you a reason to post daily.

Your CTA has to be *specific*. "Link in bio" is where installs die. "It's called FreeMotion, it's free on the App Store" works better because App Store search is where they'll actually go.

### Launch platforms, ranked honestly

- **Reddit:** worth it, but slow. r/SideProject, r/AlphaAndBetaUsers, r/BetaTestersNeeded, r/AppHookup (requires giving something free), plus r/motiongraphics, r/AfterEffects, r/VideoEditing, r/NewTubers. Needs 2–6 weeks of genuine participation and 30–50 karma first. A strong beta-recruitment post can produce 1,000+ installs, but that's best case, not a benchmark. Reddit traffic rarely converts to paying users.
- **Product Hunt:** mostly not worth it now. Only ~10% of launches get featured (down from 60–98% in 2020–23), and non-featured launches produce 100–500 visitors and 1–15 signups. **89% of surveyed founders said they wouldn't launch again.** Real residual value is a DR-91 backlink, not downloads. Do it, spend one day on it, expect nothing.
- **Hacker News:** skip unless you have a genuine engineering story (a Metal pipeline, real-time compositing, on-device rendering). Front-page Show HN gets 5,000–30,000 visitors, but only 2.3% of submissions make the front page and the median Show HN score is **2 points**. HN explicitly punishes consumer apps without technical differentiation. If you do post, lead with the engineering.
- **Discord:** not an acquisition channel for non-games. Use it for beta feedback and retention.

---

## Part 4: What paid ads are actually for

Not growth. Three narrow, defensible jobs:

**1. Creative testing (the highest-ROI use of ad money you have).**
Run $20–30/day on TikTok Spark Ads against 5–8 different video hooks. You're not buying installs, you're buying a fast read on which hook wins. Then you post the winner organically, for free, forever. A $600 test that finds a hook worth 500k organic views is the best money in this plan.

**2. Apple Ads brand defense.**
Bid on "FreeMotion" and close variants. This is cheap (low competition on your own name), stops competitors from stealing users who are already searching for you, and gets more valuable the more your organic content works. Budget: whatever it costs, usually $50–200/mo early.

**3. Competitor and long-tail keyword sniping on Apple Ads.**
Photo & Video has the **best conversion efficiency of any category (63% tap-to-install)**, so your ad dollar goes further here than almost anywhere. Exact-match only, tight keyword list, aggressive negatives. This still loses money per install at your current LTV. Treat it as paid research into which search terms convert, then feed those terms back into your ASO.

**Everything else is a donation.** No broad-match Apple Ads. No Meta advantage+ app campaigns. No scaled TikTok install campaigns. Not until LTV is above $1.50.

---

## Part 5: The budget tiers, rewritten to be worth spending

You asked for a plan and an outcome at each level. Here is what I'd actually do with each, which is different from what the naive install-buying version does.

### Tier A: $0–500/month (my recommendation for months 1–3)

| | |
|---|---|
| **Allocation** | $150 creative testing (TikTok Spark Ads, 5–8 hooks) · $100 Apple Ads brand defense · $150 video production/editing help · $100 ASO tooling (AppTweak/Sensor Tower entry tier) |
| **Your real cost** | The time to post 2–3 short videos per day. This is the actual price. |
| **Realistic 90-day outcome** | 3,000–15,000 installs, almost all organic. 1–3 videos that break 50k+ views. A validated set of hooks. A working ASO keyword set. Real retention data. |
| **Revenue** | $50–500 total. Do not plan around it. |
| **What you're actually buying** | The answer to "does anyone want this," at the lowest possible price. |

### Tier B: $500–2,000/month

Only if Tier A produced a hook that worked and D7 retention above 10%.

| | |
|---|---|
| **Allocation** | $400 creative testing at higher volume · $300 Apple Ads (brand + 10–15 exact-match terms) · $600 creator partnerships (3–4 videos at $150–200, prioritize people already posting about you) · $300 UGC production · $400 localization (5 languages, unlocks cheap geos and helps featuring) |
| **Realistic 90-day outcome** | 15,000–50,000 installs. Meaningful featuring odds if ratings hold above 4.5. |
| **Revenue** | $500–3,000. Still nowhere near covering spend. |
| **Hurdle to remember** | A $200 creator video needs **64+ installs** to beat Apple Ads. Ask for install data before you rebook anyone. |

### Tier C: $2,000–10,000/month

**Do not spend at this level until LTV is above $1.50.** At $0.24 you burn $16,700 net over a quarter to get 222 people still using the app on day 30. That is **$81 per retained user** for an app monetizing at pennies. (Tier A is $62/retained user, Tier D is $100. It gets worse as you scale, not better.)

If you've fixed monetization and LTV is verified above $1.50 with real cohort data:

| | |
|---|---|
| **Allocation** | $3,000 Apple Ads (all placements, US + tier-2 geos) · $3,000 TikTok/Meta with proper creative rotation · $1,500 creator network (10–15 creators) · $1,000 production · $500 MMP/attribution (AppsFlyer or Adjust; you need this at this level) |
| **Realistic 90-day outcome** | 30,000–80,000 paid installs plus whatever organic compounds |
| **Break-even requirement** | Blended CPI under half your verified LTV |

### Tier D: $10,000+/month

This is a growth-equity move, not a bootstrapping move. It only makes sense if you have a verified LTV above $3, a payback window under 6 months, and either funding or existing profit to fund the gap. **At today's numbers it means writing off roughly 94 cents of every dollar.**

If you get here, the constraint stops being budget and becomes creative volume: you'll need 20–40 new ad creatives a month to keep frequency from killing performance, which is a production problem, not a media-buying one.

---

## Part 6: The 90-day sequence

**Weeks 0–3 (pre-submission)**
Add rewarded video at export. Kill banners. Repackage the subscription with watermark removal and 4K. Write App Store metadata for semantic search. Build 5+ Custom Product Pages with header video. Localize to 5 languages. Submit the featuring nomination (App Launch type). Start the TikTok account now and post 20 videos before the app exists, so you launch to an audience instead of a void. Build web checkout to capture the 0% US commission.

**Weeks 4–6 (launch)**
Ship. Start Product Page Optimization on day one. $150 into TikTok creative testing across 5–8 hooks. Turn on Apple Ads brand defense. Post daily. Product Hunt launch, one day of effort, no expectations. Seed the permissive subreddits with promo codes.

**Weeks 7–12 (read the data)**
Scale the winning hook organically. Reach out to anyone who posted about FreeMotion unprompted and formalize it. Add exact-match Apple Ads on the terms that converted. Run In-App Events (Apple treats these as a high-priority featuring surface, and they are badly underused outside games).

**Week 13: decide.** Kill criteria below.

---

## Part 7: What to measure, and when to stop

Check these at day 90. They decide everything:

| Metric | Green | Yellow | Red |
|---|---|---|---|
| **D7 retention** | >12% | 8–12% | <8% |
| **D30 retention** | >6% | 4–6% | <4% |
| **Install→paid conversion** | >2% | 0.8–2% | <0.8% |
| **Ad ARPDAU** | >$0.04 | $0.02–0.04 | <$0.02 |
| **Organic installs/mo, trending** | Growing | Flat | Declining |
| **App Store rating** | 4.6+ | 4.0–4.5 | <4.0 |

**Two red lights on retention means stop spending on acquisition entirely and go fix the product.** Buying users for an app they abandon on day 2 is the most expensive mistake in mobile, and it's the one almost everyone makes.

The reference points: iOS all-category retention is D1 25.4%, D30 5.3%. Photo & Video runs *below* that (AppsFlyer explicitly identifies generative AI and photo & video as the lowest-retention categories). So "below average" for you is genuinely bad, not just middling.

---

## The one-paragraph version

Don't spend on ads yet. Your LTV is roughly $0.24 per install and Apple Ads in Photo & Video costs $3.13, so every budget tier recovers 6–9% of spend and no optimization closes a 13x gap. Spend the next three weeks on the free stuff that actually moves a motion-graphics app in 2026: rewarded video at export, a subscription that sells more than silence, App Store header video (new this fall, and it's built for exactly your product), 5+ Custom Product Pages, localization, and a featuring nomination filed 3 months early. Then run a TikTok content engine, which at 0.3% view-to-install costs you an effective **$0.74 per install versus $3.13 on Apple Ads.** Hold ad spend at **$300–500/month** and use it only for creative testing, brand defense, and keyword research. Revisit paid acquisition at day 90, and only if D7 retention clears 12% and LTV clears $1.50.

---

## Sources

**Acquisition costs**
- [AppTweak Apple Ads benchmarks 2026](https://www.apptweak.com/en/aso-blog/apple-ads-benchmarks) (~3,500 apps, 50,000 campaigns, $1B spend) — Photo & Video US: CPT $1.69, CPI $3.13, CR 63%; global median CPT $0.92 / CPI $1.80
- [Adapty Apple Ads benchmarks 2026](https://adapty.io/blog/apple-ads-benchmarks-2026/) — US CPA $2.51, CPT $1.58, TTR 9.0%; Video Editor niche CPA $2.17
- [Influencer Marketing Hub micro-influencer rates](https://influencermarketinghub.com/influencer-rates/micro-influencer-rates/) · [Influee 2026 UGC pricing](https://influee.co/blog/ugc-price)

**Monetization**
- [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps) (115k apps, $16B) — freemium install→paid 2.1%, NA 2.8%
- [RevenueCat renewal rates by category, Apr 2026](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category/) — Photo & Video first renewal: annual 23%, monthly 48%
- [Adapty Photo & Video subscription benchmarks 2026](https://adapty.io/blog/photo-video-app-subscription-benchmarks/) ($3B, 16k apps) — install→trial 14%, trial→paid 30.5%, install LTV $0.82
- [Appodeal eCPM data via Mistplay](https://business.mistplay.com/resources/mobile-ads-ecpm) — NA iOS rewarded $13.90, interstitial $13.60, banner $0.35
- [MonetizeMore, Jan 2026](https://www.monetizemore.com/blog/how-much-ad-revenue-can-apps-generate/) · [Playwire AdMob eCPM benchmarks](https://www.playwire.com/blog/admob-ecpm-benchmarks-what-publishers-should-expect) (notes gaming eCPMs run 20–30% above other categories)
- [AppLovin ad-removal willingness-to-pay survey via MarTech](https://martech.org/most-users-would-reject-opportunity-to-pay-to-avoid-mobile-ads/) — 67% would pay nothing (2015, stated preference)
- [Adjust ATT opt-in rates 2025](https://www.adjust.com/blog/att-opt-in-rates-2025/) — 35% of prompted users · [AppsFlyer](https://www.appsflyer.com/blog/measurement-analytics/leverage-users-using-idfa/) — only 27% of iOS installs have a usable IDFA

**Retention**
- [Business of Apps app retention rates 2026](https://www.businessofapps.com/data/app-retention-rates/) (AppsFlyer data) — iOS D1 25.4%, D30 5.3%; photo & video among lowest-retention categories

**App Store / ASO**
- [Apple: Scaling Search Relevance with LLM-Generated Judgments](https://machinelearning.apple.com/research/augmenting-app) ([arXiv 2602.23234](https://arxiv.org/abs/2602.23234), Feb 2026)
- [Apple WWDC26 App Store guide](https://developer.apple.com/wwdc26/guides/app-store/) · [Apple Newsroom, June 2026](https://www.apple.com/newsroom/2026/06/apple-expands-app-store-capabilities-to-help-developers-grow-and-reach-new-users/)
- [MobileAction: CPPs now in organic search](https://www.mobileaction.co/blog/custom-product-pages-meet-organic-search/) · [CPP limit doubled to 70](https://www.mobileaction.co/blog/apple-doubles-the-custom-product-page-limit/)
- [Apple: Getting featured](https://developer.apple.com/app-store/getting-featured) · [Nominate your app for featuring](https://developer.apple.com/help/app-store-connect/manage-featuring-nominations/nominate-your-app-for-featuring/)
- [Apple Product Page Optimization docs](https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization) · [App Review Guidelines update, Nov 2025](https://developer.apple.com/news/?id=ey6d8onl)
- [AppFollow ASO ranking factors](https://appfollow.io/blog/aso-ranking-factors) · [AppTweak: how to get featured](https://www.apptweak.com/en/aso-blog/how-to-get-your-app-featured-on-the-app-store)

**Organic growth**
- [PhotoRoom founder interview, Purchasely](https://www.purchasely.com/blog/how-to-grow-a-subscription-app-business-and-its-user-base-globally-by-olivier-lemarie-photoroom) — 100+ creator network, under-served geos
- [Cal AI TikTok strategy breakdown](https://growwithplutus.com/blog/cal-ai-app-tiktok-strategy) · [Superframeworks case study](https://superframeworks.com/case-study/cal-ai)
- [Conbersa: Shorts vs Reels vs TikTok reach](https://www.conbersa.ai/learn/shorts-vs-reels-vs-tiktok-reach) — TikTok median 620 views for sub-10k accounts, Q1 2026
- [Product Hunt launch statistics](https://www.shno.co/marketing-statistics/product-hunt-launch-statistics) · [daily.dev on Hacker News launches](https://business.daily.dev/resources/hacker-news-marketing-developer-tools-show-hn-launch-day-sustained-coverage/) · [Reddit promotion playbook for indie iOS](https://screenfast.app/blog/reddit-promotion-indie-ios-app)

**App Store commission / legal**
- [Fenwick: Ninth Circuit ruling, Dec 2025](https://www.fenwick.com/insights/publications/ninth-circuit-largely-upholds-ruling-in-epic-v-apple) · [AppleInsider: SCOTUS denies Apple, May 2026](https://appleinsider.com/articles/26/05/06/supreme-court-denies-apples-hopes-for-breathing-space-in-its-fight-against-epic) · [RevenueCat on anti-steering strategy](https://www.revenuecat.com/blog/growth/apple-anti-steering-ruling-monetization-strategy)

---

## Caveats on the numbers

Three inputs in my model have **no published benchmark** and are my estimates:
1. **Ad impressions per DAU** for a non-game creative app. Nobody publishes this. I used 2 interstitials + 0.25 rewarded/DAU in the base case, which back-solves to $0.02 ARPDAU, matching the published $0.01–0.03 band for utility apps. That cross-check is the main reason to trust it.
2. **Remove-ads-only subscription conversion.** No benchmark exists. I used 0.6% base, against a 2.1% freemium median for apps that gate real features. If anything I was generous.
3. **View-to-install rate on organic short-form.** Genuinely does not exist as published data. The 0.1–1% range is from scattered indie reports.

The conclusion is robust to all three. Even if I'm 4x too pessimistic on every one of them, base LTV lands near $0.97 against a $3.13 CPI, and paid acquisition still loses money.
