import React from 'react';
import {
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {assets} from '../constants/assets';
import {PrimaryButton, SecondaryButton, StatCard} from './ui';

export function ProfileScreen({
  apiDraft,
  authMessage,
  authUser,
  averageScore,
  moments,
  momentsThisMonth,
  onSaveProfile,
  onSignIn,
  onSignOut,
  setApiDraft,
  setUsernameDraft,
  topScore,
  usernameDraft,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Profile and deployment settings</Text>
      <Text style={styles.sectionBody}>
        Point the app at the Render service and choose the handle attached to
        scores you publish to the shared Supabase archive.
      </Text>

      <View style={styles.statsGrid}>
        <StatCard
          label="Top score"
          value={topScore ? topScore.toFixed(1) : '--'}
        />
        <StatCard
          label="Average"
          value={averageScore ? averageScore.toFixed(1) : '--'}
        />
        <StatCard label="Total" value={String(moments.length)} />
        <StatCard label="This month" value={String(momentsThisMonth)} />
      </View>

      <ImageBackground
        imageStyle={styles.parchmentImage}
        source={assets.parchment}
        style={styles.settingsCard}>
        <Text style={styles.settingsLabel}>Display handle</Text>
        <TextInput
          autoCorrect={false}
          onChangeText={setUsernameDraft}
          placeholder="Archive handle"
          placeholderTextColor="#816a4b"
          style={styles.input}
          value={usernameDraft}
        />

        <Text style={styles.settingsLabel}>Backend base URL</Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          onChangeText={setApiDraft}
          placeholder="https://your-render-service.onrender.com"
          placeholderTextColor="#816a4b"
          style={styles.input}
          value={apiDraft}
        />

        <Text style={styles.settingsHint}>
          For your USB-connected Android phone, run `adb reverse tcp:3000 tcp:3000`
          and keep `http://127.0.0.1:3000`. For the Android emulator, use
          `http://10.0.2.2:3000`.
        </Text>

        <PrimaryButton
          label="Save Profile"
          onPress={onSaveProfile}
          style={styles.settingsButton}
        />
      </ImageBackground>

      <View style={styles.authCard}>
        <Text style={styles.authEyebrow}>ARCHIVE IDENTITY</Text>
        <Text style={styles.authTitle}>
          {authUser
            ? authUser.email || authUser.user_metadata?.name || 'Tape keeper'
            : 'Take your tapes with you'}
        </Text>
        <Text style={styles.authBody}>{authMessage}</Text>
        {authUser ? (
          <SecondaryButton label="Sign Out" onPress={onSignOut} />
        ) : (
          <>
            <PrimaryButton
              label="Sign In with Google"
              onPress={() => onSignIn('google')}
            />
            <SecondaryButton
              label="Sign In with Apple"
              onPress={() => onSignIn('apple')}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },
  sectionTitle: {
    color: '#f8ead1',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  sectionBody: {
    marginTop: 8,
    color: '#cbb799',
    lineHeight: 21,
    marginBottom: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  settingsCard: {
    marginTop: 4,
    borderRadius: 28,
    padding: 18,
    overflow: 'hidden',
  },
  parchmentImage: {
    borderRadius: 28,
    opacity: 0.9,
  },
  settingsLabel: {
    color: '#201713',
    fontWeight: '800',
    marginBottom: 8,
    fontSize: 15,
  },
  input: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.38)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    color: '#1f1511',
  },
  settingsHint: {
    color: '#4c392a',
    lineHeight: 19,
    marginBottom: 16,
  },
  settingsButton: {
    marginTop: 6,
  },
  authCard: {
    marginTop: 18,
    padding: 18,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#4c4641',
    backgroundColor: '#24211f',
  },
  authEyebrow: {
    color: '#d8b967',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.7,
  },
  authTitle: {
    marginTop: 7,
    color: '#f8ead1',
    fontSize: 20,
    fontWeight: '900',
  },
  authBody: {
    marginTop: 7,
    marginBottom: 14,
    color: '#cbbca5',
    lineHeight: 19,
  },
});
