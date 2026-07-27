/* ══════════════════════════════════════════════════════════════════════════
   Clickable destinations mock, running on the real corpus.
   Data comes from data/corpus.json, exported from the live database:
   127 documented places, 15 guides, 31 articles, real blurbs and photographs.
   Hash routing so the whole experience can be clicked through offline.
   ══════════════════════════════════════════════════════════════════════════ */

const MONTH_L = ["J","F","M","A","M","J","J","A","S","O","N","D"];
const MONTH_N = ["January","February","March","April","May","June",
                 "July","August","September","October","November","December"];
const NOW = new Date().getMonth() + 1;

const CLOUD = "https://res.cloudinary.com/djqswlfat/image/upload";
const img = (id, w, h) =>
  id ? `${CLOUD}/f_auto,q_auto,c_fill,w_${w},h_${h}/${id}`
     : `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E`;

let DATA = null, MONTHS = null;

/* ── Season model ────────────────────────────────────────────────────────────
   Three tiers, never two. A month that is not peak is not a bad month: the
   coast is open all year and the quiet months are cheaper and emptier, which
   for a lot of people is the reason to go. So the scale reads
   peak / good / quieter, and quieter carries its own colour rather than
   looking like a dead cell. ───────────────────────────────────────────────── */
function seasonTiers(cat) {
  const peak = new Set(MONTHS[cat] || []);
  if (!peak.size) return Array(12).fill("good");
  const good = new Set();
  for (const m of peak) {
    good.add(m === 1 ? 12 : m - 1);
    good.add(m === 12 ? 1 : m + 1);
  }
  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    return peak.has(m) ? "peak" : good.has(m) ? "good" : "quiet";
  });
}

function seasonStrip(cat, { compact = false } = {}) {
  const tiers = seasonTiers(cat);
  const label = MONTH_N.map((n, i) => `${n} ${tiers[i]}`).join(", ");
  const cells = tiers.map((t, i) =>
    `<i data-t="${t}"${i + 1 === NOW ? ' data-now' : ''}>${MONTH_L[i]}</i>`).join("");
  return `<div class="mon${compact ? " mon--sm" : ""}" role="img" aria-label="${label}">${cells}</div>`;
}

function seasonWord(cat) {
  const t = seasonTiers(cat)[NOW - 1];
  return t === "peak" ? "At its best now" : t === "good" ? "Good now" : "Quieter now";
}

/* ── helpers ─────────────────────────────────────────────────────────────── */
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const destBySlug = (s) => DATA.destinations.find((d) => d.slug === s);
const guidesFor = (city) => DATA.guides.filter((g) => g.city === city);
const placesFor = (city, cat) => DATA.places.filter((p) => p.city === city && p.cat === cat);
const placeCount = (city) => DATA.places.filter((p) => p.city === city).length;
const live = () => DATA.destinations.filter((d) => guidesFor(d.slug).length > 0);
const trim = (s, n) => (s && s.length > n ? s.slice(0, n - 1).replace(/[\s,.;]+$/, "") + "…" : s || "");

