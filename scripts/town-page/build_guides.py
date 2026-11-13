"""Renders the travel-guide pages added in the 2026-11-13 review:

  itineraries.html          /travel-guides/canada/bc/itineraries
  best-time-tofino.html     /travel-guides/canada/bc/tofino/best-time-to-visit
  best-time-ucluelet.html   /travel-guides/canada/bc/ucluelet/best-time-to-visit

from scripts/town-page/data/_itineraries.json and _best-time.json.
Best time to visit leads with crowds and what is on each month; the weather is a
small table at the bottom ("there is no bad weather, only poor clothing").

Run: python3 -I scripts/town-page/build_guides.py, then node scripts/nav-rebuild.mjs
"""
import json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build import e, clean, MONTH, MON, NAMES, ISLAND, BC, ORIGIN, DATA, OUT, HERE

CLIMATE = json.load(open(os.path.join(OUT, 'climate.json')))
CROWD_LVL = {'lowest': 1, 'low': 1, 'quiet': 1, 'moderate': 2, 'building': 2, 'busy': 3, 'busiest': 4, 'peak': 4}
TOWN_HREF = lambda t: f'{BC}/{t}'

BASE_CSS = open(os.path.join(HERE, 'town.css')).read()
GUIDE_CSS = '''
.ghero{padding-block:clamp(30px,4vw,56px) clamp(26px,3vw,40px)}
.ghero h1{font-size:clamp(2.2rem,4.6vw,3.5rem);letter-spacing:-.035em;line-height:1.06;max-width:20ch;margin-top:14px}
.ghero .lede{max-width:60ch;margin-top:18px}
.gsec{padding-block:clamp(34px,4vw,60px)}
.gsec--tint{background:var(--n50);border-block:1px solid var(--n150)}
.gsec h2{font-size:clamp(1.6rem,2.8vw,2.2rem);letter-spacing:-.03em}
.gsec .dek{color:var(--n600);margin-top:8px;max-width:64ch;line-height:1.6}
.jump{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}
.jump a{display:inline-flex;align-items:center;min-height:44px;padding:0 16px;border:1px solid var(--n200);border-radius:999px;font-weight:600;font-size:.93rem;color:var(--navy);background:var(--paper)}
.jump a:hover{border-color:var(--navy)}
/* conditions by month */
.cbm{width:100%;border-collapse:collapse;margin-top:clamp(20px,2.4vw,28px)}
.cbm th{font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--azure);text-align:left;padding:0 14px 12px 0;border-bottom:1px solid var(--n200)}
.cbm td{padding:16px 14px 16px 0;border-bottom:1px solid var(--n150);vertical-align:top;font-size:.95rem;color:var(--n700);line-height:1.55}
.cbm td.m{font-weight:700;color:var(--navy);font-size:1.02rem;white-space:nowrap}
.cbm .tag{display:inline-block;padding:4px 10px;border-radius:var(--r-sm);font-size:.82rem;font-weight:700;background:var(--a100);color:var(--navy);white-space:nowrap}
.cbm .tag[data-s="peak"],.cbm .tag[data-s="summer"]{background:var(--navy);color:var(--paper)}
.chips{display:flex;flex-wrap:wrap;gap:5px}
.chips span{display:inline-block;padding:3px 9px;border-radius:var(--r-sm);font-size:.82rem;font-weight:600;background:var(--n100);color:var(--n800)}
.crowd{display:flex;align-items:center;gap:8px;white-space:nowrap;font-weight:600;color:var(--navy)}
.crowd i{display:inline-flex;gap:2px}
.crowd i b{width:7px;height:14px;border-radius:2px;background:var(--n150)}
.crowd i b[data-on]{background:var(--navy)}
@media(max-width:980px){
  .cbm thead{display:none}
  .cbm tr{display:grid;grid-template-columns:1fr auto;gap:8px 14px;padding-block:16px;border-bottom:1px solid var(--n150)}
  .cbm td{border:0;padding:0}
  .cbm td.m{grid-column:1}.cbm td.c{grid-column:2;grid-row:1}
  .cbm td.s,.cbm td.w,.cbm td.a,.cbm td.l{grid-column:1/-1}
  .cbm td.sea{display:none}
}
.events{list-style:none;margin-top:clamp(18px,2.2vw,26px);border-top:1px solid var(--n200);max-width:880px}
.events li{display:grid;grid-template-columns:150px 1fr;gap:6px 24px;padding-block:18px;border-bottom:1px solid var(--n150)}
.events .when{font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--azure);padding-top:3px}
.events h3{font-size:1.06rem}
.events p{color:var(--n600);font-size:.95rem;line-height:1.55;margin-top:4px}
@media(max-width:640px){.events li{grid-template-columns:1fr}}
.dress{list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:clamp(16px,2vw,26px);margin-top:20px}
.dress li{border-top:2px solid var(--a300);padding-top:12px;color:var(--n700);line-height:1.55;font-size:.96rem}
.wxt{border-collapse:collapse;margin-top:16px;font-size:.88rem;color:var(--n700);width:100%;max-width:880px}
.wxt th,.wxt td{padding:8px 6px;border-bottom:1px solid var(--n150);text-align:right;font-variant-numeric:tabular-nums}
.wxt th:first-child,.wxt td:first-child{text-align:left}
.wxt th{font-size:.74rem;color:var(--n600);font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.wxnote{font-size:.85rem;color:var(--n600);margin-top:10px}
.wxwrap{overflow-x:auto}
.qs2{max-width:76ch;margin-top:16px;border-top:1px solid var(--n200)}
/* itineraries */
.igroup{padding-block:clamp(34px,4vw,56px);border-top:1px solid var(--n150)}
.igroup:first-of-type{border-top:0}
.igroup__h{display:flex;justify-content:space-between;align-items:baseline;gap:16px;flex-wrap:wrap}
.igroup__h a{font-weight:600;font-size:.93rem;color:var(--azure);min-height:44px;display:inline-flex;align-items:center}
.trip{border-top:2px solid var(--navy);padding-top:18px;margin-top:clamp(22px,2.6vw,30px)}
.trip__top{display:grid;grid-template-columns:auto 1fr;gap:4px 18px;align-items:baseline}
.trip__n{font-size:clamp(2.2rem,3.4vw,2.8rem);font-weight:800;color:var(--navy);letter-spacing:-.045em;line-height:1;grid-row:1/3;font-variant-numeric:tabular-nums}
.trip__n small{display:block;font-size:.82rem;font-weight:600;letter-spacing:0;color:var(--n600);margin-top:4px}
.trip h3{font-size:clamp(1.2rem,1.8vw,1.45rem);letter-spacing:-.02em}
.trip__sum{color:var(--n700);line-height:1.6;max-width:70ch}
.trip__season{font-size:.9rem;color:var(--n600);margin-top:6px}
.days{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,280px),1fr));gap:clamp(16px,2vw,26px);margin-top:18px}
.day h4{font-size:.98rem;color:var(--navy);padding-bottom:8px;border-bottom:1px solid var(--n150)}
.day ol{list-style:none;margin-top:10px;display:grid;gap:10px}
.day li b{display:block;color:var(--navy);font-size:.95rem}
.day li b a{color:inherit;border-bottom:1px solid var(--a250)}
.day li b a:hover{color:var(--azure)}
.day li span{display:block;color:var(--n600);font-size:.9rem;line-height:1.5;margin-top:2px}
.trip__src{font-size:.82rem;color:var(--n500);margin-top:14px}
'''


