import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useAuth } from '../contexts/AuthContext';
import {
  markPendingProductAsActive,
  deferPendingProduct,
  skipPendingProduct,
} from '../services/routineService';
const guideBlocks = require('../data/guide_blocks.json');

interface PendingProductModalProps {
  visible: boolean;
  onClose: () => void;
  ingredientId: string;
  ingredientName: string;
  shortDescription: string;
  onUpdate: () => void;
}

export default function PendingProductModal({
  visible,
  onClose,
  ingredientId,
  ingredientName,
  shortDescription,
  onUpdate,
}: PendingProductModalProps) {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const [step, setStep] = useState<'initial' | 'have' | 'dontHave' | 'defer' | 'skip'>('initial');
  const [productName, setProductName] = useState('');

  const handleIHaveThis = () => {
    setStep('have');
    setProductName('');
  };

  const handleIDontHaveThis = () => {
    setStep('dontHave');
  };

  const handleProductNameSubmit = async () => {
    if (!user || !productName.trim()) {
      Alert.alert('Enter product name', 'Type what you got');
      return;
    }

    try {
      await markPendingProductAsActive(user.uid, ingredientId, productName.trim());
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error marking product as active:', error);
      Alert.alert('Error', 'Failed to update product');
    }
  };

  const handleWaitingForDelivery = () => {
    setStep('defer');
  };

  const handleSkipForever = () => {
    setStep('skip');
  };

  const handleDeferTime = async (days: 1 | 3 | 7) => {
    if (!user) return;

    try {
      await deferPendingProduct(user.uid, ingredientId, days);
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error deferring product:', error);
      Alert.alert('Error', 'Failed to defer product');
    }
  };

  const handleSkipConfirm = async () => {
    if (!user) return;

    try {
      await skipPendingProduct(user.uid, ingredientId);
      onUpdate();
      handleClose();
    } catch (error) {
      console.error('Error skipping product:', error);
      Alert.alert('Error', 'Failed to skip product');
    }
  };

  const handleClose = () => {
    setStep('initial');
    setProductName('');
    onClose();
  };

  const handleKeepIt = () => {
    setStep('dontHave');
  };

  // Get ingredient data for benefit text - use ingredient from guide blocks
  const ingredient = guideBlocks.ingredients?.find(
    (ing: any) => ing.ingredient_id === ingredientId
  );

  // Extract benefit text from short_description or used_for - use ingredient data first
  const getBenefitText = (): string => {
    // Use ingredient from guide blocks if available, otherwise use passed shortDescription
    const desc = ingredient?.short_description || shortDescription;
    const usedFor = ingredient?.used_for || [];

    // Build benefit text from used_for (most accurate)
    const benefits: string[] = [];
    if (usedFor.includes('oily_skin') && usedFor.includes('blackheads')) {
      return 'oil control and pore clearing';
    }
    if (usedFor.includes('oily_skin')) {
      benefits.push('oil control');
    }
    if (usedFor.includes('blackheads')) {
      benefits.push('pore clearing');
    }
    if (usedFor.includes('acne')) {
      benefits.push('acne treatment');
    }
    if (usedFor.includes('dry_skin')) {
      benefits.push('hydration');
    }
    if (usedFor.includes('skin_texture')) {
      benefits.push('skin texture improvement');
    }
    if (usedFor.includes('hyperpigmentation')) {
      benefits.push('pigmentation reduction');
    }
    if (usedFor.includes('dark_circles')) {
      benefits.push('dark circle reduction');
    }
    if (usedFor.includes('facial_hair')) {
      benefits.push('facial hair growth');
    }
    if (usedFor.includes('jawline')) {
      benefits.push('skin health');
    }

    if (benefits.length > 0) {
      return benefits.join(' and ');
    }

    // Fallback: extract from description
    const descLower = desc.toLowerCase();
    if (descLower.includes('oil') && descLower.includes('pore')) {
      return 'oil control and pore clearing';
    }
    if (descLower.includes('oil')) {
      return 'oil control';
    }
    if (descLower.includes('pore')) {
      return 'pore clearing';
    }
    if (descLower.includes('hydration') || descLower.includes('hydrat')) {
      return 'hydration';
    }
    if (descLower.includes('exfoliat')) {
      return 'skin exfoliation';
    }
    if (descLower.includes('barrier')) {
      return 'skin barrier repair';
    }
    if (descLower.includes('antimicrobial') || descLower.includes('bacteria')) {
      return 'acne treatment';
    }
    if (descLower.includes('brighten') || descLower.includes('antioxidant')) {
      return 'skin brightening';
    }

    // Final fallback - use first part of description
    if (desc) {
      const firstSentence = desc.split('.')[0];
      if (firstSentence.length < 60) {
        return firstSentence.toLowerCase();
      }
    }

    return 'skin health';
  };
  const benefitText = getBenefitText();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Step 1: Initial - Do you have this? */}
          {step === 'initial' && (
            <>
              <Text style={styles.title}>{ingredientName.toUpperCase()}</Text>
              <Text style={styles.description}>{shortDescription}</Text>
              <Text style={styles.question}>Do you have this now?</Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleIHaveThis}
                >
                  <Text style={styles.buttonText}>I have this</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.secondaryButton]}
                  onPress={handleIDontHaveThis}
                >
                  <Text style={styles.buttonText}>I don't have this</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 2a: I have this - Input product name */}
          {step === 'have' && (
            <>
              <Text style={styles.title}>What product did you get?</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter product name"
                placeholderTextColor={theme.colors.textMuted}
                value={productName}
                onChangeText={setProductName}
                autoFocus={true}
              />
              <TouchableOpacity
                style={[styles.button, styles.primaryButton, !productName.trim() && styles.buttonDisabled]}
                onPress={handleProductNameSubmit}
                disabled={!productName.trim()}
              >
                <Text style={[styles.buttonText, !productName.trim() && styles.buttonTextDisabled]}>
                  Continue
                </Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 2b: I don't have this - Intent */}
          {step === 'dontHave' && (
            <>
              <Text style={styles.benefitText}>
                This ingredient helps with {benefitText}.
              </Text>
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton, styles.waitingButton]}
                  onPress={handleWaitingForDelivery}
                >
                  <Text style={styles.buttonText}>Soon / Waiting for delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipForeverButton}
                  onPress={handleSkipForever}
                >
                  <Text style={styles.skipForeverText}>Skip forever</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Step 3: Waiting for delivery - Pick time */}
          {step === 'defer' && (
            <>
              <Text style={styles.title}>When should we ask again?</Text>
              <TouchableOpacity
                style={[styles.button, styles.optionButton]}
                onPress={() => handleDeferTime(1)}
              >
                <Text style={styles.buttonText}>○ 1 day</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.optionButton]}
                onPress={() => handleDeferTime(3)}
              >
                <Text style={styles.buttonText}>○ 3 days</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.optionButton]}
                onPress={() => handleDeferTime(7)}
              >
                <Text style={styles.buttonText}>○ 1 week</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Step 4: Skip forever - Warning */}
          {step === 'skip' && (
            <>
              <Text style={styles.title}>Skip this ingredient?</Text>
              <Text style={styles.warningText}>
                {ingredientName} helps with {benefitText.toLowerCase()}. Your routine will be less effective without it.
              </Text>
              <Text style={styles.warningText}>
                You can re-add it anytime in the Protocol tab.
              </Text>
              <View style={styles.skipWarningButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.primaryButton]}
                  onPress={handleKeepIt}
                >
                  <Text style={styles.buttonText}>Keep it</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.skipForeverButton}
                  onPress={handleSkipConfirm}
                >
                  <Text style={styles.skipForeverText}>Skip anyway</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {step !== 'initial' && step !== 'dontHave' && step !== 'skip' && (
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.md,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      width: '95%',
      maxWidth: 400,
    },
    title: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    description: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
      textAlign: 'center',
    },
    benefitText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    question: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    input: {
      ...theme.typography.body,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    buttonContainer: {
      width: '100%',
    },
    skipWarningButtons: {
      width: '100%',
      alignItems: 'center',
    },
    button: {
      width: '100%',
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      minHeight: 44,
    },
    primaryButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    waitingButton: {
      marginBottom: theme.spacing.md,
    },
    secondaryButton: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
    },
    optionButton: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.sm,
    },
    buttonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonTextDisabled: {
      opacity: 0.5,
    },
    skipForeverButton: {
      padding: theme.spacing.xs,
      alignItems: 'center',
      marginTop: theme.spacing.xs,
    },
    skipForeverText: {
      ...theme.typography.bodySmall,
      fontSize: 12,
      color: theme.colors.textMuted,
      textDecorationLine: 'underline',
    },
    warningText: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
      lineHeight: 22,
      textAlign: 'center',
    },
    cancelButton: {
      padding: theme.spacing.sm,
      alignItems: 'center',
      marginTop: theme.spacing.md,
    },
    cancelText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      textDecorationLine: 'underline',
    },
  });
}
