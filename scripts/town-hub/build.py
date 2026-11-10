import re, html, sys, json, os
from parse import parse, ROOT

MON = ["January","February","March","April","May","June","July","August","September","October","November","December"]
# Best months per subject, copied from the BC index data (DATA.bestMonths). Sitewide, not town specific.
BEST = {
  "hiking":[4,5,6,7,8,9,10], "mountain-biking":[5,6,7,8,9], "skiing":[12,1,2,3], "birding":[3,4,5,9,10,11],
  "kayaking":[5,6,7,8,9], "whale-watching":[3,4,5,6,7,8,9,10], "fishing":[5,6,7,8,9], "markets":[5,6,7,8,9],
  "landmarks":list(range(1,13)), "arts-history":list(range(1,13)), "parks":[4,5,6,7,8,9,10], "events":[3,4,5,6,7,8],
}

def esc(s): return html.escape(s, quote=True)
def strip_tags(s): return html.unescape(re.sub(r'<[^>]+>', '', s)).strip()
def norm(s): return re.sub(r'[^a-z0-9]+', ' ', strip_tags(s).lower()).strip()
def clean_name(n):
    n = strip_tags(n)
    return re.sub(r'^\d+\.\s*', '', n)

def window_text(months):
    on = set(months)
    if len(on) == 12: return 'All year'
    runs = []
    for m in range(1, 13):
        if m in on and (12 if m == 1 else m - 1) not in on:
            e = m
            while ((1 if e == 12 else e + 1) in on) and len(runs) < 12:
                e = 1 if e == 12 else e + 1
                if e == m: break
            runs.append((m, e))
    return ', and '.join(MON[a-1] if a == b else f'{MON[a-1]} to {MON[b-1]}' for a, b in runs)

# ---------- Whistler photographs: name pattern -> image (judged by looking at each picture) ----------
WHISTLER_PICS = [
  (r'peak 2 peak|gondola', 'image5.jpg', 'A child in a red gondola cabin with skis, mountains behind'),
  (r'whistler village', 'image6.jpg', 'Whistler Village in the evening, lit and snowy'),
  (r'snowmobil', 'image8.jpg', 'Snowmobiles crossing a snowy forest trail'),
  (r'ski or snowboard|learn to ski|ski school', 'image2.jpg', 'Four skiers on a ridge with the Black Tusk behind'),
  (r'whistler blackcomb', 'image12.jpg', 'Whistler and Blackcomb ski runs above the village at dusk'),
  (r'tubing|tube park|bubly', 'image10.jpg', 'Two people sliding on a snow tube'),
  (r'scandinave|spa', 'image9.jpg', 'Three people in an outdoor hot pool in the snow'),
  (r'audain', 'image33.jpg', 'The snowy approach to the Audain Art Museum'),
  (r"lil.?wat", 'image14.jpg', 'Carved cedar drums at the Squamish Lil’wat Cultural Centre'),
  (r'cross.country|nordic', 'image4.jpg', 'A cross-country skier in low sun'),
  (r'apr[eè]s|dining', 'image3.jpg', 'People around an outdoor fire after skiing'),
  (r'skating|ice skat', 'image7.jpg', 'Two people skating hand in hand on a frozen lake'),
  (r'snowshoe', 'image15.jpg', 'Snowshoers on a forest trail'),
  (r'bear', 'image17.jpg', 'A black bear among fireweed'),
  (r'lost lake', 'image19.jpg', 'A forested lake with a small island'),
  (r'cloudraker|skybridge', 'image20.jpg', 'The Cloudraker Skybridge across a rocky ridge'),
  (r'brewing|brewery|beer', 'image21.jpg', 'A flight of beer on a wooden paddle'),
  (r'valley trail', 'image23.jpg', 'Cyclists on the Valley Trail beside the lake'),
  (r'inukshuk', 'image24.jpg', 'The Whistler Inukshuk against the Black Tusk'),
  (r'olympic park|fat bik', 'image25.jpg', 'Fat bikers riding through snowy forest'),
  (r'peak to creek', 'image26.jpg', 'A skier in powder'),
  (r'sliding centre|bobsled|luge', 'image28.jpg', 'The lit ice track at the Whistler Sliding Centre'),
  (r'alexander falls', 'image29.jpg', 'A waterfall dropping through forest'),
  (r'blackcomb ascent|ascent trail', 'image30.jpg', 'Hikers beside an alpine lake below a glacier'),
  (r'wedgemount', 'image31.jpg', 'A turquoise lake below bare mountains'),
  (r'cheakamus', 'image32.jpg', 'A glassy lake with snow peaks behind'),
  (r'joffre', 'image34.jpg', 'A turquoise lake under a forested peak'),
  (r'ancient cedars', 'image35.jpg', 'A hiker passing giant cedars'),
]