def shell(title, desc, route, crumbs, links, body, search_in='', label=''):
    crumb_html = ''
    for i, (h, l) in enumerate(crumbs):
        deep = ' class="lvl-deep"' if i < len(crumbs) - 2 else ''
        sep = '<span class="sep lvl-deep" aria-hidden="true">/</span>' if deep else '<span class="sep" aria-hidden="true">/</span>'
        crumb_html += f'<a{deep} href="{h}">{e(l)}</a>{sep}' if h else ''
    crumb_html += f'<span aria-current="page">{e(crumbs[-1][1])}</span>'
    links_html = '\n'.join(f'    <li><a href="{h}"{" aria-current=\"page\"" if i == 0 else ""}>{e(l)}</a></li>' for i, (h, l) in enumerate(links))
    hid = f'<input type="hidden" name="in" value="{search_in}">' if search_in else ''
    return f'''<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{ORIGIN}{route}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@700&display=swap" rel="stylesheet">
<link rel="icon" href="/prototype/brand/arctrips-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/prototype/_system.css">
<style>
/* Generated by scripts/town-page/build_guides.py. Edit the data, not this file. */
{BASE_CSS}{GUIDE_CSS}
</style>
</head>
<body>
<span id="top" aria-hidden="true"></span>
<a class="skip" href="#main">Skip to content</a>
<nav class="top"><div class="wrap nav-in">
  <a class="brand" href="/"><img class="brand__mark" src="/prototype/brand/arctrips-mark-azure.svg" alt="" width="45" height="20"><span>ArcTrips</span></a>
  <ul class="nav-links"><li><a href="/">Destinations</a></li><li><a href="/search" aria-current="true">Guides</a></li></ul>
  <form class="search" role="search" action="/search" method="get">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <label class="vh" for="q">Search</label>
    <input id="q" name="q" type="search" placeholder="Go to a place, a beach, a trail or a guide">{hid}<kbd>/</kbd>
  </form>
</div></nav>
<div class="placebar placebar--two" aria-label="{e(label or crumbs[-1][1])}"><div class="wrap">
  <nav class="crumb placebar__crumb" aria-label="Breadcrumb">{crumb_html}</nav>
  <nav class="placebar-in" aria-label="{e(label or crumbs[-1][1])} sections"><ul class="placebar__links">
{links_html}
  </ul></nav>
</div></div><!-- /placebar -->
<main id="main">
{body}
</main>
<footer class="f"><div class="wrap fbase">&copy; 2026 Arc Trips. Prices in CAD, before taxes and fees.</div></footer>
<script src="/prototype/_nav.js"></script>
</body>
</html>
'''


