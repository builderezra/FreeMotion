#!/usr/bin/env python3
"""FIND WHAT GOES WRONG ONLY ON WINDOWS: THE SUITE, OR A SLICE OF IT, IN WINDOWS CHROME ON THIS LAPTOP (#1098 clause 3, 23 Oct).

    python3 tests/_win_suite.py --linux-control --out .claude/win-suite.json         # the whole suite, both sides (recommended)
    python3 tests/_win_suite.py --linux-control --only '<substring>' [--width 1280]  # a slice of it
    python3 tests/_win_suite.py --after '<name>' --upto '<name>' --linux-control     # a slice in suite order, as run.html takes it
    python3 tests/_win_suite.py --only '<substring>' --against <a Linux tests/_cdp.py result>   # compare with a driver run
    python3 tests/_win_suite.py --available                          # exit 0 when a Windows Chrome is reachable, 1 when not

Never beside a ship, a mutation or another suite (the laptop's timing tests are the point of those): it is a full suite run.

His words, 7 Oct, while the laptop shipped v17.24: "yeah i guess slowing it to work like the phone makes sense because you are
testing it for phone users. i guess you can switch between to see its pc potential. and also find issues with windows".
Clause 1 (the calibrated throttle) shipped in v17.24 and clause 2 (PC speed beside phone speed) in v17.60. This is clause 3.
Every pass a ship runs is Linux Chrome under WSL; his PC opens the app in Windows Chrome, which has its own fonts, codecs,
GPU path and file pickers. Nothing ran the suite there: tests/_win_pass.py runs only the AAC tests Linux cannot.

HOW. The same route as tests/_win_pass.py, whose helpers this imports: a headless Windows Chrome with a throwaway profile under
the Windows temp folder (never his), the tree through WSL's localhost forwarding, and a wrapper page (served here, never a file
in the tree) that holds tests/run.html in a frame and POSTs its verdict back. There is no DevTools channel across the WSL
boundary, so a test that asks the driver for something cannot be judged here — and the wrapper says which ones asked:
  - real input (__fmWantInput) is answered at once with the driver's own "NOTRUN: " reply, so the test ends NOT RUN HERE
    saying why, instead of failing after a 30 s wait (tests.js already reads that reply: the Linux touch refusal uses it);
  - a garbage collection (__fmWantGc) is answered with an error saying the same, so it is red at once, not after 30 s;
  - a CPU throttle or reduced motion (__fmWantCpu / __fmWantMedia) is NOT answered — no page can grant one, and pretending
    would be a lie — so the test decides, as it does in any browser without the driver;
  and each such test's name is recorded under "asked". A red from a test that asked, or whose error names tests/_cdp.py, is
  filed "needs the driver", never as a Windows issue.

THE CONTROL (--linux-control, recommended). The same wrapper, the same tests and the same flags run first in THIS machine's
Linux headless Chrome (tests/_platform.py's binary and its GL and mouse flags, as tests/_cdp.py launches it). Both sides then
lack the driver in exactly the same way, so a red that comes from running without it, or from the wrapper itself, is red on
both and never reads as a Windows issue — the only difference left is the browser's OS. Both sides get the Mac's mouse
(--blink-settings, as _platform gives Linux): his PC has one, and a headless Chrome reports none, which would leave every PC-
layout test NOT RUN. Windows keeps its own scrollbars, GPU and fonts: those ARE the differences this is looking for.

WHAT IT SAYS. Against the control (or --against: tests/_cdp.py's JSON of a Linux run of the same tests, what ship.sh keeps
as .claude/ship/suite-desktop.out or suite-phone.out), every red here is one of:
  WINDOWS ONLY      red in Windows Chrome, green in Linux Chrome — the finding this exists for
  red on both       red in Linux Chrome too: a plain red, not a Windows one
  Linux NOT RUN     Linux could not run it (an AAC test, a finger test), so there is nothing to compare
  Linux unknown     the Linux result has no per-test list ("ran"), is a filtered run, and does not name it
  needs the driver  see above
plus the tests NOT RUN here (with their reasons) and the tests only Windows could run. With neither, every red that did not
need the driver is listed as RED HERE, to compare by hand. The pinned picture tests say NOT RUN in Windows Chrome until
tools/record-baselines.sh has recorded a Windows baseline (tests.js pinned(): FM_OS is 'windows' there).

Report only: ship.sh does not run this, and nothing refuses on it. Exit 0 = judged, nothing WINDOWS ONLY (with no Linux side:
no RED HERE); 1 = at least one; 2 = nothing judged (no Windows or Linux Chrome, no verdict from a page, a run that matched no
test, or an --against file with no driver result in it). tools/test-port.sh proves it on stub Chromes.
"""
import argparse, html, http.server, json, os, re, shutil, socket, subprocess, sys, tempfile, threading, time, urllib.parse, uuid

