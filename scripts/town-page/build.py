"""Renders every BC town page (except Tofino and Ucluelet, which are hand-built)
from scripts/town-page/data/<slug>.json, one template for all of them.

Layout follows the Ucluelet hub the reviewer pointed at (2026-11-13 review):
hero with one photo and a standfirst, Why go with a facts table, When to go led
by crowds and seasonal activities, things to do one activity at a time with that
activity's questions under it, then itineraries, stays and the towns nearby.
No counts in the hero, no progress figures.

Run:  python3 -I scripts/town-page/build.py            (all towns with a data file)
      python3 -I scripts/town-page/build.py whistler   (one town)
Then: node scripts/nav-rebuild.mjs && node scripts/canonical-rebuild.mjs
"""
import json, os, sys, html, re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..')
DATA = os.path.join(HERE, 'data')
OUT = os.path.join(ROOT, 'design', 'prototype')
ORIGIN = 'https://arctrips-destination-pages.vercel.app'
BC = '/destinations/canada/bc'
# Stays pages verified live for these slugs only; the rest fall back to the stays index.
NO_STAY_PAGE = {'nanoose', 'shawnigan-lake'}
ITIN = '/travel-guides/canada/bc/itineraries'

# The reviewer: feature only the popular, commonly recommended places. A town
# page shows at most this many per activity, in the source article's order (D-20).
TOP_PER_ACTIVITY = 6

MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
CROWD = {1: 'Quiet', 2: 'Moderate', 3: 'Busy', 4: 'Busiest'}
NAMES = {'tofino': 'Tofino', 'ucluelet': 'Ucluelet', 'victoria': 'Victoria', 'sooke': 'Sooke', 'sidney': 'Sidney',
         'shawnigan-lake': 'Shawnigan Lake', 'chemainus': 'Chemainus', 'nanaimo': 'Nanaimo', 'nanoose': 'Nanoose Bay',
         'parksville': 'Parksville', 'campbell-river': 'Campbell River', 'vancouver': 'Vancouver',
         'whistler': 'Whistler', 'squamish': 'Squamish', 'nelson': 'Nelson'}
ISLAND = {'tofino', 'ucluelet', 'victoria', 'sooke', 'sidney', 'shawnigan-lake', 'chemainus', 'nanaimo', 'nanoose',
          'parksville', 'campbell-river'}


# US English in rendered copy (owner, 2026-11-25). Capitalised forms are left alone
# because they are proper names (Inner Harbour, Cultural Centre, Chemainus Theatre).
US = {'harbour': 'harbor', 'harbours': 'harbors', 'harbourfront': 'harborfront', 'centre': 'center', 'centres': 'centers',
      'colour': 'color', 'colours': 'colors', 'colourful': 'colorful', 'favourite': 'favorite', 'favourites': 'favorites',
      'grey': 'gray', 'jewellery': 'jewelry', 'kilometre': 'kilometer', 'kilometres': 'kilometers', 'metre': 'meter',
      'metres': 'meters', 'litre': 'liter', 'litres': 'liters', 'labour': 'labor', 'licence': 'license', 'licences': 'licenses',
      'neighbourhood': 'neighborhood', 'neighbourhoods': 'neighborhoods', 'behaviour': 'behavior', 'parlour': 'parlor',
      'theatre': 'theater', 'theatres': 'theaters', 'traveller': 'traveler', 'travellers': 'travelers',
      'organiser': 'organizer', 'organisers': 'organizers', 'neighbour': 'neighbor', 'neighbours': 'neighbors'}
US_RE = re.compile(r'(?<![\w/])(' + '|'.join(US) + r')(?!\w)')


def us(s):
    return US_RE.sub(lambda m: US[m.group(1)], s)


def e(s):
    return html.escape(us(s or ''), quote=True)


