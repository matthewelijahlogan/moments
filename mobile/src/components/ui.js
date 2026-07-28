import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

export function ActionCard({accent, body, image, onPress, title}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.actionCard,
        pressed ? styles.pressed : null,
      ]}>
      <View style={[styles.actionIconWrap, {backgroundColor: accent}]}>
        {image}
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionBody}>{body}</Text>
      </View>
    </Pressable>
  );
}

export function NavButton({active, label, onPress, symbol}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.navButton,
        active ? styles.navButtonActive : null,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={[styles.navSymbol, active ? styles.navSymbolActive : null]}>
        {symbol}
      </Text>
      <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function PrimaryButton({disabled, label, onPress, style}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({pressed}) => [
        styles.primaryButton,
        disabled ? styles.primaryButtonDisabled : null,
        pressed ? styles.pressed : null,
        style,
      ]}>
      <Text style={styles.primaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({label, onPress}) {
  return (
    <Pressable
      onPress={onPress}
      style={({pressed}) => [
        styles.secondaryButton,
        pressed ? styles.pressed : null,
      ]}>
      <Text style={styles.secondaryButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function ScorePill({label, value}) {
  return (
    <View style={styles.scorePill}>
      <Text style={styles.scorePillLabel}>{humanizeLabel(label)}</Text>
      <Text style={styles.scorePillValue}>{Number(value).toFixed(0)}</Text>
    </View>
  );
}

export function StatCard({label, value}) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export function humanizeLabel(value) {
  return value
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, firstLetter => firstLetter.toUpperCase());
}

export function formatMomentDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Recently added';
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

const styles = StyleSheet.create({
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#221c17',
    borderWidth: 1,
    borderColor: 'rgba(244, 182, 93, 0.14)',
    marginBottom: 14,
  },
  actionIconWrap: {
    width: 78,
    height: 78,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  actionCopy: {
    flex: 1,
  },
  actionTitle: {
    color: '#f8ead0',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 6,
  },
  actionBody: {
    color: '#ccb79a',
    lineHeight: 20,
    fontSize: 14,
  },
  navButton: {
    flex: 1,
    minHeight: 51,
    marginHorizontal: 3,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#080808',
    borderTopColor: '#56504b',
    backgroundColor: '#211f1e',
    shadowColor: '#000',
    shadowOpacity: 0.6,
    shadowRadius: 2,
    shadowOffset: {width: 0, height: 3},
    elevation: 4,
  },
  navButtonActive: {
    borderTopColor: '#2b2826',
    backgroundColor: '#0d0c0c',
    transform: [{translateY: 2}],
  },
  navSymbol: {
    color: '#c9bfb4',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 16,
  },
  navSymbolActive: {
    color: '#e94b42',
  },
  navLabel: {
    marginTop: 3,
    color: '#b6aaa0',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  navLabelActive: {
    color: '#f2dfc8',
  },
  primaryButton: {
    backgroundColor: '#f4b65d',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.48,
  },
  primaryButtonLabel: {
    color: '#17110d',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButton: {
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(249, 198, 122, 0.24)',
    backgroundColor: '#1e1813',
  },
  secondaryButtonLabel: {
    color: '#f2dfc0',
    fontSize: 16,
    fontWeight: '800',
  },
  scorePill: {
    backgroundColor: 'rgba(31, 23, 18, 0.08)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
  },
  scorePillLabel: {
    color: '#795a41',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    fontWeight: '800',
  },
  scorePillValue: {
    color: '#1e1712',
    marginTop: 4,
    fontWeight: '900',
    fontSize: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 24,
    backgroundColor: '#221b16',
    borderWidth: 1,
    borderColor: 'rgba(255, 202, 131, 0.12)',
    paddingVertical: 18,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statValue: {
    color: '#f7e4c5',
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    marginTop: 6,
    color: '#c8b395',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
    transform: [{scale: 0.99}],
  },
});