CONFIG = {}
CONFIG['whistler'] = dict(
  name='Whistler', pics=WHISTLER_PICS,
  groups=[
    ('hiking', 'Hiking', ['best-easy-hikes-in-whistler','best-moderate-hikes-in-whistler','best-hard-hikes-in-whistler'], r'hik|trail|lake|garibaldi|wedgemount|train wreck|pass\b'),
    ('biking', 'Biking', ['bike-park-zones-in-whistler','can-beginners-bike-in-whistler','top-biking-events-in-whistler'], r'bik|crankworx|e-bike'),
    ('winter', 'Skiing and winter', ['whistler-blackcomb-the-main-ski-area','best-whistler-winter-activities','common-questions-about-whistler-in-winter'], r'ski|snowboard|winter|lift|blackcomb|mountain'),
    ('do', 'Things to do', ['best-things-to-do-in-whistler','what-to-do-in-whistler','best-whistler-summer-activities','world-known-landmarks','arts-history-cultural-attractions','outdoor-attractions','other-interesting-attractions'], r'summer|what can you do|best thing'),
    ('itineraries', 'Itineraries', ['two-day-whistler-itinerary','three-day-whistler-itinerary'], r'^$'),
  ],
  drop_sections=['what-to-do-in-squamish','squamish-vs-whistler-by-travel-style','two-day-squamish-and-whistler-itinerary','three-day-squamish-and-whistler-itinerary'],
  drop_faq=r'squamish', drop_ans=r'Squamish(?! (Nation|People|Lil|Longhouse))',
  faq_sections=['frequently-asked-questions','common-questions-about-whistler-in-winter'],
  why=['What is Whistler best known for?','Is Whistler worth visiting if you do not ski?'],
  when_rows=[('Hiking','hiking'),('Mountain biking','mountain-biking'),('Skiing and snowboarding','skiing')],
  when_faqs=['When is the best time to ski in Whistler?','When is the best time to bike in Whistler?','What is the best month to visit Whistler in summer?'],
  hero_from_why=True,
)
CONFIG['squamish'] = dict(
  name='Squamish', pics=None,
  groups=[
    ('hiking', 'Hiking', ['best-easy-hikes-in-squamish','best-moderate-hikes-in-squamish','best-hard-hikes-in-squamish'], r'hik|chief|trail|pass\b'),
    ('biking', 'Mountain biking', ['best-mountain-biking-areas-in-squamish','key-mountain-biking-events-in-squamish'], r'bik|downhill|ride'),
    ('do', 'Things to do', ['best-things-to-do-in-squamish','why-squamish-is-known-for-outdoor-sports'], r'without hiking|best thing|winter|day trip'),
    ('itineraries', 'Itineraries', ['two-day-squamish-itinerary'], r'^$'),
  ],
  drop_sections=[], drop_faq=r'^$',
  faq_sections=['frequently-asked-questions'],
  why=['What is Squamish best known for?','Is Squamish worth visiting?'],
  when_rows=[('Hiking','hiking'),('Mountain biking','mountain-biking')],
  when_faqs=['When is the best time to mountain bike in Squamish?'],
  hero_from_why=False,
)
CONFIG['vancouver'] = dict(
  name='Vancouver', pics=None,
  groups=[
    ('do', 'Things to do', ['world-known-landmarks','art-and-history-lovers','outdoor-attractions','other-interesting-places'], r'^$'),
    ('markets', 'Farmers markets', ['vancouver','burnaby','coquitlam','delta','richmond','new-westminster','north-vancouver','langley-fort-langley','white-rock-south-surrey','abbotsford','chilliwack','mission','maple-ridge','pitt-meadows','port-coquitlam','port-moody','surrey','west-vancouver','granville-island'], r'^$'),
  ],
  drop_sections=[], drop_faq=r'^$', faq_sections=[],
  why=[], when_rows=[('Landmarks and sights','landmarks'),('Art and history','arts-history'),('Farmers markets','markets')], when_faqs=[],
  hero_from_why=False,
)
CONFIG['nelson'] = dict(
  name='Nelson', pics=None,
  groups=[
    ('fishing', 'Fishing', ['best-places-to-fish-near-nelson'], r'^$'),
    ('biking', 'Mountain biking', ['best-for-beginners','best-for-technical-riders','best-for-scenic-rides'], r'^$'),
  ],
  drop_sections=[], drop_faq=r'^$', faq_sections=[],
  why=[], when_rows=[('Fishing','fishing'),('Mountain biking','mountain-biking')], when_faqs=[],
  hero_from_why=False,
)
CONFIG['victoria'] = dict(
  name='Victoria', pics=None,
  groups=[
    ('do', 'Things to do', ['world-known-landmarks','art-and-history-lovers','outdoor-attractions','other-interesting-places'], r'^$'),
    ('walking', 'Walks and hikes', ['best-scenic-walks-in-victoria','best-beaches-and-relaxed-coastal-walks','best-nature-walks-urban-gardens','best-nature-hikes-viewpoints','best-nature-walks-easy-park-trails','best-long-walks-multi-use-trails-near-victoria'], r'hik|walk'),
    ('birding', 'Birdwatching', ['best-places-for-birdwatching-in-victoria','common-birds-to-see-in-victoria','best-birdwatching-by-season'], r'bird|swan|eagle|hummingbird|binocular|lagoon'),
    ('water', 'On the water', ['best-places-to-kayak-in-victoria','best-whale-watching-tours-in-victoria'], r'^$'),
  ],
  drop_sections=[], drop_faq=r'^$',
  faq_sections=['frequently-asked-questions'],
  why=[], when_rows=[('Landmarks and sights','landmarks'),('Hiking and walking','hiking'),('Birdwatching','birding'),('Kayaking','kayaking'),('Whale watching','whale-watching')],
  when_faqs=[], when_sections=['best-time-to-visit-victoria','best-time-of-year-for-hiking-and-walking-in-victoria'],
  hero_from_why=False,
)
CONFIG['sooke'] = dict(
  name='Sooke', pics=None,
  groups=[
    ('parks', 'Parks and coast', ['top-natural-attractions-coastal-parks','hiking-walking-trail-adventures'], r'^$'),
    ('water', 'Wildlife and water', ['wildlife-marine-water-experiences'], r'^$'),
    ('culture', 'Culture and stays', ['culture-history-local-character','scenic-stays-day-trips-nearby-coastal-stops'], r'^$'),
    ('adventure', 'Golf and adventure', ['golf-adventure-activities'], r'^$'),
  ],
  drop_sections=[], drop_faq=r'^$', faq_sections=[],
  why=[], when_rows=[('Hiking and walking','hiking'),('Parks and coast','parks'),('Events and markets','events')], when_faqs=[],
  hero_from_why=False,
  derived_faqs=[('parks','What is East Sooke Regional Park known for?','East Sooke Regional Park'),
                ('parks','How long is Whiffin Spit?','Whiffin Spit'),
                ('parks','How long is the Galloping Goose Regional Trail?','Galloping Goose Regional Trail'),
                ('water','Can you go whale watching from Sooke?','Whale watching and wildlife tours'),
                ('culture','Is there a farmers market in Sooke?','Sooke Country Market'),
                ('adventure','Is there a zipline in Sooke?','Zipline at Sooke Hills')],
)
CONFIG['sidney'] = dict(
  name='Sidney', pics=None,
  groups=[('do', 'Things to do', ['sidney'], r'^$')],
  drop_sections=[], drop_faq=r'^$', faq_sections=[],
  why=[], when_rows=[('Parks and walks','parks'),('Landmarks and sights','landmarks'),('Whale watching','whale-watching')], when_faqs=[],
  hero_from_why=False,
)


