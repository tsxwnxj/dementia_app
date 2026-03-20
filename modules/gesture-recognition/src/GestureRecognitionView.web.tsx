import * as React from 'react';

import { GestureRecognitionViewProps } from './GestureRecognition.types';

export default function GestureRecognitionView(props: GestureRecognitionViewProps) {
  return (
    <div>
      <iframe
        style={{ flex: 1 }}
        src={props.url}
        onLoad={() => props.onLoad({ nativeEvent: { url: props.url } })}
      />
    </div>
  );
}
