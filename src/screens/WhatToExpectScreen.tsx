/**
 * What to Expect Screen
 * 
 * Displays expectations card after photo capture
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, typography, spacing } from '../constants/theme';
import { getWhatToExpect } from '../services/whatToExpectService';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

interface WhatToExpectScreenProps {
  route: {
    params: {
      weekNumber: number;
    };
  };
  navigation: any;
}

export default function WhatToExpectScreen({ route, navigation }: WhatToExpectScreenProps) {
  const { weekNumber } = route.params;
  const { user } = useAuth();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadContent = async () => {
      if (!user) {
        navigation.navigate('ProgressMain');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const concerns = userData.concerns || [];
          const expectContent = getWhatToExpect(weekNumber, concerns);
          setContent(expectContent);
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [user, weekNumber]);

  const handleContinue = () => {
    // Navigate back to ProgressMain (the main Progress screen in the stack)
    navigation.navigate('ProgressMain');
  };

  if (loading || !content) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // Format current week summaries (no problem name prefixes, just summaries)
  // Trim any trailing periods from summaries, then join with '. ' and add one period at the end
  const currentWeekText = content.problems
    .map((p) => p.currentWeekSummary.trim().replace(/\.+$/, ''))
    .join('. ') + (content.problems.length > 0 ? '.' : '');

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.card}>
        <Text style={styles.title}>Week {content.weekNumber}</Text>
        
        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>How you should feel</Text>
        <Text style={styles.currentWeekText}>{currentWeekText}</Text>

        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    borderRadius: 4,
  },
  title: {
    ...typography.heading,
    marginBottom: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    ...typography.label,
    marginBottom: spacing.sm,
    color: colors.text,
    fontWeight: '600',
  },
  currentWeekText: {
    ...typography.body,
    marginBottom: spacing.xl,
    lineHeight: 24,
    color: colors.textSecondary,
  },
  button: {
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
});

