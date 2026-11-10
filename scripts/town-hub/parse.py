import re, json, os, html
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, '..', '..', 'design', 'prototype') + '/'
ORIG = os.environ.get('TOWN_HUB_ORIG', 'orig/')

SEC = re.compile(r'<section class="sec" id="([^"]+)"><div class="wrap">\s*<div class="sechead"><h2>(.*?)</h2><p class="cnt">(.*?)</p></div>\s*<div class="places">(.*?)</section>', re.S)

def parse(town):
    s = open(ORIG + town + '.html').read()
    out = []
    for m in SEC.finditer(s):
        sid, title, cnt, body = m.groups()
        items = []
        for a in re.split(r'(?=<article class="pl)', body):
            if not a.startswith('<article'):
                continue
            solo = 'pl--solo' in a.split('>')[0]
            if solo:
                q = re.search(r'<h3 class="solo__h">(.*?)</h3>', a, re.S).group(1)
                ans = re.search(r'<div class="pl__b">(.*?)</div>', a, re.S).group(1)
                items.append({'kind': 'faq', 'q': q, 'a': ans.strip(), 'raw': a, 'img': None})
            else:
                img = re.search(r'<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"', a)
                h3 = re.search(r'<h3>(.*?)</h3>', a, re.S)
                bd = re.search(r'<div class="pl__b">(.*?)</div>\s*</article>', a, re.S)
                items.append({'kind': 'place', 'name': h3.group(1) if h3 else '', 'img': img.group(1) if img else None,
                              'html': (bd.group(1) if bd else ''), 'raw': a})
        out.append({'id': sid, 'title': title, 'cnt': cnt, 'items': items})
    return s, out

if __name__ == '__main__':
    import sys
    for t in sys.argv[1:]:
        s, secs = parse(t)
        tot = sum(len(x['items']) for x in secs)
        print('==', t, len(secs), 'sections', tot, 'items')
        for x in secs:
            kinds = set(i['kind'] for i in x['items'])
            print('  ', x['id'], '|', html.unescape(x['title']), '|', x['cnt'], '|', kinds, len(x['items']))
