import os, re, sys
# Inline kit.js and every lane into one page for publishing. A lane that is missing or names </script> stops the build.
here = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(here, 'try.html'), encoding='utf-8').read()
html = re.sub(r'<!--DEV-->.*?<!--/DEV-->\n?', '', html, flags=re.S)
def inline(m):
    src = open(os.path.join(here, m.group(1)), encoding='utf-8').read()
    if '</script' in src.lower():
        sys.exit('STOP: ' + m.group(1) + ' contains a closing script tag')
    return '<script>\n' + src + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
out = os.path.join(here, 'FreeMotion-Intro-Takes.html')
open(out, 'w', encoding='utf-8', newline='\n').write(html)
print('wrote', out, len(html.encode('utf-8')) // 1024, 'KB')
