# Cozy Masjid Premium — setup guide

Everything the premium system needs, in the order you need it.

---

## 1. Install

```bash
npx expo install expo-iap expo-constants
npx expo prebuild --clean     # regenerates ios/ with the expo-iap plugin
```

`expo-iap` is the library Expo currently recommends for in-app purchases (the
old `expo-in-app-purchases` is deprecated and unmaintained). It wraps StoreKit 2
on iOS and Play Billing on Android behind one API and ships an Expo config
plugin, so no Xcode work is required.

**In-app purchases do not work in Expo Go.** You need a development build or a
TestFlight build. Your existing Codemagic pipeline already produces one.

---

## 2. Where to put your real Product IDs

**One file: `src/premium/products.ts`.**

```ts
export const PREMIUM_PRODUCT_IDS = {
  weekly: 'com.cozymasjid.premium.weekly',
  monthly: 'com.cozymasjid.premium.monthly',
  lifetime: 'com.cozymasjid.lifetime',
} as const;
```

Nothing else in the app references a product identifier. Prices, titles and
billing periods are read from the App Store at runtime, so you never edit them
in code — the strings in `fallbackPrice` are only shown for the split second
before StoreKit answers, or if the device is offline.

While you are in that file, also confirm `src/config/appLinks.ts`:

```ts
marketing:     'https://scandinaviarest.com/app-info/cozy-masjid/',
privacyPolicy: 'https://scandinaviarest.com/app-info/cozy-masjid/privacy',
termsOfUse:    'https://scandinaviarest.com/app-info/cozy-masjid/terms',
support:       'https://scandinaviarest.com/app-info/cozy-masjid/support',
```

App Review opens both links from the paywall. Dead links are a rejection.

---

## 3. App Store Connect configuration

### 3.1 Agreements first

**Business → Agreements, Tax, and Banking.** The Paid Applications agreement
must be **Active**, with banking and tax forms complete. Until it is, your
products return empty from StoreKit and the paywall shows fallback prices with
no way to buy. This is the single most common cause of "my products don't load".

### 3.2 Create a subscription group

**Your app → Monetization → Subscriptions → Create Subscription Group.**

Name it something user-visible, e.g. `Cozy Masjid Premium`. Both subscriptions
go in the **same group** — that lets people switch between weekly and monthly
without double-paying, and Apple handles the proration.

### 3.3 Create the two auto-renewable subscriptions

| Field | Weekly | Monthly |
|---|---|---|
| Reference Name | Cozy Masjid Weekly | Cozy Masjid Monthly |
| Product ID | `com.cozymasjid.premium.weekly` | `com.cozymasjid.premium.monthly` |
| Duration | 1 Week | 1 Month |
| Price | $7.99 (Tier for USD) | $19.99 (Tier for USD) |
| Subscription Group | Cozy Masjid Premium | Cozy Masjid Premium |

For each one, add under **App Store Localization** (English, plus any other
languages you ship):
- **Display Name** — what appears in the user's Subscriptions list
- **Description** — one line about what it unlocks

Set the **Subscription Group ranking**: Monthly should rank above Weekly, so an
upgrade is immediate and a downgrade waits for the period to end.

### 3.4 Create the lifetime non-consumable

**Monetization → In-App Purchases → Create → Non-Consumable.**

| Field | Value |
|---|---|
| Reference Name | Cozy Masjid Lifetime |
| Product ID | `com.cozymasjid.lifetime` |
| Price | $59.99 |

Add localized Display Name and Description here too.

### 3.5 Review information (required for every product)

Each subscription and the non-consumable needs a **screenshot of the paywall**
(1024×1024 or any valid size) and **Review Notes**. Upload a screenshot of the
premium sheet from a real device. Without this, products stay in "Missing
Metadata" and cannot be submitted.

Suggested review note:

> Premium is reachable from the crown button in the top-left of the main room
> screen, and from Settings → Get Cozy Masjid Premium. Restore Purchases is on
> the paywall and in Settings. No account or login is required.

### 3.6 App-level requirements

- **App Privacy** questionnaire completed (you collect no data — declare that).
- **App Review Information → Notes**: repeat where the paywall lives.
- **Marketing URL**: `https://scandinaviarest.com/app-info/cozy-masjid/`
- **Privacy Policy URL**: `https://scandinaviarest.com/app-info/cozy-masjid/privacy`
- **Support URL**: `https://scandinaviarest.com/app-info/cozy-masjid/support`
- **Terms / custom EULA**: `https://scandinaviarest.com/app-info/cozy-masjid/terms`
- Submit the IAP products **with** the app build the first time. They are
  reviewed together.

