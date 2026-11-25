#!/usr/bin/env python3
"""Build the Suggested Itineraries pages.

Run:  python3 -I scripts/itineraries/build.py
      python3 -I scripts/itineraries/build.py --parse <itineraries markdown export>

Reads scripts/itineraries/data/itineraries.json (the parsed Google Doc, 42 trips) and
scripts/town-page/data/_itineraries.json (existing trips, read only), then writes:
  design/prototype/itinerary-<slug>.html   one page per trip
  design/prototype/itineraries.html        the index
Styles live in design/prototype/_itinerary.css (hand edited, not generated).
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / 'scripts' / 'itineraries' / 'data' / 'itineraries.json'
EXISTING = ROOT / 'scripts' / 'town-page' / 'data' / '_itineraries.json'
OUT = ROOT / 'design' / 'prototype'
SITE = 'https://arctrips-destination-pages.vercel.app'
INDEX_ROUTE = '/travel-guides/canada/bc/itineraries'
EM = chr(0x2014)
EN = chr(0x2013)

# ---------------------------------------------------------------- parsing

BULLET = re.compile(r'^\s*[' + chr(0x2022) + r'\-\*]\s+(.*)$')
STOP = re.compile(r'^\*\*(.+?)\*\*\.?\s*(.*)$')

# lowercase British spellings to US; capitalized proper names stay as written
US = [
    (r'\bkilometre', 'kilometer'), (r'\bmetre', 'meter'), (r'\bharbour', 'harbor'),
    (r'\bcolour', 'color'), (r'\bcentre', 'center'), (r'\blicence', 'license'),
    (r'\bneighbour', 'neighbor'), (r'\bfavourite', 'favorite'), (r'\borganis', 'organiz'),
    (r'\btravelling', 'traveling'), (r'\bgrey\b', 'gray'),
]


def us(text):
    for pat, rep in US:
        text = re.sub(pat, rep, text)
    return text


def clean(text, heading=False):
    """Em dash becomes a colon in headings and a comma in running text; en dash ranges become 'to'."""
    text = text.replace('**', '').strip()
    text = re.sub(r'\s*' + EM + r'\s*', ': ' if heading else ', ', text)
    text = re.sub(r'(\d)\s*' + EN + r'\s*(\d)', r'\1 to \2', text)
    text = text.replace(EN, '-')
    text = re.sub(r'[ \t ]+', ' ', text)
    return us(text)


def parse(path):
    raw = open(path, encoding='utf-8').read()
    out = []
    for blk in re.split(r'\n(?=# \*\*)', raw):
        lines = blk.split('\n')
        m = re.match(r'^# \*\*(.+?)\*\*\s*$', lines[0])
        if not m or 'Itinerary name' not in blk:
            continue
        item = {'title': clean(m.group(1)), 'name': '', 'slug': '', 'meta': '',
                'intro': [], 'days': [], 'stops': [], 'tips': [], 'faqs': []}
        mode, cur, faq = 'intro', None, None
        for ln in lines[1:]:
            s = ln.strip()
            if not s:
                continue
            mm = re.match(r'^\*\*(Itinerary name|Suggested URL slug|Meta description)\*\*\s*(.*)$', s)
            if mm:
                key = {'Itinerary name': 'name', 'Suggested URL slug': 'slug', 'Meta description': 'meta'}[mm.group(1)]
                item[key] = clean(mm.group(2))
                continue
            h2 = re.match(r'^## \*\*(.+?)\*\*\s*$', s)
            if h2:
                h = clean(h2.group(1), heading=True)
                if h == 'Recommended stops':
                    mode = 'stops'
                elif h == 'Tips for this trip':
                    mode = 'tips'
                elif h == 'Frequently asked questions':
                    mode = 'faqs'
                else:
                    mode = 'days'
                    cur = {'heading': h, 'paras': []}
                    item['days'].append(cur)
                continue
            h3 = re.match(r'^### \*\*(.+?)\*\*\s*$', s)
            if h3 and mode == 'faqs':
                faq = {'q': clean(h3.group(1), heading=True), 'a': []}
                item['faqs'].append(faq)
                continue
            if mode == 'intro':
                item['intro'].append(clean(s))
            elif mode == 'days':
                cur['paras'].append(clean(s))
            elif mode in ('stops', 'tips'):
                b = BULLET.match(s)
                body = b.group(1) if b else s
                if mode == 'stops':
                    sm = STOP.match(body)
                    if sm:
                        item['stops'].append({'name': clean(sm.group(1)), 'text': clean(sm.group(2))})
                    else:
                        item['stops'].append({'name': '', 'text': clean(body)})
                else:
                    item['tips'].append(clean(body))
            elif mode == 'faqs':
                faq['a'].append(clean(s))
        out.append(item)
    return out


# ---------------------------------------------------------------- facts

WORDS = {'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 'six': 6, 'seven': 7, 'eight': 8,
         'nine': 9, 'ten': 10}

# place names found in titles, day headings and stop names, in order of first appearance
PLACES = [
    ('Victoria', r'Victoria'), ('Vancouver', r'(?<!North )Vancouver(?! Island)'),
    ('North Vancouver', r'North Vancouver'), ('Tofino', r'Tofino'), ('Ucluelet', r'Ucluelet'),
    ('Whistler', r'Whistler'), ('Squamish', r'Squamish\b(?! Lil)'), ('Kelowna', r'Kelowna'),
    ('Penticton', r'Penticton'), ('Osoyoos', r'Osoyoos'), ('Oliver', r'Oliver\b'),
    ('Vernon', r'Vernon'), ('Sidney', r'Sidney'), ('Sooke', r'Sooke'), ('Nanaimo', r'Nanaimo'),
    ('Parksville', r'Parksville'), ('Campbell River', r'Campbell River'),
    ('Chemainus', r'Chemainus'), ('Cowichan Valley', r'Cowichan'), ('Port Alberni', r'Port Alberni'),
    ('Ladysmith', r'Ladysmith'), ('Qualicum Beach', r'Qualicum'), ('Okanagan', r'Okanagan'),
]

# towns that have a stays page: title keyword -> arctrips.com slug
STAY_TOWNS = ['tofino', 'ucluelet', 'victoria', 'sidney', 'sooke', 'whistler', 'vancouver', 'squamish',
              'nelson', 'nanaimo', 'parksville', 'campbell-river', 'chemainus']
REGIONS = {'tofino': 'west-coast', 'ucluelet': 'west-coast', 'squamish': 'sea-to-sky', 'whistler': 'sea-to-sky',
           'victoria': 'south-island', 'sidney': 'south-island', 'sooke': 'south-island'}

# one photo per town, already used on that town's page: (kind, id or file, alt)
HERO = {
    'tofino': ('cld', 'guides/tofino/beaches/long-beach-2', 'One walker alone on the wet sand at Long Beach in low mist'),
    'ucluelet': ('cld', 'guides/ucluelet/hiking/wild-pacific-trail-1',
                 'A gravel path and a bench on the Wild Pacific Trail above the rocky Ucluelet shore'),
    'victoria': ('img', 'victoria/image47.jpg',
                 'The Inner Harbour in Victoria with flower baskets, floating docks and the British Columbia Parliament Buildings'),
    'sidney': ('img', 'sidney/image22.jpg', "An aerial view of Sidney's waterfront, pier and marina at sunset"),
    'sooke': ('img', 'sooke/image28.jpg', 'Sooke Harbour marina below forested hills, with the Olympic Mountains in the distance'),
    'whistler': ('img', 'whistler/image12.jpg', 'Ski runs above Whistler Village lit up at dusk'),
    'vancouver': ('img', 'vancouver/image8.jpg', 'The False Creek inlet with the downtown Vancouver skyline and mountains behind'),
    'squamish': ('img', 'squamish/image2.jpg', 'The Stawamus Chief above the town and the Squamish River'),
    'nanaimo': ('img', 'nanaimo/image27.jpg', 'Nanaimo harbour with its marina and waterfront towers'),
    'parksville': ('img', 'parksville/image11.jpg', 'Wide sandy tidal flats at low tide stretching toward the mainland mountains'),
    'campbell-river': ('img', 'campbell-river/image11.jpg', 'Campbell River waterfront and marina seen from the water'),
    'chemainus': ('img', 'chemainus/image9.jpg', 'A Chemainus street with a mural on a corner building'),
}
HERO_THEME = {
    ('whistler', 'Mountain biking'): ('img', 'whistler/image23.jpg', 'Cyclists on the Valley Trail beside a lake'),
    ('whistler', 'Skiing'): ('img', 'whistler/image26.jpg', 'A skier in powder beside snow-covered trees'),
}

THEME_BY_SLUG = {
    'fishing': 'Fishing', 'wildlife': 'Wildlife', 'hiking-trip': 'Hiking', 'food-and-seafood': 'Food',
    'wine-country-getaway': 'Wine', 'ski-holiday': 'Skiing', 'mountain-biking-trip': 'Mountain biking',
    'family-road-trip': 'Family', 'romantic': 'Couples', 'outdoor-adventure': 'Outdoor adventure',
}
THEME_ORDER = ['Fishing', 'Wildlife', 'Hiking', 'Food', 'Wine', 'Skiing', 'Mountain biking', 'Family',
               'Couples', 'Outdoor adventure']

# group anchors other pages link to, mapped onto the trip card that carries them
GROUP_ANCHOR = {
    'west-coast': 'west-coast-2-days', 'whistler': 'two-days-in-whistler', 'squamish': 'squamish-2-days',
    'squamish-whistler': 'squamish-whistler-2-days', 'south-island': 'south-island-3-days',
    'island-end-to-end': 'island-end-to-end-7-days', 'island-mountain-biking': 'island-mtb-3-days',
}
# existing trips that duplicate a doc itinerary: the doc version is used, the old anchor is kept as an alias
DUPLICATES = {'whistler-2-days': 'two-days-in-whistler', 'whistler-3-days': 'three-days-in-whistler'}

LENGTH_BUCKETS = [1, 2, 3, 4, 5, 7, 9]


def bucket(days):
    b = 1
    for v in LENGTH_BUCKETS:
        if days >= v:
            b = v
    return b


def bucket_label(b):
    if b == 1:
        return '1 day'
    if b == 9:
        return '9 days and longer'
    return f'{b} days'


def days_of(item):
    nums = [int(m.group(1)) for d in item['days'] for m in [re.match(r'Day (\d+)\b', d['heading'])] if m]
    if nums:
        return max(nums)
    if re.search(r'\bFriday\b', ' '.join(d['heading'] for d in item['days'])):
        return 2
    return 1


def title_days(title):
    m = re.search(r'\b(\d+)-Day\b', title)
    if m:
        return int(m.group(1))
    m = re.match(r'(One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten) Days?\b', title)
    if m:
        return WORDS[m.group(1).lower()]
    if title.startswith('Two Weeks'):
        return 14
    return None


def places_in(text):
    found = []
    for name, pat in PLACES:
        m = re.search(pat, text)
        if m:
            found.append((m.start(), name))
    return [n for _, n in sorted(found)]


def best_for(item):
    intro = ' '.join(item['intro'])
    m = re.search(r'\b(?:good fit for|good choice for|suits|works well for|works for)\s+(.+?)(?:,?\s+especially\b|\s+so\b|[.;])', intro)
    if not m:
        return ''
    s = re.sub(r' and anyone$', '', m.group(1).replace(' or for ', ' or ').strip())
    if len(s) > 64:
        s = re.split(r'\s+(?:who|that|if)\b', s)[0]
    return s[0].upper() + s[1:]


def slugify(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')


def build_items():
    items = []
    doc = json.loads(DATA.read_text(encoding='utf-8'))
    order = 0
    for d in doc:
        order += 1
        title = d['title']
        n = days_of(d)
        weekend = 'Weekend' in title
        towns = places_in(' '.join([title] + [x['heading'] for x in d['days']] + [x['name'] for x in d['stops']]))
        title_towns = [t for t in places_in(title)]
        key = [slugify(t) for t in title_towns if slugify(t) in STAY_TOWNS]
        stay = None
        if key and (len(set(key)) == 1 or len({REGIONS.get(k, k) for k in key}) == 1):
            stay = key[0]
        hero_town = next((slugify(t) for t in title_towns if slugify(t) in HERO), None)
        theme = None
        for frag, th in THEME_BY_SLUG.items():
            if frag in d['slug']:
                theme = th
        items.append({
            'id': d['slug'], 'slug': d['slug'], 'source': 'doc', 'order': order, 'title': title, 'name': d['name'],
            'meta': d['meta'], 'summary': d['meta'], 'intro': d['intro'], 'days': n, 'weekend': weekend,
            'plan': [{'heading': x['heading'], 'paras': x['paras'], 'stops': []} for x in d['days']],
            'stops': d['stops'], 'tips': d['tips'], 'faqs': d['faqs'], 'towns': towns, 'stay': stay,
            'hero_town': hero_town, 'theme': theme, 'best_for': best_for(d), 'group': None,
            'title_days': title_days(title),
        })
    ex = json.loads(EXISTING.read_text(encoding='utf-8'))
    for g in ex['groups']:
        for t in g['trips']:
            if t['id'] in DUPLICATES:
                continue
            order += 1
            gt = g['towns']
            towns = []
            for day in t['plan']:
                for s in day['stops']:
                    nm = (s['town'] or '').replace('-', ' ').title()
                    if nm and nm not in towns:
                        towns.append(nm)
            stay = gt[0] if gt and gt[0] in STAY_TOWNS and len({REGIONS.get(x, x) for x in gt}) == 1 else None
            hero_town = None if 'mountain biking' in g['name'] else (gt[0] if gt[0] in HERO else None)
            plan = []
            for day in t['plan']:
                plan.append({'heading': clean(day['title'], heading=True), 'paras': [],
                             'stops': [{'name': clean(s['name']), 'text': clean(s['what'])} for s in day['stops']]})
            theme = 'Mountain biking' if 'mtb' in t['id'] else ('Wildlife' if 'whale' in t['id'] else None)
            items.append({
                'id': t['id'], 'slug': slugify(t['title']), 'source': 'existing', 'order': order,
                'title': clean(t['title']), 'name': '', 'meta': clean(t['summary']), 'summary': clean(t['summary']),
                'intro': [clean(t['summary'])], 'days': t['days'], 'weekend': False, 'plan': plan, 'stops': [],
                'tips': [clean(t['season'])] if t.get('season') else [], 'faqs': [], 'towns': towns, 'stay': stay,
                'hero_town': hero_town, 'theme': theme, 'best_for': '', 'group': g['id'], 'title_days': None,
            })
    return items


# ---------------------------------------------------------------- html

E = html.escape


def route(it):
    return f'{INDEX_ROUTE}/{it["slug"]}'


def file_of(it):
    return f'itinerary-{it["slug"]}.html'


def days_text(it):
    n = it['days']
    return f'{n} day' if n == 1 else f'{n} days'


def towns_text(it, cap=6):
    t = it['towns']
    if len(t) <= cap:
        return ', '.join(t)
    return ', '.join(t[:cap]) + f' and {len(t) - cap} more'


FONTS = '''<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://api.fontshare.com/v2/css?f[]=satoshi@700&display=swap" rel="stylesheet">
<link rel="icon" href="/prototype/brand/arctrips-icon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/prototype/_system.css">
<link rel="stylesheet" href="/prototype/_itinerary.css">'''

NAV = '''<span id="top" aria-hidden="true"></span>
<a class="skip" href="#main">Skip to content</a>
<nav class="top"><div class="wrap nav-in">
  <a class="brand" href="/"><img class="brand__mark" src="/prototype/brand/arctrips-mark-azure.svg" alt="" width="45" height="20"><span>ArcTrips</span></a>
  <ul class="nav-links"><li><a href="/destinations">Destinations</a></li><li><a href="/travel-guides" aria-current="page">Guides</a></li></ul>
  <form class="search" role="search" action="/search" method="get">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
    <label class="vh" for="q">Search</label>
    <input id="q" name="q" type="search" placeholder="Go to a place, a beach, a trail or a guide"><kbd>/</kbd>
  </form>
</div></nav>'''

FOOT = '''</main>
<footer class="f"><div class="wrap fbase">&copy; 2026 ArcTrips</div></footer>
<script src="/prototype/_nav.js"></script>'''


def placebar(crumb_tail, links):
    lis = ''.join(f'<li><a href="{h}">{E(t)}</a></li>' for h, t in links)
    return f'''<div class="placebar placebar--two" aria-label="Itineraries"><div class="wrap">
  <nav class="crumb placebar__crumb" aria-label="Breadcrumb">{crumb_tail}</nav>
  <nav class="placebar-in" aria-label="On this page"><ul class="placebar__links">{lis}</ul></nav>
</div></div><!-- /placebar -->'''


def hero_of(it):
    town = it['hero_town']
    if not town:
        return None
    return HERO_THEME.get((town, it['theme'])) or HERO.get(town)


def img_src(h, w=1200, hh=675):
    kind, ref, _ = h
    if kind == 'cld':
        return f'https://res.cloudinary.com/du9doarye/image/upload/f_auto,q_auto,c_fill,w_{w},h_{hh}/{ref}'
    return f'/prototype/media/{ref}'


def card(it, tag='h3', id_attr=True, aliases=()):
    themes = f'<span class="icard__tag">{E(it["theme"])}</span>' if it['theme'] else ''
    anchors = ''.join(f'<span class="anchor" id="{a}"></span>' for a in aliases)
    idp = f' id="{E(it["id"])}"' if id_attr else ''
    attrs = f' data-days="{bucket(it["days"])}" data-theme="{E(it["theme"] or "")}"'
    towns = towns_text(it, 4)
    return f'''<li class="icard"{idp}{attrs}>{anchors}
  <span class="icard__n"><b>{it["days"]}</b><small>{"day" if it["days"] == 1 else "days"}</small></span>
  <div class="icard__b">
    <{tag} class="icard__t"><a href="{route(it)}">{E(it["title"])}</a></{tag}>
    <p class="icard__s">{E(it["summary"])}</p>
    <p class="icard__m"><span>{E(towns)}</span>{themes}</p>
  </div>
</li>'''


def related(it, items):
    def score(o):
        s = 0
        if o['stay'] and o['stay'] == it['stay']:
            s += 4
        if set(o['towns']) & set(it['towns']):
            s += 2
        if o['days'] == it['days']:
            s += 3
        if o['theme'] and o['theme'] == it['theme']:
            s += 1
        return s
    others = [o for o in items if o is not it]
    others.sort(key=lambda o: (-score(o), abs(o['days'] - it['days']), o['order']))
    return others[:3]


def detail_page(it, items):
    title = f'{it["title"]} | ArcTrips'
    url = SITE + route(it)
    crumbs = [('British Columbia', '/destinations/canada/bc'), ('Itineraries', INDEX_ROUTE), (it['title'], None)]
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + (u if u else route(it))}
        for i, (n, u) in enumerate(crumbs)]}
    crumb = (f'<a href="/destinations/canada/bc">British Columbia</a><span class="sep" aria-hidden="true">/</span>'
             f'<a href="{INDEX_ROUTE}">Itineraries</a><span class="sep" aria-hidden="true">/</span>'
             f'<span aria-current="page">{E(it["title"])}</span>')
    links = [('#plan', 'The plan')]
    if it['stops']:
        links.append(('#stops', 'Recommended stops'))
    if it['tips']:
        links.append(('#tips', 'Tips'))
    if it['faqs']:
        links.append(('#faq', 'Questions'))
    links.append(('#stay', 'Find a stay'))
    hero = hero_of(it)
    fig = ''
    if hero:
        fig = f'''<figure class="wrap ifig"><div class="ifig__box"><img src="{img_src(hero)}" alt="{E(hero[2])}" width="1200" height="675" fetchpriority="high"></div></figure>'''
    length = 'Weekend, Friday to Sunday' if it['weekend'] else days_text(it)
    facts = [('Length', length), ('Towns', towns_text(it))]
    if it['best_for']:
        facts.append(('Best for', it['best_for']))
    facts_html = ''.join(f'<div><dt>{k}</dt><dd>{E(v)}</dd></div>' for k, v in facts if v)
    name = f'<p class="iname">{E(it["name"])}</p>' if it['name'] else ''
    intro = ''.join(f'<p>{E(p)}</p>' for p in it['intro'])

    steps = []
    for d in it['plan']:
        paras = ''.join(f'<p>{E(p)}</p>' for p in d['paras'])
        stops = ''
        if d['stops']:
            stops = '<ul class="tl__stops">' + ''.join(
                f'<li><b>{E(s["name"])}</b> {E(s["text"])}</li>' for s in d['stops']) + '</ul>'
        steps.append(f'<li class="tl__i"><h3>{E(d["heading"])}</h3>{paras}{stops}</li>')
    plan = f'<section class="isec" id="plan"><h2>The plan</h2><ol class="tl">{"".join(steps)}</ol></section>'

    stops = ''
    if it['stops']:
        lis = ''.join(f'<li><b>{E(s["name"])}</b><span>{E(s["text"])}</span></li>' if s['name']
                      else f'<li><span>{E(s["text"])}</span></li>' for s in it['stops'])
        stops = f'<section class="isec" id="stops"><h2>Recommended stops</h2><ul class="istops">{lis}</ul></section>'
    tips = ''
    if it['tips']:
        lis = ''.join(f'<li>{E(t)}</li>' for t in it['tips'])
        tips = f'<section class="isec" id="tips"><h2>Tips for this trip</h2><ul class="itips">{lis}</ul></section>'
    faq = ''
    if it['faqs']:
        ds = ''.join(
            f'<details class="faq"><summary>{E(f["q"])}</summary><div class="faq__a">'
            + ''.join(f'<p>{E(p)}</p>' for p in f['a']) + '</div></details>' for f in it['faqs'])
        faq = f'<section class="isec" id="faq"><h2>Frequently asked questions</h2>{ds}</section>'

    stay_town = it['stay']
    if stay_town:
        nm = stay_town.replace('-', ' ').title()
        href = f'https://arctrips.com/stays/canada/bc/{stay_town}'
        band_h, band_p = f'Stay in {nm}', f'Browse places to stay in {nm} for this trip.'
    else:
        href = 'https://arctrips.com/stays'
        band_h, band_p = 'Book your nights', 'Browse places to stay across British Columbia for this trip.'
    ghost = ''
    if it['theme'] == 'Fishing':
        ghost = '<a class="btn btn--ghost" href="https://arctrips.com/fishing">Browse fishing charters</a>'
    band = f'''<section class="iband" id="stay"><div class="wrap iband__in">
  <div><h2>{E(band_h)}</h2><p>{E(band_p)}</p></div>
  <div class="iband__go"><a class="btn btn--primary" href="{href}">Find a stay</a>{ghost}</div>
</div></section>'''
    rel = ''.join(card(o, 'h3', id_attr=False) for o in related(it, items))
    more = f'<section class="imore"><div class="wrap"><h2>More itineraries</h2><ul class="ilist">{rel}</ul><p class="imore__all"><a class="btn btn--ghost" href="{INDEX_ROUTE}">All itineraries</a></p></div></section>'

    return f'''<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(it["meta"])}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="article">
<meta property="og:title" content="{E(title)}">
<meta property="og:description" content="{E(it["meta"])}">
<meta property="og:url" content="{url}">
{FONTS}
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
{NAV}
{placebar(crumb, links)}
<main id="main">
<header class="ihead"><div class="wrap">
  <span class="label">Suggested itinerary</span>
  <h1>{E(it["title"])}</h1>
  {name}
  <dl class="ifacts">{facts_html}</dl>
</div></header>
{fig}
<article class="iart"><div class="wrap iart__in">
  <div class="iart__main">
    <div class="iintro">{intro}</div>
    {plan}
  </div>
  <aside class="iart__side" aria-label="Stops and tips">
    {stops}
    {tips}
  </aside>
  <div class="iart__faq">
    {faq}
  </div>
</div></article>
{band}
{more}
{FOOT}
</body>
</html>
'''


def index_page(items):
    # trips that appear in the length groups; themed doc trips sit in the interest section
    by_len = [i for i in items if not (i['source'] == 'doc' and i['theme'])]
    by_int = [i for i in items if i['source'] == 'doc' and i['theme']]
    alias = {}
    for g, tid in GROUP_ANCHOR.items():
        alias.setdefault(tid, []).append(g)
    for dup, tid in DUPLICATES.items():
        alias.setdefault(tid, []).append(dup)

    lens = sorted({bucket(i['days']) for i in items})
    themes = [t for t in THEME_ORDER if any(i['theme'] == t for i in items)]

    secs = []
    for b in lens:
        rows = [i for i in by_len if bucket(i['days']) == b]
        if not rows:
            continue
        lis = ''.join(card(i, 'h3', aliases=alias.get(i['id'], ())) for i in rows)
        secs.append(f'<section class="igroup" data-sec><h2>{bucket_label(b)}</h2><ul class="ilist">{lis}</ul></section>')
    lis = ''.join(card(i, 'h3', aliases=alias.get(i['id'], ())) for i in by_int)
    secs.append(f'<section class="igroup" data-sec><h2>By interest</h2><p class="igroup__d">Trips built around fishing, wildlife, hiking, food, wine, skiing, mountain biking, families, couples and outdoor adventure.</p><ul class="ilist">{lis}</ul></section>')

    def chip(group, val, label, on=False):
        return (f'<button type="button" class="ichip" data-group="{group}" data-val="{E(val)}" '
                f'aria-pressed="{"true" if on else "false"}">{E(label)}</button>')

    len_chips = chip('len', 'all', 'All lengths', True) + ''.join(chip('len', str(b), bucket_label(b)) for b in lens)
    th_chips = chip('theme', 'all', 'All interests', True) + ''.join(chip('theme', t, t) for t in themes)
    n = len(items)
    crumb = '<a href="/destinations/canada/bc">British Columbia</a><span class="sep" aria-hidden="true">/</span><span aria-current="page">Suggested itineraries</span>'
    links = [('#west-coast', 'Tofino and Ucluelet'), ('#whistler', 'Whistler'), ('#squamish', 'Squamish'),
             ('#squamish-whistler', 'Squamish and Whistler'), ('#south-island', 'Vancouver Island south'),
             ('#island-end-to-end', 'Vancouver Island end to end'), ('#island-mountain-biking', 'Vancouver Island mountain biking')]
    desc = (f'{n} suggested itineraries for British Columbia, from one day in Victoria to two weeks across the coast, '
            'mountains and wine country, with day by day plans, stops and tips.')
    url = SITE + INDEX_ROUTE
    ld = {'@context': 'https://schema.org', '@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'British Columbia', 'item': SITE + '/destinations/canada/bc'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Itineraries', 'item': url}]}
    script = '''<script>
(function(){
  var chips=[].slice.call(document.querySelectorAll('.ichip'));
  var cards=[].slice.call(document.querySelectorAll('.icard'));
  var secs=[].slice.call(document.querySelectorAll('[data-sec]'));
  var count=document.getElementById('icount'), empty=document.getElementById('iempty');
  var state={len:'all',theme:'all'};
  function apply(){
    var shown=0;
    cards.forEach(function(c){
      var ok=(state.len==='all'||c.getAttribute('data-days')===state.len)&&(state.theme==='all'||c.getAttribute('data-theme')===state.theme);
      c.hidden=!ok; if(ok) shown++;
    });
    secs.forEach(function(s){ s.hidden=!s.querySelector('.icard:not([hidden])'); });
    chips.forEach(function(b){ b.setAttribute('aria-pressed', state[b.getAttribute('data-group')]===b.getAttribute('data-val')?'true':'false'); });
    count.textContent='Showing '+shown+' of '+cards.length+' itineraries';
    empty.hidden=shown!==0;
  }
  chips.forEach(function(b){ b.addEventListener('click',function(){ state[b.getAttribute('data-group')]=b.getAttribute('data-val'); apply(); }); });
  var reset=document.getElementById('ireset');
  if(reset) reset.addEventListener('click',function(){ state={len:'all',theme:'all'}; apply(); });
  function reveal(){
    var id=decodeURIComponent(location.hash.slice(1)); if(!id) return;
    var t=document.getElementById(id); if(!t) return;
    var c=t.closest('.icard');
    if(c&&c.hidden){ state={len:'all',theme:'all'}; apply(); t.scrollIntoView(); }
  }
  window.addEventListener('hashchange',reveal);
  apply(); reveal();
})();
</script>'''
    return f'''<!doctype html>
<html lang="en-CA">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Suggested itineraries in British Columbia | ArcTrips</title>
<meta name="description" content="{E(desc)}">
<link rel="canonical" href="{url}">
<meta property="og:type" content="website">
<meta property="og:title" content="Suggested itineraries in British Columbia | ArcTrips">
<meta property="og:description" content="{E(desc)}">
<meta property="og:url" content="{url}">
{FONTS}
<script>document.documentElement.className+=' js';</script>
<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>
</head>
<body>
{NAV}
{placebar(crumb, links)}
<main id="main">
<header class="ihead"><div class="wrap">
  <span class="label">British Columbia</span>
  <h1>Suggested itineraries</h1>
  <p class="ilede">Day by day plans for {n} trips, from one day in a single town to two weeks across the coast, the mountains and wine country. Pick a length or an interest, then open a plan for the stops, the tips and the questions people ask.</p>
</div></header>
<section class="ifilters" aria-label="Filter itineraries"><div class="wrap">
  <div class="ifilters__row" role="group" aria-label="Length"><span class="ifilters__k">Length</span><div class="ifilters__c">{len_chips}</div></div>
  <div class="ifilters__row" role="group" aria-label="Interest"><span class="ifilters__k">Interest</span><div class="ifilters__c">{th_chips}</div></div>
  <p class="icount" id="icount" role="status" aria-live="polite">Showing {n} of {n} itineraries</p>
</div></section>
<div class="wrap iindex">
{"".join(secs)}
<div class="iempty" id="iempty" hidden><h2>No itineraries match</h2><p>Try a different length or interest.</p><button type="button" class="btn btn--ghost" id="ireset">Show all itineraries</button></div>
</div>
{FOOT}
{script}
</body>
</html>
'''


def main():
    args = sys.argv[1:]
    if args and args[0] == '--parse':
        parsed = parse(args[1])
        DATA.parent.mkdir(parents=True, exist_ok=True)
        DATA.write_text(json.dumps(parsed, indent=1, ensure_ascii=False) + '\n', encoding='utf-8')
        print(f'parsed {len(parsed)} itineraries -> {DATA.relative_to(ROOT)}')
    if not DATA.exists():
        sys.exit('missing ' + str(DATA) + '; run with --parse <path>')
    items = build_items()
    slugs = [i['slug'] for i in items]
    assert len(slugs) == len(set(slugs)), 'duplicate slugs'
    titles = [i['title'] for i in items]
    assert len(titles) == len(set(titles)), 'duplicate titles'
    metas = [i['meta'] for i in items]
    assert len(metas) == len(set(metas)), 'duplicate descriptions'
    for it in items:
        (OUT / file_of(it)).write_text(detail_page(it, items), encoding='utf-8')
    (OUT / 'itineraries.html').write_text(index_page(items), encoding='utf-8')
    print(f'wrote {len(items)} detail pages and the index')
    print('routes = {')
    print("  'itineraries.html': '" + INDEX_ROUTE + "',")
    for it in items:
        print(f"  '{file_of(it)}': '{route(it)}',")
    print('}')


if __name__ == '__main__':
    main()
