import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  ImageBackground,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {
  launchCamera,
  launchImageLibrary,
} from 'react-native-image-picker';
import {assets} from './src/constants/assets';
import {ArchiveScreen} from './src/components/ArchiveScreen';
import {HomeScreen} from './src/components/HomeScreen';
import {LeaderboardScreen} from './src/components/LeaderboardScreen';
import {ProfileScreen} from './src/components/ProfileScreen';
import {ResultScreen} from './src/components/ResultScreen';
import {NavButton} from './src/components/ui';
import {
  defaultCommunityLeaderboard,
  fetchLeaderboard,
  normalizeApiBaseUrl,
  scoreMoment,
} from './src/lib/api';
import {
  defaultSettings,
  loadMoments,
  loadSettings,
  persistMoments,
  persistSettings,
} from './src/lib/storage';

const SCREENS = {
  HOME: 'home',
  ARCHIVE: 'archive',
  LEADERBOARD: 'leaderboard',
  PROFILE: 'profile',
  RESULT: 'result',
};

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  const hasPermission = await PermissionsAndroid.check(permission);
  if (hasPermission) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission, {
    title: 'Allow camera access',
    message: 'Moments needs camera access to capture a photo for scoring.',
    buttonPositive: 'Allow',
    buttonNegative: 'Not now',
  });

  return result === PermissionsAndroid.RESULTS.GRANTED;
}

