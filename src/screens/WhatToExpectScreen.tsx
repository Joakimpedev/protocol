/**
 * What to Expect Screen
 *
 * Displays expectations card after photo capture
 */

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

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

function getStyles(theme: Theme) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    contentContainer: {
      flexGrow: 1,
      padding: theme.spacing.lg,
      justifyContent: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.xl,
      borderRadius: theme.borderRadius.lg,
    },
    title: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.md,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginBottom: theme.spacing.lg,
    },
    sectionLabel: {
      ...theme.typography.label,
      marginBottom: theme.spacing.sm,
      color: theme.colors.text,
      fontWeight: '600',
    },
    currentWeekText: {
      ...theme.typography.body,
      marginBottom: theme.spacing.xl,
      lineHeight: 24,
      color: theme.colors.textSecondary,
    },
    button: {
      backgroundColor: theme.colors.text,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
    },
    buttonText: {
      ...theme.typography.body,
      color: theme.colors.background,
      fontWeight: '600',
    },
    loadingText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: theme.spacing.xl,
    },
  });
}
