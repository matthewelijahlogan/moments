import React from 'react';
import {
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {assets} from '../constants/assets';
import {PrimaryButton, ScorePill, SecondaryButton} from './ui';

export function ResultScreen({
  activeMomentSaved,
  isArchiving,
  moment,
  onAnalyzeAnother,
  onArchive,
}) {
  if (!moment) {
    return null;
  }

  const isVideo = moment.mediaType === 'video';
  const durationLabel = Number(
    moment.clipDurationSeconds || moment.durationSeconds || 0,
  ).toFixed(1);

  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>Moment analysis</Text>
      <Text style={styles.sectionBody}>
        The score is shaped by memory density, human warmth, visual stability,
        and how strongly the clip holds together as an experience.
      </Text>

      {isVideo ? (
        <ImageBackground
          imageStyle={styles.videoPreviewImage}
          source={assets.hero}
          style={styles.videoPreview}>
          <Image source={assets.playIcon} style={styles.videoPreviewIcon} />
          <Text style={styles.videoPreviewTitle}>Recorded clip</Text>
          <Text style={styles.videoPreviewBody}>{durationLabel} second sequence</Text>
        </ImageBackground>
      ) : (
        <Image source={{uri: moment.uri}} style={styles.resultImage} />
      )}

      <ImageBackground
        imageStyle={styles.parchmentImage}
        source={assets.parchment}
        style={styles.resultCard}>
        <Text style={styles.resultEyebrow}>
          {moment.tier}
          {isVideo ? ` • ${durationLabel}s clip` : ''}
        </Text>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{moment.title}</Text>
          <Text style={styles.resultScore}>{Number(moment.score).toFixed(1)}</Text>
        </View>
        <Text style={styles.resultSummary}>{moment.summary}</Text>

        <View style={styles.pillRow}>
          {Object.entries(moment.dimensions || {}).map(([label, value]) => (
            <ScorePill key={label} label={label} value={value} />
          ))}
        </View>
      </ImageBackground>

      {(moment.explanation || []).map((line, index) => (
        <View key={`${moment.id}-reason-${index}`} style={styles.reasonCard}>
          <Image source={assets.maskingTape} style={styles.reasonTape} />
          <Text style={styles.reasonText}>{line}</Text>
        </View>
      ))}

      <View style={styles.resultActions}>
        <PrimaryButton
          label={
            activeMomentSaved
              ? 'Saved to Archive'
              : isArchiving
                ? 'Archiving...'
                : 'Archive Result'
          }
          onPress={onArchive}
          disabled={activeMomentSaved || isArchiving}
        />
        <SecondaryButton label="Analyze Another" onPress={onAnalyzeAnother} />
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
  resultImage: {
    width: '100%',
    height: 320,
    borderRadius: 28,
    marginBottom: 16,
  },
  videoPreview: {
    width: '100%',
    height: 320,
    borderRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1510',
  },
  videoPreviewImage: {
    borderRadius: 28,
    opacity: 0.24,
    resizeMode: 'cover',
  },
  videoPreviewIcon: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
    marginBottom: 12,
  },
  videoPreviewTitle: {
    color: '#f8ead1',
    fontSize: 24,
    fontWeight: '900',
  },
  videoPreviewBody: {
    marginTop: 8,
    color: '#cfbc9c',
    fontSize: 15,
  },
  resultCard: {
    borderRadius: 28,
    padding: 20,
    marginBottom: 14,
    overflow: 'hidden',
  },
  parchmentImage: {
    borderRadius: 28,
    opacity: 0.9,
  },
  resultEyebrow: {
    color: '#6f5139',
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    fontSize: 11,
    fontWeight: '800',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  resultTitle: {
    flex: 1,
    fontSize: 27,
    lineHeight: 33,
    color: '#1f1712',
    fontWeight: '900',
    paddingRight: 12,
  },
  resultScore: {
    color: '#1f120a',
    fontSize: 32,
    fontWeight: '900',
  },
  resultSummary: {
    marginTop: 12,
    color: '#382d24',
    lineHeight: 22,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
  },
  reasonCard: {
    backgroundColor: '#1f1914',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(249, 198, 122, 0.1)',
  },
  reasonTape: {
    position: 'absolute',
    top: 0,
    left: 16,
    width: 120,
    height: 32,
    resizeMode: 'stretch',
    opacity: 0.35,
  },
  reasonText: {
    color: '#e4d2b7',
    lineHeight: 22,
  },
  resultActions: {
    marginTop: 8,
  },
});
