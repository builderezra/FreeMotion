import Foundation
import AVFoundation
import CoreImage

let args = CommandLine.arguments
let src = URL(fileURLWithPath: args[1]), dst = URL(fileURLWithPath: args[2])
let side = Int(args[3]) ?? 1280
let kbps = Int(args[4]) ?? 2000
try? FileManager.default.removeItem(at: dst)

let asset = AVURLAsset(url: src)
guard let vtrack = asset.tracks(withMediaType: .video).first else { print("no video"); exit(1) }

let reader = try AVAssetReader(asset: asset)
let rOut = AVAssetReaderTrackOutput(track: vtrack, outputSettings: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
reader.add(rOut)

let writer = try AVAssetWriter(outputURL: dst, fileType: .mp4)
let wIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
    AVVideoCodecKey: AVVideoCodecType.h264,
    AVVideoWidthKey: side,
    AVVideoHeightKey: side,
    AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: kbps * 1000,
        AVVideoProfileLevelKey: (ProcessInfo.processInfo.environment["PROF"] == "baseline" ? AVVideoProfileLevelH264BaselineAutoLevel : AVVideoProfileLevelH264MainAutoLevel),
        AVVideoAllowFrameReorderingKey: false,
        AVVideoMaxKeyFrameIntervalKey: 60,
        AVVideoExpectedSourceFrameRateKey: 60,
    ]])
wIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: wIn, sourcePixelBufferAttributes: [
    kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
    kCVPixelBufferWidthKey as String: side,
    kCVPixelBufferHeightKey as String: side])
writer.add(wIn)

writer.startWriting(); writer.startSession(atSourceTime: .zero)
reader.startReading()

let ci = CIContext()
let sem = DispatchSemaphore(value: 0)
var frames = 0
wIn.requestMediaDataWhenReady(on: DispatchQueue(label: "enc")) {
    while wIn.isReadyForMoreMediaData {
        guard let sb = rOut.copyNextSampleBuffer(), let pb = CMSampleBufferGetImageBuffer(sb) else {
            wIn.markAsFinished(); sem.signal(); return
        }
        let pts = CMSampleBufferGetPresentationTimeStamp(sb)
        var outPB: CVPixelBuffer?
        CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &outPB)
        if let o = outPB {
            let img = CIImage(cvPixelBuffer: pb)
            let sx = CGFloat(side) / img.extent.width, sy = CGFloat(side) / img.extent.height
            let scaled = img.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
            ci.render(scaled, to: o)
            adaptor.append(o, withPresentationTime: pts)
            frames += 1
        }
        CMSampleBufferInvalidate(sb)
    }
}
sem.wait()
writer.finishWriting { sem.signal() }
sem.wait()
let sz = (try? FileManager.default.attributesOfItem(atPath: dst.path)[.size] as? Int) ?? 0
print("frames \(frames)  ->  \(sz ?? 0) bytes  (\(String(format: "%.2f", Double(sz ?? 0)/1048576.0)) MB)  status=\(writer.status.rawValue)")
if let e = writer.error { print("error: \(e)") }
