import React, { createContext, useContext, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type FontSize = 'small' | 'medium' | 'large';

interface FontSizeContextType {
  fontSize: FontSize;
  fontScale: number;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextType>({
  fontSize: 'medium',
  fontScale: 1,
  setFontSize: () => {},
});

export const fontScales = {
  small: 0.85,
  medium: 1.1,
  large: 1.4,
};

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');

  const setFontSize = async (size: FontSize) => {
    setFontSizeState(size);
    await AsyncStorage.setItem('fontSize', size);
  };

  // 앱 시작 시 저장된 값 불러오기
  React.useEffect(() => {
    AsyncStorage.getItem('fontSize').then((val) => {
      if (val === 'small' || val === 'medium' || val === 'large') {
        setFontSizeState(val);
      }
    });
  }, []);

  return (
    <FontSizeContext.Provider value={{ fontSize, fontScale: fontScales[fontSize], setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => useContext(FontSizeContext);