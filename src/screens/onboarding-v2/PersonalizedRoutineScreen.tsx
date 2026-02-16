import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import V2ScreenWrapper from '../../components/v2/V2ScreenWrapper';
import GradientButton from '../../components/v2/GradientButton';
import { useScreenEntrance } from '../../hooks/useScreenEntrance';
import { useOnboardingTracking } from '../../hooks/useOnboardingTracking';
import {
  colorsV2,
  typographyV2,
  spacingV2,
  borderRadiusV2,
} from '../../constants/themeV2';

const PROTOCOL_ITEMS = [
  { name: 'Niacinamide', status: 'Active', statusColor: colorsV2.success, desc: 'Skin brightening serum' },
  { name: 'Retinol', status: 'Evening', statusColor: colorsV2.accentPurple, desc: 'Anti-aging treatment' },
  { name: 'Mewing', status: 'Daily', statusColor: colorsV2.accentCyan, desc: 'Jawline exercise' },
];

const ROUTINES = [
  { name: 'Morning Routine', steps: 4, mins: 8, done: true },
  { name: 'Evening Routine', steps: 3, mins: 5, done: false },
  { name: 'Exercises', tasks: 5, mins: 12, done: false },
];

export default function PersonalizedRoutineScreen({ navigation }: any) {
  useOnboardingTracking('v2_personalized_routine');
  const anims = useScreenEntrance(4); // header + protocol card + routines card + button

  // Staggered slide-in for protocol items
  const slideAnims = useRef(PROTOCOL_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.stagger(
      150,
      slideAnims.map((anim) =>
        Animated.spring(anim, {
          toValue: 1,
          delay: 400,
          useNativeDriver: true,
          tension: 120,
          friction: 10,
        })
      )
    ).start();
  }, []);

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('V2Gender');
  };

  return (
    <V2ScreenWrapper showProgress={true} currentStep={3} totalSteps={14}>
      <View style={styles.content}>
        <Animated.View
          style={{
            opacity: anims[0].opacity,
            transform: anims[0].transform,
          }}
        >
          <Text style={styles.headline}>Personalized Plan</Text>
          <Text style={styles.subheadline}>
            A step-by-step protocol tailored to you
          </Text>
        </Animated.View>

        {/* Protocol items card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: anims[1].opacity,
              transform: anims[1].transform,
            },
          ]}
        >
          <Text style={styles.cardTitle}>Your Protocol</Text>
          <Text style={styles.cardSubtitle}>Personalized for your goals</Text>
          <View style={styles.divider} />
          {PROTOCOL_ITEMS.map((item, i) => (
            <Animated.View
              key={item.name}
              style={[
                styles.protocolItem,
                {
                  opacity: slideAnims[i],
                  transform: [{
                    translateX: slideAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [30, 0],
                    }),
                  }],
                },
              ]}
            >
              <View style={styles.protocolItemLeft}>
                <Text style={styles.protocolName}>{item.name.toUpperCase()}</Text>
                <Text style={styles.protocolDesc}>{item.desc}</Text>
              </View>
              <View style={[styles.statusBadge, { borderColor: item.statusColor }]}>
                <Text style={[styles.statusText, { color: item.statusColor }]}>
                  {item.status}
                </Text>
              </View>
            </Animated.View>
          ))}
        </Animated.View>

        {/* Daily routines card */}
        <Animated.View
          style={[
            styles.card,
            {
              opacity: anims[2].opacity,
              transform: anims[2].transform,
            },
          ]}
        >
          <Text style={styles.cardTitle}>Daily Routines</Text>
          <View style={styles.divider} />
          {ROUTINES.map((r) => (
            <View key={r.name} style={[styles.routineItem, r.done && styles.routineItemDone]}>
              <View style={styles.routineLeft}>
                <Text style={styles.routineName}>{r.name}</Text>
                <Text style={styles.routineMeta}>
                  {'steps' in r ? `${r.steps} steps` : `${r.tasks} tasks`} · {r.mins} min
                </Text>
              </View>
              {r.done ? (
                <View style={styles.checkBadge}>
                  <Text style={styles.checkMark}>✓</Text>
                </View>
              ) : (
                <View style={styles.startBadge}>
                  <Text style={styles.startText}>Start</Text>
                </View>
              )}
            </View>
          ))}
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View
          style={{
            opacity: anims[3].opacity,
            transform: anims[3].transform,
          }}
        >
          <GradientButton title="Continue" onPress={handleContinue} />
        </Animated.View>
      </View>
    </V2ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  headline: {
    ...typographyV2.hero,
    textAlign: 'center',
    marginTop: spacingV2.xl,
    marginBottom: spacingV2.sm,
  },
  subheadline: {
    ...typographyV2.body,
    color: colorsV2.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacingV2.md,
    marginBottom: spacingV2.xl,
  },
  card: {
    backgroundColor: colorsV2.surface,
    borderRadius: borderRadiusV2.xl,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.lg,
    marginBottom: spacingV2.md,
  },
  cardTitle: {
    ...typographyV2.heading,
    fontSize: 20,
    marginBottom: 2,
  },
  cardSubtitle: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
    marginBottom: spacingV2.md,
  },
  divider: {
    height: 1,
    backgroundColor: colorsV2.border,
    marginBottom: spacingV2.md,
  },
  // Protocol items
  protocolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.md,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.sm,
  },
  protocolItemLeft: {
    flex: 1,
  },
  protocolName: {
    ...typographyV2.bodySmall,
    fontWeight: '700',
    color: colorsV2.textPrimary,
    letterSpacing: 1,
    marginBottom: 2,
  },
  protocolDesc: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  statusBadge: {
    borderWidth: 1.5,
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // Routines
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colorsV2.surfaceLight,
    borderRadius: borderRadiusV2.md,
    borderWidth: 1,
    borderColor: colorsV2.border,
    padding: spacingV2.md,
    marginBottom: spacingV2.sm,
  },
  routineItemDone: {
    opacity: 0.6,
  },
  routineLeft: {
    flex: 1,
  },
  routineName: {
    ...typographyV2.body,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 2,
  },
  routineMeta: {
    ...typographyV2.caption,
    color: colorsV2.textMuted,
  },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colorsV2.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  startBadge: {
    backgroundColor: colorsV2.surfaceLight,
    borderWidth: 1,
    borderColor: colorsV2.textMuted,
    borderRadius: borderRadiusV2.sm,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  startText: {
    ...typographyV2.caption,
    color: colorsV2.textSecondary,
    fontWeight: '600',
  },
  spacer: {
    flex: 1,
    minHeight: spacingV2.md,
  },
});
