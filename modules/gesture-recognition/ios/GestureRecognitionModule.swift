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
  static weak var shared: GestureRecognitionModule?

  private var videoOutput: AVCaptureVideoDataOutput?
  private var cameraDelegate = CameraDelegate()
  private var frameBuffer: [[Float]] = []
  private let sequenceLen = 30
  private let inputSize = 126
  private var isRunning = false
  private var mlModel: MLModel?

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

    OnCreate {
      GestureRecognitionModule.shared = self
    }

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
      do {
        try self.loadCoreMLModel()
        promise.resolve(true)
      } catch {
        promise.reject("MODEL_ERROR", error.localizedDescription)
      }
    }

    View(GestureRecognitionView.self) {
      Events("onSessionReady")
    }
  }

  private func loadCoreMLModel() throws {
    if let modelURL = Bundle.main.url(forResource: "gesture_final", withExtension: "mlmodelc") {
      mlModel = try MLModel(contentsOf: modelURL)
    } else if let modelURL = Bundle.main.url(forResource: "gesture_final", withExtension: "mlpackage") {
      let compiledURL = try MLModel.compileModel(at: modelURL)
      mlModel = try MLModel(contentsOf: compiledURL)
    } else {
      throw NSError(domain: "GestureRecognition", code: 1, userInfo: [NSLocalizedDescriptionKey: "모델 파일을 찾을 수 없습니다"])
    }
  }

  func attachOutput(to session: AVCaptureSession) {
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
    guard let model = mlModel else { return }

    do {
      let inputArray = try MLMultiArray(shape: [1, NSNumber(value: sequenceLen), NSNumber(value: inputSize)], dataType: .float32)
      for i in 0..<sequenceLen {
        for j in 0..<inputSize {
          inputArray[[0, NSNumber(value: i), NSNumber(value: j)]] = NSNumber(value: frameBuffer[i][j])
        }
      }

      let input = try MLDictionaryFeatureProvider(dictionary: ["input": inputArray])
      let output = try model.prediction(from: input)

      if let outputArray = output.featureValue(for: "var_85")?.multiArrayValue {
        var maxScore: Float = -Float.infinity
        var maxIdx = 0
        for i in 0..<labels.count {
          let score = outputArray[i].floatValue
          if score > maxScore {
            maxScore = score
            maxIdx = i
          }
        }
        let confidence = Int(min(max((maxScore + 3) / 6 * 100, 0), 100))
        let gesture = labels[maxIdx]
        let gestureKo = labelsKo[gesture] ?? gesture
        DispatchQueue.main.async {
          self.sendEvent("onGestureResult", [
            "gesture": gesture,
            "gestureKo": gestureKo,
            "score": confidence,
            "isCorrect": confidence >= 70
          ])
        }
      }
    } catch {
      print("예측 오류:", error)
    }
  }
}
