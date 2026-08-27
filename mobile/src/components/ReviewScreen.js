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
        </View>
      </View>

      <Text style={styles.copy}>
        Camera off. Review your moment, then grade it or record again.
      </Text>
      <View style={styles.actions}>
        <PrimaryButton label="GRADE THIS MOMENT" onPress={onScore} />
        <SecondaryButton label="RECORD AGAIN" onPress={onRetake} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 7,
    paddingTop: 8,
    paddingBottom: 24,
    backgroundColor: '#101313',
  },
  tv: {
    flex: 1,
    width: '100%',
    padding: 8,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#090a0a',
    borderTopColor: '#505754',
    backgroundColor: '#292e2c',
    shadowColor: '#000',
    shadowOpacity: 0.8,
    shadowRadius: 14,
    shadowOffset: {width: 0, height: 9},
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
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  scanline: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(213, 255, 249, 0.08)',
  },
  copy: {
    marginVertical: 13,
    paddingHorizontal: 8,
    color: '#b9c1bc',
    lineHeight: 19,
    textAlign: 'center',
  },
  actions: {
    gap: 8,
  },
});
