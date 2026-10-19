// Kissed prints: the grid, the product sheet, and the tap-to-kiss spot picker.
//
// The chosen spot travels to Stripe in the payment link's client_reference_id,
// e.g. "s03-8x10-k62-38" = still 03, 8×10, kiss centered 62% across and 38% down
// the paper ("kany" = she picks). shop/spot/ turns that code back into a picture
// with measurements, so she knows exactly where to kiss.
(function () {
  var SHOP = window.SHOP;
  var LINKS = window.SHOP_LINKS || {};
  var KISS_SRC = 'kiss.svg';
  var KISS_ASPECT = 150 / 240;        // height / width of kiss.svg
  var TILE_SPOT = { x: 76, y: 87 };   // sample kiss on the grid tiles, corner-signature style
  var ANY_SPOT = { x: 68, y: 80 };    // drawn faded when the buyer lets her choose
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var verb = finePointer ? 'Click' : 'Tap';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function money(n) { return '$' + n; }

  var sizeById = {};
  SHOP.sizes.forEach(function (s) { sizeById[s.id] = s; });
  var stillById = {};
  SHOP.stills.forEach(function (s) { stillById[s.id] = s; });
  var fromPrice = Math.min.apply(null, SHOP.sizes.map(function (s) { return s.price; }));

  // A kiss is drawn to scale: ~2.2 in across, whatever the print size.
  function kissShare(size) { return Math.min(0.9, SHOP.kissWidthIn / size.w); }

  // ── grid ────────────────────────────────────────────────
  var grid = $('.grid');
  SHOP.stills.forEach(function (still, i) {
    var li = document.createElement('li');
    li.innerHTML =
      '<button class="tile" type="button" data-still="' + esc(still.id) + '">' +
        '<span class="tile-print" style="--tilt:' + (i % 2 ? 1.2 : -1.4) + 'deg">' +
          '<img class="photo" src="' + esc(still.img) + '" alt="" loading="lazy" decoding="async">' +
          '<img class="kiss" src="' + KISS_SRC + '" alt="" style="--x:' + TILE_SPOT.x + '%;--y:' + TILE_SPOT.y + '%">' +
        '</span>' +
        '<span class="tile-meta">' +
          '<span class="tile-title">' + esc(still.title) +
            (still.note ? ' <span class="tile-note">' + esc(still.note) + '</span>' : '') + '</span>' +
          '<span class="tile-price">from ' + money(fromPrice) + '</span>' +
        '</span>' +
      '</button>';
    grid.appendChild(li);
  });

  var live = Object.keys(LINKS).length > 0;
  if (!live || SHOP.stills.some(function (s) { return s.placeholder; })) $('.preview-note').hidden = false;

  // ── product sheet ───────────────────────────────────────
  var sheet = $('.sheet');
  var print = $('.print', sheet);
  var photo = $('.photo', sheet);
  var ghost = $('.kiss.ghost', sheet);
  var placed = $('.kiss.placed', sheet);
  var status = $('.spot-status', sheet);
  var anyBadge = $('.any-badge', sheet);
  var btnAny = $('[data-action="any"]', sheet);
  var btnClear = $('[data-action="clear"]', sheet);
  var sizeList = $('.size-list', sheet);
  var messageBox = $('input[name="message"]', sheet);
  var summary = $('.summary', sheet);
  var checkout = $('.checkout', sheet);
  var title = $('.sheet-title', sheet);
  $('.hint-text', sheet).textContent = verb + ' where you want your kiss';

  // kiss: null (not chosen yet) | 'any' (she picks) | {x, y} in % of the paper
  var state = { still: null, size: SHOP.defaultSize, kiss: null, message: false };

  SHOP.sizes.forEach(function (s) {
    var label = document.createElement('label');
    label.className = 'size';
    label.innerHTML = '<input type="radio" name="size" value="' + esc(s.id) + '">' +
      '<span class="size-name">' + esc(s.label) + '</span>' +
      '<span class="size-dims">' + esc(s.dims) + '</span>' +
      '<span class="size-price">' + money(s.price) + '</span>';
    sizeList.appendChild(label);
  });

  // The kiss has to land on the paper, so its center stays half a kiss from every edge.
  function clampPoint(x, y) {
    var size = sizeById[state.size];
    var halfW = kissShare(size) * 50;
    var halfH = halfW * KISS_ASPECT * (size.w / size.h);
    return {
      x: Math.round(Math.min(100 - halfW, Math.max(halfW, x)) * 10) / 10,
      y: Math.round(Math.min(100 - halfH, Math.max(halfH, y)) * 10) / 10,
    };
  }
  function pointFrom(e) {
    var r = print.getBoundingClientRect();
    return clampPoint((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
  }
  function setSpot(el, p) {
    el.style.setProperty('--x', p.x + '%');
    el.style.setProperty('--y', p.y + '%');
  }

  function linkFor() {
    var bySize = LINKS[state.still] && LINKS[state.still][state.size];
    return bySize ? (state.message ? bySize.message : bySize.plain) : null;
  }
  function refCode() {
    var k = state.kiss === 'any' ? 'kany' : 'k' + Math.round(state.kiss.x) + '-' + Math.round(state.kiss.y);
    return 's' + state.still + '-' + state.size + '-' + k;
  }

  function render() {
    var still = stillById[state.still];
    var size = sizeById[state.size];

    title.innerHTML = esc(still.title) + (still.note ? ' <span class="tile-note">' + esc(still.note) + '</span>' : '');
    if (photo.getAttribute('src') !== still.img) photo.src = still.img;
    print.style.setProperty('--ar', size.w / size.h);
    print.style.setProperty('--kw', kissShare(size) * 100 + '%');
    sizeList.querySelector('input[value="' + state.size + '"]').checked = true;
    messageBox.checked = state.message;

    var spot = state.kiss === 'any' ? clampPoint(ANY_SPOT.x, ANY_SPOT.y) : state.kiss;
    placed.hidden = !spot;
    if (spot) setSpot(placed, spot);
    print.classList.toggle('has-kiss', !!state.kiss);
    print.classList.toggle('is-any', state.kiss === 'any');
    anyBadge.hidden = state.kiss !== 'any';
    btnAny.hidden = state.kiss === 'any';
    btnClear.hidden = !state.kiss;

    if (!state.kiss) {
      status.textContent = 'Drawn to scale: a kiss is about ' + SHOP.kissWidthIn + ' in wide, so it looks bigger on small prints.';
      print.setAttribute('aria-label', 'Print preview. ' + verb + ' or press Enter to place your kiss; use the arrow keys to move it.');
    } else if (state.kiss === 'any') {
      status.innerHTML = '<b>She’ll choose the spot</b> ✨ ' + verb + ' the photo if you’d rather pick it.';
      print.setAttribute('aria-label', 'Print preview. She will choose where to kiss it.');
    } else {
      status.innerHTML = '<b>Kissed here</b> 💋 ' + verb + ' anywhere to move it' + (finePointer ? '.' : ', or drag the kiss.');
      print.setAttribute('aria-label', 'Print preview. Kiss spot ' + Math.round(spot.x) + '% across, ' +
        Math.round(spot.y) + '% down. Use the arrow keys to move it.');
    }

    var total = size.price + (state.message ? SHOP.messagePrice : 0);
    var rows = [[size.label + ' kissed print', money(size.price)]];
    if (state.message) rows.push(['Handwritten message', money(SHOP.messagePrice)]);
    rows.push(['Signed letter', 'Included'], ['Shipping (US)', 'Free']);
    summary.innerHTML = rows.map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>'; }).join('') +
      '<dt class="total">Total</dt><dd class="total">' + money(total) + '</dd>';

    var link = linkFor();
    checkout.disabled = !state.kiss || !link;
    checkout.textContent = !state.kiss ? 'Choose your kiss spot first'
      : !link ? 'Checkout opens soon'
      : 'Checkout · ' + money(total);
  }

  function place(p) {
    state.kiss = p;
    ghost.hidden = true;
    render();
    placed.classList.remove('stamp');
    void placed.offsetWidth;            // restart the stamp animation
    placed.classList.add('stamp');
    if (!finePointer && navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* not allowed */ } }
  }

  // With a mouse, the kiss itself is the cursor, at the size it will be on the print.
  print.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse' || dragging) return;
    setSpot(ghost, pointFrom(e));
    ghost.hidden = false;
  });
  print.addEventListener('pointerleave', function () { ghost.hidden = true; });

  var dragging = false, moved = false, swallowClick = false;
  print.addEventListener('click', function (e) {
    if (swallowClick) { swallowClick = false; return; }
    place(pointFrom(e));
  });

  // Touch: tap places the kiss, dragging it fine-tunes. touch-action:none on the
  // kiss keeps the drag from scrolling the sheet.
  placed.addEventListener('pointerdown', function (e) {
    if (state.kiss === 'any') return;
    dragging = true;
    moved = false;
    placed.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  placed.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    moved = true;
    state.kiss = pointFrom(e);
    setSpot(placed, state.kiss);
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    if (moved) { swallowClick = true; render(); }
  }
  placed.addEventListener('pointerup', endDrag);
  placed.addEventListener('pointercancel', endDrag);

  print.addEventListener('keydown', function (e) {
    var step = e.shiftKey ? 8 : 2;
    var moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!state.kiss || state.kiss === 'any') place(clampPoint(50, 50));
      return;
    }
    if (!moves[e.key]) return;
    e.preventDefault();
    var from = state.kiss && state.kiss !== 'any' ? state.kiss : { x: 50, y: 50 };
    state.kiss = clampPoint(from.x + moves[e.key][0], from.y + moves[e.key][1]);
    render();
  });

  btnAny.addEventListener('click', function () { state.kiss = 'any'; render(); });
  btnClear.addEventListener('click', function () { state.kiss = null; render(); print.focus(); });
  sizeList.addEventListener('change', function (e) {
    state.size = e.target.value;
    if (state.kiss && state.kiss !== 'any') state.kiss = clampPoint(state.kiss.x, state.kiss.y);
    render();
  });
  messageBox.addEventListener('change', function () { state.message = messageBox.checked; render(); });

  checkout.addEventListener('click', function () {
    var link = linkFor();
    if (!link || !state.kiss) return;
    var ref = refCode();
    try {
      localStorage.setItem('fpp:last', JSON.stringify({
        ref: ref, still: state.still, size: state.size, kiss: state.kiss, message: state.message, at: Date.now(),
      }));
    } catch (e) { /* private mode: the thanks page just shows less */ }
    location.href = link + (link.indexOf('?') < 0 ? '?' : '&') + 'client_reference_id=' + encodeURIComponent(ref);
  });

  // ── open / close, with the back button closing the sheet ─
  var pushed = false;
  function open(id, fromHistory) {
    if (!stillById[id]) return;
    if (state.still !== id) { state.kiss = null; state.message = false; }
    state.still = id;
    render();
    if (!sheet.open) sheet.showModal();
    if (!fromHistory) { history.pushState({ still: id }, '', '#' + id); pushed = true; }
  }
  sheet.addEventListener('close', function () {
    ghost.hidden = true;
    if (pushed) { pushed = false; history.back(); }
    else if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  });
  $('.close', sheet).addEventListener('click', function () { sheet.close(); });
  sheet.addEventListener('click', function (e) { if (e.target === sheet) sheet.close(); });
  grid.addEventListener('click', function (e) {
    var tile = e.target.closest('.tile');
    if (tile) open(tile.dataset.still);
  });
  window.addEventListener('popstate', function () {
    var id = location.hash.slice(1);
    if (stillById[id]) open(id, true);
    else if (sheet.open) { pushed = false; sheet.close(); }
  });

  var initial = location.hash.slice(1);
  if (stillById[initial]) open(initial, true);
})();
