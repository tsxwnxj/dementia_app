import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './GestureRecognition.types';

type GestureRecognitionModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class GestureRecognitionModule extends NativeModule<GestureRecognitionModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(GestureRecognitionModule, 'GestureRecognitionModule');
