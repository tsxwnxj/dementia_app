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

  // ── 데이터 수집 관련 ─────────────────────────────────────
  private var isCollecting = false
  private var collectingGesture = ""
  private var collectBuffer: [[Float]] = []
  private var savedCount = 0
  private var targetCount = 50

  public func definition() -> ModuleDefinition {
    Name("GestureRecognition")
    Events("onGestureResult", "onDebug", "onError", "onCollectProgress", "onCollectComplete")

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

    // ── 데이터 수집 시작 ──────────────────────────────────
    AsyncFunction("startCollecting") { (gesture: String, count: Int, promise: Promise) in
      self.isCollecting = true
      self.collectingGesture = gesture
      self.collectBuffer = []
      self.savedCount = 0
      self.targetCount = count
      self.isRunning = true
      self.frameBuffer = []
      DispatchQueue.main.async {
        self.sendEvent("onDebug", ["msg": "📹 수집 시작: \(gesture) (\(count)개 목표)"])
      }
      promise.resolve(true)
    }

    // ── 데이터 수집 중단 ──────────────────────────────────
    AsyncFunction("stopCollecting") { (promise: Promise) in
      self.isCollecting = false
      self.collectingGesture = ""
      self.collectBuffer = []
      self.isRunning = false
      promise.resolve(self.savedCount)
    }

    // ── 저장된 파일 목록 반환 ─────────────────────────────
    Function("getSavedFiles") { () -> [String] in
      let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      let collectDir = docsDir.appendingPathComponent("gesture_data")
      let files = try? FileManager.default.contentsOfDirectory(atPath: collectDir.path)
      return files ?? []
    }

    // ── 파일 내용 읽기 ────────────────────────────────────
    Function("readFile") { (filename: String) -> String in
      let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      let filePath = docsDir.appendingPathComponent("gesture_data/\(filename)")
      return (try? String(contentsOf: filePath, encoding: .utf8)) ?? ""
    }

    // ── 파일 삭제 ─────────────────────────────────────────
    Function("deleteFile") { (filename: String) -> Bool in
      let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
      let filePath = docsDir.appendingPathComponent("gesture_data/\(filename)")
      return (try? FileManager.default.removeItem(at: filePath)) != nil
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
      } catch {}
    }

    // ── 데이터 수집 모드 ──────────────────────────────────
    if isCollecting {
      collectBuffer.append(landmarks)

      if collectBuffer.count == sequenceLen {
        saveSequence(collectBuffer)
        savedCount += 1

        DispatchQueue.main.async {
          self.sendEvent("onCollectProgress", [
            "gesture": self.collectingGesture,
            "saved": self.savedCount,
            "target": self.targetCount
          ])
        }

        collectBuffer = []

        if savedCount >= targetCount {
          isCollecting = false
          isRunning = false
          DispatchQueue.main.async {
            self.sendEvent("onCollectComplete", [
              "gesture": self.collectingGesture,
              "total": self.savedCount
            ])
          }
        }
      }
      return
    }

    // ── 일반 예측 모드 ────────────────────────────────────
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

  // ── 시퀀스 JSON으로 저장 ───────────────────────────────
private func saveSequence(_ sequence: [[Float]]) {
    let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
    let collectDir = docsDir.appendingPathComponent("gesture_data/\(collectingGesture)")

    try? FileManager.default.createDirectory(at: collectDir, withIntermediateDirectories: true)

    let timestamp = Int(Date().timeIntervalSince1970 * 1000)
    let filename = "\(collectingGesture)_\(timestamp)_\(savedCount).json"
    let filePath = collectDir.appendingPathComponent(filename)

    // ← 로그 추가
    DispatchQueue.main.async {
        self.sendEvent("onDebug", ["msg": "💾 저장 시도: \(filePath.path)"])
    }

    if let jsonData = try? JSONSerialization.data(withJSONObject: sequence),
       let jsonStr = String(data: jsonData, encoding: .utf8) {
        do {
            try jsonStr.write(to: filePath, atomically: true, encoding: .utf8)
            DispatchQueue.main.async {
                self.sendEvent("onDebug", ["msg": "✅ 저장 성공: \(filename)"])
            }
        } catch {
            DispatchQueue.main.async {
                self.sendEvent("onDebug", ["msg": "❌ 저장 실패: \(error)"])
            }
        }
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

      if let outputArray = output.featureValue(for: "var_239")?.multiArrayValue {
        var logits = [Float]()
        for i in 0..<labels.count {
          logits.append(outputArray[i].floatValue)
        }

        let probs = softmax(logits)
        let maxProb = probs.max() ?? 0
        let maxIdx = probs.firstIndex(of: maxProb) ?? 0

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