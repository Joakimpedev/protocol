import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';

const MONOSPACE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' });

export default function MarketingDisplayAltScreen({ route, navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { data } = route.params;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Row - Protocol + Days Completed */}
        <View style={styles.headerRow}>
          {/* Protocol Section */}
          <View style={styles.protocolSection}>
            <Text style={styles.protocolText}>Protocol</Text>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.logo}
            />
          </View>

          {/* Separator */}
          <View style={styles.separator} />

          {/* Days Section */}
          <View style={styles.daysSection}>
            <Text style={styles.daysNumber}>{data.daysCompleted} days</Text>
            <Text style={styles.completedText}>completed</Text>
          </View>
        </View>

        {/* Before Photo */}
        <View style={styles.photoSection}>
          <View style={styles.circleContainer}>
            <View style={styles.circle}>
              <Image source={{ uri: data.beforePhoto }} style={styles.circleImage} />
            </View>
            <View style={styles.weekBadge}>
              <Text style={styles.weekLabel}>WEEK {data.beforeWeek}</Text>
            </View>
          </View>
        </View>

        {/* After Photo */}
        <View style={[styles.photoSection, styles.lastPhoto]}>
          <View style={styles.circleContainer}>
            <View style={styles.circle}>
              <Image source={{ uri: data.afterPhoto }} style={styles.circleImage} />
            </View>
            <View style={styles.weekBadge}>
              <Text style={styles.weekLabel}>WEEK {data.afterWeek}</Text>
            </View>
          </View>
        </View>

        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back to Main View</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.xl,
    paddingTop: theme.spacing.xl * 2,
    paddingBottom: theme.spacing.xl * 2,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.xl * 2,
    marginTop: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  protocolSection: {
    alignItems: 'center',
    flex: 1,
  },
  protocolText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 2,
    marginBottom: theme.spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 11,
  },
  separator: {
    width: 1,
    height: 60,
    backgroundColor: theme.colors.accent,
  },
  daysSection: {
    alignItems: 'center',
    flex: 1,
  },
  daysNumber: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  completedText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    letterSpacing: 1,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  lastPhoto: {
    marginBottom: theme.spacing.xl * 3,
  },
  circleContainer: {
    padding: 5,
    borderRadius: 999,
    borderWidth: 6,
    borderColor: theme.colors.accentSecondary,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  weekBadge: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    backgroundColor: theme.colors.accentSecondary,
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  weekLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  backButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: theme.spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
