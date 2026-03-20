import ExpoModulesCore
import AVFoundation

class GestureRecognitionView: ExpoView {
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private(set) var captureSession: AVCaptureSession?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    setupCamera()
  }

  private func setupCamera() {
    let session = AVCaptureSession()
    session.sessionPreset = .medium

    guard let frontCamera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .front),
          let input = try? AVCaptureDeviceInput(device: frontCamera) else {
      print("[GestureRecognitionView] ❌ 카메라 입력 실패")
      return
    }

    session.addInput(input)

    // BGRA 포맷으로 output 먼저 추가
    let output = AVCaptureVideoDataOutput()
    output.videoSettings = [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
    ]
    if session.canAddOutput(output) {
      session.addOutput(output)
    }

    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = bounds
    self.layer.insertSublayer(layer, at: 0)
    previewLayer = layer
    captureSession = session

    DispatchQueue.global(qos: .background).async {
      session.startRunning()
      DispatchQueue.main.async {
        GestureRecognitionModule.shared?.attachOutput(to: session, existingOutput: output)
        print("[GestureRecognitionView] ✅ 카메라 세션 시작")
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }
}
