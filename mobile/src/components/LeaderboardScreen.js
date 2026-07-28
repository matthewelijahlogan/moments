import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export function LeaderboardScreen({entries, isRefreshing}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenScroll}
      showsVerticalScrollIndicator={false}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>Signal board</Text>
          <Text style={styles.sectionBody}>
            Community scores come from the shared archive when available. Local
            entries stay visible too, so you can compare before cloud sync.
          </Text>
        </View>
        {isRefreshing ? <ActivityIndicator color="#f2b75a" /> : null}
      </View>

      {entries.slice(0, 12).map((entry, index) => (
        <View
          key={entry.id || `${entry.username}-${entry.title}-${index}`}
          style={[
            styles.boardRow,
            index < 3 ? styles.boardRowTop : null,
            entry.source === 'Your archive' ? styles.boardRowLocal : null,
          ]}>
          <View style={styles.boardRankWrap}>
            <Text style={styles.boardRank}>#{index + 1}</Text>
          </View>
          <View style={styles.boardCopy}>
            <Text style={styles.boardUser}>{entry.username}</Text>
            <Text style={styles.boardTitle}>{entry.title}</Text>
            <Text style={styles.boardSummary} numberOfLines={2}>
              {entry.summary}
            </Text>
          </View>
          <View style={styles.boardScoreWrap}>
            <Text style={styles.boardScore}>{Number(entry.score).toFixed(1)}</Text>
            <Text style={styles.boardSource}>{entry.source || 'Featured'}</Text>
          </View>
        </View>
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sectionHeaderCopy: {
    flex: 1,
    paddingRight: 12,
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
  boardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#211a15',
    borderWidth: 1,
    borderColor: 'rgba(245, 186, 106, 0.1)',
    marginBottom: 12,
  },
  boardRowTop: {
    backgroundColor: '#2a1e14',
    borderColor: 'rgba(255, 195, 92, 0.24)',
  },
  boardRowLocal: {
    borderColor: 'rgba(249, 198, 122, 0.3)',
  },
  boardRankWrap: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#15100d',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  boardRank: {
    color: '#f5c46d',
    fontSize: 20,
    fontWeight: '900',
  },
  boardCopy: {
    flex: 1,
    paddingRight: 10,
  },
  boardUser: {
    color: '#f5e2c2',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  boardTitle: {
    color: '#fffbf5',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  boardSummary: {
    color: '#ccb79a',
    fontSize: 13,
    lineHeight: 18,
  },
  boardScoreWrap: {
    alignItems: 'flex-end',
  },
  boardScore: {
    color: '#ffb74a',
    fontSize: 22,
    fontWeight: '900',
  },
  boardSource: {
    marginTop: 4,
    color: '#9c8361',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
});