def clean(s):
    """House rules on any copy that reaches the page: no em dashes, ranges read 'to'."""
    s = re.sub('\\s*\u2014\\s*', ', ', s or '')
    s = re.sub(r'(?<=\d)\s*\u2013\s*(?=\d)', ' to ', s)
    s = re.sub(r'\s*\u2013\s*', ', ', s)
    return s


def window(months):
    ms = sorted(set(months))
    if not ms:
        return ''
    if len(ms) == 12:
        return 'All year'
    # longest wrap-around run reads best ("November to February")
    runs, run = [], [ms[0]]
    for m in ms[1:]:
        if m == run[-1] + 1:
            run.append(m)
        else:
            runs.append(run); run = [m]
    runs.append(run)
    if len(runs) > 1 and runs[0][0] == 1 and runs[-1][-1] == 12:
        runs[0] = runs.pop() + runs[0]
    parts = [MONTH[r[0] - 1] if len(r) == 1 else f'{MONTH[r[0] - 1]} to {MONTH[r[-1] - 1]}' for r in runs]
    return ', '.join(parts[:-1]) + (' and ' if len(parts) > 1 else '') + parts[-1]


def itinerary_groups():
    p = os.path.join(DATA, '_itineraries.json')
    if not os.path.exists(p):
        return {}
    out = {}
    for g in json.load(open(p))['groups']:
        # Whistler and Squamish pages stay about their own town (review 2026-11-13);
        # the combined trips live on the itineraries page only.
        if g['id'] == 'squamish-whistler':
            continue
        for t in g.get('towns', []):
            out.setdefault(t, []).append(g)
    return out


LEAD = re.compile(r"^(Ride|Walk Across|Explore|See|Visit|Relax at|Paddle on|Drive|Go|Try|Cross-Country Ski at)\s+(the\s+)?", re.I)


def short_name(n):
    """Caption for a place: no parenthetical, no leading verb (Ride the Sea to Sky Gondola -> Sea to Sky Gondola)."""
    n = re.sub(r'\s*\([^)]*\)', '', n).strip()
    m = LEAD.match(n)
    if m and len(n) > m.end():
        n = n[m.end():]
        n = n[0].upper() + n[1:]
    return n


def hero_plates(d):
    """The town's hero photo as the large plate, then up to two photos of its places, one per tab first.
    Returns [(src, alt, caption)]; fewer than three when the town has fewer usable photos."""
    h = d['hero']
    plates = [(h['img'], h['alt'], h.get('caption') or d['name'])]
    seen = {h['img']}
    names = {re.sub(r'^the\s+', '', plates[0][2].lower())}
    per_tab = [[p for p in t['places'][:TOP_PER_ACTIVITY] if p.get('img')] for t in d['tabs']]
    order = [t[0] for t in per_tab if t] + [p for t in per_tab for p in t[1:]]
    for limit in (36, 999):
        for p in order:
            if len(plates) == 3:
                break
            cap = short_name(p['name'])
            key = re.sub(r'^the\s+', '', cap.lower())
            if p['img'] in seen or len(cap) > limit or key in names:
                continue
            seen.add(p['img'])
            names.add(key)
            plates.append((p['img'], p.get('alt') or p['name'], cap))
    return plates


CSS = open(os.path.join(HERE, 'town.css')).read()
JS = open(os.path.join(HERE, 'town.js')).read()


