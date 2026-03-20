import { requireNativeView } from 'expo';
import * as React from 'react';

import { GestureRecognitionViewProps } from './GestureRecognition.types';

const NativeView: React.ComponentType<GestureRecognitionViewProps> =
  requireNativeView('GestureRecognition');

export default function GestureRecognitionView(props: GestureRecognitionViewProps) {
  return <NativeView {...props} />;
}
