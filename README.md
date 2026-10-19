# foxypixiepie.com

Link-in-bio and kissed-print shop for Instagram [@foxypixiepie](https://www.instagram.com/foxypixiepie/).
Static site on GitHub Pages (custom domain in `CNAME`); DNS and email forwarding at Namecheap.

## Layout

| Path | What it is |
|------|------------|
| `index.html`, `style.css`, `app.js` | The link page. Its hero is her pinned 💎🍒✨ post. |
| `shop/` | Kissed prints: the grid and the product sheet where buyers tap where she kisses the print |
| `shop/catalog.js` | Stills, sizes and prices. Edit this to add a still or change a price. |
| `shop/links.js` | Stripe payment links, generated. While it's empty, checkout stays switched off. |
| `shop/thanks/` | Where Stripe sends buyers after paying |
| `shop/spot/` | For her: paste an order's kiss code and see where to kiss, in inches |
| `shop/policies/` | Shipping, returns and privacy (Stripe expects these on the site) |
| `scripts/stripe-payment-links.mjs` | Creates the Stripe products, prices and payment links, and writes `shop/links.js` |
| `scripts/make-kiss.py` | Draws the stand-in kiss `shop/kiss.svg` |

## How an order works

1. The buyer picks a still and a size, taps the photo where they want the kiss (or picks
   "Let her choose"), and can add a handwritten message for $10.
2. Checkout opens that still and size's Stripe payment link with the kiss spot appended:
   `?client_reference_id=s03-8x10-k62-38` means still 03, 8×10, kiss centered 62% across
   and 38% down the paper. `kany` means she picks.
3. Stripe takes payment, the shipping address, the message (required field on message
   links), an optional "Name for your letter", and an optional tip.
4. To fulfil: open the payment in Stripe, copy the client reference, and paste it into
   [foxypixiepie.com/shop/spot](https://foxypixiepie.com/shop/spot/). It shows the print
   with the kiss spot and the distance from the left and top edges.

The kiss is drawn to scale (about 2.2 in wide), so it covers most of a wallet print and
a corner of a poster.

## Launch checklist

- [ ] Her original photos in `shop/img/` (at least 2400 px on the long side, for posters),
      with entries in `shop/catalog.js` replacing the five placeholders.
- [ ] Her real kiss: photograph a kiss on white paper, cut it out to a transparent
      `shop/kiss.png`, and point `KISS_SRC` in `shop/shop.js` and the `kiss.svg`
      references in `shop/shop.css` at it.
- [ ] Stripe in her name: a restricted key (write access to Products, Prices, Payment
      Links, Shipping Rates) in `.env.local` as `STRIPE_SECRET_KEY`. Run
      `node scripts/stripe-payment-links.mjs --apply` with a test key, buy one print with
      a test card, then re-run with her live key and `--live`.
- [ ] Delete the preview `noindex` lines in `shop/index.html` and `shop/policies/index.html`.
- [ ] Merge the `shop` branch into `main`. The preview note disappears on its own once
      `links.js` has links and no placeholder stills are left.

## Email

`hello@foxypixiepie.com` forwards to her Gmail (Namecheap › Domain › Redirect Email).
