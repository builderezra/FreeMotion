// mkhevc.swift — write a short HEVC (hvc1) QuickTime .mov the way an iPhone screen recording is encoded.
// Usage: swiftc -O mkhevc.swift -o mkhevc && ./mkhevc out.mov [seconds] [fps]
import AVFoundation
import CoreVideo
import Foundation

let args = CommandLine.arguments
let outPath = args.count > 1 ? args[1] : "hevc.mov"
let seconds = args.count > 2 ? Double(args[2]) ?? 2.0 : 2.0
let fps: Int32 = args.count > 3 ? Int32(args[3]) ?? 30 : 30
let W = 360, H = 640
let url = URL(fileURLWithPath: outPath)
try? FileManager.default.removeItem(at: url)
let writer = try AVAssetWriter(outputURL: url, fileType: .mov)
let settings: [String: Any] = [
  AVVideoCodecKey: AVVideoCodecType.hevc,
  AVVideoWidthKey: W, AVVideoHeightKey: H,
  AVVideoCompressionPropertiesKey: [AVVideoAverageBitRateKey: 600_000],
]
let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
input.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: W, kCVPixelBufferHeightKey as String: H,
])
writer.add(input)
guard writer.startWriting() else { print("startWriting failed: \(writer.error.map { "\($0)" } ?? "?")"); exit(2) }
writer.startSession(atSourceTime: .zero)
let n = Int(seconds * Double(fps))
for i in 0..<n {
  while !input.isReadyForMoreMediaData { usleep(2000) }
  var pb: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &pb)
  guard let buf = pb else { print("no pixel buffer"); exit(3) }
  CVPixelBufferLockBaseAddress(buf, [])
  let base = CVPixelBufferGetBaseAddress(buf)!.assumingMemoryBound(to: UInt8.self)
  let stride = CVPixelBufferGetBytesPerRow(buf)
  // a moving vertical bar on a dark ground, so frames differ and the encoder has something to do
  let bar = (i * 12) % W
  for y in 0..<H { for x in 0..<W {
    let p = base + y * stride + x * 4
    let on = abs(x - bar) < 24
    p[0] = on ? 40 : 20; p[1] = on ? 200 : 24; p[2] = on ? 255 : 40; p[3] = 255
  } }
  CVPixelBufferUnlockBaseAddress(buf, [])
  adaptor.append(buf, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
input.markAsFinished()
let sem = DispatchSemaphore(value: 0)
writer.finishWriting { sem.signal() }
sem.wait()
if writer.status == .completed { print("wrote \(outPath) \(n) frames @\(fps) fps") } else { print("failed: \(writer.error.map { "\($0)" } ?? "?")"); exit(4) }
