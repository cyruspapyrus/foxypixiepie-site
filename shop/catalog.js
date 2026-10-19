// What the shop sells. shop.js renders from this; scripts/stripe-payment-links.mjs
// reads it to create the matching Stripe products, prices and payment links.
//
// To add a still: put the photo in shop/img/ (her original, at least 2400px on the
// long side for posters), add an entry below, and re-run the Stripe script.
window.SHOP = {
  // A lipstick kiss is about 2.2 in wide, so it covers most of a wallet print and
  // a corner of a poster. The preview draws it to scale for the chosen size.
  kissWidthIn: 2.2,
  messagePrice: 10,
  tips: [5, 10, 20],

  sizes: [
    { id: 'wallet', label: 'Wallet', dims: '2.5 × 3.5 in', w: 2.5, h: 3.5, price: 15 },
    { id: '4x6', label: '4×6', dims: '4 × 6 in', w: 4, h: 6, price: 25 },
    { id: '5x7', label: '5×7', dims: '5 × 7 in', w: 5, h: 7, price: 35 },
    { id: '8x10', label: '8×10', dims: '8 × 10 in', w: 8, h: 10, price: 50 },
    { id: '11x14', label: '11×14', dims: '11 × 14 in', w: 11, h: 14, price: 75 },
    { id: '18x24', label: 'Poster', dims: '18 × 24 in', w: 18, h: 24, price: 120 },
  ],
  defaultSize: '5x7',

  // Stand-ins: the five slides of her pinned 💎🍒✨ post, already on the link page.
  // Replace with the stills she picks, from her original files.
  stills: [
    { id: '01', title: '💎🍒✨', note: 'Pout', img: '../img/p1.jpg', placeholder: true },
    { id: '02', title: '💎🍒✨', note: 'Tongue out', img: '../img/p2.jpg', placeholder: true },
    { id: '03', title: '💎🍒✨', note: 'Smile', img: '../img/p3.jpg', placeholder: true },
    { id: '04', title: '💎🍒✨', note: 'Straight face', img: '../img/p4.jpg', placeholder: true },
    { id: '05', title: '💎🍒✨', note: 'Head tilt', img: '../img/p5.jpg', placeholder: true },
  ],
};