def faq_html(faqs):
    return ''.join(f'<details class="hq"><summary>{e(clean(q["q"]))}</summary><div class="hq__a"><p>{e(clean(q["a"]))}</p></div></details>' for q in faqs)


def best_time(town, d):
    name = NAMES[town]
    other = 'ucluelet' if town == 'tofino' else 'tofino'
    route = f'/travel-guides/canada/bc/{town}/best-time-to-visit'
    rows = []
    for m in d['months']:
        lvl = CROWD_LVL.get(m['crowds'].lower().split()[0], 2)
        bars = ''.join(f'<b{" data-on" if k < lvl else ""}></b>' for k in range(4))
        wl = ''.join(f'<span>{e(w)}</span>' for w in m.get('wildlife', []))
        ac = ''.join(f'<span>{e(a)}</span>' for a in m.get('activities', []))
        rows.append(f'<tr><td class="m">{MONTH[m["m"] - 1]}</td><td class="s"><span class="tag" data-s="{e(m["season"].lower())}">{e(m["season"])}</span></td>'
                    f'<td class="a"><div class="chips">{ac}</div></td><td class="w"><div class="chips">{wl}</div></td>'
                    f'<td class="c"><span class="crowd"><i aria-hidden="true">{bars}</i>{e(m["crowds"])}</span></td>'
                    f'<td class="sea">{e(clean(m["sea"]))}</td><td class="l">{e(clean(m["like"]))}</td></tr>')
    events = ''.join(f'<li><span class="when">{e(ev["when"])}</span><div><h3>{e(clean(ev["name"]))}</h3><p>{e(clean(ev["what"]))}</p></div></li>' for ev in d['events'])
    dress = ''.join(f'<li>{e(clean(t))}</li>' for t in d['dress'])
    cl = CLIMATE[town]
    wx_rows = ''.join(f'<tr><td>{MON[i]}</td><td>{c["hi"]}&deg;</td><td>{c["lo"]}&deg;</td><td>{c["mm"]}</td><td>{c["days"]}</td></tr>' for i, c in enumerate(cl))
    body = f'''<header class="ghero"><div class="wrap">
  <span class="label">{e(name)}, British Columbia</span>
  <h1>{e(clean(d["h1"]))}</h1>
  <p class="lede">{e(clean(d["lede"]))}</p>
  <nav class="jump" aria-label="On this page"><a href="#months">Month by month</a><a href="#calendar">On the calendar</a><a href="#dress">Dress for it</a><a href="#weather">Weather</a></nav>
</div></header>

<section class="gsec gsec--tint" id="months"><div class="wrap">
  <h2>Conditions by month</h2>
  <p class="dek">What is on, what you can see, and how busy {e(name)} gets in each month. The more bars, the more people.</p>
  <table class="cbm">
    <thead><tr><th>Month</th><th>Season</th><th>What is on</th><th>Wildlife</th><th>Crowds</th><th class="sea">Sea</th><th>What it is like</th></tr></thead>
    <tbody>{"".join(rows)}</tbody>
  </table>
</div></section>

<section class="gsec" id="calendar"><div class="wrap">
  <h2>On the calendar</h2>
  <p class="dek">The yearly events that shape when people come. Check each organiser for this year's dates.</p>
  <ul class="events">{events}</ul>
</div></section>

<section class="gsec gsec--tint" id="dress"><div class="wrap">
  <h2>Dress for it, then go</h2>
  <ul class="dress">{dress}</ul>
</div></section>

<section class="gsec" id="weather"><div class="wrap">
  <h2 style="font-size:1.3rem">The weather, month by month</h2>
  <div class="wxwrap"><table class="wxt"><thead><tr><th>Month</th><th>High</th><th>Low</th><th>Rain, mm</th><th>Rain days</th></tr></thead><tbody>{wx_rows}</tbody></table></div>
  <p class="wxnote">Climate normals seeded for design, not yet checked against the station record.</p>
</div></section>

<section class="gsec gsec--tint" id="questions"><div class="wrap">
  <h2>Questions about timing a trip</h2>
  <div class="qs2">{faq_html(d.get("faqs", []))}</div>
</div></section>

<section class="hstay"><div class="wrap stayband">
  <div><h2>Stay in {e(name)}</h2><p>Places to stay are open in every month. See {e(NAMES[other])} too, forty minutes down the same road.</p></div>
  <div class="stay__go"><a class="btn btn--primary" href="/search?in={town}">Find a stay in {e(name)}</a></div>
</div></section>
<section class="hnear"><div class="wrap roster"><h2>Keep planning</h2><ul>
  <li><a href="{BC}/{town}">{e(name)} overview</a></li>
  <li><a href="/travel-guides/canada/bc/itineraries#west-coast">West coast itineraries</a></li>
  <li><a href="/travel-guides/canada/bc/{other}/best-time-to-visit">Best time to visit {e(NAMES[other])}</a></li>
</ul></div></section>'''
    crumbs = [('/', 'British Columbia'), (f'{BC}/vancouver-island', 'Vancouver Island'), (f'{BC}/{town}', name), (None, 'Best time to visit')]
    links = [('#months', 'Month by month'), ('#calendar', 'On the calendar'), ('#dress', 'Dress for it'), ('#weather', 'Weather'), ('#questions', 'Questions')]
    desc = clean(d['lede'])[:158]
    return shell(f'Best time to visit {name}, Arc Trips', desc, route, crumbs, links, body, town, name)