import zipfile
DOCS = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'New Articles - 2026') + '/'
_doc = {}
def doc(name):
    if name not in _doc:
        x = zipfile.ZipFile(DOCS + name).read('word/document.xml').decode()
        out = []
        for p in re.findall(r'<w:p[ >].*?</w:p>', x, re.S):
            t = html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>', p))).strip()
            if t and not t.startswith('http'): out.append(t)
        _doc[name] = out
    return _doc[name]
def para(name, i): return doc(name)[i]
def sents(text, idx=None):
    ss = re.split(r'(?<=[.!?])\s+', text.strip())
    return ' '.join(ss if idx is None else [ss[k] for k in idx])
def P(text): return '<p>' + esc(text) + '</p>'

AT = 'Vancouver - Agent Trek.docx'; FM = 'Farmers Markets in Vancouver_.docx'
NB = 'Nelson.docx'; NF = 'Nelson - fishing.docx'; SD = 'Sidney.docx'; SK = 'Sooke.docx'
WT = 'Top Things to See and Do in Whistler.docx'
SQ = 'Squamish - Sports Capital.docx'; SQH = 'Best Hikes in Squamish.docx'; SQB = 'Mountain Biking in Squamish.docx'
VS = 'Scenic Spots in Victoria.docx'; VH = 'Hiking_Walking in Victoria.docx'; VK = 'Victoria - Kayaking.docx'; VW = 'Whale Watching Victoria.docx'

def L(best, ok=()): return {'best': list(best), 'ok': list(ok)}
ALL = list(range(1, 13))
R = lambda a, b: list(range(a, b + 1))

CONFIG['whistler'].update(
  why_src=[(WT, 243)], when_faqs=[],
  when_notes=[('Winter, December to February', WT, [200]), ('Spring, March to May', WT, [201]), ('Summer, June to August', WT, [202]), ('Fall, September to November', WT, [203])],
  rows=[('Hiking', L(R(6, 10))), ('Mountain biking', L(R(6, 9), [5, 10])), ('Skiing and snowboarding', L([1, 2, 3], [11, 12, 4]))],
  media='whistler')
CONFIG['squamish'].update(
  pics=[(r'stawamus chief', 'image2.jpg', 'The Stawamus Chief above the town and the Squamish River'),
        (r'railway', 'image10.jpg', 'Railway tracks running toward the mountains'),
        (r'sea to sky gondola$|ride the sea to sky gondola', 'image3.jpg', 'A gondola cabin above Howe Sound'),
        (r'gondola summit', 'image20.jpg', 'A red gondola cabin above snowy forest'),
        (r'sky pilot', 'image8.jpg', 'The Sky Pilot suspension bridge seen from above'),
        (r'howe sound viewpoints', 'image1.jpg', 'Howe Sound seen from a rocky viewpoint'),
        (r'^go mountain biking', 'image15.jpg', 'Three riders on a forest trail'),
        (r'downhill mountain biking', 'image21.jpg', 'A rider on a mossy forest trail'),
        (r'bald eagles', 'image11.jpg', 'Two bald eagles on a log in a river'),
        (r'britannia', 'image7.jpg', 'The Britannia Mine Museum building'),
        (r'alice lake', 'image5.jpg', 'Still water reflecting a forested shoreline'),
        (r'smoke bluffs', 'image12.jpg', 'A photographer on a viewpoint above Squamish'),
        (r'estuary', 'image6.jpg', 'The Squamish Estuary below the Chief'),
        (r'sea.to.sky highway', 'image9.jpg', 'The highway curving above Howe Sound'),
        (r'porteau', 'image14.jpg', 'A pier on Howe Sound with mountains behind'),
        (r'caf', 'image4.jpg', 'The main street of Squamish with a peak behind'),
        (r'shannon falls', 'image13.jpg', 'Shannon Falls dropping through autumn forest'),
        (r'kiteboarding|windsurf', 'image17.jpg', 'Kiteboarders and windsurfers on Howe Sound'),
        (r'rock climbing', 'image19.jpg', 'A climber on a granite face'),
        (r'rafting', 'image31.jpg', 'A river running through a rocky canyon'),
        (r'skiing and winter', 'image20.jpg', 'A red gondola cabin above snowy forest')],
  media='squamish',
  why_src=[(SQ, 1)],
  when_notes=[('Hiking, April to October', SQH, [7]), ('Mountain biking, spring through fall', SQB, [23, 24])],
  when_faqs=[],
  rows=[('Hiking', L(R(4, 10))), ('Mountain biking', L(R(4, 10), [3, 11]))],
  borrow='whistler', borrow_faq_sections=['frequently-asked-questions', 'squamish-vs-whistler-by-travel-style'], borrow_filter=r'squamish',
  borrow_itin=['two-day-squamish-and-whistler-itinerary', 'three-day-squamish-and-whistler-itinerary'])
