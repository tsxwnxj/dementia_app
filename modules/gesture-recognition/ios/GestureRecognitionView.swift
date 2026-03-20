import ExpoModulesCore
import AVFoundation

class GestureRecognitionView: ExpoView {
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private(set) var captureSession: AVCaptureSession?
  var onSessionReady: ((AVCaptureSession) -> Void)?

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
      return
    }

    session.addInput(input)
    captureSession = session

    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = bounds
    self.layer.insertSublayer(layer, at: 0)
    previewLayer = layer

    DispatchQueue.global(qos: .background).async {
      session.startRunning()
      DispatchQueue.main.async {
        self.onSessionReady?(session)
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }
}
