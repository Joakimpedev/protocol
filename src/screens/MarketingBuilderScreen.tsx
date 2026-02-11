import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { colors, typography, spacing, MONOSPACE_FONT } from '../constants/theme';

interface Problem {
  text: string;
  severity: 1 | 2 | 3 | 4 | 5; // 1=Minor, 5=Severe
}

interface MarketingData {
  beforePhoto: string | null;
  afterPhoto: string | null;
  beforeWeek: string;
  afterWeek: string;
  problems: Problem[];
  consistencyScore: string;
  daysCompleted: string;
  adherencePercent: string;
  quote: string;
}

export default function MarketingBuilderScreen({ navigation }: any) {
  const [data, setData] = useState<MarketingData>({
    beforePhoto: null,
    afterPhoto: null,
    beforeWeek: '0',
    afterWeek: '12',
    problems: [
      { text: 'Forward head posture', severity: 5 },
      { text: 'Poor tongue posture', severity: 4 },
    ],
    consistencyScore: '9.4',
    daysCompleted: '84',
    adherencePercent: '95',
    quote: 'Results speak for themselves. 3 months of consistency.',
  });
  const [newProblem, setNewProblem] = useState('');
  const [newProblemSeverity, setNewProblemSeverity] = useState<1 | 2 | 3 | 4 | 5>(3);

  const pickImage = async (type: 'before' | 'after') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      if (type === 'before') {
        setData({ ...data, beforePhoto: result.assets[0].uri });
      } else {
        setData({ ...data, afterPhoto: result.assets[0].uri });
      }
    }
  };

  const addProblem = () => {
    if (newProblem.trim()) {
      setData({
        ...data,
        problems: [...data.problems, { text: newProblem.trim(), severity: newProblemSeverity }]
      });
      setNewProblem('');
      setNewProblemSeverity(3);
    }
  };

  const removeProblem = (index: number) => {
    setData({ ...data, problems: data.problems.filter((_, i) => i !== index) });
  };

  const updateProblemSeverity = (index: number, severity: 1 | 2 | 3 | 4 | 5) => {
    const updatedProblems = [...data.problems];
    updatedProblems[index].severity = severity;
    setData({ ...data, problems: updatedProblems });
  };

  const getSeverityLabel = (severity: number): string => {
    const labels = ['', 'Minor', 'Mild', 'Moderate', 'High', 'Severe'];
    return labels[severity];
  };

  const handlePreview = () => {
    if (!data.beforePhoto || !data.afterPhoto) {
      Alert.alert('Missing Photos', 'Please add both before and after photos.');
      return;
    }
    navigation.navigate('MarketingDisplay', { data });
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Marketing Builder</Text>
        <Text style={styles.subtitle}>Build your success story for marketing materials</Text>

        {/* Photos Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>

          <Text style={styles.helperText}>Photos will be displayed in circles - center face when cropping</Text>

          <View style={styles.photoRow}>
            <View style={styles.photoContainer}>
              <Text style={styles.label}>Before Photo</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('before')}
              >
                {data.beforePhoto ? (
                  <View style={styles.circularPreview}>
                    <Image source={{ uri: data.beforePhoto }} style={styles.photoPreview} />
                  </View>
                ) : (
                  <Text style={styles.photoButtonText}>Tap to select</Text>
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={data.beforeWeek}
                onChangeText={(text) => setData({ ...data, beforeWeek: text })}
                placeholder="Week number"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.photoContainer}>
              <Text style={styles.label}>After Photo</Text>
              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => pickImage('after')}
              >
                {data.afterPhoto ? (
                  <View style={styles.circularPreview}>
                    <Image source={{ uri: data.afterPhoto }} style={styles.photoPreview} />
                  </View>
                ) : (
                  <Text style={styles.photoButtonText}>Tap to select</Text>
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.input}
                value={data.afterWeek}
                onChangeText={(text) => setData({ ...data, afterWeek: text })}
                placeholder="Week number"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Problems Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Problems Addressed</Text>

          {data.problems.map((problem, index) => (
            <View key={index} style={styles.problemItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.problemText}>{problem.text}</Text>
                <View style={styles.severityPicker}>
                  {[1, 2, 3, 4, 5].map((severity) => (
                    <TouchableOpacity
                      key={severity}
                      style={[
                        styles.severityButton,
                        problem.severity === severity && styles.severityButtonActive,
                      ]}
                      onPress={() => updateProblemSeverity(index, severity as 1 | 2 | 3 | 4 | 5)}
                    >
                      <Text style={[
                        styles.severityButtonText,
                        problem.severity === severity && styles.severityButtonTextActive,
                      ]}>
                        {getSeverityLabel(severity)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity onPress={() => removeProblem(index)}>
                <Text style={styles.removeButton}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.addProblemContainer}>
            <View style={{ flex: 1 }}>
              <TextInput
                style={styles.input}
                value={newProblem}
                onChangeText={setNewProblem}
                placeholder="Add new problem"
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={addProblem}
              />
              <View style={styles.severityPicker}>
                {[1, 2, 3, 4, 5].map((severity) => (
                  <TouchableOpacity
                    key={severity}
                    style={[
                      styles.severityButton,
                      newProblemSeverity === severity && styles.severityButtonActive,
                    ]}
                    onPress={() => setNewProblemSeverity(severity as 1 | 2 | 3 | 4 | 5)}
                  >
                    <Text style={[
                      styles.severityButtonText,
                      newProblemSeverity === severity && styles.severityButtonTextActive,
                    ]}>
                      {getSeverityLabel(severity)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={addProblem}>
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Consistency Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consistency Stats</Text>

          <Text style={styles.label}>Consistency Score (0-10)</Text>
          <TextInput
            style={styles.input}
            value={data.consistencyScore}
            onChangeText={(text) => setData({ ...data, consistencyScore: text })}
            placeholder="9.4"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Days Completed</Text>
          <TextInput
            style={styles.input}
            value={data.daysCompleted}
            onChangeText={(text) => setData({ ...data, daysCompleted: text })}
            placeholder="84"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Adherence %</Text>
          <TextInput
            style={styles.input}
            value={data.adherencePercent}
            onChangeText={(text) => setData({ ...data, adherencePercent: text })}
            placeholder="95"
            placeholderTextColor={colors.textMuted}
            keyboardType="numeric"
          />
        </View>

        {/* Quote Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quote (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={data.quote}
            onChangeText={(text) => setData({ ...data, quote: text })}
            placeholder="Add a quote or tagline"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity style={styles.previewButton} onPress={handlePreview}>
          <Text style={styles.previewButtonText}>View Result</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
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
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
  },
  heading: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingSmall,
    fontSize: 18,
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs,
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  photoContainer: {
    flex: 1,
  },
  helperText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  photoButton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  photoButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  circularPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
  },
  problemItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  problemText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  severityPicker: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  severityButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  severityButtonActive: {
    backgroundColor: colors.surface,
    borderColor: colors.accent,
  },
  severityButtonText: {
    ...typography.bodySmall,
    fontSize: 11,
    color: colors.textSecondary,
  },
  severityButtonTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  removeButton: {
    ...typography.bodySmall,
    color: colors.error,
    textDecorationLine: 'underline',
  },
  addProblemContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  addButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  previewButton: {
    backgroundColor: colors.surfaceGreen,
    borderWidth: 1,
    borderColor: colors.borderGreen,
    borderRadius: 4,
    padding: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  previewButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
});