CONFIG['squamish']['groups'][3] = ('itineraries', 'Itineraries', ['two-day-squamish-itinerary', 'two-day-squamish-and-whistler-itinerary', 'three-day-squamish-and-whistler-itinerary'], r'^$')
CONFIG['vancouver'].update(
  why_src=[(AT, 1), (FM, 1)], nophoto_groups=['markets'],
  when_notes=[('Farmers markets', FM, [3])],
  rows=[('Farmers markets', L([6, 7, 8], [3, 4, 5, 9, 10]))],
  src_faqs=[('do', 'What is Vancouver known for?', AT, 1, [0]),
            ('markets', 'When are the farmers markets open?', FM, 3, [0, 1]),
            ('markets', 'Are there farmers markets outside Vancouver?', FM, 2, [1])])
CONFIG['nelson'].update(
  pics=[(r'giveout|morning mountain', 'image8.jpg', 'Two riders on a forest trail'),
        (r'svoboda', 'image13.jpg', 'A rider on a wooden trail feature in the forest'),
        (r'north shore', 'image3.jpg', 'A rider among large cedars'),
        (r'baldface', 'image7.jpg', 'Riders resting above Kootenay Lake')],
  media='nelson',
  why_src=[(NB, 1), (NF, 1)],
  when_notes=[('Mountain biking, late spring through fall', NB, [26, 27]), ('Fishing, all year', NF, [30, 31, 32, 33, 34])],
  rows=[('Mountain biking', L([7, 8], [5, 6, 9, 10])), ('Fishing', L(ALL))],
  src_faqs=[('fishing', 'What is Nelson known for fishing?', NF, 1, [1]),
            ('fishing', 'Can you fish in Nelson in winter?', NF, 34, None),
            ('biking', 'When is the mountain biking season in Nelson?', NB, 26, [0])])
CONFIG['victoria'].update(
  pics=[(r'butchart', 'image30.jpg', 'Paths through the Sunken Garden at The Butchart Gardens'),
        (r'inner harbour', 'image61.jpg', 'A floatplane taking off in the Inner Harbour'),
        (r'parliament', 'image20.jpg', 'The British Columbia Parliament Buildings behind tulips'),
        (r"fisherman", 'image25.jpg', "Floating buildings at Fisherman's Wharf"),
        (r'chinatown', 'image31.jpg', "The red gate at the entrance to Victoria's Chinatown"),
        (r'government house', 'image24.jpg', 'Flower beds in front of Government House'),
        (r'bastion|market square', 'image27.jpg', 'A pedestrian street with tall flower sculptures'),
        (r'royal bc museum', 'image21.jpg', 'The Royal BC Museum frontage'),
        (r'carr house', 'image29.jpg', 'A yellow Victorian house with a garden'),
        (r'hatley', 'image37.jpg', 'Hatley Castle behind spring flower beds'),
        (r'abkhazi', 'image28.jpg', 'Rock garden and flowering trees'),
        (r'dallas road beach|dallas road waterfront$', 'image23.jpg', 'Driftwood on a pebble beach'),
        (r'mount tolmie', 'image19.jpg', 'Mount Tolmie rising above the neighbourhoods'),
        (r'clover point', 'image26.jpg', 'A paved path along the shore at Clover Point'),
        (r'ogden point', 'image22.jpg', 'The Ogden Point breakwater in low sun'),
        (r'save-on-foods', 'image18.jpg', 'The Save-On-Foods Memorial Centre entrance'),
        (r'scenic marine route', 'image15.jpg', 'A yellow tour boat at dusk'),
        (r'whale watching$', 'image7.jpg', 'A whale watching boat at speed'),
        (r'top-rated tour', 'image16.jpg', 'A tour catamaran on open water'),
        (r'goldstream', 'image41.jpg', 'A boardwalk through old forest'),
        (r'beacon hill', 'image36.jpg', 'Ducks on lawn under cherry blossom'),
        (r'cattle point', 'image44.jpg', 'Rocky shore with driftwood at low tide'),
        (r"witty", 'image54.jpg', 'Forest edge on a still lagoon'),
        (r'esquimalt lagoon', 'image48.jpg', 'Trees along the edge of Esquimalt Lagoon'),
        (r'high rock', 'image49.jpg', 'A bare rock outlook with a lone tree'),
        (r'willows beach', 'image63.jpg', 'Mount Baker across the water from Willows Beach'),
        (r'gorge waterway', 'image52.jpg', 'Autumn trees on the Gorge Waterway'),
        (r'seabirds', 'image13.jpg', 'Gulls flying over the water'),
        (r'fisgard|fort rodd', 'image38.jpg', 'Fisgard Lighthouse on its rocky point')],
  media='victoria',
  why_src=[(VS, 1), (VH, 1)],
  when_notes=[('Kayaking, May to September', VK, [20, 21]), ('Whale watching, April to October', VW, [4])],
  rows=[('Hiking and walking', L(ALL)), ('Kayaking', L(R(5, 9), [4, 10])), ('Whale watching', L(R(4, 10))), ('Birdwatching', L([3, 4, 5, 12, 1, 2]))],
  when_faqs=[])
CONFIG['sooke'].update(
  why_src=[(SK, 1), (SK, 2)],
  when_notes=[('Year-round, busiest May to September', SK, [3])],
  rows=[('Visiting Sooke', L(R(5, 9), [1, 2, 3, 4, 10, 11, 12]))],
  src_faqs=[('parks', 'When is the best time to visit Sooke?', SK, 3, [1])])
CONFIG['sidney'].update(
  why_src=[(SD, 2), (SD, 3)],
  when_notes=[('Spring through early fall', SD, [4])],
  rows=[('Waterfront, parks and outdoors', L(R(3, 10)))],
  src_faqs=[('do', 'When is the best time to visit Sidney?', SD, 4, [0, 1]),
            ('do', 'What is Sidney known for?', SD, 2, [1]),
            ('do', 'What is there to do around Sidney?', SD, 3, [0])])

