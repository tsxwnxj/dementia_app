import ExpoModulesCore
import AVFoundation
import CoreML
import MediaPipeTasksVision

class CameraDelegate: NSObject, AVCaptureVideoDataOutputSampleBufferDelegate {
  var onFrame: ((CMSampleBuffer) -> Void)?
  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    onFrame?(sampleBuffer)
  }
}

public class GestureRecognitionModule: Module {
  static weak var shared: GestureRecognitionModule?
  private var cameraDelegate = CameraDelegate()
  private var frameBuffer: [[Float]] = []
  private let sequenceLen = 30
  private let inputSize = 126
  private var isRunning = false
  private var mlModel: MLModel?
  private var handLandmarker: HandLandmarker?
  private var frameCount = 0
  private var handDetectedCount = 0
  private let confidenceThreshold: Float = 0.75

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
    Events("onGestureResult", "onDebug", "onError")

    OnCreate {
      GestureRecognitionModule.shared = self
      self.setupHandLandmarker()
    }

    AsyncFunction("startDetection") { (promise: Promise) in
      self.isRunning = true
      self.frameBuffer = []
      self.frameCount = 0
      self.handDetectedCount = 0
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

  private func setupHandLandmarker() {
    guard let modelPath = Bundle.main.path(forResource: "hand_landmarker", ofType: "task") else {
      DispatchQueue.main.async { self.sendEvent("onDebug", ["msg": "❌ hand_landmarker.task 없음"]) }
      return
    }
    do {
      let options = HandLandmarkerOptions()
      options.baseOptions.modelAssetPath = modelPath
      options.numHands = 2
      options.minHandDetectionConfidence = 0.7
      options.minHandPresenceConfidence = 0.5
      options.minTrackingConfidence = 0.5
      options.runningMode = .video
      handLandmarker = try HandLandmarker(options: options)
      DispatchQueue.main.async { self.sendEvent("onDebug", ["msg": "✅ HandLandmarker 초기화 완료"]) }
    } catch {
      DispatchQueue.main.async { self.sendEvent("onDebug", ["msg": "❌ HandLandmarker 실패: \(error)"]) }
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

  func attachOutput(to session: AVCaptureSession, existingOutput: AVCaptureVideoDataOutput) {
    cameraDelegate.onFrame = { [weak self] sampleBuffer in
      self?.processFrame(sampleBuffer)
    }
    existingOutput.setSampleBufferDelegate(cameraDelegate, queue: DispatchQueue(label: "gesture.camera"))
    DispatchQueue.main.async { self.sendEvent("onDebug", ["msg": "✅ delegate 연결 완료"]) }
  }

  private func processFrame(_ sampleBuffer: CMSampleBuffer) {
    guard isRunning else { return }
    frameCount += 1

    let timestampMs = Int(CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds * 1000)
    var landmarks = [Float](repeating: 0, count: inputSize)
    var handDetected = false

    if let landmarker = handLandmarker {
      do {
        let mpImage = try MPImage(sampleBuffer: sampleBuffer)
        let result = try landmarker.detect(videoFrame: mpImage, timestampInMilliseconds: timestampMs)
        let multiHandLandmarks = result.landmarks
        if !multiHandLandmarks.isEmpty {
          handDetected = true
          handDetectedCount += 1
          for (i, handLandmarks) in multiHandLandmarks.prefix(2).enumerated() {
            let offset = i * 63
            for (j, lm) in handLandmarks.enumerated() {
              landmarks[offset + j * 3] = lm.x
              landmarks[offset + j * 3 + 1] = lm.y
              landmarks[offset + j * 3 + 2] = lm.z
            }
          }
        }
        if frameCount % 30 == 0 {
          DispatchQueue.main.async {
            self.sendEvent("onDebug", ["msg": "frame:\(self.frameCount) hand:\(self.handDetectedCount) detected:\(handDetected)"])
          }
        }
      } catch {
        if frameCount % 30 == 0 {
          DispatchQueue.main.async { self.sendEvent("onDebug", ["msg": "❌ MPImage 오류: \(error)"]) }
        }
      }
    }

    frameBuffer.append(landmarks)
    if frameBuffer.count > sequenceLen { frameBuffer.removeFirst() }

    if frameBuffer.count == sequenceLen {
      let handCount = frameBuffer.filter { $0.contains(where: { $0 != 0 }) }.count
      let handRatio = Float(handCount) / Float(sequenceLen)
      if handRatio >= 0.5 {
        predictGesture(handDetected: handDetected)
      } else {
        DispatchQueue.main.async {
          self.sendEvent("onGestureResult", ["gesture": "", "gestureKo": "", "score": 0, "isCorrect": false, "handDetected": false])
        }
      }
      frameBuffer = []
    }
  }

  private func softmax(_ logits: [Float]) -> [Float] {
    let maxLogit = logits.max() ?? 0
    let exps = logits.map { exp($0 - maxLogit) }
    let sumExps = exps.reduce(0, +)
    return exps.map { $0 / sumExps }
  }

  private func predictGesture(handDetected: Bool) {
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
        // logit 값 추출
        var logits = [Float]()
        for i in 0..<labels.count {
          logits.append(outputArray[i].floatValue)
        }

        // softmax로 확률 계산
        let probs = softmax(logits)
        let maxProb = probs.max() ?? 0
        let maxIdx = probs.firstIndex(of: maxProb) ?? 0

        DispatchQueue.main.async {
          self.sendEvent("onDebug", ["msg": "probs: \(probs.map { String(format: "%.2f", $0) }.joined(separator: ","))"])
        }

        // confidence threshold 체크
        if maxProb >= self.confidenceThreshold {
          let confidence = Int(maxProb * 100)
          let gesture = self.labels[maxIdx]
          let gestureKo = self.labelsKo[gesture] ?? gesture
          DispatchQueue.main.async {
            self.sendEvent("onGestureResult", [
              "gesture": gesture, "gestureKo": gestureKo,
              "score": confidence, "isCorrect": true,
              "handDetected": handDetected
            ])
          }
        } else {
          DispatchQueue.main.async {
            self.sendEvent("onGestureResult", [
              "gesture": "", "gestureKo": "", "score": 0,
              "isCorrect": false, "handDetected": handDetected
            ])
          }
        }
      }
    } catch {
      print("예측 오류:", error)
    }
  }
}
