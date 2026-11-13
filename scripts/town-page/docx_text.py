# usage: python3 -I docx_text.py "<path to .docx>"  -> prints paragraphs with style and index
import zipfile,re,html,sys
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode()
for i,p in enumerate(re.findall(r'<w:p[ >].*?</w:p>',x,flags=re.S)):
    t=html.unescape(''.join(re.findall(r'<w:t[^>]*>([^<]*)</w:t>',p))).strip()
    if not t: continue
    st=re.search(r'w:pStyle w:val="([^"]+)"',p)
    print(f'[{i}] {st.group(1) if st else "P"}: {t}')