### 3.7 Sandbox testing

1. **Users and Access → Sandbox → Test Accounts** → create one.
2. On the device: Settings → Developer → Sandbox Apple Account → sign in.
3. Install a TestFlight or dev build and buy.

Sandbox subscription durations are compressed: a 1-week subscription renews
every 3 minutes and auto-cancels after 6 renewals; a 1-month renews every 5
minutes. Good for watching expiry actually work.

You can also test offline with a local StoreKit configuration file in Xcode if
you ever open the generated `ios/` project.

---

## 4. Android (if you ship there)

Same product IDs in Google Play Console:
- Weekly and Monthly → **Subscriptions**, each with a base plan.
- Lifetime → **In-app products** (one-time).

The code already passes Play's required `offerToken` for subscriptions; it reads
it from the product response automatically.

---

## 5. What Premium unlocks

**The first item in every catalog category is free. Everything after it needs
Premium.** The rule is derived from catalog order in
`src/premium/premiumContent.ts`, so you never maintain a list by hand — add an
asset to `src/catalog/` and it is locked automatically.

Current split: **15 free, 100 locked**, across 15 categories.

| Category | Items | Free item |
|---|---|---|
| Characters | 10 | Qiyam Figure |
| Storage | 6 | Low Bookshelf |
| Plants | 5 | Hanging Ivy |
| Pets | 4 | Sitting Cream Cat |
| Tables | 4 | Terracotta Side Table |
| Decor | 6 | Cube Bakhoor Burner |
| Lights | 9 | Wall Sconce |
| Serving | 6 | Dallah Tray Set |
| Wall | 11 | Prayer Times Clock |
| Seating | 12 | Bolster Cushion |
| Rugs | 1 | Spiral Round Rug (whole category is free) |
| Minbar | 11 | Sand & Teal Minbar |
| Prayer Rugs | 11 | Double Arch Prayer Rug |
| Tasbih | 8 | Onyx Gold Tasbih |
| Quran | 11 | Closed Teal Quran |

To make a different item the free one in a category, move it to the top of that
category's block in `catalog.ts`, or add its id to
`ALWAYS_FREE_CATALOG_ITEM_IDS` in `premiumContent.ts`.

### Rooms already built stay intact

Locking applies only to *placing a new item from the tray*. Anything already
saved in a room keeps rendering, and retired ids are never treated as premium.
This matters for App Review: taking away content people already placed is the
kind of change that gets read as a bait-and-switch under Guideline 3.1.1.

### Making a whole room premium

Rooms and backgrounds are still free. When you ship a new premium-only room,
add its id in `premiumContent.ts`:

```ts
export const PREMIUM_BUILDING_IDS: readonly BuildingId[] = ['emerald-masjid-room'];
```

then gate it in `BuildingSwitcher` the same way the catalog does:

```tsx
if (isContentLocked(isPremiumBuilding(buildingId), isPremium)) {
  openPaywall('locked-content');
  return;
}
```

---

## 6. Adding server-side receipt validation later

Today the app trusts StoreKit 2, which cryptographically verifies transactions
on-device before they reach JavaScript. That is acceptable for this app's threat
model — the worst case is a jailbroken device unlocking decorative content.

When you want a backend, the hook is in
`PremiumProvider.handlePurchase`, immediately before `finishPurchase(purchase)`:

```ts
const valid = await verifyOnYourServer(purchase.purchaseToken); // JWS on iOS
if (!valid) return;                      // do not finish, do not grant
await finishPurchase(purchase);
```

Never grant entitlement before verification, and never finish a transaction you
did not grant — unfinished iOS transactions replay on the next launch, which is
exactly the safety net you want.

---

## 7. A note on the pricing

Weekly at $7.99 works out to roughly $34.62 per month — still well above the
$19.99 monthly plan, and it passes the monthly price after three weeks. That is
perfectly normal pricing, but a paywall that leads with weekly and hides the
comparison is the kind of thing App Review flags as misleading. The weekly card
therefore carries the line *"Three weeks of Weekly costs more than a whole month
of Monthly."*

Lifetime at $59.99 pays for itself against Monthly in three months,
which is an unusually short payback window. Expect a meaningful share of buyers
to pick it over the subscription — good for conversion, weaker for recurring
revenue. Worth watching in your first month of data.
