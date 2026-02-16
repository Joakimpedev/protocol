import { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';

const MONOSPACE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' });

export default function MarketingDisplayScreen({ route, navigation }: any) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { data } = route.params;

  const getSeverityLabel = (severity: number): string => {
    const labels = ['', 'Minor', 'Mild', 'Moderate', 'High', 'Severe'];
    return labels[severity];
  };

  const getSeverityColor = (severity: number): string => {
    const colors = ['', '#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'];
    return colors[severity];
  };

  const getSeverityBarWidth = (severity: number): string => {
    // Severe (5) caps at 95%, scales down for lower levels
    const percentages = ['0%', '19%', '38%', '57%', '76%', '95%'];
    return percentages[severity];
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Before/After Photos Section */}
        <View style={styles.photosSection}>
          {/* Before Photo */}
          <View style={styles.photoContainer}>
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
          <View style={styles.photoContainer}>
            <View style={styles.circleContainer}>
              <View style={styles.circle}>
                <Image source={{ uri: data.afterPhoto }} style={styles.circleImage} />
              </View>
              <View style={styles.weekBadge}>
                <Text style={styles.weekLabel}>WEEK {data.afterWeek}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Problems Section */}
        {data.problems.length > 0 && (
          <View style={styles.problemsSection}>
            <Text style={styles.fixingTitle}>Fixing:</Text>
            <View style={styles.problemsGrid}>
              {data.problems.map((problem: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.problemCard,
                    { borderColor: getSeverityColor(problem.severity) }
                  ]}
                >
                  <Text style={styles.problemTitle}>{problem.text}</Text>
                  <Text style={styles.severityLabel}>{getSeverityLabel(problem.severity)}</Text>
                  <View style={styles.severityBarContainer}>
                    <View
                      style={[
                        styles.severityBar,
                        {
                          width: getSeverityBarWidth(problem.severity),
                          backgroundColor: getSeverityColor(problem.severity),
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Consistency Section */}
        <View style={styles.consistencyCard}>
          {/* Logo - Centered */}
          <Image
            source={require('../../assets/images/icon.png')}
            style={styles.logo}
          />

          {/* Title */}
          <Text style={styles.brandingTitle}>Protocol Consistency Score</Text>

          {/* Score */}
          <View style={styles.scoreSection}>
            <Text style={styles.statValue}>{data.consistencyScore}</Text>
            <Text style={styles.statValue}> / 10</Text>
          </View>

          {/* Metrics Badges */}
          <View style={styles.metricsRow}>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeNumber}>{data.daysCompleted}</Text>
              <Text style={styles.metricBadgeLabel}>days completed</Text>
            </View>
            <View style={styles.metricBadge}>
              <Text style={styles.metricBadgeNumber}>{data.adherencePercent}%</Text>
              <Text style={styles.metricBadgeLabel}>adherence</Text>
            </View>
          </View>
        </View>

        {/* Quote Section */}
        {data.quote && (
          <View style={styles.quoteSection}>
            <Text style={styles.quote}>"{data.quote}"</Text>
          </View>
        )}

        {/* Alternative View Button */}
        <TouchableOpacity
          style={styles.altViewButton}
          onPress={() => navigation.navigate('MarketingDisplayAlt', { data })}
        >
          <Text style={styles.altViewButtonText}>View Alternative Layout</Text>
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
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  photosSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  photoContainer: {
    alignItems: 'center',
  },
  circleContainer: {
    padding: 4,
    borderRadius: 999,
    borderWidth: 5,
    borderColor: theme.colors.accentSecondary,
    backgroundColor: theme.colors.background,
    position: 'relative',
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
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
    borderColor: theme.colors.accentSecondary,
    borderRadius: 5,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs / 2,
  },
  weekLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  arrowContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.lg,
  },
  arrow: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 36,
    color: theme.colors.accentSecondary,
    fontWeight: '600',
  },
  problemsSection: {
    marginBottom: theme.spacing.xl,
  },
  fixingTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontWeight: '600',
  },
  problemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  problemCard: {
    width: '47%',
    backgroundColor: theme.colors.surface,
    borderWidth: 2,
    borderRadius: 4,
    padding: theme.spacing.md,
    minHeight: 100,
  },
  problemTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: '500',
    lineHeight: 18,
  },
  severityLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  severityBarContainer: {
    height: 6,
    backgroundColor: theme.colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  severityBar: {
    height: '100%',
    borderRadius: 3,
  },
  consistencyCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.accentSecondary,
    borderRadius: 4,
    padding: theme.spacing.xl,
    alignItems: 'center',
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginBottom: theme.spacing.sm,
  },
  brandingTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: theme.spacing.md,
  },
  scoreSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginBottom: theme.spacing.lg,
  },
  statValue: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 38,
    fontWeight: '700',
    color: theme.colors.text,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    width: '100%',
  },
  metricBadge: {
    flex: 1,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: theme.spacing.md,
    alignItems: 'center',
  },
  metricBadgeNumber: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs / 2,
  },
  metricBadgeLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 10,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  quoteSection: {
    marginTop: theme.spacing.xl,
    paddingTop: theme.spacing.xl,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quote: {
    ...theme.typography.body,
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
  },
  altViewButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: theme.spacing.md,
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    width: '100%',
  },
  altViewButtonText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
});
