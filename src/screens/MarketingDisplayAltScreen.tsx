import { View, Text, StyleSheet, ScrollView, Image, SafeAreaView, TouchableOpacity } from 'react-native';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';

export default function MarketingDisplayAltScreen({ route, navigation }: any) {
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.xl,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl * 2,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl * 2,
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  protocolSection: {
    alignItems: 'center',
    flex: 1,
  },
  protocolText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 2,
    marginBottom: spacing.sm,
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 11,
  },
  separator: {
    width: 1,
    height: 60,
    backgroundColor: colors.accent,
  },
  daysSection: {
    alignItems: 'center',
    flex: 1,
  },
  daysNumber: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  completedText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
    letterSpacing: 1,
  },
  photoSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  lastPhoto: {
    marginBottom: spacing.xl * 3,
  },
  circleContainer: {
    padding: 5,
    borderRadius: 999,
    borderWidth: 6,
    borderColor: colors.buttonAccent,
    backgroundColor: colors.background,
    position: 'relative',
  },
  circle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  circleImage: {
    width: '100%',
    height: '100%',
  },
  weekBadge: {
    position: 'absolute',
    bottom: -7,
    alignSelf: 'center',
    backgroundColor: colors.buttonAccent,
    borderWidth: 0,
    borderRadius: 5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
  },
  weekLabel: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.5,
  },
  backButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    alignItems: 'center',
    width: '100%',
  },
  backButtonText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
