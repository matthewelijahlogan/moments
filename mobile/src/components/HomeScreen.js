import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {assets} from '../constants/assets';

export function HomeScreen({onRecord}) {
  return (
    <View style={styles.screen}>
      <View style={styles.brandTape}>
        <Image source={assets.maskingTape} style={styles.tapeImage} />
        <Text style={styles.brandTapeText}>moments</Text>
      </View>

      <View style={styles.tv}>
        <Pressable
          accessibilityHint="Records a three to five second clip"
          accessibilityLabel="Record a moment"
          onPress={onRecord}
          style={({pressed}) => [
            styles.tvScreen,
            pressed ? styles.tvScreenPressed : null,
          ]}>
          <View style={styles.screenGlow} />
          <View style={styles.recordCenter}>
            <View style={styles.recordRing}>
              <View style={styles.recordDot} />
            </View>
            <Text style={styles.recordTitle}>RECORD</Text>
            <Text style={styles.recordTiming}>3–5 SECONDS</Text>
          </View>
          <Text style={styles.screenFooter}>
            KEEP WHAT YOU WILL WANT TO REMEMBER
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 64,
    paddingHorizontal: 7,
    paddingBottom: 82,
    backgroundColor: '#101313',
  },
  brandTape: {
    position: 'absolute',
    top: 12,
    width: 180,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{rotate: '-1deg'}],
    zIndex: 4,
  },
  tapeImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'stretch',
  },
  brandTapeText: {
    color: '#241a17',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  tv: {
    flex: 1,
    width: '100%',
    maxWidth: 620,
    padding: 8,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#090a0a',
    borderTopColor: '#505754',
    backgroundColor: '#292e2c',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 10},
    elevation: 18,
  },
  tvScreen: {
    flex: 1,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 27,
    borderWidth: 7,
    borderColor: '#080a0a',
    backgroundColor: '#071b1c',
  },
  tvScreenPressed: {
    opacity: 0.88,
    transform: [{scale: 0.995}],
  },
  screenGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(64, 131, 127, 0.09)',
  },
  recordCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordRing: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 41,
    borderWidth: 4,
    borderColor: '#eee3d4',
    backgroundColor: 'rgba(4, 16, 20, 0.45)',
  },
  recordDot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#d84b44',
  },
  recordTitle: {
    marginTop: 16,
    color: '#fff0da',
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 3,
  },
  recordTiming: {
    marginTop: 6,
    color: '#a9bfba',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  screenFooter: {
    paddingBottom: 18,
    color: 'rgba(199, 228, 222, 0.68)',
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
  },
});
