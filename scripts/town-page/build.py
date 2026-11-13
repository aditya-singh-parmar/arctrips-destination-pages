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


def e(s):
    return html.escape(s or '', quote=True)


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
    groups = itins.get(slug, [])
    links = [('#top', 'Overview', True), ('#why', 'Why go', False), ('#when', 'When to go', False), ('#do', 'Things to do', False)]
    if groups:
        links.append(('#trips', 'Itineraries', False))
    links_html = '\n'.join(f'    <li><a href="{h}"{" aria-current=\"page\"" if c else ""}>{l}</a></li>' for h, l, c in links)

    hero = d['hero']
    region_label = 'Vancouver Island, British Columbia' if island else 'British Columbia'

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
        for p in t['places'][:TOP_PER_ACTIVITY]:
            note = f'<p class="pl__n"><b>Good to know.</b> {e(clean(p["note"]))}</p>' if p.get('note') else ''
            body = f'<div class="pl__b"><h3>{e(p["name"])}</h3><p>{e(clean(p["text"]))}</p>{note}</div>'
            if p.get('img'):
                cards.append(f'<article class="hc"><figure class="hc__m"><img loading="lazy" src="{e(p["img"])}" alt="{e(p.get("alt") or p["name"])}"></figure>{body}</article>')
            else:
                cards.append(f'<article class="hc hc--t">{body}</article>')
        qs = ''.join(f'<details class="hq"><summary>{e(clean(q["q"]))}</summary><div class="hq__a"><p>{e(clean(q["a"]))}</p></div></details>' for q in t.get('faqs', []))
        qblock = f'<div class="hqs"><h4>Questions about {e(t["label"].lower())} in {e(name)}</h4>{qs}</div>' if qs else ''
        intro = f'<p class="hpanel__p">{e(clean(t["intro"]))}</p>' if t.get('intro') else ''
        panels.append(f'<div class="hpanel" role="tabpanel" id="panel-{tid}" aria-labelledby="tab-{tid}" data-g="{tid}"{"" if i == 0 else " hidden"}>'
                      f'<h3 class="hpanel__h">{e(t["label"])} in {e(name)}</h3>{intro}'
                      f'<div class="hgrid">{"".join(cards)}</div>{qblock}</div>')
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
        planning = f'<div class="hqs hqs--plan"><h4>Before you go</h4>{qs}</div>'

    nearby = ''.join(f'<li><a href="{BC}/{n}">{e(NAMES.get(n, n))}</a></li>' for n in d.get('nearby', []) if n in NAMES and n != slug)

    page = f'''<!doctype html>
<html lang="en-CA">
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
  <ul class="nav-links"><li><a href="/" aria-current="true">Destinations</a></li><li><a href="/search?in={slug}">Guides</a></li></ul>
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

<header class="hero thero2"><div class="wrap hero-grid">
  <div>
    <span class="label">{e(region_label)}</span>
    <h1 style="margin-top:16px">{e(name)}</h1>
    <p class="lede">{e(clean(hero["standfirst"]))}</p>
    <div class="hero-cta">
      <a class="btn btn--ghost" href="#do">What to do here</a>
      <a class="btn btn--ghost" href="#when">When to go</a>
    </div>
  </div>
  <figure class="uphoto"><img src="{e(hero["img"])}" alt="{e(hero["alt"])}"></figure>
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
  <p class="hdress">No month is a bad month here if you dress for it: layers and a waterproof shell cover most of the year.</p>
</div></section>

<section class="hdo" id="do"><div class="wrap">
  <div class="head"><div><span class="label label--n">Things to do</span>
    <h2 style="margin-top:11px">What to do in {e(name)}</h2>
    <p>The places people come for, one activity at a time. Each tab ends with the questions people ask about it.</p></div></div>
  <div class="acts" role="tablist" aria-label="Activities in {e(name)}">{"".join(tabs)}</div>
  {"".join(panels)}
  {planning}
</div></section>
{trips}
<section class="hstay"><div class="wrap stayband">
  <div><h2>Where to stay in {e(name)}</h2>
    <p>Search what is open in {e(name)} for your dates.</p></div>
  <div class="stay__go"><a class="btn btn--primary" href="/search?in={slug}">Find a stay in {e(name)}</a></div>
</div></section>

<section class="hnear"><div class="wrap roster">
  <h2>Nearby</h2>
  <ul>{nearby}<li><a href="{f"{BC}/vancouver-island" if island else "/"}">{"All of Vancouver Island" if island else "All of British Columbia"}</a></li></ul>
</div></section>
</main>
<footer class="f"><div class="wrap fbase">&copy; 2026 Arc Trips. Prices in CAD, before taxes and fees.</div></footer>
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
