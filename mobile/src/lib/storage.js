import AsyncStorage from '@react-native-async-storage/async-storage';

const MOMENTS_KEY = 'moments.archive.v1';
const SETTINGS_KEY = 'moments.settings.v1';

export const defaultSettings = {
  username: 'ArchiveKeeper',
  apiBaseUrl: 'http://10.0.2.2:3000',
};

export async function loadMoments() {
  try {
    const rawValue = await AsyncStorage.getItem(MOMENTS_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export async function persistMoments(moments) {
  try {
    await AsyncStorage.setItem(MOMENTS_KEY, JSON.stringify(moments));
  } catch (error) {
    // Ignore persistence failures until a dedicated error surface exists.
  }
}

export async function loadSettings() {
  try {
    const rawValue = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!rawValue) {
      return defaultSettings;
    }

    const parsed = JSON.parse(rawValue);
    return {
      username: parsed.username || defaultSettings.username,
      apiBaseUrl: parsed.apiBaseUrl || defaultSettings.apiBaseUrl,
    };
  } catch (error) {
    return defaultSettings;
  }
}

export async function persistSettings(settings) {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // Ignore persistence failures until a dedicated error surface exists.
  }
}
