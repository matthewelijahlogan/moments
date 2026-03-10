import React from 'react';
import {
  Animated,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {assets} from '../constants/assets';
import {normalizeApiBaseUrl} from '../lib/api';
import {ActionCard} from './ui';

export function HomeScreen({
  cassetteLift,
  heroOpacity,
  heroTranslateY,
  moments,
  onAcquireMoment,
  onOpenMoment,
  settings,
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}>
      <Animated.View
        style={[
          styles.heroCard,
          {
            opacity: heroOpacity,
            transform: [{translateY: heroTranslateY}],
          },
        ]}>
        <ImageBackground
          imageStyle={styles.parchmentImage}
          source={assets.parchment}
          style={styles.heroPaper}>
          <Image source={assets.banner} style={styles.bannerImage} />
          <Text style={styles.heroEyebrow}>Meaning scored from memory signals</Text>
          <Text style={styles.heroTitle}>
            A retro social camera that rates photos for presence, depth, and human weight.
          </Text>
          <Text style={styles.heroBody}>
            Moments treats each image like a memory artifact. It looks for warmth,
            narrative tension, atmosphere, composition, and coherence instead of pure polish.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>API</Text>
              <Text style={styles.metaPillValue}>
                {normalizeApiBaseUrl(settings.apiBaseUrl)}
              </Text>
            </View>
            <View style={styles.metaPill}>
              <Text style={styles.metaPillLabel}>Handle</Text>
              <Text style={styles.metaPillValue}>{settings.username}</Text>
            </View>
          </View>
        </ImageBackground>
      </Animated.View>

      <View style={styles.actionStack}>
        <ActionCard
          title="Shoot a Moment"
          body="Open the camera, capture a real-world fragment, and send it straight to the scoring engine."
          image={<Image source={assets.recordIcon} style={styles.actionIcon} />}
          accent="#ff9c73"
          onPress={() => onAcquireMoment('camera')}
        />
        <ActionCard
          title="Choose from Archive"
          body="Import an existing photo and see how your personal history ranks for meaning."
          image={<Image source={assets.playIcon} style={styles.actionIcon} />}
          accent="#f3d87c"
          onPress={() => onAcquireMoment('library')}
        />
      </View>

      <Animated.View
        style={[
          styles.featureStrip,
          {
            transform: [{translateY: cassetteLift}],
          },
        ]}>
        <Image source={assets.hero} style={styles.featureStripArt} />
        <View style={styles.featureStripText}>
          <Text style={styles.featureStripTitle}>Archive language, not vanity metrics</Text>
          <Text style={styles.featureStripBody}>
            Every score returns a breakdown for presence, depth, connection,
            atmosphere, and coherence so the rating reads like editorial reasoning,
            not a random number.
          </Text>
        </View>
      </Animated.View>

      {moments.length > 0 ? (
        <Pressable onPress={() => onOpenMoment(moments[0])} style={styles.latestCard}>
          <Image source={{uri: moments[0].uri}} style={styles.latestImage} />
          <View style={styles.latestBody}>
            <Text style={styles.latestLabel}>Latest archived moment</Text>
            <Text style={styles.latestTitle}>{moments[0].title}</Text>
            <Text style={styles.latestSummary} numberOfLines={3}>
              {moments[0].summary}
            </Text>
            <Text style={styles.latestScore}>
              {Number(moments[0].score).toFixed(1)} / 100
            </Text>
          </View>
        </Pressable>
      ) : (
        <View style={styles.emptyStateCard}>
          <Image source={assets.maskingTape} style={styles.emptyTape} />
          <Text style={styles.emptyStateTitle}>No archived moments yet</Text>
          <Text style={styles.emptyStateBody}>
            Analyze a photo and your first memory card will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: '#1f1915',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(250, 206, 141, 0.22)',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: {width: 0, height: 8},
    elevation: 8,
  },
  heroPaper: {
    padding: 22,
  },
  parchmentImage: {
    borderRadius: 28,
    opacity: 0.9,
  },
  bannerImage: {
    width: '100%',
    height: 78,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  heroEyebrow: {
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: '#624731',
    marginBottom: 8,
    fontWeight: '700',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    color: '#17110e',
    fontWeight: '800',
    marginBottom: 12,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2f261f',
  },
  heroMetaRow: {
    marginTop: 18,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metaPill: {
    backgroundColor: 'rgba(23, 17, 14, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  metaPillLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: '#7d5a40',
    fontWeight: '700',
  },
  metaPillValue: {
    marginTop: 4,
    color: '#211913',
    fontSize: 13,
    fontWeight: '700',
  },
  actionStack: {
    marginTop: 18,
  },
  actionIcon: {
    width: 60,
    height: 60,
    resizeMode: 'contain',
  },
  featureStrip: {
    marginTop: 8,
    borderRadius: 28,
    backgroundColor: '#18120f',
    padding: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 92, 0.15)',
  },
  featureStripArt: {
    width: '100%',
    height: 142,
    resizeMode: 'cover',
    borderRadius: 20,
    marginBottom: 16,
  },
  featureStripText: {
    paddingHorizontal: 2,
  },
  featureStripTitle: {
    color: '#f8ebd2',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  featureStripBody: {
    color: '#ccb79a',
    fontSize: 14,
    lineHeight: 21,
  },
  latestCard: {
    marginTop: 16,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: '#211913',
    borderWidth: 1,
    borderColor: 'rgba(255, 204, 126, 0.14)',
  },
  latestImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  latestBody: {
    padding: 18,
  },
  latestLabel: {
    color: '#a88a63',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontSize: 11,
    fontWeight: '700',
  },
  latestTitle: {
    marginTop: 8,
    color: '#f6e5c7',
    fontSize: 22,
    fontWeight: '800',
  },
  latestSummary: {
    marginTop: 8,
    color: '#d3bfa3',
    lineHeight: 20,
  },
  latestScore: {
    marginTop: 12,
    color: '#ffb74a',
    fontSize: 24,
    fontWeight: '900',
  },
  emptyStateCard: {
    marginTop: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
    borderRadius: 28,
    backgroundColor: '#1f1814',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 128, 0.12)',
  },
  emptyTape: {
    width: 220,
    height: 70,
    resizeMode: 'stretch',
    marginBottom: 12,
    opacity: 0.42,
  },
  emptyStateTitle: {
    color: '#f8ead1',
    fontSize: 20,
    fontWeight: '800',
  },
  emptyStateBody: {
    marginTop: 8,
    color: '#c7b59a',
    textAlign: 'center',
    lineHeight: 21,
  },
});