sys.dont_write_bytecode = True   # importing _win_pass must not leave a tests/__pycache__ in the tree for a ship's git add -A
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _win_pass as W   # noqa: E402 — chrome(), wintemp(), end_browser(), chrome_info(), describe(), flat()
import _platform as P   # noqa: E402 — the Linux control's Chrome and flags, exactly as tests/_cdp.py launches it

DRIVER_ERR = re.compile(r'tests/_cdp\.py|__fmWant')
# what tests/_cdp.py gives every test Chrome that is about the HARNESS, not the OS: both sides get these
COMMON = ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--mute-audio',
          '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
          '--disable-features=WebRtcHideLocalIpsWithMdns', '--allow-loopback-in-peer-connection']
# the Mac's mouse (tests/_platform.py chrome_extra_flags gives Linux the same): his PC has one, a headless Chrome reports none
MOUSE = '--blink-settings=primaryPointerType=4,availablePointerTypes=4,primaryHoverType=2,availableHoverTypes=2'
WRAP = '''<!doctype html><meta charset="utf-8"><title>win suite</title>
<iframe id="r" style="position:absolute;left:0;top:0;width:%(w)dpx;height:900px;border:0" src="%(src)s"></iframe>
<script>
(function () {
  var f = document.getElementById('r'), t0 = Date.now(), sent = false, asked = {};
  var WHY = 'the Windows pass (tests/_win_suite.py) has no DevTools channel, so nothing here can answer this request';
  function send(o) { if (sent) return; sent = true; o.asked = asked; fetch('/__win/result?id=%(id)s', { method: 'POST', body: JSON.stringify(o) }); }
  function note(kind, a) {
    var n = String(a.__fmLastTest || '?');
    if (!asked[n]) asked[n] = [];
    if (asked[n].indexOf(kind) < 0) asked[n].push(kind);
  }
  function answer(a) {
    var q = a.__fmWantInput;
    if (q && typeof q.seq === 'number' && a.__fmInputDone !== q.seq) {
      note('input', a);
      a.__fmInputErr = 'NOTRUN: needs real input from tests/_cdp.py - ' + WHY;
      a.__fmInputDone = q.seq;
    }
    q = a.__fmWantGc;
    if (q && typeof q.seq === 'number' && a.__fmGcDone !== q.seq) {
      note('gc', a);
      a.__fmGc = { seq: q.seq, err: WHY };
      a.__fmGcDone = q.seq;
    }
    q = a.__fmWantCpu;
    if (q && typeof q.rate === 'number' && q.rate > 1) note('cpu', a);
    q = a.__fmWantMedia;
    if (q && q.reduce === true) note('media', a);
    if (a.__fmWantShot || a.__fmWantSetup) note('shot', a);
  }
  setInterval(function () {
    var d, w, a;
    try { d = f.contentDocument; w = f.contentWindow; } catch (e) { return; }
    try { a = d && d.getElementById('app'); a = a && a.contentWindow; if (a) answer(a); } catch (e) {}
    var s = d && d.getElementById('sum');
    if (s && (s.textContent.indexOf('Regression') >= 0 || s.textContent.indexOf('Error') >= 0)) {
      send({ sum: s.textContent,
             ran: (w.__fmResults || null) && w.__fmResults.map(function (r) { return { name: r.name, ok: !!r.ok, pending: !!r.pending, error: String(r.error || '').slice(0, 400), notRun: r.notRun || '' }; }),
             notRun: (w.__fmNotRun || []).map(function (r) { return { name: r.name, reason: r.reason }; }), ua: navigator.userAgent });
    } else if (Date.now() - t0 > %(ms)d) {
      var last = ''; try { last = String(a && a.__fmLastTest || ''); } catch (e) {}
      send({ error: 'no verdict within %(s)ds', last: last });
    }
  }, 100);
})();
</script>'''


