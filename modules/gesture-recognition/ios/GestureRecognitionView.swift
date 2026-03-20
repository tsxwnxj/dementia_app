import ExpoModulesCore
import AVFoundation

class GestureRecognitionView: ExpoView {
  private var previewLayer: AVCaptureVideoPreviewLayer?

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

    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = bounds
    self.layer.insertSublayer(layer, at: 0)
    previewLayer = layer

    DispatchQueue.global(qos: .background).async {
      session.startRunning()
      DispatchQueue.main.async {
        GestureRecognitionModule.shared?.attachOutput(to: session)
      }
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }
}
