import React from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {assets} from '../constants/assets';

export function HomeScreen({moments, onRecord, settings}) {
  const latestMoment = moments[0];

  return (
    <ImageBackground
      imageStyle={styles.roomImage}
      source={assets.crtRoom}
      style={styles.room}>
      <View style={styles.roomShade} />

      <View style={styles.brandTape}>
        <Image source={assets.maskingTape} style={styles.brandTapeImage} />
        <Text style={styles.brandTapeText}>MOMENTS / HOME VIDEO</Text>
      </View>

      <Pressable
        accessibilityHint="Opens the camera to record a three to five second clip"
        accessibilityLabel="Record a moment"
        onPress={onRecord}
        style={({pressed}) => [
          styles.tvScreen,
          pressed ? styles.tvScreenPressed : null,
        ]}>
        <View style={styles.scanlines} pointerEvents="none" />
        <View style={styles.recHeader}>
          <Text style={styles.channelLabel}>CH 03</Text>
          <Text style={styles.recLabel}>● REC</Text>
        </View>
        <View style={styles.recordCenter}>
          <View style={styles.recordRing}>
            <View style={styles.recordDot} />
          </View>
          <Text style={styles.recordTitle}>PRESS TO RECORD</Text>
          <Text style={styles.recordTiming}>3–5 SECOND HOME VIDEO</Text>
        </View>
        <Text style={styles.screenFooter}>
          KEEP WHAT YOU WILL WANT TO REMEMBER
        </Text>
      </Pressable>

      <View style={styles.vhsLabel}>
        <Image source={assets.maskingTape} style={styles.vhsLabelImage} />
        <View style={styles.vhsLabelCopy}>
          <Text style={styles.vhsLabelTitle}>
            {latestMoment ? latestMoment.title : 'TAPE 001 / READY'}
          </Text>
          <Text style={styles.vhsLabelMeta}>
            {latestMoment
              ? `${Number(latestMoment.score).toFixed(1)} MEANING SCORE`
              : `${settings.username} / GENUINE MOMENTS ONLY`}
          </Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  room: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#120b0d',
  },
  roomImage: {
    resizeMode: 'cover',
  },
  roomShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 4, 7, 0.13)',
  },
  brandTape: {
    position: 'absolute',
    top: 18,
    alignItems: 'center',
    justifyContent: 'center',
    width: 245,
    height: 54,
    transform: [{rotate: '-1.5deg'}],
  },
  brandTapeImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    opacity: 0.93,
  },
  brandTapeText: {
    color: '#231a18',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  tvScreen: {
    position: 'absolute',
    top: '17.8%',
    left: '13.8%',
    right: '13.8%',
    height: '31.5%',
    overflow: 'hidden',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(171, 230, 225, 0.18)',
    backgroundColor: 'rgba(3, 24, 31, 0.62)',
    shadowColor: '#6ed2d1',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 0},
    elevation: 8,
  },
  tvScreenPressed: {
    opacity: 0.82,
    transform: [{scale: 0.985}],
  },
  scanlines: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#b5f5ed',
  },
  recHeader: {
    paddingTop: 15,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  channelLabel: {
    color: '#a9d1ce',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  recLabel: {
    color: '#ff665d',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  recordCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 5,
  },
  recordRing: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 29,
    borderWidth: 2,
    borderColor: 'rgba(255, 238, 216, 0.72)',
    backgroundColor: 'rgba(4, 16, 20, 0.45)',
  },
  recordDot: {
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#d83f3a',
  },
  recordTitle: {
    marginTop: 12,
    color: '#fff0da',
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  recordTiming: {
    marginTop: 5,
    color: '#9ec5c4',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  screenFooter: {
    paddingBottom: 13,
    color: 'rgba(199, 228, 222, 0.72)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
  vhsLabel: {
    position: 'absolute',
    left: 29,
    right: 29,
    bottom: 108,
    minHeight: 64,
    justifyContent: 'center',
    transform: [{rotate: '0.8deg'}],
  },
  vhsLabelImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
    opacity: 0.9,
  },
  vhsLabelCopy: {
    paddingHorizontal: 26,
    paddingVertical: 12,
  },
  vhsLabelTitle: {
    color: '#261d1b',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  vhsLabelMeta: {
    marginTop: 4,
    color: '#57433c',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