/* ── views ───────────────────────────────────────────────────────────────── */
function viewHome() {
  const L = live();
  const totalGuides = L.reduce((n, d) => n + guidesFor(d.slug).length, 0);
  const totalPlaces = DATA.places.length;
  const totalStays = L.reduce((n, d) => n + (d.stays || 0), 0);

  const allGuides = L.flatMap((d) => guidesFor(d.slug));
  const bySubject = [...new Map(allGuides.map((g) => [g.cat, g])).values()]
    .sort((a, b) => {
      const rank = (g) => ({ peak: 0, good: 1, quiet: 2 }[seasonTiers(g.cat)[NOW - 1]]);
      return rank(a) - rank(b);
    });

  const cards = L.map((d) => {
    const gs = guidesFor(d.slug);
    const best = gs.filter((g) => seasonTiers(g.cat)[NOW - 1] === "peak").length;
    return `<a class="dcard" href="#/d/${d.slug}">
      <div class="dcard__m"><img src="${img(d.hero, 620, 465)}" alt="${esc(d.name)}">
        ${best ? `<span class="dcard__tag">${best} at their best</span>` : ""}</div>
      <div class="dcard__b"><h3>${esc(d.name)}</h3>
        <p class="dcard__meta tnum">${gs.length} guides &middot; ${placeCount(d.slug)} places &middot; ${d.stays} stays</p>
      </div></a>`;
  }).join("");

  const soon = ["Victoria", "Squamish"].map((n) => `
    <span class="dcard dcard--soon"><div class="dcard__m"><img src="${img("thomas-lipke-M12HGHNVJ2s-unsplash_nttcvc", 620, 465)}" alt=""></div>
    <div class="dcard__b"><h3>${n}</h3><p class="dcard__meta">Guides in review</p></div></span>`).join("");

  const catRow = bySubject.map((g) => {
    const n = DATA.places.filter((p) => p.cat === g.cat).length;
    return `<a class="cat" href="#/g/${g.city}/${g.cat}"><span class="cat__n">${esc(g.name)}</span>
      <span class="cat__c tnum">${n ? n + " places" : "guide"}</span></a>`;
  }).join("");

  const ledger = bySubject.map((g) => {
    const towns = [...new Set(allGuides.filter((x) => x.cat === g.cat).map((x) => destBySlug(x.city)?.name))].join(" and ");
    const n = DATA.places.filter((p) => p.cat === g.cat).length;
    return `<tr onclick="location.hash='#/g/${g.city}/${g.cat}'">
      <td><div class="led__s">${esc(g.name)}</div><div class="led__w">${esc(towns)}${n ? ` &middot; ${n} documented` : ""}</div></td>
      <td class="led__mon">${seasonStrip(g.cat)}</td>
      <td class="led__b"><span class="tier tier--${seasonTiers(g.cat)[NOW - 1]}">${seasonWord(g.cat)}</span></td>
    </tr>`;
  }).join("");

  const feature = DATA.articles.find((a) => a.hero && a.excerpt) || DATA.articles[0];
  const rest = DATA.articles.filter((a) => a !== feature && a.hero).slice(0, 4);

  return `
  <header class="hero"><div class="wrap">
    <div class="hero__b">
      <img src="${img("arcstudio/jhrn4nwfk4vsnvtqwkvz", 1800, 760)}" alt="Clayoquot Sound from the air">
      <div class="hero__t">
        <span class="hero__pill">Canada, British Columbia</span>
        <h1>Know the place before you go.</h1>
        <p>Guides to where we stay, written after we have been. What to do, when to go, and what it is actually like.</p>
      </div>
    </div>
    ${searchCard()}
  </div></header>

  <section class="sec"><div class="wrap"><div class="stats">
    <div class="stat"><b class="tnum">${L.length}</b><span>Destinations</span></div>
    <div class="stat"><b class="tnum">${totalGuides}</b><span>Guides</span></div>
    <div class="stat"><b class="tnum">${totalPlaces}</b><span>Places documented</span></div>
    <div class="stat"><b class="tnum">${totalStays}</b><span>Stays</span></div>
  </div></div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sechead center"><h2>Every destination.</h2>
      <p class="sub">We publish a place once we have stayed in it, walked it in more than one season, and can answer the awkward questions.</p></div>
    <div class="dgrid">${cards}${soon}</div>
  </div></section>

  <section class="sec" style="padding-top:0"><div class="wrap"><div class="panel panel--azure">
    <div class="sechead center">
      <span class="eyebrow">Things to do</span>
      <h2>Every month is worth something.</h2>
      <p class="sub">Everything there is to do across our destinations, and when each one is at its best. The quiet months are cheaper and emptier, which is why a lot of people pick them.</p>
    </div>
    <div class="catrow">${catRow}<a class="cat cat--all" href="#/search?q=">Search everything</a></div>
    <table class="led">
      <thead><tr><th>Subject</th><th class="led__mon">Through the year</th><th style="text-align:right">In ${MONTH_N[NOW - 1]}</th></tr></thead>
      <tbody>${ledger}</tbody>
    </table>
    <p class="legend">
      <span><span class="sw sw--peak"></span>At its best</span>
      <span><span class="sw sw--good"></span>Good</span>
      <span><span class="sw sw--quiet"></span>Quieter, fewer people</span>
      <span class="legend__note">Nothing here closes. The outline marks this month.</span>
    </p>
  </div></div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sechead center"><h2>Latest from the guides.</h2>
      <p class="sub">Long reads written after we have been, not rewritten from a tourism board.</p></div>
    <div class="read">
      <a class="feat" href="#/a/${feature.slug}">
        <div class="feat__m"><img src="${img(feature.hero, 1000, 600)}" alt=""></div>
        <div class="kmeta"><span class="k">${esc(feature.cat || "Guide")}</span><span class="dot"></span><span>${esc((feature.cities || []).join(" and ") || "Vancouver Island")}</span></div>
        <h3>${esc(feature.title)}</h3><p>${esc(trim(feature.excerpt, 190))}</p>
      </a>
      <div>${rest.map((a) => `
        <a class="ritem" href="#/a/${a.slug}">
          <div class="ritem__m"><img src="${img(a.hero, 240, 180)}" alt=""></div>
          <div><div class="kmeta" style="margin-top:0"><span class="k">${esc(a.cat || "Guide")}</span></div>
          <h4>${esc(a.title)}</h4></div></a>`).join("")}</div>
    </div>
  </div></section>

  <section class="sec" style="padding-top:0"><div class="wrap"><div class="panel panel--azure center">
    <h2>We write when the coast changes.</h2>
    <p class="sub">Four letters a year: when the greys arrive, when the surf turns, when the storms start, and when the trails dry out.</p>
    <form class="capture" onsubmit="return false"><input type="email" placeholder="Enter your email" aria-label="Email address">
      <button class="btn btn--primary" type="submit">Sign up</button></form>
  </div></div></section>`;
}