def itineraries(d):
    route = '/travel-guides/canada/bc/itineraries'
    groups_html, jump = [], []
    for g in d['groups']:
        jump.append(f'<a href="#{e(g["id"])}">{e(g["name"])}</a>')
        trips = []
        for t in g['trips']:
            days = []
            for day in t['plan']:
                stops = []
                for st in day['stops']:
                    nm = e(clean(st['name']))
                    tw = st.get('town')
                    link = f'<a href="{TOWN_HREF(tw)}">{nm}</a>' if tw in NAMES else nm
                    stops.append(f'<li><b>{link}</b><span>{e(clean(st["what"]))}</span></li>')
                days.append(f'<div class="day"><h4>{e(clean(day["title"]))}</h4><ol>{"".join(stops)}</ol></div>')
            season = f'<p class="trip__season">{e(clean(t["season"]))}</p>' if t.get('season') else ''
            trips.append(f'<article class="trip" id="{e(t["id"])}"><div class="trip__top"><span class="trip__n">{t["days"]}<small>{"day" if t["days"] == 1 else "days"}</small></span>'
                         f'<h3>{e(clean(t["title"]))}</h3><div><p class="trip__sum">{e(clean(t["summary"]))}</p>{season}</div></div>'
                         f'<div class="days">{"".join(days)}</div></article>')
        towns = [tw for tw in g.get('towns', []) if tw in NAMES]
        tlinks = ', '.join(f'<a href="{TOWN_HREF(tw)}">{e(NAMES[tw])}</a>' for tw in towns)
        groups_html.append(f'<section class="igroup" id="{e(g["id"])}"><div class="wrap">'
                           f'<div class="igroup__h"><h2>{e(g["name"])}</h2></div>'
                           f'<p class="dek">{e(clean(g["intro"]))}{" Towns: " + tlinks + "." if tlinks else ""}</p>'
                           f'{"".join(trips)}</div></section>')
    n_min = min(t['days'] for g in d['groups'] for t in g['trips'])
    n_max = max(t['days'] for g in d['groups'] for t in g['trips'])
    body = f'''<header class="ghero"><div class="wrap">
  <span class="label">British Columbia</span>
  <h1>Suggested itineraries, {n_min} to {n_max} days</h1>
  <p class="lede">Day by day plans for one town or several: the west coast, Whistler and Squamish, the south of Vancouver Island, and the whole island end to end. Each stop links to its town.</p>
  <nav class="jump" aria-label="Itineraries by place">{"".join(jump)}</nav>
</div></header>
{"".join(groups_html)}
<section class="hstay"><div class="wrap stayband">
  <div><h2>Book the nights first</h2><p>Places to stay in Tofino and Ucluelet are bookable tonight.</p></div>
  <div class="stay__go"><a class="btn btn--primary" href="/search">Find a stay</a></div>
</div></section>'''
    crumbs = [('/', 'British Columbia'), (None, 'Suggested itineraries')]
    links = [(f'#{g["id"]}', g['name']) for g in d['groups']]
    return shell('Suggested itineraries in British Columbia, Arc Trips',
                 'Two to ten day itineraries for Tofino and Ucluelet, Whistler and Squamish, and Vancouver Island, day by day.',
                 route, crumbs, links, body, '', 'Itineraries')


def main():
    bt = json.load(open(os.path.join(DATA, '_best-time.json')))
    for t in ('tofino', 'ucluelet'):
        open(os.path.join(OUT, f'best-time-{t}.html'), 'w').write(best_time(t, bt[t]))
        print(f'  best-time-{t}.html')
    it = json.load(open(os.path.join(DATA, '_itineraries.json')))
    open(os.path.join(OUT, 'itineraries.html'), 'w').write(itineraries(it))
    print('  itineraries.html')


if __name__ == '__main__':
    main()
