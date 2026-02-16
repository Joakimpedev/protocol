import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';

const MONOSPACE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' });

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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);

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
                placeholderTextColor={theme.colors.textMuted}
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
                placeholderTextColor={theme.colors.textMuted}
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
                placeholderTextColor={theme.colors.textMuted}
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
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="decimal-pad"
          />

          <Text style={styles.label}>Days Completed</Text>
          <TextInput
            style={styles.input}
            value={data.daysCompleted}
            onChangeText={(text) => setData({ ...data, daysCompleted: text })}
            placeholder="84"
            placeholderTextColor={theme.colors.textMuted}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Adherence %</Text>
          <TextInput
            style={styles.input}
            value={data.adherencePercent}
            onChangeText={(text) => setData({ ...data, adherencePercent: text })}
            placeholder="95"
            placeholderTextColor={theme.colors.textMuted}
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
            placeholderTextColor={theme.colors.textMuted}
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

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xl * 2,
  },
  heading: {
    ...theme.typography.heading,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.headingSmall,
    fontSize: 18,
    marginBottom: theme.spacing.md,
  },
  label: {
    ...theme.typography.label,
    marginBottom: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  input: {
    ...theme.typography.body,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: theme.spacing.md,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  photoRow: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  photoContainer: {
    flex: 1,
  },
  helperText: {
    ...theme.typography.bodySmall,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  photoButton: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
    overflow: 'hidden',
  },
  photoButtonText: {
    ...theme.typography.body,
    color: theme.colors.textSecondary,
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
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    marginBottom: theme.spacing.sm,
  },
  problemText: {
    ...theme.typography.body,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  severityPicker: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
    flexWrap: 'wrap',
  },
  severityButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    backgroundColor: theme.colors.background,
  },
  severityButtonActive: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
  },
  severityButtonText: {
    ...theme.typography.bodySmall,
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  severityButtonTextActive: {
    color: theme.colors.text,
    fontWeight: '600',
  },
  removeButton: {
    ...theme.typography.bodySmall,
    color: theme.colors.error,
    textDecorationLine: 'underline',
  },
  addProblemContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 4,
    padding: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  addButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  previewButton: {
    backgroundColor: '#171A17',
    borderWidth: 1,
    borderColor: '#0D360D',
    borderRadius: 4,
    padding: theme.spacing.lg,
    alignItems: 'center',
    marginTop: theme.spacing.lg,
  },
  previewButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
});
