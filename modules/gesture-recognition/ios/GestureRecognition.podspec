Pod::Spec.new do |s|
  s.name           = 'GestureRecognition'
  s.version        = '1.0.0'
  s.summary        = 'Gesture Recognition with MediaPipe and CoreML'
  s.description    = 'AVCaptureSession + MediaPipe Hands + CoreML CNN-LSTM'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '15.1',
  }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'MediaPipeTasksVision'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
