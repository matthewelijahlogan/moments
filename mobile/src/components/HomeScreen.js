import React from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';
import {assets} from '../constants/assets';

export function HomeScreen({moments, onRecord, settings}) {
  const latestMoment = moments[0];
  const tapeTitle = latestMoment ? latestMoment.title : 'TAPE 001 / READY';
  const tapeMeta = latestMoment
    ? `${Number(latestMoment.score).toFixed(1)} MEANING SCORE`
    : `${settings?.username || 'TAPE KEEPER'} / GENUINE MOMENTS ONLY`;

  return (
    <View style={styles.room}>
      <View pointerEvents="none" style={styles.panelLines}>
        {[1, 2, 3, 4, 5, 6].map(line => <View key={line} style={styles.panelLine} />)}
      </View>
      <View style={styles.brandTape}>
        <Image source={assets.maskingTape} style={styles.tapeImage} />
        <Text style={styles.brandTapeText}>MOMENTS / HOME VIDEO</Text>
      </View>
      <View style={styles.tv}>
        <View style={styles.tvLip} />
        <Pressable accessibilityHint="Opens the camera to record a two to four second clip" accessibilityLabel="Record a moment" onPress={onRecord} style={({pressed}) => [styles.tvScreen, pressed ? styles.tvScreenPressed : null]}>
          <View style={styles.screenGlow} />
          <View style={styles.recHeader}><Text style={styles.channelLabel}>CH 03</Text><Text style={styles.recLabel}>REC</Text></View>
          <View style={styles.recordCenter}>
            <View style={styles.recordRing}><View style={styles.recordDot} /></View>
            <Text style={styles.recordTitle}>PRESS TO RECORD</Text>
            <Text style={styles.recordTiming}>2–4 SECOND HOME VIDEO</Text>
          </View>
          <Text style={styles.screenFooter}>KEEP WHAT YOU WILL WANT TO REMEMBER</Text>
        </Pressable>
        <View style={styles.tvControls}>
          <View style={styles.speaker}>{[1, 2, 3, 4, 5].map(slot => <View key={slot} style={styles.speakerSlot} />)}</View>
          <View style={styles.knob} /><View style={styles.knobSmall} />
        </View>
      </View>
      <View style={styles.vcr}>
        <View style={styles.vcrSlot}><Text style={styles.vcrSlotText}>VHS HQ</Text></View>
        <View style={styles.vcrDisplay}><Text style={styles.vcrDisplayText}>00:00</Text></View>
        <View style={styles.vcrButtonRow}>{['REW', 'PLAY', 'STOP', 'REC'].map(label => <View key={label} style={styles.vcrButton}><Text style={label === 'REC' ? styles.vcrRecord : styles.vcrButtonText}>{label}</Text></View>)}</View>
      </View>
      <View style={styles.vhsLabel}>
        <Image source={assets.maskingTape} style={styles.tapeImage} />
        <View style={styles.vhsLabelCopy}><Text numberOfLines={1} style={styles.vhsLabelTitle}>{tapeTitle}</Text><Text style={styles.vhsLabelMeta}>{tapeMeta}</Text></View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  room: {flex: 1, alignItems: 'center', paddingTop: 72, paddingBottom: 82, backgroundColor: '#8e4f59', overflow: 'hidden'},
  panelLines: {...StyleSheet.absoluteFillObject, flexDirection: 'row', justifyContent: 'space-evenly', opacity: 0.22}, panelLine: {width: 2, height: '100%', backgroundColor: '#3d212b'},
  brandTape: {position: 'absolute', top: 14, width: 250, height: 52, alignItems: 'center', justifyContent: 'center', transform: [{rotate: '-1.4deg'}], zIndex: 4}, tapeImage: {...StyleSheet.absoluteFillObject, width: '100%', height: '100%', resizeMode: 'stretch'}, brandTapeText: {color: '#241a17', fontSize: 15, fontWeight: '900', letterSpacing: 1.5},
  tv: {width: '91%', maxWidth: 560, padding: 18, paddingBottom: 14, borderRadius: 34, borderWidth: 5, borderColor: '#171615', borderTopColor: '#5f5952', backgroundColor: '#2b2926', shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: {width: 0, height: 10}, elevation: 18}, tvLip: {position: 'absolute', top: 8, right: 42, left: 42, height: 4, borderRadius: 2, backgroundColor: '#777067', opacity: 0.42},
  tvScreen: {width: '100%', aspectRatio: 4 / 3, overflow: 'hidden', borderRadius: 40, borderWidth: 7, borderColor: '#111212', backgroundColor: '#063236', shadowColor: '#7fe0df', shadowOpacity: 0.24, shadowRadius: 14, elevation: 7}, tvScreenPressed: {opacity: 0.86, transform: [{scale: 0.99}]}, screenGlow: {...StyleSheet.absoluteFillObject, borderRadius: 34, backgroundColor: 'rgba(61, 147, 151, 0.12)', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(204, 255, 247, 0.12)'},
  recHeader: {paddingTop: 17, paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'space-between'}, channelLabel: {color: '#a9d1ce', fontSize: 11, fontWeight: '800', letterSpacing: 1.5}, recLabel: {color: '#ff665d', fontSize: 11, fontWeight: '900', letterSpacing: 1.4}, recordCenter: {flex: 1, alignItems: 'center', justifyContent: 'center'}, recordRing: {width: 64, height: 64, alignItems: 'center', justifyContent: 'center', borderRadius: 32, borderWidth: 3, borderColor: 'rgba(255, 238, 216, 0.78)', backgroundColor: 'rgba(4, 16, 20, 0.45)'}, recordDot: {width: 35, height: 35, borderRadius: 18, backgroundColor: '#dc433d'}, recordTitle: {marginTop: 14, color: '#fff0da', fontSize: 18, fontWeight: '900', letterSpacing: 1.2}, recordTiming: {marginTop: 5, color: '#9ec5c4', fontSize: 10, fontWeight: '700', letterSpacing: 1.1}, screenFooter: {paddingBottom: 14, color: 'rgba(199, 228, 222, 0.72)', fontSize: 8, fontWeight: '700', letterSpacing: 0.8, textAlign: 'center'},
  tvControls: {height: 48, paddingTop: 13, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center'}, speaker: {flex: 1, flexDirection: 'row', gap: 6}, speakerSlot: {width: 4, height: 22, borderRadius: 2, backgroundColor: '#111'}, knob: {width: 30, height: 30, borderRadius: 15, borderWidth: 3, borderColor: '#111', backgroundColor: '#46413c'}, knobSmall: {width: 18, height: 18, marginLeft: 10, borderRadius: 9, borderWidth: 2, borderColor: '#111', backgroundColor: '#46413c'},
  vcr: {width: '82%', maxWidth: 500, height: 92, marginTop: 7, padding: 10, borderWidth: 3, borderColor: '#090909', borderTopColor: '#514c47', borderRadius: 5, backgroundColor: '#242220', shadowColor: '#000', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: {width: 0, height: 5}, elevation: 12}, vcrSlot: {height: 24, justifyContent: 'center', paddingLeft: 12, borderWidth: 2, borderColor: '#0d0d0d', backgroundColor: '#171615'}, vcrSlotText: {color: '#77716b', fontSize: 7, fontWeight: '800'}, vcrDisplay: {position: 'absolute', top: 43, left: 13, width: 62, height: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: '#081919', borderWidth: 1, borderColor: '#020505'}, vcrDisplayText: {color: '#7ab7a7', fontSize: 10, letterSpacing: 1}, vcrButtonRow: {position: 'absolute', right: 11, bottom: 10, flexDirection: 'row', gap: 5}, vcrButton: {width: 40, height: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#57524c', borderBottomColor: '#080808', backgroundColor: '#302e2b'}, vcrButtonText: {color: '#aaa198', fontSize: 7, fontWeight: '800'}, vcrRecord: {color: '#d85046', fontSize: 7, fontWeight: '900'},
  vhsLabel: {width: '78%', maxWidth: 460, minHeight: 58, marginTop: 16, justifyContent: 'center', transform: [{rotate: '0.7deg'}]}, vhsLabelCopy: {paddingHorizontal: 24, paddingVertical: 10}, vhsLabelTitle: {color: '#261d1b', fontSize: 13, fontWeight: '900', letterSpacing: 0.8}, vhsLabelMeta: {marginTop: 4, color: '#57433c', fontSize: 9, fontWeight: '800', letterSpacing: 1},
});
