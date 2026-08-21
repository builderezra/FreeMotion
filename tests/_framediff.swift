import Foundation
import AVFoundation
import CoreVideo

let args = CommandLine.arguments
guard args.count > 1 else { print("usage: framediff <file>"); exit(1) }
let url = URL(fileURLWithPath: args[1])
let asset = AVURLAsset(url: url)
guard let track = asset.tracks(withMediaType: .video).first else { print("no video track"); exit(1) }

let W = 96
let H = Int((Double(W) * Double(track.naturalSize.height) / Double(track.naturalSize.width)).rounded())
let reader = try AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: W,
    kCVPixelBufferHeightKey as String: H])
reader.add(out)
reader.startReading()

var prev: [UInt8] = []
var times: [Double] = []
var diffs: [Double] = []
var inks: [Int] = []

while let sb = out.copyNextSampleBuffer() {
    guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
    let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sb))
    CVPixelBufferLockBaseAddress(pb, .readOnly)
    let base = CVPixelBufferGetBaseAddress(pb)!
    let stride = CVPixelBufferGetBytesPerRow(pb)
    var luma = [UInt8](repeating: 0, count: W*H)
    var ink = 0
    for y in 0..<H {
        let row = base.advanced(by: y*stride).assumingMemoryBound(to: UInt8.self)
        for x in 0..<W {
            let b = Int(row[x*4]), g = Int(row[x*4+1]), r = Int(row[x*4+2])
            let l = UInt8((r+g+b)/3)
            luma[y*W+x] = l
            ink += Int(l)
        }
    }
    CVPixelBufferUnlockBaseAddress(pb, .readOnly)
    if !prev.isEmpty {
        var s = 0
        for i in 0..<luma.count { s += abs(Int(luma[i]) - Int(prev[i])) }
        diffs.append(Double(s)/Double(luma.count))
    }
    inks.append(ink/(W*H))
    times.append(t)
    prev = luma
    CMSampleBufferInvalidate(sb)
}

guard diffs.count > 5 else { print("only \(times.count) frames decoded"); exit(1) }
let sd = diffs.sorted()
func pc(_ p: Double) -> Double { sd[min(sd.count-1, Int(Double(sd.count)*p))] }
var gaps: [Double] = []
for i in 1..<times.count { gaps.append((times[i]-times[i-1])*1000) }
let sg = gaps.sorted()
func gp(_ p: Double) -> Double { sg[min(sg.count-1, Int(Double(sg.count)*p))] }

var run = 0, best = 0, at = 0
for (i,d) in diffs.enumerated() { if d < 0.4 { run += 1; if run > best { best = run; at = i } } else { run = 0 } }

print(String(format: "frames decoded      : %d over %.2fs", times.count, times.last! - times.first!))
print(String(format: "CONTROL ink range   : %d .. %d   (identical = probe is blind)", inks.min()!, inks.max()!))
print(String(format: "CONTROL max diff    : %.2f", sd.last!))
print(String(format: "picture diff p50    : %.2f", pc(0.5)))
print(String(format: "picture diff p95    : %.2f", pc(0.95)))
print(String(format: "identical pairs     : %d of %d  (%.1f%%)", diffs.filter{$0 < 0.4}.count, diffs.count, 100.0*Double(diffs.filter{$0 < 0.4}.count)/Double(diffs.count)))
print(String(format: "longest frozen run  : %d frames  (%.2fs, starting %.2fs)", best, Double(best)*(gp(0.5)/1000), best > 0 ? times[max(0,at-best+1)] : 0))
print(String(format: "frame gap p50/p95/max: %.1f / %.1f / %.1f ms", gp(0.5), gp(0.95), sg.last!))
print("")
print("per-second mean picture change:")
var i = 0
while i < diffs.count {
    let end = min(i+60, diffs.count)
    let slice = Array(diffs[i..<end])
    print(String(format: "  %4.1fs  mean %6.2f   max %6.2f   still-frames %d/%d",
                 times[i], slice.reduce(0,+)/Double(slice.count), slice.max()!, slice.filter{$0 < 0.4}.count, slice.count))
    i = end
}
