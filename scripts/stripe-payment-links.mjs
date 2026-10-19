#!/usr/bin/env node
// Creates the Stripe products, prices and payment links for shop/catalog.js and
// writes shop/links.js, which switches checkout on.
//
//   node scripts/stripe-payment-links.mjs            dry run: prints the plan, calls nothing
//   node scripts/stripe-payment-links.mjs --apply    creates what's missing (test keys only)
//   node scripts/stripe-payment-links.mjs --apply --live   same, against her live account
//
// Reads STRIPE_SECRET_KEY from .env.local (gitignored). Use a restricted key with
// write access to Products, Prices, Payment Links and Shipping Rates.
//
// Each still × size gets two payment links: the print alone (quantity 1–10), and
// the print plus the $10 handwritten message, which makes "Message for your print"
// a required field. Both offer $5/$10/$20 tips as optional items, collect a US
// shipping address with free shipping, ask for an optional "Name for your letter",
// and return buyers to /shop/thanks/. The kiss spot is not in the link: shop.js
// appends it per order as ?client_reference_id=s03-8x10-k62-38.
//
// Re-running is safe: products are found by id, prices by lookup key, and links
// already in shop/links.js are kept unless you pass --force.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://foxypixiepie.com';
const args = new Set(process.argv.slice(2));
const APPLY = args.has('--apply');
const LIVE = args.has('--live');
const FORCE = args.has('--force');
const WITH_PLACEHOLDERS = args.has('--include-placeholders');

function loadWindowScript(file, key) {
  const sandbox = { window: {} };
  vm.runInNewContext(readFileSync(join(ROOT, file), 'utf8'), sandbox, { filename: file });
  return sandbox.window[key];
}

const SHOP = loadWindowScript('shop/catalog.js', 'SHOP');
const existing = existsSync(join(ROOT, 'shop/links.js')) ? loadWindowScript('shop/links.js', 'SHOP_LINKS') || {} : {};

function readKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  const envFile = join(ROOT, '.env.local');
  if (!existsSync(envFile)) return null;
  const line = readFileSync(envFile, 'utf8').split('\n').find((l) => /^\s*STRIPE_SECRET_KEY\s*=/.test(l));
  return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : null;
}

