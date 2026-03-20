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
      self.setupHandLandmarker()
    }

    AsyncFunction("startDetection") { (promise: Promise) in
      self.isRunning = true
      self.frameBuffer = []
      self.frameCount = 0
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
      print("[GestureRecognition] ❌ hand_landmarker.task 없음")
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
      print("[GestureRecognition] ✅ HandLandmarker 초기화 완료")
    } catch {
      print("[GestureRecognition] ❌ HandLandmarker 초기화 실패:", error)
    }
  }

  private func loadCoreMLModel() throws {
    if let modelURL = Bundle.main.url(forResource: "gesture_final", withExtension: "mlmodelc") {
      mlModel = try MLModel(contentsOf: modelURL)
      print("[GestureRecognition] ✅ CoreML 로드 완료 (mlmodelc)")
    } else if let modelURL = Bundle.main.url(forResource: "gesture_final", withExtension: "mlpackage") {
      let compiledURL = try MLModel.compileModel(at: modelURL)
      mlModel = try MLModel(contentsOf: compiledURL)
      print("[GestureRecognition] ✅ CoreML 로드 완료 (mlpackage)")
    } else {
      throw NSError(domain: "GestureRecognition", code: 1, userInfo: [NSLocalizedDescriptionKey: "모델 파일을 찾을 수 없습니다"])
    }
  }

  // 뷰에서 이미 만든 output에 delegate만 붙임
  func attachOutput(to session: AVCaptureSession, existingOutput: AVCaptureVideoDataOutput) {
    cameraDelegate.onFrame = { [weak self] sampleBuffer in
      self?.processFrame(sampleBuffer)
    }
    existingOutput.setSampleBufferDelegate(cameraDelegate, queue: DispatchQueue(label: "gesture.camera"))
    print("[GestureRecognition] ✅ delegate 연결 완료")
  }

  private func processFrame(_ sampleBuffer: CMSampleBuffer) {
    guard isRunning else { return }

    frameCount += 1
    let timestampMs = Int(CMSampleBufferGetPresentationTimeStamp(sampleBuffer).seconds * 1000)
    var landmarks = [Float](repeating: 0, count: inputSize)
    var handDetected = false

    if let landmarker = handLandmarker,
       let mpImage = try? MPImage(sampleBuffer: sampleBuffer) {
      if let result = try? landmarker.detect(videoFrame: mpImage, timestampInMilliseconds: timestampMs) {
        let multiHandLandmarks = result.landmarks
        if !multiHandLandmarks.isEmpty {
          handDetected = true
          for (i, handLandmarks) in multiHandLandmarks.prefix(2).enumerated() {
            let offset = i * 63
            for (j, lm) in handLandmarks.enumerated() {
              landmarks[offset + j * 3] = lm.x
              landmarks[offset + j * 3 + 1] = lm.y
              landmarks[offset + j * 3 + 2] = lm.z
            }
          }
        }
      }
    }

    frameBuffer.append(landmarks)
    if frameBuffer.count > sequenceLen {
      frameBuffer.removeFirst()
    }

    if frameBuffer.count == sequenceLen {
      let handCount = frameBuffer.filter { $0.contains(where: { $0 != 0 }) }.count
      let handRatio = Float(handCount) / Float(sequenceLen)
      if handRatio >= 0.5 {
        predictGesture(handDetected: handDetected)
      } else {
        DispatchQueue.main.async {
          self.sendEvent("onGestureResult", [
            "gesture": "",
            "gestureKo": "",
            "score": 0,
            "isCorrect": false,
            "handDetected": false
          ])
        }
      }
      frameBuffer = []
    }
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
            "isCorrect": confidence >= 70,
            "handDetected": handDetected
          ])
        }
      }
    } catch {
      print("[GestureRecognition] ❌ 예측 오류:", error)
    }
  }
}
