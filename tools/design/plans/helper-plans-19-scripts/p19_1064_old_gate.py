"""#1064 BEFORE: what ship.sh's watched-file regex says about the files the new gate names. Prints the files the OLD gate would look at."""
import re
changed = ['vendor/mp4-muxer.js', 'manifest.json', 'brand-wordmark-m.png', 'fx-art/cat.jpg', 'apple-touch-icon.png', 'js/app.js']
print([f for f in changed if re.match(r'^(js/.*\.js|styles\.css|theme-glass\.css)$', f)])   # only js/app.js