CSS = '''
/* town hub: why go, when to go, and one activity at a time */
.hwhy,.hwhen,.hdo{padding-block:clamp(40px,5vw,72px)}
.hwhen{background:var(--n50);border-block:1px solid var(--n150)}
.hlead{display:grid;gap:14px;max-width:68ch;margin-top:6px}
.hlead p{color:var(--n700);font-size:1.08rem;line-height:1.7}
.hstart{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(14px,2vw,24px);margin-top:clamp(26px,3vw,38px)}
@media(max-width:860px){.hstart{grid-template-columns:1fr}}
.hstart a{display:block;color:inherit;text-decoration:none}
.hstart figure{margin:0;border-radius:var(--r);overflow:hidden;aspect-ratio:16/10;background:var(--n100)}
.hstart img{width:100%;height:100%;object-fit:cover;transition:transform .6s var(--ease)}
.hstart a:hover img{transform:scale(1.035)}
.hstart h3{font-size:1.14rem;margin-top:14px}
.hstart p{color:var(--n600);font-size:.95rem;line-height:1.6;margin-top:6px}
.hstart .k{font-size:.72rem;font-weight:700;letter-spacing:.13em;text-transform:uppercase;color:var(--n600)}
.mband{border:1px solid var(--n150);border-radius:var(--r);padding:clamp(18px,2.4vw,28px);margin-top:clamp(22px,2.6vw,30px);background:var(--paper)}
.mrow{display:grid;grid-template-columns:minmax(150px,1fr) minmax(260px,1.7fr) minmax(0,1fr);gap:clamp(12px,2vw,24px);align-items:center;padding-block:14px;border-top:1px solid var(--n150)}
.mrow:first-child{border-top:0;padding-top:0}
@media(max-width:900px){.mrow{grid-template-columns:1fr;gap:8px;padding-block:16px}}
.mrow__n{font-weight:700;color:var(--navy);font-size:1.02rem}
.mrow__w{color:var(--n600);font-size:.92rem}
.mcells{display:flex;gap:3px}
.mcells span{flex:1;min-width:0;height:30px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm);font-size:.8rem;font-weight:700;background:var(--n50);color:var(--n600);box-shadow:inset 0 0 0 1px var(--n150)}
.mcells span[data-on="1"]{background:var(--a250);color:var(--navy);box-shadow:none}
.mcells span[data-on="2"]{background:var(--azure);color:var(--paper);box-shadow:none}
.mkey{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin-top:16px;padding-top:14px;border-top:1px solid var(--n150);font-size:.86rem;color:var(--n600);font-weight:600}
.mkey i{width:14px;height:14px;border-radius:4px;display:inline-block;background:var(--n50);border:1px solid var(--n200)}
.mkey i[data-on="2"]{background:var(--azure);border-color:var(--azure)}
.mkey i[data-on="1"]{background:var(--a250);border-color:var(--a250)}
.hnotes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:clamp(18px,2.4vw,30px);margin-top:clamp(26px,3vw,38px)}
.hnote{border-top:2px solid var(--a300);padding-top:14px}
.hnote h3{font-size:1.04rem}
.hnote p{color:var(--n600);font-size:.95rem;line-height:1.6;margin-top:8px}
.acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:clamp(20px,2.4vw,28px);padding-bottom:16px;border-bottom:1px solid var(--n150)}
.acts button{font:inherit;font-weight:600;font-size:.95rem;color:var(--navy);background:var(--paper);border:1px solid var(--n200);border-radius:999px;min-height:44px;padding:8px 18px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:background .15s,border-color .15s,color .15s}
.acts button:hover{border-color:var(--navy)}
.acts button[aria-selected="true"]{background:var(--navy);border-color:var(--navy);color:var(--paper)}
.acts button:disabled{opacity:.5;cursor:not-allowed}
.acts .ct{font-size:.82rem;font-weight:700;opacity:.7}
.hpanel{padding-top:clamp(24px,3vw,36px)}
.hpanel[hidden]{display:none}
.hpanel__h{font-size:clamp(1.5rem,2.6vw,2rem);letter-spacing:-.03em}
.hsub{margin-top:clamp(22px,2.8vw,34px)}
.hsub>h4{font-size:1.02rem;color:var(--navy);padding-bottom:10px;border-bottom:1px solid var(--n150);display:flex;justify-content:space-between;gap:12px}
.hsub>h4 span{font-weight:600;color:var(--n600);font-size:.9rem}
.hgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:clamp(22px,2.6vw,34px) clamp(18px,2.2vw,28px);margin-top:20px}
.hc{display:flex;flex-direction:column;min-width:0}
.hc[hidden]{display:none}
.hc__m{margin:0 0 14px;border-radius:var(--r);overflow:hidden;aspect-ratio:4/3;background:var(--n100)}
.hc__m img{width:100%;height:100%;object-fit:cover}
.hc--t{border-top:2px solid var(--a300);padding-top:14px}
.hc h3{font-size:1.14rem;letter-spacing:-.02em;margin-bottom:8px}
.hc .pl__b p{font-size:.96rem;line-height:1.62;margin-bottom:10px;max-width:none}
.hc .pl__n{margin-top:10px;padding:10px 14px;font-size:.9rem}
.hmore{margin-top:20px}
.hmore button{font:inherit;font-weight:600;font-size:.92rem;color:var(--azure);background:none;border:1px solid var(--n200);border-radius:999px;min-height:44px;padding:8px 20px;cursor:pointer}
.hmore button:hover{border-color:var(--azure)}
.hqs{margin-top:clamp(28px,3.4vw,44px)}
.hqs>h4{font-size:1.02rem;color:var(--navy);padding-bottom:10px;border-bottom:1px solid var(--n150)}
.hq{border-bottom:1px solid var(--n150)}
.hq summary{cursor:pointer;list-style:none;padding:16px 28px 16px 0;font-weight:700;color:var(--navy);position:relative;min-height:44px}
.hq summary::-webkit-details-marker{display:none}
.hq summary::after{content:"+";position:absolute;right:4px;top:14px;font-size:1.3rem;font-weight:500;color:var(--azure)}
.hq[open] summary::after{content:"\\2212"}
.hq .hq__a{padding:0 0 18px;max-width:70ch}
.hq .hq__a p{color:var(--n700);line-height:1.65;margin-top:8px}
.hq .hq__a p:first-child{margin-top:0}
'''

