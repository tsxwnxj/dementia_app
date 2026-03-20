// Reexport the native module. On web, it will be resolved to GestureRecognitionModule.web.ts
// and on native platforms to GestureRecognitionModule.ts
export { default } from './src/GestureRecognitionModule';
export { default as GestureRecognitionView } from './src/GestureRecognitionView';
export * from  './src/GestureRecognition.types';
