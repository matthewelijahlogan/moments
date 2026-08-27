import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {assets} from '../constants/assets';
import {formatMomentDate} from './ui';

export function ArchiveScreen({moments, onOpenMoment}) {
  if (!moments.length) {
    return (
      <View style={styles.centeredScreen}>
        <Image source={assets.hero} style={styles.emptyHero} />
        <Text style={styles.centeredTitle}>Your archive is empty</Text>
        <Text style={styles.centeredBody}>
          Start from REC and keep a three-to-five-second piece of your day.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Archive</Text>
      <Text style={styles.sectionBody}>
        Every card is stored on this device. When cloud sync is available, its
        private media file is backed up and its grade joins the meaning board.
      </Text>

      {moments.map(moment => (
        <Pressable
          key={moment.id}
          onPress={() => onOpenMoment(moment)}
          style={styles.momentCard}>
          {moment.mediaType === 'video' ? (
            <ImageBackground
              imageStyle={styles.videoPreviewImage}
              source={assets.hero}
              style={styles.videoPreview}>
              <Image source={assets.playIcon} style={styles.videoPreviewIcon} />
              <Text style={styles.videoPreviewTitle}>Clip capture</Text>
              <Text style={styles.videoPreviewBody}>
                {Number(
                  moment.clipDurationSeconds || moment.durationSeconds || 0,
                ).toFixed(1)}
                s sequence
              </Text>
            </ImageBackground>
          ) : (
            <Image source={{uri: moment.uri}} style={styles.momentImage} />
          )}
          <ImageBackground
            imageStyle={styles.parchmentImage}
            source={assets.parchment}
            style={styles.momentMeta}>
            <View style={styles.momentMetaHeader}>
              <Text style={styles.momentCardTitle}>{moment.title}</Text>
              <Text style={styles.momentCardScore}>
                {Number(moment.score).toFixed(1)}
              </Text>
            </View>
            <Text style={styles.momentCardSummary} numberOfLines={3}>
              {moment.summary}
            </Text>
            <Text style={styles.momentCardDate}>
              {formatMomentDate(moment.createdAt)}
            </Text>
          </ImageBackground>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screenScroll: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 120,
  },
  centeredScreen: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 70,
  },
  emptyHero: {
    width: 260,
    height: 130,
    resizeMode: 'contain',
    marginBottom: 22,
  },
  centeredTitle: {
    color: '#f7e6cb',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  centeredBody: {
    marginTop: 10,
    color: '#cab798',
    lineHeight: 22,
    textAlign: 'center',
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
  momentCard: {
    marginBottom: 16,
    borderRadius: 26,
    overflow: 'hidden',
    backgroundColor: '#201915',
    borderWidth: 1,
    borderColor: 'rgba(255, 196, 128, 0.12)',
  },
  momentImage: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  videoPreview: {
    width: '100%',
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1510',
  },
  videoPreviewImage: {
    opacity: 0.24,
    resizeMode: 'cover',
  },
  videoPreviewIcon: {
    width: 58,
    height: 58,
    resizeMode: 'contain',
    marginBottom: 10,
  },
  videoPreviewTitle: {
    color: '#f8ead1',
    fontSize: 22,
    fontWeight: '900',
  },
  videoPreviewBody: {
    marginTop: 6,
    color: '#cfbc9c',
    fontSize: 14,
  },
  momentMeta: {
    padding: 18,
  },
  parchmentImage: {
    borderRadius: 26,
    opacity: 0.9,
  },
  momentMetaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  momentCardTitle: {
    flex: 1,
    color: '#1c1511',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    paddingRight: 12,
  },
  momentCardScore: {
    color: '#20120a',
    fontSize: 24,
    fontWeight: '900',
  },
  momentCardSummary: {
    marginTop: 10,
    color: '#352a22',
    lineHeight: 21,
  },
  momentCardDate: {
    marginTop: 12,
    color: '#7f634a',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '700',
  },
});
