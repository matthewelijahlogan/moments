import React, {useEffect, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Linking,
  PermissionsAndroid,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {launchCamera} from 'react-native-image-picker';
import {assets} from './src/constants/assets';
import {ArchiveScreen} from './src/components/ArchiveScreen';
import {HomeScreen} from './src/components/HomeScreen';
import {LeaderboardScreen} from './src/components/LeaderboardScreen';
import {ProfileScreen} from './src/components/ProfileScreen';
import {ReviewScreen} from './src/components/ReviewScreen';
import {ResultScreen} from './src/components/ResultScreen';
import {NavButton} from './src/components/ui';
import {
  archiveMoment,
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
import {
  beginOAuth,
  consumeAuthCallback,
  loadAuthSession,
  signOut,
} from './src/lib/auth';

const SCREENS = {
  HOME: 'home',
  REVIEW: 'review',
  ARCHIVE: 'archive',
  LEADERBOARD: 'leaderboard',
  PROFILE: 'profile',
  RESULT: 'result',
};

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permissions = [
    PermissionsAndroid.PERMISSIONS.CAMERA,
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  ];
  const current = await Promise.all(
    permissions.map(permission => PermissionsAndroid.check(permission)),
  );
  if (current.every(Boolean)) {
    return true;
  }

  const result = await PermissionsAndroid.requestMultiple(permissions);

  return permissions.every(
    permission => result[permission] === PermissionsAndroid.RESULTS.GRANTED,
  );
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
  const [pendingAsset, setPendingAsset] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isRefreshingBoard, setIsRefreshingBoard] = useState(false);
  const [authSession, setAuthSession] = useState(null);
  const [authMessage, setAuthMessage] = useState('Checking the tape club guest list…');

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 1650);
    return () => clearTimeout(timer);
  }, []);

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

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    let active = true;

    async function acceptUrl(url) {
      try {
        const session = await consumeAuthCallback(settings.apiBaseUrl, url);
        if (active && session) {
          setAuthSession(session);
          setAuthMessage('Signed in. Your tapes can follow you across devices.');
        }
      } catch (error) {
        if (active) {
          setAuthMessage(error.message);
        }
      }
    }

    loadAuthSession(settings.apiBaseUrl)
      .then(session => {
        if (active) {
          setAuthSession(session);
          setAuthMessage(
            session
              ? 'Signed in. Your tapes can follow you across devices.'
              : 'Sign in to own tapes across phone and web.',
          );
        }
      })
      .catch(error => {
        if (active) {
          setAuthMessage(error.message);
        }
      });

    Linking.getInitialURL().then(acceptUrl);
    const subscription = Linking.addEventListener('url', event =>
      acceptUrl(event.url),
    );

    return () => {
      active = false;
      subscription.remove();
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
    if (moment.cloudId) {
      return;
    }

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

  async function handleRecordMoment() {
    const options = {
      mediaType: 'video',
      durationLimit: 5,
      selectionLimit: 1,
      includeBase64: false,
      cameraType: 'back',
      saveToPhotos: true,
      videoQuality: 'high',
    };

    try {
      const granted = await ensureCameraPermission();
      if (!granted) {
        Alert.alert(
          'Camera permission needed',
          'Allow camera access to record a three-to-five-second moment.',
        );
        return;
      }

      const result = await launchCamera(options);

      if (result.didCancel) {
        return;
      }

      if (result.errorCode) {
        throw new Error(result.errorMessage || result.errorCode);
      }

      const asset = result.assets && result.assets[0];
      if (!asset || !asset.uri) {
        throw new Error('No video was returned from the camera.');
      }

      const capturedDuration = Number(asset.duration) || 0;
      if (capturedDuration > 0 && capturedDuration < 3) {
        Alert.alert(
          'Let the moment breathe',
          'Record at least three seconds so the scorer can read motion, continuity, and human presence.',
        );
        return;
      }

      setPendingAsset(asset);
      setScreen(SCREENS.REVIEW);
    } catch (error) {
      Alert.alert(
        'Analysis failed',
        error.message ||
          'Moments could not score that clip. Confirm the backend URL and try again.',
      );
    }
  }

  async function handleScorePendingMoment() {
    if (!pendingAsset) {
      return;
    }

    setIsAnalyzing(true);
    try {
      const scoredMoment = await scoreMoment({
        asset: pendingAsset,
        apiBaseUrl: settings.apiBaseUrl,
        username: settings.username,
      });
      const nextMoment = {
        id: `moment-${Date.now()}`,
        uri: pendingAsset.uri,
        fileName: pendingAsset.fileName || `moment-${Date.now()}.mp4`,
        mimeType: pendingAsset.type || 'video/mp4',
        createdAt: new Date().toISOString(),
        width: pendingAsset.width || 0,
        height: pendingAsset.height || 0,
        mediaType: 'video',
        durationSeconds:
          Number(scoredMoment.clipDurationSeconds) ||
          Number(pendingAsset.duration) ||
          0,
        ...scoredMoment,
      };

      setActiveMoment(nextMoment);
      setPendingAsset(null);
      setScreen(SCREENS.RESULT);
    } catch (error) {
      Alert.alert(
        'Scoring failed',
        error.message || 'Moments could not score that tape right now.',
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  function handleRetake() {
    setPendingAsset(null);
    setScreen(SCREENS.HOME);
    setTimeout(handleRecordMoment, 150);
  }

  async function handleArchiveActiveMoment() {
    if (!activeMoment) {
      return;
    }

    if (!authSession?.access_token) {
      const locallyArchived = {
        ...activeMoment,
        archivedAt: activeMoment.archivedAt || new Date().toISOString(),
      };
      setMoments(currentMoments => [
        locallyArchived,
        ...currentMoments.filter(moment => moment.id !== activeMoment.id),
      ]);
      setActiveMoment(locallyArchived);
      setScreen(SCREENS.PROFILE);
      Alert.alert(
        'Sign in to archive',
        'Your scored tape is still on this phone. Sign in with Google or Apple to save it to the shared archive.',
      );
      return;
    }

    setIsArchiving(true);
    let momentToArchive = {
      ...activeMoment,
      archivedAt: new Date().toISOString(),
    };
    let cloudArchiveError = null;

    try {
      const cloudResult = await archiveMoment({
        accessToken: authSession.access_token,
        apiBaseUrl: settings.apiBaseUrl,
        clientId: settings.clientId,
        moment: activeMoment,
        username: settings.username,
      });

      momentToArchive = {
        ...momentToArchive,
        cloudId: cloudResult.archive.id,
        cloudArchivedAt: cloudResult.archive.createdAt,
      };
      setFeaturedLeaderboard(currentEntries => {
        const withoutArchivedMoment = currentEntries.filter(
          entry => entry.id !== cloudResult.archive.id,
        );
        return [cloudResult.archive, ...withoutArchivedMoment].sort(
          (left, right) => Number(right.score) - Number(left.score),
        );
      });
    } catch (error) {
      cloudArchiveError = error;
    }

    setMoments(currentMoments => {
      const nextMoments = currentMoments.filter(
        moment => moment.id !== activeMoment.id,
      );

      return [
        momentToArchive,
        ...nextMoments,
      ].slice(0, 64);
    });

    setActiveMoment(momentToArchive);
    setIsArchiving(false);
    setScreen(SCREENS.ARCHIVE);

    if (cloudArchiveError) {
      Alert.alert(
        'Saved on this device',
        `The local archive is safe, but cloud sync was unavailable: ${cloudArchiveError.message}`,
      );
    }
  }

  async function handleOAuth(provider) {
    try {
      setAuthMessage(`Opening ${provider} sign-in…`);
      await beginOAuth(settings.apiBaseUrl, provider);
    } catch (error) {
      setAuthMessage(error.message);
      Alert.alert('Sign-in unavailable', error.message);
    }
  }

  async function handleSignOut() {
    try {
      await signOut(settings.apiBaseUrl);
      setAuthSession(null);
      setAuthMessage('Signed out. Tapes already on this phone remain here.');
    } catch (error) {
      Alert.alert('Could not sign out', error.message);
    }
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
      clientId: settings.clientId || defaultSettings.clientId,
    };

    setSettings(nextSettings);
    setUsernameDraft(nextSettings.username);
    setApiDraft(nextSettings.apiBaseUrl);
    Alert.alert('Profile updated', 'Moments saved your handle and backend URL.');
  }

  const activeMomentSaved = Boolean(
    activeMoment && activeMoment.cloudId,
  );

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
            authMessage={authMessage}
            authUser={authSession?.user || null}
            averageScore={averageScore}
            moments={moments}
            momentsThisMonth={momentsThisMonth}
            onSaveProfile={handleSaveProfile}
            onSignIn={handleOAuth}
            onSignOut={handleSignOut}
            setApiDraft={setApiDraft}
            setUsernameDraft={setUsernameDraft}
            topScore={topScore}
            usernameDraft={usernameDraft}
          />
        );
      case SCREENS.REVIEW:
        return (
          <ReviewScreen
            asset={pendingAsset}
            onRetake={handleRetake}
            onScore={handleScorePendingMoment}
          />
        );
      case SCREENS.RESULT:
        return (
          <ResultScreen
            activeMomentSaved={activeMomentSaved}
            isArchiving={isArchiving}
            moment={activeMoment}
            onAnalyzeAnother={() => setScreen(SCREENS.HOME)}
            onArchive={handleArchiveActiveMoment}
          />
        );
      case SCREENS.HOME:
      default:
        return (
          <HomeScreen
            moments={moments}
            onRecord={handleRecordMoment}
            settings={settings}
          />
        );
    }
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#14110f" />
        {showSplash || !hydrated ? (
          <View style={styles.splashScreen}>
            <Image source={assets.splash} style={styles.splashImage} />
          </View>
        ) : (
          <>
        <View style={styles.appShell}>
          {screen !== SCREENS.HOME ? (
            <>
              <Image source={assets.tape} style={styles.backgroundTape} />
              <Image source={assets.hero} style={styles.backgroundHero} />
            </>
          ) : null}
          {renderContent()}
          {screen !== SCREENS.REVIEW ? (
          <View style={styles.bottomNav}>
            <NavButton
              active={screen === SCREENS.HOME}
              label="REC"
              symbol="●"
              onPress={() => setScreen(SCREENS.HOME)}
            />
            <NavButton
              active={screen === SCREENS.ARCHIVE}
              label="TAPES"
              symbol="◀"
              onPress={() => setScreen(SCREENS.ARCHIVE)}
            />
            <NavButton
              active={screen === SCREENS.LEADERBOARD}
              label="SCORES"
              symbol="▲"
              onPress={() => setScreen(SCREENS.LEADERBOARD)}
            />
            <NavButton
              active={screen === SCREENS.PROFILE}
              label="SET"
              symbol="■"
              onPress={() => setScreen(SCREENS.PROFILE)}
            />
          </View>
          ) : null}
        </View>

        {isAnalyzing || isArchiving ? (
          <View style={styles.loadingOverlay}>
            <ImageBackground
              imageStyle={styles.loadingCardImage}
              source={assets.parchment}
              style={styles.loadingCard}>
              <Image source={assets.recordIcon} style={styles.loadingRecord} />
              <ActivityIndicator color="#121212" size="large" />
              <Text style={styles.loadingCardTitle}>
                {isArchiving ? 'Archiving the moment' : 'Scoring the moment'}
              </Text>
              <Text style={styles.loadingCardBody}>
                {isArchiving
                  ? 'Saving the private media file and publishing its score to the community board.'
                  : 'Rewinding the clip through motion, warmth, connection, and content signals.'}
              </Text>
            </ImageBackground>
          </View>
        ) : null}
          </>
        )}
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
  splashScreen: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#17110f',
  },
  splashImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
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
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#2d2926',
    borderRadius: 7,
    paddingHorizontal: 5,
    paddingTop: 9,
    paddingBottom: 8,
    borderWidth: 2,
    borderColor: '#0b0a09',
    borderTopColor: '#756b61',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 7,
    shadowOffset: {width: 0, height: 5},
    elevation: 12,
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
