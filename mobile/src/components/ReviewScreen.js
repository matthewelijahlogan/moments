import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import Video from 'react-native-video';
import {PrimaryButton, SecondaryButton} from './ui';

export function ReviewScreen({asset, onRetake, onScore}) {
  if (!asset) {
    return null;
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.eyebrow}>TAPE JUST EJECTED</Text>
      <Text style={styles.title}>Play it back once.</Text>
      <Text style={styles.copy}>
        The camera is off. Nothing is sent for scoring until you choose to keep
        this tape.
      </Text>

      <View style={styles.tv}>
        <View style={styles.tvScreen}>
          <Video
            controls
            paused={false}
            repeat
            resizeMode="cover"
            source={{uri: asset.uri}}
            style={styles.video}
          />
          <View pointerEvents="none" style={styles.scanline} />
          <Text pointerEvents="none" style={styles.playLabel}>
            PLAY ▶
          </Text>
        </View>
        <View style={styles.deck}>
          <View style={styles.slot} />
          <View style={styles.deckDisplay}>
            <Text style={styles.deckDisplayText}>PLAY</Text>
          </View>
          <View style={styles.knob} />
        </View>
      </View>

      <View style={styles.actions}>
        <PrimaryButton label="BE KIND, REWIND & SCORE" onPress={onScore} />
        <SecondaryButton label="Eject It / Record Again" onPress={onRetake} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 120,
    backgroundColor: '#8e4f59',
  },
  eyebrow: {
    color: '#f2c964',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  title: {
    marginTop: 6,
    color: '#fff0da',
    fontSize: 30,
    fontWeight: '900',
  },
  copy: {
    marginTop: 7,
    marginBottom: 18,
    color: '#ead7c6',
    lineHeight: 20,
  },
  tv: {
    width: '100%',
    padding: 16,
    paddingBottom: 0,
    borderRadius: 30,
    borderWidth: 5,
    borderColor: '#151413',
    borderTopColor: '#5c5650',
    backgroundColor: '#2a2825',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 9},
    elevation: 18,
  },
  tvScreen: {
    width: '100%',
    aspectRatio: 4 / 3,
    overflow: 'hidden',
    borderRadius: 32,
    borderWidth: 7,
    borderColor: '#101111',
    backgroundColor: '#062c30',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  scanline: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(213, 255, 249, 0.13)',
  },
  playLabel: {
    position: 'absolute',
    top: 15,
    left: 18,
    color: '#e7f0e7',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.4,
    textShadowColor: '#000',
    textShadowRadius: 2,
  },
  deck: {
    height: 68,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  slot: {
    flex: 1,
    height: 19,
    borderWidth: 2,
    borderColor: '#0b0a0a',
    backgroundColor: '#181716',
  },
  deckDisplay: {
    width: 48,
    height: 23,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#071817',
  },
  deckDisplayText: {
    color: '#72b8a5',
    fontSize: 8,
    fontWeight: '800',
  },
  knob: {
    width: 26,
    height: 26,
    marginLeft: 10,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: '#111',
    backgroundColor: '#47413c',
  },
  actions: {
    marginTop: 22,
  },
});
