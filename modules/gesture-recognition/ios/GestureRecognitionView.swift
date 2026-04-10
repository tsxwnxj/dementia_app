//GestureRecognitionView.swift

import ExpoModulesCore
import AVFoundation
import UIKit

class GestureRecognitionView: ExpoView {
  private var previewLayer: AVCaptureVideoPreviewLayer?
  private(set) var captureSession: AVCaptureSession?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .black
    setupCamera()
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(orientationDidChange),
      name: UIDevice.orientationDidChangeNotification,
      object: nil
    )
    UIDevice.current.beginGeneratingDeviceOrientationNotifications()
  }

  deinit {
    NotificationCenter.default.removeObserver(self)
    UIDevice.current.endGeneratingDeviceOrientationNotifications()
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
        self.updatePreviewOrientation()
        print("[GestureRecognitionView] ✅ 카메라 세션 시작")
      }
    }
  }

  @objc private func orientationDidChange() {
    DispatchQueue.main.async {
      self.updatePreviewOrientation()
    }
  }

  private func updatePreviewOrientation() {
    guard let connection = previewLayer?.connection, connection.isVideoOrientationSupported else { return }
    let deviceOrientation = UIDevice.current.orientation
    switch deviceOrientation {
    case .landscapeLeft:
      connection.videoOrientation = .landscapeRight
    case .landscapeRight:
      connection.videoOrientation = .landscapeLeft
    case .portraitUpsideDown:
      connection.videoOrientation = .portraitUpsideDown
    default:
      connection.videoOrientation = .portrait
    }
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer?.frame = bounds
    updatePreviewOrientation()
  }
}