function viewDestination(slug) {
  const d = destBySlug(slug);
  if (!d) return notFound();
  const gs = guidesFor(slug).sort((a, b) =>
    ({ peak: 0, good: 1, quiet: 2 }[seasonTiers(a.cat)[NOW - 1]]) -
    ({ peak: 0, good: 1, quiet: 2 }[seasonTiers(b.cat)[NOW - 1]]));

  return `
  ${crumb([["#/", "Destinations"], [null, d.name]])}
  <header class="hero"><div class="wrap"><div class="hero__b">
    <img src="${img(d.hero, 1800, 700)}" alt="${esc(d.name)}">
    <div class="hero__t"><span class="hero__pill">Vancouver Island, British Columbia</span>
      <h1>${esc(d.name)}</h1><p>${esc(d.standfirst)}</p></div>
  </div>${searchCard(`Search ${d.name}`)}</div></header>

  <section class="sec"><div class="wrap"><div class="stats">
    <div class="stat"><b class="tnum">${gs.length}</b><span>Guides</span></div>
    <div class="stat"><b class="tnum">${placeCount(slug)}</b><span>Places documented</span></div>
    <div class="stat"><b class="tnum">${d.stays}</b><span>Stays</span></div>
    <div class="stat"><b class="tnum">${gs.filter((g) => seasonTiers(g.cat)[NOW - 1] === "peak").length}</b><span>At their best now</span></div>
  </div></div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="prose">${(d.overview || []).map((p) => `<p>${esc(p)}</p>`).join("")}</div>
  </div></section>

  <section class="sec" style="padding-top:0"><div class="wrap">
    <div class="sechead center"><span class="eyebrow">Things to do</span>
      <h2>What there is to do in ${esc(d.name)}.</h2>
      <p class="sub">${gs.length} guides, ${placeCount(slug)} named places. Ordered by what is at its best this month.</p></div>
    <div class="gguide">${gs.map((g) => {
      const n = placesFor(g.city, g.cat).length;
      const t = seasonTiers(g.cat)[NOW - 1];
      return `<a class="gcard" href="#/g/${g.city}/${g.cat}">
        <div class="gcard__m"><img src="${img(g.hero || g.photos[0]?.id, 520, 390)}" alt=""></div>
        <div class="gcard__b">
          <div class="gcard__top"><h3>${esc(g.name)}</h3><span class="tier tier--${t}">${seasonWord(g.cat)}</span></div>
          <p class="gcard__lead">${esc(trim(g.lead, 150))}</p>
          ${seasonStrip(g.cat, { compact: true })}
          <p class="gcard__n tnum">${n ? `${n} places documented` : "Guide"}</p>
        </div></a>`;
    }).join("")}</div>
  </div></section>`;
}

