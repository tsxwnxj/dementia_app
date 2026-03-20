import ExpoModulesCore
import AVFoundation

class GestureRecognitionView: ExpoView {
  private var previewLayer: AVCaptureVideoPreviewLayer?
  
  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
  }
  
  func setupPreview(with session: AVCaptureSession) {
    previewLayer?.removeFromSuperlayer()
    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = bounds
    self.layer.insertSublayer(layer, at: 0)
    previewLayer = layer
  }
  
  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
  }
}