JS = '''
(function(){
  var tabs=[].slice.call(document.querySelectorAll('.acts button[data-g]'));
  var panels=[].slice.call(document.querySelectorAll('.hpanel'));
  if(!tabs.length) return;
  function show(g,push){
    tabs.forEach(function(t){var on=t.dataset.g===g;t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;});
    panels.forEach(function(p){p.hidden=p.dataset.g!==g;});
    if(push&&history.replaceState)history.replaceState(null,'','#'+g);
  }
  tabs.forEach(function(t,i){
    t.addEventListener('click',function(){show(t.dataset.g,true);});
    t.addEventListener('keydown',function(e){
      var n=e.key==='ArrowRight'?i+1:e.key==='ArrowLeft'?i-1:-1; if(n<0)return;
      n=(n+tabs.length)%tabs.length; tabs[n].focus(); show(tabs[n].dataset.g,true); e.preventDefault();
    });
  });
  var h=(location.hash||'').slice(1);
  show(tabs.some(function(t){return t.dataset.g===h;})?h:tabs[0].dataset.g,false);
  /* a long list shows its first six, then the rest on request */
  document.querySelectorAll('.hgrid').forEach(function(g){
    var cs=[].slice.call(g.children), cap=innerWidth<700?3:6; if(cs.length<=cap+1) return;
    cs.slice(cap).forEach(function(c){c.hidden=true;});
    var w=document.createElement('div'); w.className='hmore';
    var b=document.createElement('button'); b.type='button'; b.textContent='Show all '+cs.length;
    b.addEventListener('click',function(){cs.forEach(function(c){c.hidden=false;});w.remove();});
    w.appendChild(b); g.parentNode.insertBefore(w,g.nextSibling);
  });
})();
'''

MEDIA = ['whistler']
USED_TEXT = set()
def card(it, pics, nophoto=False):
    name = clean_name(it['name'])
    body = re.sub(r'<p>(.*?)</p>', lambda m: '' if norm(m.group(1)) in USED_TEXT else m.group(0), it['body'], flags=re.S)
    img = it.get('img')
    if nophoto:
        img = None; alt = ''
    elif pics is not None:
        img = None; alt = ''
        for pat, f, a in pics:
            if re.search(pat, name, re.I):
                img = '/prototype/media/' + MEDIA[0] + '/' + f; alt = a; break
    else:
        alt = (it.get('alt') or name)
    if img:
        return f'<article class="hc"><figure class="hc__m"><img loading="lazy" src="{img}" alt="{esc(alt)}"></figure><div class="pl__b"><h3>{esc(name)}</h3>{body}</div></article>'
    return f'<article class="hc hc--t"><div class="pl__b"><h3>{esc(name)}</h3>{body}</div></article>'