// Stripe takes form encoding with bracketed keys: line_items[0][price]=...
function encode(params, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params)) {
    const key = prefix ? `${prefix}[${k}]` : k;
    if (v === undefined || v === null) continue;
    if (Array.isArray(v)) v.forEach((item, i) => (typeof item === 'object' ? encode(item, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(item))));
    else if (typeof v === 'object') encode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

let KEY = null;
async function stripe(method, path, params) {
  const query = params ? encode(params).toString() : '';
  const res = await fetch(`https://api.stripe.com/v1${path}${method === 'GET' && query ? `?${query}` : ''}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : query,
  });
  const json = await res.json();
  if (!res.ok) {
    const err = new Error(`${method} ${path}: ${json.error?.message || res.status}`);
    err.status = res.status;
    throw err;
  }
  return json;
}

async function ensureProduct(id, fields) {
  try {
    return await stripe('GET', `/products/${id}`);
  } catch (err) {
    if (err.status !== 404) throw err;
    return stripe('POST', '/products', { id, ...fields });
  }
}

async function ensurePrice(product, cents, lookupKey) {
  const found = await stripe('GET', '/prices', { lookup_keys: [lookupKey], active: true, limit: 1 });
  if (found.data[0]) return found.data[0].id;
  const price = await stripe('POST', '/prices', { product, unit_amount: cents, currency: 'usd', lookup_key: lookupKey });
  return price.id;
}

async function ensureFreeShipping() {
  const rates = await stripe('GET', '/shipping_rates', { active: true, limit: 100 });
  const found = rates.data.find((r) => r.metadata?.fpp === 'free_us');
  if (found) return found.id;
  const rate = await stripe('POST', '/shipping_rates', {
    display_name: 'Free US shipping (kissed & packed by hand)',
    type: 'fixed_amount',
    fixed_amount: { amount: 0, currency: 'usd' },
    delivery_estimate: { minimum: { unit: 'business_day', value: 7 }, maximum: { unit: 'business_day', value: 14 } },
    metadata: { fpp: 'free_us' },
  });
  return rate.id;
}

function linkParams({ printPrice, messagePrice, tipPrices, shippingRate, still, size, withMessage }) {
  return {
    line_items: withMessage
      ? [{ price: printPrice, quantity: 1 }, { price: messagePrice, quantity: 1 }]
      : [{ price: printPrice, quantity: 1, adjustable_quantity: { enabled: true, minimum: 1, maximum: 10 } }],
    optional_items: tipPrices.map((price) => ({ price, quantity: 1 })),
    custom_fields: [
      ...(withMessage
        ? [{ key: 'print_message', label: { type: 'custom', custom: 'Message for your print' }, type: 'text', optional: false, text: { maximum_length: 80 } }]
        : []),
      { key: 'letter_name', label: { type: 'custom', custom: 'Name for your letter' }, type: 'text', optional: true, text: { maximum_length: 40 } },
    ],
    shipping_address_collection: { allowed_countries: ['US'] },
    shipping_options: [{ shipping_rate: shippingRate }],
    after_completion: { type: 'redirect', redirect: { url: `${SITE}/shop/thanks/` } },
    custom_text: {
      submit: { message: 'Each print is kissed by hand where you chose and ships with a signed letter in 7–14 days. All sales final: foxypixiepie.com/shop/policies' },
    },
    allow_promotion_codes: true,
    metadata: { fpp_still: still.id, fpp_size: size.id, fpp_message: withMessage ? 'yes' : 'no' },
  };
}

const stills = SHOP.stills.filter((s) => WITH_PLACEHOLDERS || !s.placeholder);
const plan = stills.flatMap((still) => SHOP.sizes.map((size) => ({ still, size })));

console.log(`${stills.length} stills × ${SHOP.sizes.length} sizes = ${plan.length} prints, ${plan.length * 2} payment links (with and without the message).`);
if (stills.length < SHOP.stills.length) console.log(`Skipping ${SHOP.stills.length - stills.length} placeholder stills (pass --include-placeholders to test with them).`);

if (!APPLY) {
  const sample = plan[0] && linkParams({
    printPrice: 'price_…', messagePrice: 'price_…', tipPrices: ['price_…', 'price_…', 'price_…'], shippingRate: 'shr_…',
    still: plan[0].still, size: plan[0].size, withMessage: true,
  });
  if (sample) console.log('\nSample payment link (with message):\n' + decodeURIComponent(encode(sample).toString()).split('&').join('\n'));
  console.log('\nDry run only. Re-run with --apply to create them.');
  process.exit(0);
}

KEY = readKey();
if (!KEY) { console.error('No STRIPE_SECRET_KEY in the environment or .env.local.'); process.exit(1); }
const isLiveKey = /^(sk|rk)_live_/.test(KEY);
if (isLiveKey && !LIVE) { console.error('That is a live key. Re-run with --live once test mode looks right.'); process.exit(1); }
if (!isLiveKey && !/^(sk|rk)_test_/.test(KEY)) { console.error('STRIPE_SECRET_KEY does not look like a Stripe key.'); process.exit(1); }
console.log(`Using a ${isLiveKey ? 'LIVE' : 'test'} key.`);

const messageProduct = await ensureProduct('fpp_message', { name: 'Handwritten message on your print', description: 'Up to 80 characters, written on your print by hand.' });
const messagePrice = await ensurePrice(messageProduct.id, SHOP.messagePrice * 100, `fpp_message_${SHOP.messagePrice * 100}`);
const tipProduct = await ensureProduct('fpp_tip', { name: 'Tip for Mimi 💋', description: 'Thank you for supporting me.' });
const tipPrices = [];
for (const t of SHOP.tips) tipPrices.push(await ensurePrice(tipProduct.id, t * 100, `fpp_tip_${t * 100}`));
const shippingRate = await ensureFreeShipping();

const links = JSON.parse(JSON.stringify(existing));
let created = 0;
for (const { still, size } of plan) {
  const productId = `fpp_print_${still.id}_${size.id}`;
  const product = await ensureProduct(productId, {
    name: `Kissed print · ${still.title}${still.note ? ` ${still.note}` : ''} · ${size.label}`,
    description: `${size.dims} print, kissed by Mimi where you chose, with a letter she signs for you.`,
    images: [new URL(still.img, `${SITE}/shop/`).href],
    metadata: { fpp_still: still.id, fpp_size: size.id },
  });
  const printPrice = await ensurePrice(product.id, size.price * 100, `${productId}_${size.price * 100}`);
  links[still.id] ||= {};
  const have = links[still.id][size.id];
  if (have && !FORCE) continue;
  const base = { printPrice, messagePrice, tipPrices, shippingRate, still, size };
  const plain = await stripe('POST', '/payment_links', linkParams({ ...base, withMessage: false }));
  const message = await stripe('POST', '/payment_links', linkParams({ ...base, withMessage: true }));
  links[still.id][size.id] = { plain: plain.url, message: message.url };
  created += 2;
  process.stdout.write('.');
}

writeFileSync(join(ROOT, 'shop/links.js'),
  `// Generated by scripts/stripe-payment-links.mjs on ${new Date().toISOString().slice(0, 10)} (${isLiveKey ? 'live' : 'TEST'} mode). Do not edit by hand.\n` +
  `// SHOP_LINKS[stillId][sizeId] = { plain: <payment link>, message: <payment link with the +$10 message> }\n` +
  `window.SHOP_LINKS = ${JSON.stringify(links, null, 2)};\n`);
console.log(`\nCreated ${created} payment links. Wrote shop/links.js.`);