def render(d, itins):
    slug, name = d['slug'], d['name']
    island = slug in ISLAND
    route = f'{BC}/{slug}'
    crumbs = [('/', 'British Columbia')] + ([(f'{BC}/vancouver-island', 'Vancouver Island')] if island else [])
    crumb_html = ''
    for i, (h, l) in enumerate(crumbs):
        deep = ' class="lvl-deep"' if i < len(crumbs) - 1 else ''
        sep = '<span class="sep lvl-deep" aria-hidden="true">/</span>' if deep else '<span class="sep" aria-hidden="true">/</span>'
        crumb_html += f'<a{deep} href="{h}">{e(l)}</a>{sep}'
    crumb_html += f'<span aria-current="page">{e(name)}</span>'
    stay_url = 'https://arctrips.com/stays' if slug in NO_STAY_PAGE else f'https://arctrips.com/stays/canada/bc/{slug}'
    groups = itins.get(slug, [])
    links = [('#top', 'Overview', True), ('#why', 'Why go', False), ('#when', 'When to go', False), ('#do', 'Things to do', False)]
    if groups:
        links.append(('#trips', 'Itineraries', False))
    links_html = '\n'.join(f'    <li><a href="{h}"{" aria-current=\"page\"" if c else ""}>{l}</a></li>' for h, l, c in links)

    hero = d['hero']
    plates = hero_plates(d)
    plates_html = ''.join(
        f'<figure class="tplate tp{i + 1}"><img src="{e(src)}" alt="{e(alt)}"{"" if i == 0 else " loading=\"lazy\""}>'
        f'<figcaption>{e(cap)}</figcaption></figure>' for i, (src, alt, cap) in enumerate(plates))

    # why go
    facts = ''.join(f'<div><dt>{e(f["k"])}</dt><dd>{e(clean(f["v"]))}</dd></div>' for f in d['why']['facts'])
    why_paras = ''.join(f'<p>{e(clean(p))}</p>' for p in d['why']['paras'])

    # when to go: crowds first, then the activities, then the seasons
    w = d['when']
    crowd_cells = ''.join(f'<span data-c="{c}" title="{MONTH[i]}: {CROWD[c].lower()}">{MON[i][0]}</span>' for i, c in enumerate(w['crowds']))
    busiest = [i + 1 for i, c in enumerate(w['crowds']) if c == max(w['crowds'])]
    quiet = [i + 1 for i, c in enumerate(w['crowds']) if c == min(w['crowds'])]
    crowd_label = f'Visitors by month. Busiest {window(busiest)}, quietest {window(quiet)}.'
    rows = [f'<div class="mrow mrow--crowd"><span class="mrow__n">Visitors</span>'
            f'<div class="mcells mcells--crowd" role="img" aria-label="{e(crowd_label)}">{crowd_cells}</div>'
            f'<p class="mrow__w">{e(clean(w.get("crowdsNote", "")))}</p></div>']
    for r in w['rows']:
        cells = ''.join(f'<span{" data-on=\"2\"" if i + 1 in r["best"] else (" data-on=\"1\"" if i + 1 in r.get("shoulder", []) else "")}>{MON[i][0]}</span>' for i in range(12))
        label = f'{r["name"]}: best {window(r["best"])}' + (f', also {window(r["shoulder"])}' if r.get('shoulder') else '')
        note = clean(r.get('note') or f'Best {window(r["best"])}.')
        rows.append(f'<div class="mrow"><span class="mrow__n">{e(r["name"])}</span>'
                    f'<div class="mcells" role="img" aria-label="{e(label)}">{cells}</div><p class="mrow__w">{e(note)}</p></div>')
    seasons = ''.join(f'<div class="hnote"><h3>{e(s["h"])}</h3><p>{e(clean(s["p"]))}</p></div>' for s in w['seasons'])

    # things to do
    tabs, panels = [], []
    for i, t in enumerate(d['tabs']):
        tid = re.sub(r'[^a-z0-9]+', '-', t['id'].lower()).strip('-')
        cards = []
        for n, p in enumerate(t['places'][:TOP_PER_ACTIVITY], 1):
            note = f'<p class="tpl__note"><b>Good to know.</b> {e(clean(p["note"]))}</p>' if p.get('note') else ''
            body = f'<div class="tpl__b"><span class="tpl__k tnum">{n:02d}</span><h3>{e(p["name"])}</h3><p>{e(clean(p["text"]))}</p>{note}</div>'
            if p.get('img'):
                cards.append(f'<article class="tpl"><figure class="tpl__m"><img loading="lazy" src="{e(p["img"])}" alt="{e(p.get("alt") or p["name"])}"></figure>{body}</article>')
            else:
                cards.append(f'<article class="tpl tpl--t">{body}</article>')
        qs = ''.join(f'<details class="hq"><summary>{e(clean(q["q"]))}</summary><div class="hq__a"><p>{e(clean(q["a"]))}</p></div></details>' for q in t.get('faqs', []))
        qblock = f'<div class="hqs"><h4>Frequently asked questions</h4>{qs}</div>' if qs else ''
        intro = f'<p class="hpanel__p">{e(clean(t["intro"]))}</p>' if t.get('intro') else ''
        panels.append(f'<div class="hpanel" role="tabpanel" id="panel-{tid}" aria-labelledby="tab-{tid}" data-g="{tid}"{"" if i == 0 else " hidden"}>'
                      f'<h3 class="hpanel__h">{e(t["label"])} in {e(name)}</h3>{intro}'
                      f'<div class="tpls">{"".join(cards)}</div>{qblock}</div>')
        tabs.append(f'<button type="button" role="tab" id="tab-{tid}" aria-controls="panel-{tid}" aria-selected="{"true" if i == 0 else "false"}" tabindex="{0 if i == 0 else -1}" data-g="{tid}">{e(t["label"])}</button>')

    # itineraries, from the itineraries page
    trips = ''
    if groups:
        items = []
        for g in groups:
            for tr in g['trips']:
                items.append(f'<li><a href="{ITIN}#{e(tr["id"])}"><span class="trip__d tnum">{tr["days"]}</span><span class="trip__u">{"day" if tr["days"] == 1 else "days"}</span>'
                             f'<span class="trip__t">{e(clean(tr["title"]))}</span><span class="trip__s">{e(clean(tr["summary"]))}</span></a></li>')
        trips = (f'<section class="htrips" id="trips"><div class="wrap"><div class="head"><div><span class="label label--n">Itineraries</span>'
                 f'<h2 style="margin-top:11px">Suggested days in {e(name)}</h2></div>'
                 f'<a class="btn btn--ghost" href="{ITIN}">Every itinerary</a></div>'
                 f'<ul class="trips">{"".join(items)}</ul></div></section>')

    planning = ''
    if d.get('planning'):
        qs = ''.join(f'<details class="hq"><summary>{e(clean(q["q"]))}</summary><div class="hq__a"><p>{e(clean(q["a"]))}</p></div></details>' for q in d['planning'])
        planning = f'<div class="hqs hqs--plan"><h4>Frequently asked questions</h4>{qs}</div>'

    nearby = ''.join(f'<li><a href="{BC}/{n}">{e(NAMES.get(n, n))}</a></li>' for n in d.get('nearby', []) if n in NAMES and n != slug)

    nearby_html = (f'<section class="hnear"><div class="wrap roster"><h2>Nearby</h2><ul>{nearby}</ul></div></section>' if nearby else '')

    page = f'''<!doctype html>
<html lang="en-US">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(d["title"])}</title>
<meta name="description" content="{e(clean(d["description"]))}">
<link rel="canonical" href="{ORIGIN}{route}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@700&display=swap" rel="stylesheet">
<link rel="icon" href="/prototype/brand/arctrips-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/prototype/_system.css">
<style>
/* Generated by scripts/town-page/build.py from scripts/town-page/data/{slug}.json. Edit the data, not this file. */
{CSS}
</style>
</head>
<body>
<span id="top" aria-hidden="true"></span>
<a class="skip" href="#main">Skip to content</a>
<nav class="top"><div class="wrap nav-in">
  <a class="brand" href="/"><img class="brand__mark" src="/prototype/brand/arctrips-mark-azure.svg" alt="" width="45" height="20"><span>ArcTrips</span></a>
  <ul class="nav-links"><li><a href="/destinations" aria-current="page">Destinations</a></li><li><a href="/travel-guides">Guides</a></li></ul>
  <form class="search" role="search" action="/search" method="get">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <label class="vh" for="q">Search {e(name)}</label>
    <input id="q" name="q" type="search" placeholder="Search {e(name)}"><input type="hidden" name="in" value="{slug}"><kbd>/</kbd>
  </form>
</div></nav>
<div class="placebar placebar--two" aria-label="{e(name)}"><div class="wrap">
  <nav class="crumb placebar__crumb" aria-label="Breadcrumb">{crumb_html}</nav>
  <nav class="placebar-in" aria-label="{e(name)} sections"><ul class="placebar__links">
{links_html}
  </ul></nav>
</div></div><!-- /placebar -->
<main id="main">

<header class="thero"><div class="wrap thero-grid">
  <div>
    <h1>{e(name)}</h1>
    <p class="lede">{e(clean(hero["standfirst"]))}</p>
    <div class="hero-cta">
      <a class="btn btn--ghost" href="#when">When to go</a>
      <a class="btn btn--ghost" href="#do">Things to do</a>
    </div>
  </div>
  <div class="tcol tcol--{len(plates)}">{plates_html}</div>
</div></header>

<section class="sec--why" id="why"><div class="wrap why">
  <div>
    <span class="label label--n">Why go</span>
    <h2 style="margin-top:11px">{e(clean(d["why"]["h2"]))}</h2>
    <div class="why__p">{why_paras}</div>
  </div>
  <dl class="spec">{facts}</dl>
</div></section>

<section class="hwhen" id="when"><div class="wrap">
  <div class="head"><div><span class="label label--n">When to go</span>
    <h2 style="margin-top:11px">{e(clean(w["h2"]))}</h2>
    <p>{e(clean(w["intro"]))}</p></div></div>
  <div class="mband">{"".join(rows)}
    <div class="mkeys"><p class="mkey"><span class="mkey__h">Visitors</span><i data-c="1"></i>Quiet<i data-c="2"></i>Moderate<i data-c="3"></i>Busy<i data-c="4"></i>Busiest</p>
    <p class="mkey"><span class="mkey__h">Activities</span><i data-on="2"></i>Best months<i data-on="1"></i>Shoulder<i></i>Not the time</p></div>
  </div>
  <div class="hnotes">{seasons}</div>
  <p class="hdress">Every season here has a reason to come. Choose by what you want to do and who you want to share it with, then pack for the season you pick.</p>
</div></section>

<section class="hdo" id="do"><div class="wrap">
  <div class="head"><div><span class="label label--n">Things to do</span>
    <h2 style="margin-top:11px">What to do in {e(name)}</h2>
    <p>The places people come for, one activity at a time.</p></div></div>
  <div class="acts" role="tablist" aria-label="Activities in {e(name)}">{"".join(tabs)}</div>
  {"".join(panels)}
  {planning}
</div></section>
{trips}
<section class="hstay"><div class="wrap stayband">
  <div><h2>Where to stay in {e(name)}</h2>
    <p>Search what is open in {e(name)} for your dates.</p></div>
  <div class="stay__go"><a class="btn btn--primary" href="{stay_url}">Find a stay in {e(name)}</a></div>
</div></section>

{nearby_html}
</main>
<footer class="f"><div class="wrap fbase">&copy; 2026 ArcTrips</div></footer>
<script>
{JS}
</script>
<script src="/prototype/_nav.js"></script>
</body>
</html>
'''
    return page


def main():
    itins = itinerary_groups()
    slugs = [a for a in sys.argv[1:] if not a.startswith('-')] or sorted(f[:-5] for f in os.listdir(DATA) if f.endswith('.json') and not f.startswith('_'))
    for s in slugs:
        d = json.load(open(os.path.join(DATA, s + '.json')))
        out = render(d, itins)
        if '\u2014' in out:
            raise SystemExit(f'{s}: em dash in output')
        open(os.path.join(OUT, s + '.html'), 'w').write(out)
        print(f'  {s}.html  tabs={[t["label"] for t in d["tabs"]]}')


if __name__ == '__main__':
    main()