function App() {
  const [screen, setScreen] = useState(SCREENS.HOME);
  const [moments, setMoments] = useState([]);
  const [settings, setSettings] = useState(defaultSettings);
  const [apiDraft, setApiDraft] = useState(defaultSettings.apiBaseUrl);
  const [usernameDraft, setUsernameDraft] = useState(defaultSettings.username);
  const [featuredLeaderboard, setFeaturedLeaderboard] = useState(
    defaultCommunityLeaderboard,
  );
  const [activeMoment, setActiveMoment] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRefreshingBoard, setIsRefreshingBoard] = useState(false);

  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroTranslateY = useRef(new Animated.Value(18)).current;
  const cassetteFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;

    async function hydrateState() {
      const [storedMoments, storedSettings] = await Promise.all([
        loadMoments(),
        loadSettings(),
      ]);

      if (cancelled) {
        return;
      }

      setMoments(storedMoments);
      setSettings(storedSettings);
      setApiDraft(storedSettings.apiBaseUrl);
      setUsernameDraft(storedSettings.username);
      setHydrated(true);
    }

    hydrateState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(heroTranslateY, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(cassetteFloat, {
          toValue: 1,
          duration: 2300,
          useNativeDriver: true,
        }),
        Animated.timing(cassetteFloat, {
          toValue: 0,
          duration: 2300,
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [cassetteFloat, heroOpacity, heroTranslateY]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistMoments(moments);
  }, [hydrated, moments]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    persistSettings(settings);
  }, [hydrated, settings]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let cancelled = false;

    async function refreshLeaderboard() {
      setIsRefreshingBoard(true);

      try {
        const entries = await fetchLeaderboard(settings.apiBaseUrl);
        if (!cancelled) {
          setFeaturedLeaderboard(entries);
        }
      } catch (error) {
        if (!cancelled) {
          setFeaturedLeaderboard(defaultCommunityLeaderboard);
        }
      } finally {
        if (!cancelled) {
          setIsRefreshingBoard(false);
        }
      }
    }

    refreshLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [hydrated, settings.apiBaseUrl]);

  const archivedScores = moments.map(moment => Number(moment.score) || 0);
  const averageScore = archivedScores.length
    ? archivedScores.reduce((sum, score) => sum + score, 0) /
      archivedScores.length
    : 0;
  const topScore = archivedScores.length ? Math.max(...archivedScores) : 0;
  const momentsThisMonth = moments.filter(moment => {
    const createdAt = new Date(moment.createdAt).getTime();
    return createdAt >= Date.now() - 30 * 24 * 60 * 60 * 1000;
  }).length;

  const combinedLeaderboard = [...featuredLeaderboard];
  moments.forEach(moment => {
    combinedLeaderboard.push({
      id: `local-${moment.id}`,
      username: settings.username,
      title: moment.title,
      score: Number(moment.score) || 0,
      summary: moment.summary,
      source: 'Your archive',
    });
  });
  combinedLeaderboard.sort((left, right) => right.score - left.score);

  async function handleAcquireMoment(mode) {
    const picker = mode === 'library' ? launchImageLibrary : launchCamera;
    const isClip = mode === 'clip';
    const options = isClip
      ? {
          mediaType: 'video',
          durationLimit: 5,
          selectionLimit: 1,
          includeBase64: false,
          cameraType: 'back',
          saveToPhotos: true,
          videoQuality: 'high',
        }
      : {
          mediaType: 'photo',
          quality: 0.9,
          selectionLimit: 1,
          includeBase64: false,
          cameraType: 'back',
          saveToPhotos: mode === 'camera',
          maxWidth: 1800,
          maxHeight: 1800,
        };

    try {
      if (mode === 'camera' || mode === 'clip') {
        const granted = await ensureCameraPermission();
        if (!granted) {
          Alert.alert(
            'Camera permission needed',
            'Allow camera access to capture a new photo, or use the library instead.',
          );
          return;
        }
      }

      const result = await picker(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || result.errorCode);
      }

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) {
        throw new Error('No image was returned from the picker.');
      }

      setIsAnalyzing(true);
      const scoredMoment = await scoreMoment({
        asset,
        apiBaseUrl: settings.apiBaseUrl,
        username: settings.username,
      });

      const nextMoment = {
        id: `moment-${Date.now()}`,
        uri: asset.uri,
        fileName: asset.fileName || `moment-${Date.now()}.jpg`,
        mimeType: asset.type || 'image/jpeg',
        createdAt: new Date().toISOString(),
        width: asset.width || 0,
        height: asset.height || 0,
        mediaType:
          scoredMoment.medium ||
          (asset.type && asset.type.toLowerCase().startsWith('video/')
            ? 'video'
            : 'image'),
        durationSeconds:
          Number(scoredMoment.clipDurationSeconds) || Number(asset.duration) || 0,
        ...scoredMoment,
      };

      setActiveMoment(nextMoment);
      setScreen(SCREENS.RESULT);
    } catch (error) {
      Alert.alert(
        'Analysis failed',
        error.message ||
          'Moments could not score that image. Confirm the backend URL and try again.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleArchiveActiveMoment() {
    if (!activeMoment) {
      return;
    }

    setMoments(currentMoments => {
      const nextMoments = currentMoments.filter(
        moment => moment.id !== activeMoment.id,
      );

      return [
        {
          ...activeMoment,
          archivedAt: new Date().toISOString(),
        },
        ...nextMoments,
      ].slice(0, 64);
    });

    setScreen(SCREENS.ARCHIVE);
  }

  function handleOpenMoment(moment) {
    setActiveMoment(moment);
    setScreen(SCREENS.RESULT);
  }

  function handleSaveProfile() {
    const nextSettings = {
      username: usernameDraft.trim() || defaultSettings.username,
      apiBaseUrl:
        normalizeApiBaseUrl(apiDraft) || defaultSettings.apiBaseUrl,
    };

    setSettings(nextSettings);
    setUsernameDraft(nextSettings.username);
    setApiDraft(nextSettings.apiBaseUrl);
    Alert.alert('Profile updated', 'Moments saved your handle and backend URL.');
  }

  const activeMomentSaved = Boolean(
    activeMoment && moments.some(moment => moment.id === activeMoment.id),
  );

  const cassetteLift = cassetteFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -9],
  });

  function renderContent() {
    if (!hydrated) {
      return (
        <View style={styles.loadingScreen}>
          <Image source={assets.banner} style={styles.loadingBanner} />
          <ActivityIndicator color="#f4b65d" size="large" />
          <Text style={styles.loadingLabel}>Loading your memory archive...</Text>
        </View>
      );
    }

    switch (screen) {
      case SCREENS.ARCHIVE:
        return <ArchiveScreen moments={moments} onOpenMoment={handleOpenMoment} />;
      case SCREENS.LEADERBOARD:
        return (
          <LeaderboardScreen
            entries={combinedLeaderboard}
            isRefreshing={isRefreshingBoard}
          />
        );
      case SCREENS.PROFILE:
        return (
          <ProfileScreen
            apiDraft={apiDraft}
            averageScore={averageScore}
            moments={moments}
            momentsThisMonth={momentsThisMonth}
            onSaveProfile={handleSaveProfile}
            setApiDraft={setApiDraft}
            setUsernameDraft={setUsernameDraft}
            topScore={topScore}
            usernameDraft={usernameDraft}
          />
        );
      case SCREENS.RESULT:
        return (
          <ResultScreen
            activeMomentSaved={activeMomentSaved}
            moment={activeMoment}
            onAnalyzeAnother={() => setScreen(SCREENS.HOME)}
            onArchive={handleArchiveActiveMoment}
          />
        );
      case SCREENS.HOME:
      default:
        return (
          <HomeScreen
            cassetteLift={cassetteLift}
            heroOpacity={heroOpacity}
            heroTranslateY={heroTranslateY}
            moments={moments}
            onAcquireMoment={handleAcquireMoment}
            onOpenMoment={handleOpenMoment}
            settings={settings}
          />
        );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#14110f" />
        <View style={styles.appShell}>
          <Image source={assets.tape} style={styles.backgroundTape} />
          <Image source={assets.hero} style={styles.backgroundHero} />
          {renderContent()}
          <View style={styles.bottomNav}>
            <NavButton
              active={screen === SCREENS.HOME}
              label="Home"
              onPress={() => setScreen(SCREENS.HOME)}
            />
            <NavButton
              active={screen === SCREENS.ARCHIVE}
              label="Archive"
              onPress={() => setScreen(SCREENS.ARCHIVE)}
            />
            <NavButton
              active={screen === SCREENS.LEADERBOARD}
              label="Board"
              onPress={() => setScreen(SCREENS.LEADERBOARD)}
            />
            <NavButton
              active={screen === SCREENS.PROFILE}
              label="Profile"
              onPress={() => setScreen(SCREENS.PROFILE)}
            />
          </View>
        </View>

        {isAnalyzing ? (
          <View style={styles.loadingOverlay}>
            <ImageBackground
              imageStyle={styles.loadingCardImage}
              source={assets.parchment}
              style={styles.loadingCard}>
              <Image source={assets.recordIcon} style={styles.loadingRecord} />
              <ActivityIndicator color="#121212" size="large" />
              <Text style={styles.loadingCardTitle}>Scoring the moment</Text>
              <Text style={styles.loadingCardBody}>
                Sending your image through the backend and turning it into a
                meaning profile.
              </Text>
            </ImageBackground>
          </View>
        ) : null}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#14110f',
  },
  appShell: {
    flex: 1,
    backgroundColor: '#14110f',
  },
  backgroundTape: {
    position: 'absolute',
    top: 30,
    left: -120,
    width: 320,
    height: 180,
    opacity: 0.08,
    transform: [{rotate: '-6deg'}],
  },
  backgroundHero: {
    position: 'absolute',
    right: -70,
    top: 90,
    width: 260,
    height: 140,
    opacity: 0.08,
    resizeMode: 'contain',
  },
  loadingScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 60,
  },
  loadingBanner: {
    width: 220,
    height: 70,
    resizeMode: 'contain',
    marginBottom: 18,
  },
  loadingLabel: {
    marginTop: 16,
    color: '#d7c2a3',
  },
  bottomNav: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 14, 12, 0.96)',
    borderRadius: 26,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(247, 196, 122, 0.16)',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(11, 8, 6, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    width: '100%',
    borderRadius: 30,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    overflow: 'hidden',
  },
  loadingCardImage: {
    borderRadius: 30,
    opacity: 0.9,
  },
  loadingRecord: {
    width: 110,
    height: 110,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  loadingCardTitle: {
    marginTop: 12,
    color: '#1f1612',
    fontSize: 22,
    fontWeight: '900',
  },
  loadingCardBody: {
    marginTop: 8,
    color: '#403026',
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default App;