def run_src(a):
    q = [(k, v) for k, v in (('only', a.only), ('after', a.after), ('upto', a.upto)) if v]
    return '/tests/run.html' + ('?' + urllib.parse.urlencode(q) if q else '')


def serve(root, results, seen, a):
    # the same server as tests/_win_pass.py's, with its own wrapper route; SEEN splits "Chrome never asked for the page"
    # from "the page loaded and then said nothing", exactly as there
    class H(http.server.SimpleHTTPRequestHandler):
        protocol_version = 'HTTP/1.1'

        def __init__(self, *x, **k):
            super().__init__(*x, directory=root, **k)

        def end_headers(self):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            super().end_headers()

        def log_message(self, *x):
            pass

        def do_GET(self):
            u = urllib.parse.urlparse(self.path)
            if u.path == '/__win/suite':
                q = urllib.parse.parse_qs(u.query)
                seen.setdefault(q['id'][0], {})['wrap'] = time.time()
                seen['_cur'] = q['id'][0]
                body = (WRAP % {'w': a.width, 'id': q['id'][0], 'ms': a.timeout * 1000, 's': a.timeout, 'src': html.escape(run_src(a))}).encode()
                self.send_response(200); self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(body))); self.end_headers(); self.wfile.write(body)
                return
            cur = seen.get(seen.get('_cur') or '')
            if isinstance(cur, dict):
                cur['gets'] = cur.get('gets', 0) + 1
                cur['last'] = u.path[:120]
            return super().do_GET()

        def do_POST(self):
            u = urllib.parse.urlparse(self.path)
            data = self.rfile.read(int(self.headers.get('Content-Length', 0)))
            if u.path == '/__win/result':
                try:
                    rid = urllib.parse.parse_qs(u.query)['id'][0]
                    seen.setdefault(rid, {})['posted'] = time.time()
                    results[rid] = json.loads(data or b'{}')
                except Exception as ex:
                    results['?'] = {'error': 'unreadable result: %s' % ex}
            self.send_response(204); self.send_header('Content-Length', '0'); self.end_headers()

    class S(http.server.ThreadingHTTPServer):
        request_queue_size = 256
        daemon_threads = True
        allow_reuse_address = True

    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = S(('127.0.0.1', port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, port


def grace(a):
    return 30 if a.timeout >= 60 else 2


def end_linux(p, prof):
    # OUR Linux Chrome only: the one we started, then anything still carrying this run's own random profile path
    try:
        p.terminate()
        p.wait(timeout=10)
    except Exception:
        p.kill()
    try:
        subprocess.run(['pkill', '-f', '--', '--user-data-dir=' + prof], capture_output=True, timeout=30)
    except Exception:
        pass
    shutil.rmtree(prof, ignore_errors=True)


def launch(a, side, exe, port, results, seen):
    rid = uuid.uuid4().hex[:10]
    tag = 'fm-winsuite-' + rid
    # the top URL carries the same only/after/upto: tests.js reads the TOP window's query first (tests.js, ?only= handling)
    q = [('id', rid)] + [(k, v) for k, v in (('only', a.only), ('after', a.after), ('upto', a.upto)) if v]
    url = 'http://localhost:%d/__win/suite?%s' % (port, urllib.parse.urlencode(q))
    size = '--window-size=%d,950' % (a.width + 20)
    if side == 'windows':
        prof = W.wintemp() + '\\' + tag
        errpath = os.path.join(tempfile.gettempdir(), tag + '.err')
        args, env = [exe] + COMMON + [MOUSE, '--user-data-dir=' + prof, size, url], None
    else:
        prof = tempfile.mkdtemp(prefix='fm-winsuite-lin-')
        errpath = os.path.join(tempfile.gettempdir(), tag + '-lin.err')
        args = [exe] + COMMON + P.gl_flags() + P.chrome_extra_flags() + ['--user-data-dir=' + prof, size, url]
        env = P.chrome_env(prof)
    ef = open(errpath, 'wb')
    p = subprocess.Popen(args, stdout=subprocess.DEVNULL, stderr=ef, env=env)
    t0 = time.time()
    exited = ''
    try:
        while rid not in results and time.time() - t0 < a.timeout + grace(a):
            if not exited and p.poll() is not None:
                exited = 'with code %s after %ds' % (p.returncode, time.time() - t0)
            time.sleep(0.2)
    finally:
        if side == 'windows':
            W.end_browser(tag, prof)
            try:
                p.wait(timeout=10)
            except Exception:
                p.kill()
        else:
            end_linux(p, prof)
        ef.close()
    try:
        with open(errpath, 'rb') as f:
            err = W.flat(f.read()[-2000:].decode('utf-8', 'replace'))
        os.remove(errpath)
    except OSError:
        err = ''
    s = seen.get(rid, {})
    return rid, {'wrapperFetched': 'wrap' in s, 'pageRequests': s.get('gets', 0), 'lastRequest': s.get('last', ''),
                 'posted': 'posted' in s, 'chromeExited': exited if rid not in results else '', 'stderr': err[-400:]}


def find_result(raw):
    """The first JSON object at a line start that is a driver result (it has "ok" or "summary"). None if none."""
    dec = json.JSONDecoder()
    for i in [0] + [k + 1 for k, c in enumerate(raw) if c == '\n']:
        if raw.startswith('{', i):
            try:
                o, _ = dec.raw_decode(raw, i)
            except ValueError:
                continue
            if isinstance(o, dict) and ('ok' in o or 'summary' in o):
                return o
    return None


def linux_side(lin):
    """name -> 'red' / 'notrun' / 'pass' / 'unknown' for the Linux run, as far as it can say."""
    fails = [str(x) for x in (lin.get('failures') or [])]
    notrun = set(str(x.get('name', '')) for x in (lin.get('notRun') or []) if isinstance(x, dict))
    ran = lin.get('ran') if isinstance(lin.get('ran'), list) else None
    by = {}
    if ran is not None:
        for x in ran:
            if isinstance(x, dict) and x.get('name'):
                by[x['name']] = 'notrun' if x.get('notRun') else 'pass' if x.get('ok') else 'red'
    filtered = 'FILTERED' in str(lin.get('summary', ''))

    def of(name):
        if name in notrun:
            return 'notrun'
        if ran is not None:
            return by.get(name, 'unknown')
        for row in fails:
            # a FAIL row (tests/run.html) is 'FAIL' + the name, then ' (pending)' and/or ' — <error>': the exact name, never
            # a longer one that starts with it
            body = row[4:] if row.startswith('FAIL') else row
            if body == name or body.startswith(name + ' — ') or body.startswith(name + ' (pending)'):
                return 'red'
        return 'unknown' if filtered else 'pass'
    return of


def judge(r, lin_of):
    ran = [x for x in (r.get('ran') or []) if isinstance(x, dict) and x.get('name')]
    asked = r.get('asked') if isinstance(r.get('asked'), dict) else {}
    out = {'windowsOnly': [], 'redBoth': [], 'linuxNotRun': [], 'linuxUnknown': [], 'red': [], 'needsDriver': [],
           'notRunHere': [], 'onlyWindowsRan': [], 'pass': 0, 'pending': 0}
    for x in ran:
        name, err = x['name'], W.flat(x.get('error', ''))[:400]
        kinds = asked.get(name) or []
        if x.get('pending'):
            out['pending'] += 1
            continue
        if x.get('notRun'):
            out['notRunHere'].append({'name': name, 'why': W.flat(x['notRun'])[:300], 'asked': kinds})
            continue
        if x.get('ok'):
            out['pass'] += 1
            if lin_of and lin_of(name) == 'notrun':
                out['onlyWindowsRan'].append({'name': name})
            continue
        e = {'name': name, 'error': err, 'asked': kinds}
        if kinds or DRIVER_ERR.search(err):
            out['needsDriver'].append(e)
        elif not lin_of:
            out['red'].append(e)
        else:
            side = lin_of(name)
            out[{'pass': 'windowsOnly', 'red': 'redBoth', 'notrun': 'linuxNotRun'}.get(side, 'linuxUnknown')].append(e)
    return out


def what_of(a):
    return ' '.join('%s=%s' % (k, v) for k, v in (('only', a.only), ('after', a.after), ('upto', a.upto)) if v) or 'the whole suite'


def run_side(a, side, exe, port, results, seen):
    """One run of the wrapper in one browser. Returns (result or None, why there is none, diag, relaunched)."""
    rid, diag = launch(a, side, exe, port, results, seen)
    relaunched = ''
    # ONE relaunch, only for a Chrome that never asked for the page — nothing ran, so this is the first run, not a retry
    if rid not in results and not diag['wrapperFetched']:
        relaunched = W.describe(diag)
        print('   relaunch (%s) — %s; launching Chrome once more' % (side, relaunched[:240]), flush=True)
        first = diag
        rid, diag = launch(a, side, exe, port, results, seen)
        diag['firstLaunch'] = first
    r = results.get(rid)
    if not isinstance(r, dict) or r.get('error') or not isinstance(r.get('ran'), list):
        why = (('no verdict: ' + W.flat(r['error'])[:300] + (' (last test: %s)' % W.flat(r.get('last'))[:160] if r.get('last') else ''))
               if isinstance(r, dict) and r.get('error') else
               'the runner gave no per-test list — it says: ' + (W.flat(r.get('sum'))[:300] or 'nothing') if isinstance(r, dict) else
               'no verdict within %ds — %s' % (a.timeout + grace(a), W.describe(diag)))
        return None, why, diag, relaunched
    if not r['ran']:
        return None, 'no test matched ' + what_of(a), diag, relaunched
    return r, '', diag, relaunched


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', default='', help='substring of the test names to run (tests/run.html ?only=); empty = all')
    ap.add_argument('--after', default='')
    ap.add_argument('--upto', default='')
    ap.add_argument('--width', type=int, default=1280)
    ap.add_argument('--timeout', type=int, default=0, help='seconds for each run (default 7200, or 1200 with a filter)')
    ap.add_argument('--linux-control', action='store_true', help='run the same wrapper in Linux Chrome first and compare with it')
    ap.add_argument('--against', default=None, help="tests/_cdp.py's JSON of a Linux run of the same tests")
    ap.add_argument('--out', default=None)
    ap.add_argument('--root', default='.', help='the tree to serve (default: here)')
    ap.add_argument('--available', action='store_true')
    a = ap.parse_args()
    exe = W.chrome()
    if a.available:
        print(exe or 'no Windows Chrome reachable from here')
        return 0 if exe else 1
    if a.against and a.linux_control:
        ap.error('--against or --linux-control, not both')
    if not a.timeout:
        a.timeout = 1200 if (a.only or a.after or a.upto) else 7200
    what = what_of(a)
    lin_of = None
    if a.against:
        try:
            lin = find_result(open(a.against, encoding='utf-8', errors='replace').read())
        except OSError:
            lin = None
        if not isinstance(lin, dict):
            print('win suite: no Linux driver result in %s — nothing to compare against, nothing judged' % a.against)
            return 2
        lin_of = linux_side(lin)
    if not exe:
        print('win suite: no Windows Chrome reachable from here — nothing judged')
        return 2
    lexe = None
    if a.linux_control:
        lexe = P.find_chrome()
        if not lexe:
            print('win suite: no Linux Chrome for the control (tests/_platform.py found none) — nothing judged')
            return 2
    results, seen = {}, {}
    t0 = time.time()
    ci = W.chrome_info(exe)
    res = {'what': what, 'width': a.width, 'chrome': ci, 'against': a.against, 'control': 'linux' if lexe else ''}

    def nothing(why):
        res['error'] = why
        res['seconds'] = round(time.time() - t0)
        if a.out:
            with open(a.out, 'w', encoding='utf-8') as f:
                json.dump(res, f, indent=1, ensure_ascii=False)
        print('win suite: nothing judged — ' + why)
        return 2

    srv, port = serve(os.path.abspath(a.root), results, seen, a)
    try:
        if lexe:
            print('   the Linux control first (the same wrapper and tests in %s) — %s at %d px' % (lexe, what, a.width), flush=True)
            ctl, why, res['controlDiag'], res['controlRelaunched'] = run_side(a, 'linux', lexe, port, results, seen)
            if ctl is None:
                return nothing('the Linux control: ' + why + ' (Windows Chrome was not launched)')
            res['controlSummary'] = W.flat(ctl.get('sum'))[:300]
            lin_of = linux_side({'ran': ctl['ran'], 'notRun': ctl.get('notRun') or [], 'summary': ctl.get('sum', '')})
            print('   Linux control: %s' % res['controlSummary'], flush=True)
        print('   Windows Chrome: %s, version %s%s — %s at %d px' % (ci['exe'], ci['version'],
              ', an update (new_chrome.exe) is waiting beside it' if ci['pendingUpdate'] else '', what, a.width), flush=True)
        r, why, res['diag'], relaunched = run_side(a, 'windows', exe, port, results, seen)
        res['relaunched'] = relaunched
        if r is None:
            return nothing('Windows Chrome: ' + why)
    finally:
        srv.shutdown()
    res['seconds'] = round(time.time() - t0)
    j = judge(r, lin_of)
    res.update(j)
    res['summary'] = W.flat(r.get('sum'))[:300]
    res['browser'] = r.get('ua', '')
    res['asked'] = r.get('asked') or {}
    if a.out:
        with open(a.out, 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    print('   %s   [%s]' % (res['summary'], W.flat(res['browser'])[-48:] or '?'))
    finding = j['windowsOnly'] if lin_of else j['red']
    label = 'WINDOWS ONLY' if lin_of else 'RED HERE'
    for e in finding:
        print('   %s: %s — %s' % (label, W.flat(e['name'])[:120], e['error'][:220]))
    for k, lab in (('redBoth', 'red on Linux too'), ('linuxNotRun', 'Linux NOT RUN'), ('linuxUnknown', 'Linux unknown')):
        for e in j[k]:
            print('   %s: %s — %s' % (lab, W.flat(e['name'])[:120], e['error'][:160]))
    nd = j['needsDriver']
    if nd:
        print('   needs the driver (not judged here): %d — %s%s' % (len(nd), '; '.join(W.flat(e['name'])[:60] for e in nd[:5]),
                                                                    ' …' if len(nd) > 5 else ''))
    for e in j['onlyWindowsRan']:
        print('   runs only here: %s' % W.flat(e['name'])[:140])
    print('Windows Chrome at %d px, %s: %d pass, %d %s, %d red on both, %d Linux NOT RUN, %d Linux unknown, %d need the driver, '
          '%d NOT RUN here, %d pending%s' % (
              a.width, what, j['pass'], len(finding), 'WINDOWS ONLY' if lin_of else 'red (no Linux run to compare)',
              len(j['redBoth']), len(j['linuxNotRun']), len(j['linuxUnknown']), len(nd), len(j['notRunHere']), j['pending'],
              ' — relaunched once because Chrome never asked for the page' if relaunched else ''))
    return 1 if finding else 0


if __name__ == '__main__':
    sys.exit(main())