def build(town):
    cfg = CONFIG[town]
    MEDIA[0] = cfg.get('media', town)
    USED_TEXT.clear()
    for dn, pi in cfg.get('why_src', []): USED_TEXT.add(norm(html.escape(para(dn, pi), quote=False)))
    for _t, dn, idxs in cfg.get('when_notes', []):
        for i_ in idxs: USED_TEXT.add(norm(html.escape(para(dn, i_), quote=False)))
    s, secs = parse(town)
    by = {x['id']: x for x in secs}
    def normalize(secs_):
        for x in secs_:
            for it in x['items']:
                raw = it['raw']
                m = re.search(r'<div class="pl__b">(.*?)</div>\s*</article>', raw, re.S)
                inner = m.group(1) if m else ''
                inner = re.sub(r'<h3>.*?</h3>', '', inner, flags=re.S).strip()
                it['body'] = re.sub(r'\n\s*\n', '\n', inner)
                h = re.search(r'<h3[^>]*>(.*?)</h3>', raw, re.S)
                it['name'] = h.group(1) if h else (it.get('q') or '')
                a_ = re.search(r'<img[^>]*alt="([^"]*)"', raw)
                it['alt'] = html.unescape(re.sub(r'^\d+\.\s*', '', a_.group(1))) if a_ else ''
                it['isq'] = strip_tags(it['name']).endswith('?') and (x['id'] in cfg['faq_sections'] + cfg.get('borrow_faq_sections', []))
    normalize(secs)
    bor = cfg.get('borrow')
    borrowed_faqs = []
    if bor:
        _, secs2 = parse(bor)
        normalize(secs2)
        b2 = {x['id']: x for x in secs2}
        for sid in cfg['borrow_faq_sections']:
            for it in b2.get(sid, {'items': []})['items']:
                q = strip_tags(it['name'])
                if sid == 'squamish-vs-whistler-by-travel-style' or re.search(cfg['borrow_filter'], q, re.I):
                    borrowed_faqs.append({'q': q, 'a': it['body']})
        for sid in cfg['borrow_itin']:
            by[sid] = b2[sid]
    # collect faqs
    faqs = []
    seen = set()
    for sid in cfg['faq_sections']:
        for it in by.get(sid, {'items': []})['items']:
            q = strip_tags(it['name'])
            if re.search(cfg['drop_faq'], q, re.I) or (cfg.get('drop_ans') and re.search(cfg['drop_ans'], strip_tags(it['body']))) or norm(q) in seen: continue
            seen.add(norm(q)); faqs.append({'q': q, 'a': it['body']})
    for f in borrowed_faqs:
        if norm(f['q']) not in seen:
            seen.add(norm(f['q'])); faqs.append(f)
    # why / when answers lifted from the faq list
    why = []; whenq = []
    for q in cfg['why']:
        for f in faqs:
            if norm(f['q']) == norm(q): why.append(f); break
    for q in cfg['when_faqs']:
        for f in faqs:
            if norm(f['q']) == norm(q): whenq.append(f); break
    used = set(norm(f['q']) for f in why + whenq)
    faqs = [f for f in faqs if norm(f['q']) not in used]
    groups = []
    assigned = set()
    for key, label, sids, kw in cfg['groups']:
        groups.append({'key': key, 'label': label, 'sids': sids, 'kw': kw, 'faqs': []})
    # faq to group by keyword, first match wins; leftovers become Planning
    plan = []
    for f in faqs:
        for g in groups:
            if g['kw'] != r'^$' and re.search(g['kw'], f['q'], re.I):
                g['faqs'].append(f); break
        else:
            plan.append(f)
    # a page with no questions in its source: each answer is the first sentence of that place's own text
    for gk, q, pname in cfg.get('derived_faqs', []):
        for x in secs:
            for it in x['items']:
                if clean_name(it['name']) == pname:
                    p = re.search(r'<p>(.*?)</p>', it['body'], re.S)
                    first = re.split(r'(?<=[.!?])\s', strip_tags(p.group(1)))[0]
                    for g in groups:
                        if g['key'] == gk: g['faqs'].append({'q': q, 'a': '<p>' + esc(first) + '</p>'})
                    break
            else:
                continue
            break
    for gk, q, dn, pi, idx in cfg.get('src_faqs', []):
        for g in groups:
            if g['key'] == gk: g['faqs'].append({'q': q, 'a': P(sents(para(dn, pi), idx))})
    # build panels
    panels = []; tabs = []
    all_groups = groups[:]
    if plan:
        all_groups.append({'key': 'plan', 'label': 'Planning your visit', 'sids': [], 'kw': '', 'faqs': plan})
    first_cards = []
    for g in all_groups:
        subs = []; count = 0
        seen_names = set()
        for sid in g['sids']:
            x = by.get(sid)
            if not x: continue
            cards = []
            for it in x['items']:
                if it['isq']: continue
                nm = norm(clean_name(it['name']))
                if nm in seen_names: continue
                seen_names.add(nm)
                cards.append(card(it, cfg['pics'], g['key'] in cfg.get('nophoto_groups', [])))
                count += 1
                pic = None
                if g['key'] not in cfg.get('nophoto_groups', []):
                    if cfg['pics'] is None: pic = it.get('img')
                    else:
                        for pat, f, a_ in cfg['pics']:
                            if re.search(pat, clean_name(it['name']), re.I): pic = '/prototype/media/' + MEDIA[0] + '/' + f; it['alt'] = a_; break
                if pic and len(first_cards) < 3 and g['key'] in ('do', 'hiking', 'water', 'parks', 'fishing', 'walking', 'biking') and it['body'] and all(pic != c['_pic'] for c in first_cards):
                    it['_pic'] = pic; first_cards.append(it)
            if not cards: continue
            title = strip_tags(x['title'])
            title = re.sub(r'\s+in ' + re.escape(cfg['name']) + r'$', '', title)
            title = re.sub(r'\s+near ' + re.escape(cfg['name']) + r'$', '', title)
            subs.append((title, cards))
        if not subs and not g['faqs']: continue
        h = [f'<div class="hpanel" role="tabpanel" id="panel-{g["key"]}" aria-labelledby="tab-{g["key"]}" data-g="{g["key"]}">',
             f'<h3 class="hpanel__h">{esc(g["label"])} in {esc(cfg["name"])}</h3>']
        for title, cards in subs:
            head = f'<h4>{esc(title)}<span>{len(cards)}</span></h4>' if (len(subs) > 1) else ''
            h.append(f'<div class="hsub">{head}<div class="hgrid">{"".join(cards)}</div></div>')
        if g['faqs']:
            h.append(f'<div class="hqs"><h4>Questions about {esc(g["label"].lower())}</h4>')
            for f in g['faqs']:
                h.append(f'<details class="hq"><summary>{esc(f["q"])}</summary><div class="hq__a">{f["a"]}</div></details>')
            h.append('</div>')
        h.append('</div>')
        panels.append('\n'.join(h))
        tabs.append(f'<button type="button" role="tab" id="tab-{g["key"]}" aria-controls="panel-{g["key"]}" aria-selected="false" data-g="{g["key"]}">{esc(g["label"])}<span class="ct">{count or len(g["faqs"])}</span></button>')
    # why go
    wh = ['<section class="hwhy" id="why"><div class="wrap">',
          '<div class="head"><div><span class="label label--n">Why go</span>',
          f'<h2 style="margin-top:11px">Why go to {esc(cfg["name"])}</h2></div></div>']
    body_why = why[1:] if (cfg.get('hero_from_why') and why) else why
    lead = ''.join(f['a'] for f in body_why) + ''.join(P(para(dn, pi)) for dn, pi in cfg.get('why_src', []))
    if lead:
        wh.append('<div class="hlead">' + lead + '</div>')
    if first_cards:
        wh.append('<div class="hstart">')
        for it in first_cards[:3]:
            nm = clean_name(it['name'])
            p = re.search(r'<p>(.*?)</p>', it['body'], re.S)
            first = strip_tags(p.group(1)) if p else ''
            first = re.split(r'(?<=[.!?])\s', first)[0]
            wh.append(f'<a href="#do"><figure><img loading="lazy" src="{it["_pic"]}" alt="{esc(it["alt"] or nm)}"></figure><h3>{esc(nm)}</h3><p>{esc(first)}</p></a>')
        wh.append('</div>')
    wh.append('</div></section>')
    # when to go
    rows = []
    for label, lv in cfg['rows']:
        cells = ''.join(f'<span{(" data-on=\"2\"" if i+1 in lv["best"] else (" data-on=\"1\"" if i+1 in lv["ok"] else ""))}>{MON[i][0]}</span>' for i in range(12))
        cap = window_text(lv['best']) if len(lv['best']) < 12 else 'All year'
        rows.append(f'<div class="mrow"><span class="mrow__n">{esc(label)}</span><div class="mcells" role="img" aria-label="{esc(label)}: best {esc(cap)}">{cells}</div><p class="mrow__w">Best: {esc(cap)}</p></div>')
    notes = []
    for f in whenq:
        notes.append(f'<div class="hnote"><h3>{esc(f["q"])}</h3>{f["a"]}</div>')
    for title, dn, idxs in cfg.get('when_notes', []):
        notes.append(f'<div class="hnote"><h3>{esc(title)}</h3>' + ''.join(P(para(dn, i)) for i in idxs) + '</div>')
    for sid in cfg.get('when_sections', []):
        for it in by.get(sid, {'items': []})['items']:
            notes.append(f'<div class="hnote"><h3>{esc(clean_name(it["name"]))}</h3>{it["body"]}</div>')
    wn = ['<section class="hwhen" id="when"><div class="wrap">',
          '<div class="head"><div><span class="label label--n">When to go</span>',
          f'<h2 style="margin-top:11px">When to go to {esc(cfg["name"])}</h2>',
          '<p>The months each activity is at its best.</p></div></div>',
          '<div class="mband">' + ''.join(rows) + '<p class="mkey"><i data-on="2"></i>Best months<i data-on="1"></i>Also possible<i></i>Not the time</p></div>']
    if notes:
        wn.append('<div class="hnotes">' + ''.join(notes) + '</div>')
    wn.append('</div></section>')
    # do
    do = ['<section class="hdo" id="do"><div class="wrap">',
          '<div class="head"><div><span class="label label--n">Things to do</span>',
          f'<h2 style="margin-top:11px">What to do in {esc(cfg["name"])}</h2>',
          '<p>Pick what you came for. Each tab holds its places and the questions people ask about it.</p></div></div>',
          f'<div class="acts" role="tablist" aria-label="Activities in {esc(cfg["name"])}">' + ''.join(tabs) + '</div>',
          '\n'.join(panels), '</div></section>']
    # hero paragraph
    hero = s[s.index('<header class="thero">'):s.index('</header>') + 9]
    if cfg.get('hero_from_why') and why:
        first = strip_tags(re.search(r'<p>(.*?)</p>', why[0]['a'], re.S).group(1))
        hero = re.sub(r'(<h1>.*?</h1>\s*)<p>.*?</p>', lambda m: m.group(1) + '<p>' + esc(first) + '</p>', hero, flags=re.S)
    hero = hero.replace('<dt>Guides</dt>', '<dt>Travel guides</dt>')
    head = s[:s.index('<main id="main">')]
    head = re.sub(r'<ul class="placebar__links">.*?</ul>', '<ul class="placebar__links"><li><a href="#top" aria-current="page">Overview</a></li><li><a href="#why">Why go</a></li><li><a href="#when">When to go</a></li><li><a href="#do">Things to do</a></li></ul>', head, flags=re.S)
    crumb = s[s.index('<main id="main">'):s.index('<header class="thero">')]
    tail = s[s.index('<section class="sec" style="padding-top:0"><div class="wrap">\n  <h2>Keep going</h2>'):]
    # drop the repeated British Columbia sibling
    tail = re.sub(r'(<a class="sib" href="/"><span class="sib__n">British Columbia</span><span class="sib__m">All the towns</span></a>\s*)(<a class="sib" href="/search[^"]*">.*?</a>\s*)<a class="sib" href="/"><span class="sib__n">British Columbia</span><span class="sib__m">Every town we cover</span></a>\s*', r'\1\2', tail, flags=re.S)
    head = head.replace('</style>', CSS + '</style>', 1)
    tail = tail.replace('<script src="/prototype/_nav.js"></script>', '<script>' + JS + '</script>\n<script src="/prototype/_nav.js"></script>', 1)
    out = head + crumb + hero + '\n' + '\n'.join(wh) + '\n' + '\n'.join(wn) + '\n' + '\n'.join(do) + '\n' + tail
    # labels fixed after the pre-hub pages were saved: Places featured, no photograph count
    out = re.sub(r'<div><dt>With photographs</dt><dd class="tnum">\d+</dd></div>\s*', '', out)
    out = out.replace('<dt>Places written up</dt>', '<dt>Places featured</dt>')
    out = re.sub(r'(\d+) places written up, \d+ with photographs\.', r'\1 places featured.', out)
    # a paragraph already quoted in Why go, When to go or a question is not repeated on a place card
    out = re.sub(r'\s*\u2014\s*', ', ', out)           # no em dashes in copy
    out = re.sub(r'(?<=[\w)])\s*\u2013\s*(?=[\w(])', ' to ', out)   # ranges read "May to September"
    return out, dict(groups=[(g['label'], len(g['faqs'])) for g in all_groups], why=len(why), whenq=len(whenq), faqs=len(faqs))

if __name__ == '__main__':
    apply = '--apply' in sys.argv
    for t in [a for a in sys.argv[1:] if not a.startswith('--')]:
        out, info = build(t)
        print(t, info, len(out))
        if apply:
            open(ROOT + t + '.html', 'w').write(out)
