import { useEffect, useState } from 'react';
import * as Font from 'expo-font';
import {
  OpenSans_400Regular,
  OpenSans_600SemiBold,
  OpenSans_700Bold,
} from '@expo-google-fonts/open-sans';

export const useFonts = () => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          'Akira-Extended': require('@/assets/fonts/Akira Expanded.otf'),
          'OpenSans-Regular': OpenSans_400Regular,
          'OpenSans-SemiBold': OpenSans_600SemiBold,
          'OpenSans-Bold': OpenSans_700Bold,
        });
        setFontsLoaded(true);
        console.log('✅ Fonts loaded successfully!');
      } catch (error) {
        console.error('❌ Error loading fonts:', error);
        setFontsLoaded(true); // Continue even if font fails to load
      }
    }

    loadFonts();
  }, []);

  return fontsLoaded;
};
