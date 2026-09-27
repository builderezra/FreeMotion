// Real-WebKit probe for queue 920 (what iOS 26's WebKit picks for the status-bar strip). Build: swiftc tools/wkedge/main.swift -o "$TMPDIR/wkedge"
// Loads the app in a WKWebView with an obscured TOP inset (the stand-in for the iPhone status bar) and logs
// WebKit's own answer to "what colour goes in that top strip": the SPI _sampledTopFixedPositionContentColor
// (nil = no fixed top edge → iOS shows the soft scroll-edge pocket, i.e. THE FADE, tinted underPageBackgroundColor).
// Same WebCore code (LocalFrameView::fixedContainerEdges, Page::updateFixedContainerEdges) and the same commit-time
// trigger (WebPage::willCommitMainFrameData) as iOS; only the UIKit painting differs.
// usage: harness <url> <scenario.json> [fix.js]
import Cocoa
import WebKit

let args = CommandLine.arguments
let url = URL(string: args[1])!
let scenario = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: args[2]))) as! [[String: Any]]
let fixJS: String? = args.count > 3 ? try! String(contentsOfFile: args[3], encoding: .utf8) : nil
let W: CGFloat = 440, H: CGFloat = 956, INSET: CGFloat = 54

func hex(_ c: NSColor?) -> String {
  guard let c = c, let s = c.usingColorSpace(.sRGB) else { return "nil" }
  let r = Int(round(s.redComponent * 255)), g = Int(round(s.greenComponent * 255)), b = Int(round(s.blueComponent * 255))
  let a = s.alphaComponent
  return String(format: "#%02x%02x%02x", r, g, b) + (a < 0.999 ? String(format: "@%.2f", a) : "")
}

let app = NSApplication.shared
app.setActivationPolicy(.accessory)
let cfg = WKWebViewConfiguration()
cfg.websiteDataStore = .nonPersistent()
cfg.mediaTypesRequiringUserActionForPlayback = []
cfg.userContentController.addUserScript(WKUserScript(source: "try{localStorage.setItem('fm.test.seedProject','1')}catch(e){}", injectionTime: .atDocumentStart, forMainFrameOnly: true))
if let f = fixJS { cfg.userContentController.addUserScript(WKUserScript(source: f, injectionTime: .atDocumentEnd, forMainFrameOnly: true)) }
let win = NSWindow(contentRect: NSRect(x: -4000, y: -4000, width: W, height: H + INSET), styleMask: [.borderless], backing: .buffered, defer: false)
let wv = WKWebView(frame: NSRect(x: 0, y: 0, width: W, height: H + INSET), configuration: cfg)
let occSel = NSSelectorFromString("_setWindowOcclusionDetectionEnabled:")
if wv.responds(to: occSel) {
  typealias SetBool = @convention(c) (AnyObject, Selector, Bool) -> Void
  unsafeBitCast(wv.method(for: occSel), to: SetBool.self)(wv, occSel, false)
} else { FileHandle.standardError.write("no occlusion SPI\n".data(using: .utf8)!) }
wv.obscuredContentInsets = NSEdgeInsets(top: INSET, left: 0, bottom: 0, right: 0)
win.contentView = wv
win.orderFrontRegardless()

var t0 = Date()
var lastLine = ""
var log: [String] = []
func ms() -> Int { Int(Date().timeIntervalSince(t0) * 1000) }
func sample(_ label: String, force: Bool = false) {
  let top = hex(wv.value(forKey: "_sampledTopFixedPositionContentColor") as? NSColor)
  let under = hex(wv.underPageBackgroundColor)
  let line = "top=\(top) under=\(under)"
  if force || line != lastLine { log.append(String(format: "%6d  %-14@ %@", ms(), label as NSString, line as NSString)); lastLine = line }
}
var current = "load"
wv.load(URLRequest(url: url))
t0 = Date()
Timer.scheduledTimer(withTimeInterval: 0.025, repeats: true) { _ in sample(current) }
for step in scenario {
  let at = (step["at"] as! NSNumber).doubleValue / 1000
  let label = step["label"] as! String
  let js = step["js"] as? String
  Timer.scheduledTimer(withTimeInterval: at, repeats: false) { _ in
    current = label
    if let js = js {
      wv.evaluateJavaScript(js) { v, e in
        if let e = e { log.append("        js error \(label): \(e.localizedDescription)") }
        else if let v = v, !(v is NSNull) { log.append("        js \(label): \(v)") }
      }
    }
    sample(label, force: true)
  }
}
let end = (scenario.last!["at"] as! NSNumber).doubleValue / 1000 + 0.2
Timer.scheduledTimer(withTimeInterval: end, repeats: false) { _ in
  print(log.joined(separator: "\n"))
  exit(0)
}
app.run()