function viewGuide(city, cat) {
  const g = DATA.guides.find((x) => x.city === city && x.cat === cat);
  if (!g) return notFound();
  const d = destBySlug(city);
  const ps = placesFor(city, cat);

  return `
  ${crumb([["#/", "Destinations"], [`#/d/${city}`, d.name], [null, g.name]])}
  <header class="hero"><div class="wrap"><div class="hero__b hero__b--sm">
    <img src="${img(g.hero || g.photos[0]?.id, 1800, 620)}" alt="">
    <div class="hero__t"><span class="hero__pill">${esc(d.name)}</span>
      <h1>${esc(g.name)} in ${esc(d.name)}</h1><p>${esc(trim(g.lead, 200))}</p></div>
  </div></div></header>

  <section class="sec"><div class="wrap"><div class="panel panel--azure">
    <div class="sechead center" style="margin-bottom:18px"><h2 style="font-size:1.35rem">When to go</h2></div>
    ${seasonStrip(cat)}
    <p class="legend" style="margin-top:14px">
      <span><span class="sw sw--peak"></span>At its best</span>
      <span><span class="sw sw--good"></span>Good</span>
      <span><span class="sw sw--quiet"></span>Quieter, fewer people</span>
    </p>
  </div></div></section>

  ${ps.length ? `
  <section class="sec" style="padding-top:0" id="places"><div class="wrap wrap--wide">
    <div class="sechead center"><h2>${ps.length} places, documented.</h2>
      <p class="sub">Every one visited. Names, what they suit, and what to know before you go.</p></div>

    <div class="gshell">
      <aside class="pindex" aria-label="Places in this guide">
        <p class="pindex__h">${esc(g.name)}</p>
        <ol class="pindex__l">${ps.map((p, i) => `
          <li><a href="#/g/${city}/${cat}?at=${p.slug}" data-jump="${p.slug}">
            <span class="tnum">${String(i + 1).padStart(2, "0")}</span>${esc(p.name)}</a></li>`).join("")}</ol>
        <div class="pindex__f">
          <a href="#gallery">From the guide</a>
          <a href="#stay">Where to stay</a>
        </div>
      </aside>

      <div class="plist">${ps.map((p, i) => {
        const good = (p.goodFor || [])
          // The ingest leaked table headers into a few good-for lists, so a
          // fragment like "beach - location - best for" is dropped rather
          // than printed as if a person wrote it.
          .filter((t) => !/\u00b7/.test(t) && !/^(location|best for|beach)$/i.test(t.trim()))
          .map((t) => t.toLowerCase());
        const goodLine = good.length
          ? good.length === 1 ? good[0]
            : good.slice(0, -1).join(", ") + " and " + good[good.length - 1]
          : "";
        const body = (p.body || []).filter((t) => !p.blurb || !t.slice(0, 40).includes(p.blurb.slice(0, 30)));
        return `
        <article class="place${p.hero ? "" : " place--noimg"}" id="${p.slug}">
          ${p.hero ? `<figure class="place__m"><button class="gal__b" onclick="lightbox(0,'place',${i})" aria-label="Open photographs of ${esc(p.name)}">
            <img src="${img(p.hero, 1000, 720)}" alt="${esc(p.name)}"><span class="place__zoom">View gallery</span></button></figure>` : ""}
          <div class="place__b">
            <span class="place__i tnum">${String(i + 1).padStart(2, "0")} of ${ps.length}</span>
            <h3>${esc(p.name)}</h3>
            ${p.blurb ? `<p class="place__lead">${esc(p.blurb)}</p>` : ""}
            ${body.slice(0, 1).map((t) => `<p class="place__body">${esc(trim(t, 340))}</p>`).join("")}
            ${goodLine ? `<p class="place__good"><span>Good for</span> ${esc(goodLine)}.</p>` : ""}
            ${p.note ? `<p class="place__note"><span>Good to know</span> ${esc(p.note)}</p>` : ""}
          </div>
        </article>`;
      }).join("")}</div>
    </div>
  </div></section>` : ""}

  ${g.photos.length ? `
  <section class="sec" style="padding-top:0" id="gallery"><div class="wrap">
    <div class="sechead center"><h2>From the guide.</h2></div>
    <div class="gal">${g.photos.map((p, i) => `
      <figure><button class="gal__b" onclick="lightbox(${i})" aria-label="Open photograph ${i + 1} of ${g.photos.length}">
        <img src="${img(p.id, 560, 420)}" alt="${esc(p.caption || "")}"></button>
      ${p.caption ? `<figcaption>${esc(trim(p.caption, 70))}</figcaption>` : ""}</figure>`).join("")}</div>
  </div></section>` : ""}

  ${stayBlock(city, d)}`;
}

function viewArticle(slug) {
  const a = DATA.articles.find((x) => x.slug === slug);
  if (!a) return notFound();
  return `
  ${crumb([["#/", "Destinations"], [null, a.title]])}
  <header class="hero"><div class="wrap"><div class="hero__b hero__b--sm">
    <img src="${img(a.hero, 1800, 600)}" alt="">
    <div class="hero__t"><span class="hero__pill">${esc(a.cat || "Guide")}</span>
      <h1>${esc(a.title)}</h1><p>${esc(a.excerpt || "")}</p></div>
  </div></div></header>
  ${a.faqs?.length ? `
  <section class="sec"><div class="wrap"><div class="sechead center"><h2>Common questions.</h2></div>
    <div class="faq">${a.faqs.map((f) => `<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div>
  </div></section>` : `<section class="sec"><div class="wrap"><p class="prose">The full article body renders here from the corpus.</p></div></section>`}`;
}

/* ── search ──────────────────────────────────────────────────────────────── */
function searchAll(q) {
  const t = q.trim().toLowerCase();
  if (t.length < 2) return null;
  const hit = (s) => (s || "").toLowerCase().includes(t);
  return {
    destinations: live().filter((d) => hit(d.name) || hit(d.standfirst)),
    guides: DATA.guides.filter((g) => hit(g.name) || hit(g.lead)),
    places: DATA.places.filter((p) => hit(p.name) || hit(p.blurb) || (p.goodFor || []).some(hit)),
    articles: DATA.articles.filter((a) => hit(a.title) || hit(a.excerpt)),
  };
}

function viewSearch(q) {
  const r = searchAll(q);
  const total = r ? r.destinations.length + r.guides.length + r.places.length + r.articles.length : 0;

  const group = (title, items, render) => items.length ? `
    <div class="sgroup"><h3 class="sgroup__h">${title} <span class="tnum">${items.length}</span></h3>
    <div class="sgroup__b">${items.slice(0, 12).map(render).join("")}</div></div>` : "";

  return `
  ${crumb([["#/", "Destinations"], [null, "Search"]])}
  <section class="sec"><div class="wrap">
    <div class="sechead"><h2>${q ? `Results for &ldquo;${esc(q)}&rdquo;` : "Search everything"}</h2>
      <p class="sub" style="margin-left:0">${q ? `${total} match${total === 1 ? "" : "es"} across destinations, guides, documented places and reading.` : "Type at least two characters. This searches every destination, guide, place and article we publish."}</p></div>
    ${searchCard("Search destinations, guides, places", q)}
    ${!r ? "" : total === 0 ? `
      <div class="empty"><h3>Nothing matched &ldquo;${esc(q)}&rdquo;</h3>
      <p>Try a place name, an activity, or a month. Here is everything we publish:</p>
      <div class="catrow" style="justify-content:flex-start">${live().map((d) => `<a class="cat" href="#/d/${d.slug}"><span class="cat__n">${esc(d.name)}</span></a>`).join("")}</div></div>` : `
      ${group("Destinations", r.destinations, (d) => `
        <a class="sres" href="#/d/${d.slug}"><img src="${img(d.hero, 120, 90)}" alt="">
        <div><b>${esc(d.name)}</b><span>${esc(trim(d.standfirst, 80))}</span></div></a>`)}
      ${group("Things to do", r.guides, (g) => `
        <a class="sres" href="#/g/${g.city}/${g.cat}"><img src="${img(g.hero || g.photos[0]?.id, 120, 90)}" alt="">
        <div><b>${esc(g.name)}</b><span>${esc(destBySlug(g.city)?.name)} &middot; ${placesFor(g.city, g.cat).length} places</span></div></a>`)}
      ${group("Documented places", r.places, (p) => `
        <a class="sres" href="#/g/${p.city}/${p.cat}?at=${p.slug}"><img src="${img(p.hero, 120, 90)}" alt="">
        <div><b>${esc(p.name)}</b><span>${esc(destBySlug(p.city)?.name)} &middot; ${esc(trim(p.blurb, 70))}</span></div></a>`)}
      ${group("Reading", r.articles, (a) => `
        <a class="sres" href="#/a/${a.slug}"><img src="${img(a.hero, 120, 90)}" alt="">
        <div><b>${esc(a.title)}</b><span>${esc(trim(a.excerpt, 80))}</span></div></a>`)}`}
  </div></section>`;
}

/* ── where to stay: three real listings, chosen so they differ ───────────── */
function stayBlock(city, d) {
  const raw = (DATA.listings || []).filter((l) => l.city === city);
  if (!raw.length) return "";

  // The listings table is seeded placeholder inventory: nine Tofino rows but
  // four unique titles, several tagged to Canmore, and every one identical at
  // 3 beds / 2 baths / 4.9. So drop the duplicates, drop rows whose location
  // contradicts the town, and label by the one thing that genuinely differs,
  // which is price. Calling one "highest rated" when all are 4.9 is a lie.
  const seen = new Set();
  const clean = raw.filter((l) => {
    const placed = !l.location || l.location.toLowerCase().includes(d.name.toLowerCase());
    if (!placed || seen.has(l.title)) return false;
    seen.add(l.title);
    return true;
  }).sort((a, b) => a.price - b.price);

  if (!clean.length) return "";
  const three = clean.length <= 3 ? clean : [clean[0], clean[Math.floor(clean.length / 2)], clean[clean.length - 1]];
  const band = three.length === 3 ? ["Lowest rate", "Mid range", "Top of the range"] : three.map(() => "");
  const spread = three.length > 1 ? `$${three[0].price} to $${three[three.length - 1].price} a night` : `$${three[0].price} a night`;

  return `<section class="sec" style="padding-top:0" id="stay"><div class="wrap">
    <div class="sechead center"><span class="eyebrow">Where to stay</span>
      <h2>Three places to stay in ${esc(d.name)}.</h2>
      <p class="sub">One from each end of the range and one in the middle, ${spread}, picked from ${d.stays} stays.</p></div>
    <div class="stays">${three.map((l, i) => `
      <a class="stay" href="#">
        <div class="stay__m"><img src="${img(l.hero, 620, 465)}" alt="${esc(l.title)}">
          ${band[i] ? `<span class="stay__why">${band[i]}</span>` : ""}</div>
        <div class="stay__b">
          <h3>${esc(trim(l.title, 56))}</h3>
          <p class="stay__loc">${esc(l.location || d.name)}</p>
          <p class="stay__spec tnum">${l.beds} beds &middot; ${l.baths} baths &middot; ${l.rooms} rooms</p>
          <div class="stay__foot">
            <span class="stay__price tnum"><b>$${l.price}</b> a night</span>
            ${l.rating ? `<span class="stay__rate tnum">${l.rating.toFixed(1)}</span>` : ""}
          </div>
        </div></a>`).join("")}</div>
    <p class="stays__note">From-rates before taxes and fees. <a href="#">See all ${d.stays} stays in ${esc(d.name)}</a>.</p>
  </div></section>`;
}

/* ── photo viewer. A gallery is the one place a modal is the right answer:
      the subject is the photograph at size, and nothing else. ─────────────── */
let LB = { list: [], i: 0 };
window.lightbox = (i, kind, placeIdx) => {
  const seg = location.hash.replace(/^#\/?/, "").split("?")[0].split("/");
  const g = DATA.guides.find((x) => x.city === seg[1] && x.cat === seg[2]);
  if (!g) return;
  if (kind === "place") {
    const p = placesFor(seg[1], seg[2])[placeIdx];
    const tagged = g.photos.filter((ph) => ph.place === p?.slug);
    LB.list = (tagged.length ? tagged : g.photos).slice();
    if (p?.hero && !LB.list.some((x) => x.id === p.hero)) LB.list.unshift({ id: p.hero, caption: p.name });
    LB.i = 0;
  } else { LB.list = g.photos.slice(); LB.i = i; }
  paintLB();
};
function paintLB() {
  let el = document.getElementById("lb");
  if (!el) {
    el = document.createElement("div");
    el.id = "lb"; el.className = "lb"; el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true"); el.setAttribute("aria-label", "Photographs");
    document.body.appendChild(el);
    el.addEventListener("click", (e) => { if (e.target === el || e.target.closest("[data-close]")) closeLB(); });
  }
  const p = LB.list[LB.i];
  el.innerHTML = `
    <button class="lb__x" data-close aria-label="Close">&times;</button>
    <button class="lb__nav lb__nav--p" onclick="stepLB(-1)" aria-label="Previous">&#8249;</button>
    <figure class="lb__f">
      <img src="${img(p.id, 1600, 1100)}" alt="${esc(p.caption || "")}">
      <figcaption><span>${esc(p.caption || "")}</span><b class="tnum">${LB.i + 1} of ${LB.list.length}</b></figcaption>
    </figure>
    <button class="lb__nav lb__nav--n" onclick="stepLB(1)" aria-label="Next">&#8250;</button>`;
  document.body.style.overflow = "hidden";
  el.querySelector(".lb__x").focus();
}
window.stepLB = (d) => { LB.i = (LB.i + d + LB.list.length) % LB.list.length; paintLB(); };
function closeLB() {
  document.getElementById("lb")?.remove();
  document.body.style.overflow = "";
}
addEventListener("keydown", (e) => {
  if (!document.getElementById("lb")) return;
  if (e.key === "Escape") closeLB();
  if (e.key === "ArrowRight") stepLB(1);
  if (e.key === "ArrowLeft") stepLB(-1);
});

/* ── chrome ──────────────────────────────────────────────────────────────── */
function searchCard(placeholder = "Search destinations, guides, places", value = "") {
  return `<div class="searchcard">
    <form class="searchrow" onsubmit="go(this.q.value);return false">
      <label class="sfield">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
        <input name="q" type="search" value="${esc(value)}" placeholder="${esc(placeholder)}" aria-label="Search" oninput="typeahead(this.value)" autocomplete="off">
      </label>
      <button class="btn btn--primary" type="submit">Search</button>
    </form>
    <div class="ta" id="ta" hidden></div>
    <p class="searchnote">Searches every destination, guide, documented place and article we publish.</p>
  </div>`;
}

function crumb(parts) {
  return `<div class="wrap"><nav class="crumb">${parts.map(([href, label], i) =>
    (href ? `<a href="${href}">${esc(label)}</a>` : `<span>${esc(label)}</span>`) +
    (i < parts.length - 1 ? '<i aria-hidden="true">/</i>' : "")).join("")}</nav></div>`;
}

function notFound() {
  return `<section class="sec"><div class="wrap empty">
    <h3>We could not find that page</h3><p>Start from a destination we publish.</p>
    <div class="catrow" style="justify-content:flex-start">${live().map((d) =>
      `<a class="cat" href="#/d/${d.slug}"><span class="cat__n">${esc(d.name)}</span></a>`).join("")}</div>
  </div></section>`;
}

window.go = (q) => { location.hash = `#/search?q=${encodeURIComponent(q || "")}`; };

window.typeahead = (q) => {
  const box = document.getElementById("ta");
  if (!box) return;
  const r = searchAll(q);
  if (!r) { box.hidden = true; return; }
  const rows = [
    ...r.destinations.slice(0, 3).map((d) => [`#/d/${d.slug}`, d.name, "Destination"]),
    ...r.guides.slice(0, 3).map((g) => [`#/g/${g.city}/${g.cat}`, g.name, destBySlug(g.city)?.name]),
    ...r.places.slice(0, 5).map((p) => [`#/g/${p.city}/${p.cat}?at=${p.slug}`, p.name, `${destBySlug(p.city)?.name} place`]),
    ...r.articles.slice(0, 2).map((a) => [`#/a/${a.slug}`, a.title, "Reading"]),
  ];
  if (!rows.length) { box.innerHTML = `<p class="ta__none">Nothing yet for &ldquo;${esc(q)}&rdquo;</p>`; box.hidden = false; return; }
  box.innerHTML = rows.map(([h, n, k]) =>
    `<a href="${h}"><b>${esc(n)}</b><span>${esc(k)}</span></a>`).join("") +
    `<a class="ta__all" href="#/search?q=${encodeURIComponent(q)}">See all results for &ldquo;${esc(q)}&rdquo;</a>`;
  box.hidden = false;
};

/* ── router ──────────────────────────────────────────────────────────────── */
function render() {
  const h = location.hash.replace(/^#\/?/, "");
  const [path, query] = h.split("?");
  const seg = path.split("/").filter(Boolean);
  const q = new URLSearchParams(query || "").get("q") || "";

  let html;
  if (!seg.length) html = viewHome();
  else if (seg[0] === "d") html = viewDestination(seg[1]);
  else if (seg[0] === "g") html = viewGuide(seg[1], seg[2]);
  else if (seg[0] === "a") html = viewArticle(seg[1]);
  else if (seg[0] === "search") html = viewSearch(q);
  else html = notFound();

  document.getElementById("app").innerHTML = html;
  document.querySelectorAll(".nav-links a").forEach((a) =>
    a.toggleAttribute("aria-current", a.getAttribute("href") === "#/"));

  // Deep link to one documented place, which is what a search result does.
  const at = new URLSearchParams(query || "").get("at");
  const el = at && document.getElementById(at);
  if (el) { el.classList.add("place--hit"); el.scrollIntoView({ behavior: "smooth", block: "center" }); }
  else window.scrollTo(0, 0);

  spyPlaces();
}

/* The index highlights whichever place is on screen, so scrolling a 13 entry
   guide never leaves you guessing where you are. */
let SPY = null;
function spyPlaces() {
  SPY?.disconnect();
  const links = new Map([...document.querySelectorAll("[data-jump]")].map((a) => [a.dataset.jump, a]));
  if (!links.size) return;
  SPY = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      links.forEach((a) => a.removeAttribute("aria-current"));
      links.get(e.target.id)?.setAttribute("aria-current", "true");
      links.get(e.target.id)?.scrollIntoView({ block: "nearest" });
    }
  }, { rootMargin: "-45% 0px -50% 0px" });
  document.querySelectorAll(".place").forEach((el) => SPY.observe(el));
}

addEventListener("hashchange", render);
addEventListener("keydown", (e) => {
  if (e.key === "/" && !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
    e.preventDefault();
    document.querySelector(".searchcard input")?.focus();
  }
});

Promise.all([
  fetch("data/corpus.json").then((r) => r.json()),
  fetch("data/best-months.json").then((r) => r.json()),
]).then(([corpus, months]) => { DATA = corpus; MONTHS = months; render(); })
  .catch((e) => { document.getElementById("app").innerHTML =
    `<div class="wrap sec empty"><h3>Could not load the corpus</h3><p>${esc(e.message)}. Serve this folder over http rather than opening the file directly.</p></div>`; });
