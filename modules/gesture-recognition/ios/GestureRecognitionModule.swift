import ExpoModulesCore
import AVFoundation
import CoreML

class CameraDelegate: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  var onFrame: ((CMSampleBuffer) -> Void)?

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    onFrame?(sampleBuffer)
  }
}

public class GestureRecognitionModule: Module {
  private var videoOutput: AVCaptureVideoDataOutput?
  private var cameraDelegate = CameraDelegate()
  private var frameBuffer: [[Float]] = []
  private let sequenceLen = 30
  private let inputSize = 126
  private var isRunning = false

  private let labels = ["cross_fist", "finger_fold", "finger_wave", "fingertip_clap", "fist_open", "hand_shake"]
  private let labelsKo: [String: String] = [
    "cross_fist": "엇갈려 주먹 쥐고 펴기",
    "finger_fold": "손가락 접기",
    "finger_wave": "손가락 움직이기",
    "fingertip_clap": "손끝 박수",
    "fist_open": "주먹 쥐고 펴기",
    "hand_shake": "손 털기"
  ]

  public func definition() -> ModuleDefinition {
    Name("GestureRecognition")
    Events("onGestureResult", "onError")

    AsyncFunction("startDetection") { (promise: Promise) in
      self.isRunning = true
      self.frameBuffer = []
      promise.resolve(true)
    }

    AsyncFunction("stopDetection") { (promise: Promise) in
      self.isRunning = false
      self.frameBuffer = []
      promise.resolve(true)
    }

    AsyncFunction("loadModel") { (promise: Promise) in
      promise.resolve(true)
    }

    View(GestureRecognitionView.self) {
      Events("onLoad")
      OnCreate { view in
        view.onSessionReady = { [weak self] session in
          self?.attachOutput(to: session)
        }
      }
    }
  }

  private func attachOutput(to session: AVCaptureSession) {
    let output = AVCaptureVideoDataOutput()
    cameraDelegate.onFrame = { [weak self] sampleBuffer in
      self?.processFrame(sampleBuffer)
    }
    output.setSampleBufferDelegate(cameraDelegate, queue: DispatchQueue(label: "gesture.camera"))

    session.beginConfiguration()
    if session.canAddOutput(output) {
      session.addOutput(output)
    }
    session.commitConfiguration()
    videoOutput = output
  }

  private func processFrame(_ sampleBuffer: CMSampleBuffer) {
    guard isRunning else { return }

    let landmarks = [Float](repeating: 0, count: inputSize)
    frameBuffer.append(landmarks)

    if frameBuffer.count > sequenceLen {
      frameBuffer.removeFirst()
    }

    if frameBuffer.count == sequenceLen {
      predictGesture()
      frameBuffer = []
    }
  }

  private func predictGesture() {
    let mockScore = Int.random(in: 70...100)
    let mockIdx = Int.random(in: 0..<labels.count)
    let gesture = labels[mockIdx]
    let gestureKo = labelsKo[gesture] ?? gesture

    DispatchQueue.main.async {
      self.sendEvent("onGestureResult", [
        "gesture": gesture,
        "gestureKo": gestureKo,
        "score": mockScore,
        "isCorrect": mockScore >= 70
      ])
    }
  }
}
