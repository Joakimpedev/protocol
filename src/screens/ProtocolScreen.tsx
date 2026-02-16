import { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Alert, Image, Modal, Platform } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { useResponsive } from '../utils/responsive';

const MONOSPACE_FONT = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });
import { useAuth } from '../contexts/AuthContext';
import { usePremium } from '../contexts/PremiumContext';
import { loadUserRoutine, subscribeToUserRoutine, UserRoutineData, IngredientSelection, ExerciseSelection, updateIngredientState, updateExerciseState } from '../services/routineService';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import PaywallModal from '../components/PaywallModal';
import PendingProductModal from '../components/PendingProductModal';
const guideBlocks = require('../data/guide_blocks.json');

// Active Product Modal Component
interface ActiveProductModalProps {
  visible: boolean;
  onClose: () => void;
  ingredientId: string;
  ingredientName: string;
  productName: string;
  onProductNameChange: (text: string) => void;
  onUpdate: () => void;
  onRemove: () => void;
  activeProductModalStyles: ReturnType<typeof getActiveProductModalStyles>;
  theme: Theme;
}

function ActiveProductModal({
  visible,
  onClose,
  ingredientName,
  productName,
  onProductNameChange,
  onUpdate,
  onRemove,
  activeProductModalStyles,
  theme,
}: ActiveProductModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={activeProductModalStyles.overlay}>
        <View style={activeProductModalStyles.modal}>
          <View style={activeProductModalStyles.header}>
            <Text style={activeProductModalStyles.title}>{ingredientName.toUpperCase()}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={activeProductModalStyles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={activeProductModalStyles.divider} />

          <Text style={activeProductModalStyles.sectionLabel}>Your product</Text>
          <TextInput
            style={activeProductModalStyles.input}
            placeholder="Product name..."
            placeholderTextColor={theme.colors.textMuted}
            value={productName}
            onChangeText={onProductNameChange}
            autoFocus={true}
          />

          <TouchableOpacity
            style={[activeProductModalStyles.updateButton, !productName.trim() && activeProductModalStyles.buttonDisabled]}
            onPress={onUpdate}
            disabled={!productName.trim()}
          >
            <Text style={activeProductModalStyles.updateButtonText}>Update</Text>
          </TouchableOpacity>

          <View style={activeProductModalStyles.divider} />

          <TouchableOpacity onPress={onRemove}>
            <Text style={activeProductModalStyles.removeText}>Remove from routine</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

interface Problem {
  problem_id: string;
  display_name: string;
  what_it_is: string;
  what_causes_it: string;
  how_to_fix: string;
  recommended_ingredients: string[];
  recommended_exercises: string[];
}

interface Ingredient {
  ingredient_id: string;
  display_name: string;
  routine_order: number;
  short_description: string;
  example_brands: string[];
  timing: string;
  used_for: string[];
}

interface Exercise {
  exercise_id: string;
  display_name: string;
  short_description?: string;
  instructions?: string;
  tip?: string;
  used_for: string[];
  [key: string]: any; // Allow additional properties from JSON
}

interface ItemState {
  state: 'pending' | 'added' | 'skipped' | 'not_received';
  productName?: string;
  waitingForDelivery?: boolean;
}

export default function ProtocolScreen({ navigation }: any) {
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const responsive = useResponsive();
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const activeProductModalStyles = useMemo(() => getActiveProductModalStyles(theme), [theme]);
  const isPro = theme.key === 'pro';
  const [routineData, setRoutineData] = useState<UserRoutineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<string | null>(null);
  const [newIngredientStates, setNewIngredientStates] = useState<Record<string, ItemState>>({});
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [configureProductId, setConfigureProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState<string>('');
  const [configureExerciseId, setConfigureExerciseId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Subscribe to routine data
    const unsubscribe = subscribeToUserRoutine(user.uid, (data) => {
      setRoutineData(data);
      setLoading(false);
    });

    // Load initial data
    const loadData = async () => {
      try {
        const routine = await loadUserRoutine(user.uid);
        if (routine) {
          setRoutineData(routine);
        }
      } catch (error) {
        console.error('Error loading routine data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => unsubscribe();
  }, [user]);

  // Load guide blocks data (always available, safe to call before early returns)
  const problems: Problem[] = guideBlocks.problems || [];
  const ingredients: Ingredient[] = guideBlocks.ingredients || [];
  const exercises: Exercise[] = guideBlocks.exercises || [];

  // Calculate selectedIngredients early for useEffect (safe even if routineData is null)
  // This must be before any early returns to follow Rules of Hooks
  const ingredientSelections = routineData?.ingredientSelections || [];
  const selectedIngredients = ingredientSelections
    .map((sel: IngredientSelection) => {
      const ingredient = ingredients.find(ing => ing.ingredient_id === sel.ingredient_id);
      return ingredient ? { ...ingredient, selection: sel } : null;
    })
    .filter(Boolean);

  // Initialize editing product name when configure modal opens
  // This must be before any early returns to follow Rules of Hooks
  useEffect(() => {
    if (configureProductId) {
      // Only initialize when modal opens, not when data updates
      const product = selectedIngredients.find((item: any) => item.ingredient_id === configureProductId);
      if (product) {
        const selection = product.selection as IngredientSelection;
        const state = selection.state === 'added' ? 'active' :
                      selection.state === 'not_received' ? (selection.waiting_for_delivery ? 'deferred' : 'pending') :
                      selection.state;
        if (state === 'active' && selection.product_name) {
          setEditingProductName(selection.product_name);
        } else {
          setEditingProductName('');
        }
      } else {
        setEditingProductName('');
      }
    } else {
      setEditingProductName('');
    }
    // Only depend on configureProductId, not selectedIngredients to avoid resetting while typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configureProductId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={theme.colors.text} />
      </View>
    );
  }

  if (!routineData || !routineData.routineStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.body}>Complete onboarding to see your protocol.</Text>
      </View>
    );
  }

  // Get selected problems based on user's concerns
  const selectedProblems = problems.filter((problem: Problem) =>
    routineData.concerns?.includes(problem.problem_id)
  );

  // Get current ingredient selections
  const currentIngredientIds = new Set(ingredientSelections.map((sel: IngredientSelection) => sel.ingredient_id));

  // Check if there are missing products (pending, deferred, or not_received, but not skipped)
  const hasMissingProducts = ingredientSelections.some((sel: IngredientSelection) => {
    const state = sel.state === 'added' ? 'active' :
                sel.state === 'not_received' ? (sel.waiting_for_delivery ? 'deferred' : 'pending') :
                sel.state;
    // Missing if pending, deferred, or not_received (but not skipped)
    return (state === 'pending' || state === 'deferred' || state === 'not_received') && state !== 'skipped';
  });

  // Helper to check if ingredient is premium (for free users, hide premium ingredients)
  const isPremiumIngredient = (ing: any): boolean => {
    return ing?.session?.premium === true;
  };

  // Get all ingredients that are NOT currently in the routine and NOT premium
  const availableIngredients = ingredients.filter(
    (ing: Ingredient) => !currentIngredientIds.has(ing.ingredient_id) && !isPremiumIngredient(ing)
  );

  // Get exercises from user's selections
  const exerciseSelections = routineData.exerciseSelections || [];
  const selectedExercises = exerciseSelections
    .map((sel: ExerciseSelection) => {
      const exercise = exercises.find(ex => ex.exercise_id === sel.exercise_id);
      return exercise ? { ...exercise, selection: sel } : null;
    })
    .filter(Boolean);

  // Format problem names for intro text
  const formatProblemNames = (problems: Problem[]): string => {
    if (problems.length === 0) return '';
    if (problems.length === 1) return problems[0].display_name.toLowerCase();
    if (problems.length === 2) {
      return `${problems[0].display_name.toLowerCase()} and ${problems[1].display_name.toLowerCase()}`;
    }
    const allButLast = problems.slice(0, -1).map(p => p.display_name.toLowerCase()).join(', ');
    const last = problems[problems.length - 1].display_name.toLowerCase();
    return `${allButLast} and ${last}`;
  };

  const problemNamesText = formatProblemNames(selectedProblems);

  // Helper to format arrival date
  const formatArrivalDate = (deferUntil?: string): string => {
    if (!deferUntil) return '';
    const date = new Date(deferUntil);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `Arriving ${months[date.getMonth()]} ${date.getDate()}`;
  };

  // Helper to get badge info based on product state
  const getBadgeInfo = (selection: IngredientSelection) => {
    // Handle legacy states
    const state = selection.state === 'added' ? 'active' :
                  selection.state === 'not_received' ? (selection.waiting_for_delivery ? 'deferred' : 'pending') :
                  selection.state;

    switch (state) {
      case 'active':
        return { text: 'You have', color: theme.colors.accent };
      case 'pending':
        return { text: 'Will get', color: theme.colors.textMuted };
      case 'deferred':
        return { text: formatArrivalDate(selection.defer_until), color: theme.colors.warning };
      case 'skipped':
        return { text: 'Skipped', color: theme.colors.error };
      default:
        return { text: 'Will get', color: theme.colors.textMuted };
    }
  };

  // Helper to get ingredient benefit text for warnings
  const getIngredientBenefit = (ingredient: any): string => {
    const usedFor = ingredient?.used_for || [];
    if (usedFor.includes('oily_skin') && usedFor.includes('blackheads')) {
      return 'oil control and pore clearing';
    }
    if (usedFor.includes('oily_skin')) {
      return 'oil control';
    }
    if (usedFor.includes('blackheads')) {
      return 'pore clearing';
    }
    if (usedFor.includes('acne')) {
      return 'acne treatment';
    }
    if (usedFor.includes('skin_texture')) {
      return 'skin texture improvement';
    }
    return 'skin health';
  };

  const handleProductNameChange = (ingredientId: string, text: string) => {
    setNewIngredientStates((prev) => ({
      ...prev,
      [ingredientId]: {
        ...prev[ingredientId],
        productName: text,
        state: prev[ingredientId]?.state || 'pending',
        waitingForDelivery: prev[ingredientId]?.waitingForDelivery || false,
      },
    }));
  };

  const handleToggleWaiting = (ingredientId: string) => {
    setNewIngredientStates((prev) => {
      const current = prev[ingredientId] || { state: 'pending', productName: '', waitingForDelivery: false };
      return {
        ...prev,
        [ingredientId]: {
          ...current,
          waitingForDelivery: !current.waitingForDelivery,
        },
      };
    });
  };

  const handleIngredientAdd = async (ingredientId: string) => {
    if (!user) return;

    const state = newIngredientStates[ingredientId];
    if (!state?.productName?.trim()) {
      Alert.alert('Enter product name', 'Type what you got');
      return;
    }

    setSaving(true);
    try {
      const userDoc = await doc(db, 'users', user.uid);
      const currentSelections = routineData.ingredientSelections || [];

      // Check if ingredient already exists
      const existingIndex = currentSelections.findIndex(
        (sel: IngredientSelection) => sel.ingredient_id === ingredientId
      );

      const newSelection: IngredientSelection = {
        ingredient_id: ingredientId,
        product_name: state.productName.trim(),
        state: state.waitingForDelivery ? 'not_received' : 'added',
        waiting_for_delivery: state.waitingForDelivery || false,
      };

      let updatedSelections: IngredientSelection[];
      if (existingIndex >= 0) {
        // Update existing
        updatedSelections = [...currentSelections];
        updatedSelections[existingIndex] = newSelection;
      } else {
        // Add new
        updatedSelections = [...currentSelections, newSelection];
      }

      await updateDoc(userDoc, {
        ingredientSelections: updatedSelections,
      });

      // Clear the form
      setNewIngredientStates((prev) => {
        const next = { ...prev };
        delete next[ingredientId];
        return next;
      });
      setShowAddIngredient(false);
      setEditingIngredient(null);
    } catch (error) {
      console.error('Error adding ingredient:', error);
      Alert.alert('Error', 'Failed to save ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleIngredientEdit = async (ingredientId: string, updates: Partial<IngredientSelection>) => {
    if (!user) return;

    setSaving(true);
    try {
      await updateIngredientState(user.uid, ingredientId, updates);
      setEditingIngredient(null);
    } catch (error) {
      console.error('Error updating ingredient:', error);
      Alert.alert('Error', 'Failed to update ingredient');
    } finally {
      setSaving(false);
    }
  };

  const handleIngredientRemove = async (ingredientId: string) => {
    if (!user) return;

    Alert.alert(
      'Remove ingredient?',
      'This will remove this ingredient from your routine.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              const userDoc = await doc(db, 'users', user.uid);
              const currentSelections = routineData.ingredientSelections || [];
              const updatedSelections = currentSelections.filter(
                (sel: IngredientSelection) => sel.ingredient_id !== ingredientId
              );
              await updateDoc(userDoc, {
                ingredientSelections: updatedSelections,
              });
            } catch (error) {
              console.error('Error removing ingredient:', error);
              Alert.alert('Error', 'Failed to remove ingredient');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const handleExerciseExclude = async (exerciseId: string) => {
    if (!user) return;

    Alert.alert(
      'Exclude from routine?',
      'This exercise will be excluded from your routine and will not count toward your consistency score.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exclude',
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await updateExerciseState(user.uid, exerciseId, 'excluded');
              setConfigureExerciseId(null);
            } catch (error) {
              console.error('Error excluding exercise:', error);
              Alert.alert('Error', 'Failed to exclude exercise');
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  };

  const renderProblemSection = (problem: Problem) => (
    <View key={problem.problem_id} style={styles.problemSection}>
      <Text style={styles.problemTitle}>{problem.display_name}</Text>
      <Text style={styles.problemParagraph}>{problem.what_it_is}</Text>
      <Text style={styles.problemParagraph}>{problem.what_causes_it}</Text>
      <Text style={styles.solutionTitle}>Solution</Text>
      <Text style={styles.problemParagraph}>{problem.how_to_fix}</Text>
    </View>
  );

  const renderProductCard = (item: any) => {
    const ingredient = item;
    const selection = item.selection as IngredientSelection;
    const badgeInfo = getBadgeInfo(selection);
    const state = selection.state === 'added' ? 'active' :
                  selection.state === 'not_received' ? (selection.waiting_for_delivery ? 'deferred' : 'pending') :
                  selection.state;
    const productName = state === 'active' && selection.product_name ? selection.product_name : '';

    return (
      <View key={ingredient.ingredient_id} style={styles.productCard}>
        <View style={styles.productCardHeader}>
          <View style={styles.productCardLeft}>
            <Text style={styles.productIngredientName}>{ingredient.display_name.toUpperCase()}</Text>
            {productName ? (
              <Text style={styles.productName}>{productName}</Text>
            ) : null}
          </View>
          <View style={styles.productCardRight}>
            <View style={[styles.badge, { borderColor: badgeInfo.color }]}>
              <Text style={[styles.badgeText, { color: badgeInfo.color }]}>
                {badgeInfo.text}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.configureButton}
              onPress={() => setConfigureProductId(ingredient.ingredient_id)}
            >
              <Text style={styles.configureButtonText}>•••</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.productDescription}>{ingredient.short_description}</Text>
        <View style={styles.productExamplesContainer}>
          <Text style={styles.productExamplesLabel}>Example brands:</Text>
          {ingredient.example_brands.map((brand: string, idx: number) => (
            <Text key={idx} style={styles.productExampleText}>• {brand}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderIngredientCard = (item: any) => {
    const ingredient = item;
    const selection = item.selection as IngredientSelection;
    const isEditing = editingIngredient === ingredient.ingredient_id;
    const editState = newIngredientStates[ingredient.ingredient_id] || {
      productName: selection.product_name || '',
      waitingForDelivery: selection.waiting_for_delivery || false,
    };

    if (isEditing) {
      return (
        <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
          <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
          <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
          <View style={styles.examplesContainer}>
            <Text style={styles.examplesLabel}>Example brands:</Text>
            {ingredient.example_brands.map((brand: string, idx: number) => (
              <Text key={idx} style={styles.exampleText}>• {brand}</Text>
            ))}
          </View>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.productInput}
              placeholder="What is name of the product you got?"
              placeholderTextColor={theme.colors.textMuted}
              value={editState.productName}
              onChangeText={(text) => handleProductNameChange(ingredient.ingredient_id, text)}
            />
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => handleToggleWaiting(ingredient.ingredient_id)}
            >
              <Text style={styles.checkboxText}>
                {editState.waitingForDelivery ? '☑' : '☐'} Will buy / waiting for delivery
              </Text>
            </TouchableOpacity>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.addButton,
                  (!editState.productName?.trim() || saving) && styles.buttonDisabled,
                ]}
                onPress={() => handleIngredientAdd(ingredient.ingredient_id)}
                disabled={!editState.productName?.trim() || saving}
              >
                <Text style={styles.actionButtonText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => {
                  setEditingIngredient(null);
                  setNewIngredientStates((prev) => {
                    const next = { ...prev };
                    delete next[ingredient.ingredient_id];
                    return next;
                  });
                }}
              >
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      );
    }

    return (
      <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
        <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
        <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesLabel}>Example brands:</Text>
          {ingredient.example_brands.map((brand: string, idx: number) => (
            <Text key={idx} style={styles.exampleText}>• {brand}</Text>
          ))}
        </View>
        {selection.state === 'added' && (
          <View style={styles.addedContainer}>
            <Text style={styles.addedText}>✓ Added: {selection.product_name}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={() => setEditingIngredient(ingredient.ingredient_id)}>
                <Text style={styles.changeText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleIngredientRemove(ingredient.ingredient_id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {selection.state === 'not_received' && (
          <View style={styles.notReceivedContainer}>
            <Text style={styles.notReceivedText}>⏳ Waiting for delivery: {selection.product_name}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={() => setEditingIngredient(ingredient.ingredient_id)}>
                <Text style={styles.changeText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleIngredientRemove(ingredient.ingredient_id)}>
                <Text style={styles.removeText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {selection.state === 'skipped' && (
          <View style={styles.addedContainer}>
            <Text style={styles.skippedText}>Skipped</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={() => setEditingIngredient(ingredient.ingredient_id)}>
                <Text style={styles.changeText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAddIngredientCard = (ingredient: Ingredient) => {
    const state = newIngredientStates[ingredient.ingredient_id] || {
      state: 'pending',
      productName: '',
      waitingForDelivery: false,
    };

    return (
      <View key={ingredient.ingredient_id} style={styles.ingredientCard}>
        <Text style={styles.ingredientName}>{ingredient.display_name}</Text>
        <Text style={styles.ingredientDescription}>{ingredient.short_description}</Text>
        <View style={styles.examplesContainer}>
          <Text style={styles.examplesLabel}>Example brands:</Text>
          {ingredient.example_brands.map((brand: string, idx: number) => (
            <Text key={idx} style={styles.exampleText}>• {brand}</Text>
          ))}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.productInput}
            placeholder="What is name of the product you got?"
            placeholderTextColor={theme.colors.textMuted}
            value={state.productName}
            onChangeText={(text) => handleProductNameChange(ingredient.ingredient_id, text)}
          />
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleToggleWaiting(ingredient.ingredient_id)}
          >
            <Text style={styles.checkboxText}>
              {state.waitingForDelivery ? '☑' : '☐'} Will buy / waiting for delivery
            </Text>
          </TouchableOpacity>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.addButton,
                (!state.productName?.trim() || saving) && styles.buttonDisabled,
              ]}
              onPress={() => handleIngredientAdd(ingredient.ingredient_id)}
              disabled={!state.productName?.trim() || saving}
            >
              <Text style={styles.actionButtonText}>Add to routine</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.skipButton]}
              onPress={() => {
                setNewIngredientStates((prev) => {
                  const next = { ...prev };
                  delete next[ingredient.ingredient_id];
                  return next;
                });
              }}
            >
              <Text style={styles.actionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderExerciseCard = (item: any) => {
    const exercise = item;
    const selection = item.selection as ExerciseSelection;
    const exerciseData = exercises.find((ex: Exercise) => ex.exercise_id === exercise.exercise_id);

    if (!exerciseData) return null;

    const exerciseCardContent = (
      <>
        <View style={styles.exerciseCardHeader}>
          <Text style={styles.exerciseName}>{exerciseData.display_name}</Text>
          <TouchableOpacity
            style={styles.configureButton}
            onPress={() => setConfigureExerciseId(exercise.exercise_id)}
          >
            <Text style={styles.configureButtonText}>•••</Text>
          </TouchableOpacity>
        </View>
        {exerciseData.exercise_id === 'jaw_exercises' && (
          <>
            <Text style={styles.exerciseExplanation}>
              Jaw exercises strengthen the masseter and surrounding facial muscles. Stronger jaw muscles create better definition and improve the overall structure of your lower face. These resistance movements target different areas of the jaw for balanced development.
            </Text>
            {(exerciseData as any).variations && (exerciseData as any).variations.length > 0 && (
              <>
                <Text style={styles.variationsTitle}>Exercises:</Text>
                {(exerciseData as any).variations.map((variation: any, index: number) => (
                  <Text key={variation.variation_id || index} style={styles.variationListItem}>
                    • {variation.name}
                  </Text>
                ))}
              </>
            )}
          </>
        )}
        {exerciseData.exercise_id === 'neck_posture' && (
          <>
            <Text style={styles.exerciseExplanation}>
              Forward head posture pulls your jaw back and hides definition. Neck posture exercises correct alignment, improve jaw appearance, and prevent the forward head position that undermines your jawline. Proper alignment makes your existing structure more visible.
            </Text>
            {(exerciseData as any).variations && (exerciseData as any).variations.length > 0 && (
              <>
                <Text style={styles.variationsTitle}>Exercises:</Text>
                {(exerciseData as any).variations.map((variation: any, index: number) => (
                  <Text key={variation.variation_id || index} style={styles.variationListItem}>
                    • {variation.name}
                  </Text>
                ))}
              </>
            )}
          </>
        )}
        {exerciseData.exercise_id === 'mewing' && (
          <>
            <Text style={styles.exerciseInstructions}>
              {exerciseData.instructions || exerciseData.short_description}
            </Text>
            {exerciseData.tip && (
              <Text style={styles.exerciseTip}>{exerciseData.tip}</Text>
            )}
          </>
        )}
        {exerciseData.exercise_id === 'chewing' && (
          <>
            <Text style={styles.exerciseInstructions}>
              You can chew normal gum or mastic gum with consistent, firm pressure. You can also buy rubber jaw exercisers. These mimic gum, but make sure to get the ones that exercise chewing with your molars, not with your front teeth. Alternate sides every few minutes to develop both sides evenly.
            </Text>
            {exerciseData.tip && (
              <Text style={styles.exerciseTip}>{exerciseData.tip}</Text>
            )}
          </>
        )}
        {exerciseData.exercise_id !== 'mewing' && exerciseData.exercise_id !== 'chewing' && exerciseData.exercise_id !== 'jaw_exercises' && exerciseData.exercise_id !== 'neck_posture' && (
          <>
            {exerciseData.instructions && (
              <Text style={styles.exerciseInstructions}>{exerciseData.instructions}</Text>
            )}
            {exerciseData.short_description && (
              <Text style={styles.exerciseDescription}>{exerciseData.short_description}</Text>
            )}
            {exerciseData.tip && (
              <Text style={styles.exerciseTip}>{exerciseData.tip}</Text>
            )}
          </>
        )}
      </>
    );

    return (
      <View key={exercise.exercise_id} style={styles.exerciseCard}>
        {exerciseCardContent}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.settingsButton,
          {
            right: responsive.safeHorizontalPadding,
            width: responsive.sz(36),
            height: responsive.sz(36),
            borderRadius: responsive.sz(18),
          }
        ]}
        onPress={() => navigation.navigate('Settings')}
      >
        <Image
          source={require('../../assets/icons/gear.png')}
          style={[styles.settingsButtonIcon, { width: responsive.sz(22), height: responsive.sz(22) }]}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <ScrollView style={styles.scrollView} contentContainerStyle={[styles.scrollContent, { paddingHorizontal: responsive.safeHorizontalPadding }]}>
        <Text style={[styles.heading, styles.protocolHeading, { fontSize: responsive.font(32) }]}>
          Your{'\n'}Protocol
        </Text>

        {/* Missing Products Banner */}
        {hasMissingProducts && (
          <View style={styles.missingProductsBanner}>
            <Text style={styles.missingProductsBannerText}>
              You are missing products
            </Text>
          </View>
        )}

        {/* Custom protocol intro */}
        {problemNamesText && (
          <Text style={styles.protocolIntro}>
            Your protocol is focused on {problemNamesText}.
          </Text>
        )}

        {/* Info intro text */}
        {selectedProblems.length > 0 && (
          <Text style={styles.infoIntro}>
            If you follow this protocol, you will see results. Below is some info on the cause of these problems, and how to combat them.
            {'\n'}{'\n'}</Text>
        )}

        {/* Problem Sections */}
        {selectedProblems.length > 0 && (
          <>
            <Text style={styles.problemsTitle}>Your main problems</Text>
            <View style={styles.section}>
              {selectedProblems.map((problem: Problem) => renderProblemSection(problem))}
            </View>
            <View style={styles.divider} />
          </>
        )}

        {/* Products Section */}
        <Text style={styles.sectionTitle}>
          Your products
        </Text>
        <View style={styles.section}>
          {selectedIngredients.map((item: any) => renderProductCard(item))}
        </View>

        {/* Add Ingredient Section */}
        {!showAddIngredient && availableIngredients.length > 0 && (
          <TouchableOpacity
            style={styles.addButtonContainer}
            onPress={() => {
              if (isPremium) {
                setShowAddIngredient(true);
              } else {
                setShowPaywall(true);
              }
            }}
          >
            <Text style={styles.addButtonText}>+ Add Ingredient</Text>
          </TouchableOpacity>
        )}

        {showAddIngredient && availableIngredients.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Add New Ingredient</Text>
            <View style={styles.section}>
              {availableIngredients.map((ingredient: Ingredient) => renderAddIngredientCard(ingredient))}
            </View>
            <TouchableOpacity
              style={styles.cancelButtonContainer}
              onPress={() => {
                setShowAddIngredient(false);
                setNewIngredientStates({});
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={styles.divider} />

        {/* Exercises Section */}
        {selectedExercises.filter((item: any) => {
          const selection = item.selection as ExerciseSelection;
          return selection.state !== 'excluded';
        }).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Exercises
            </Text>
            <Text style={styles.exercisesIntro}>
              These exercises target facial muscles and posture to improve your jawline and overall facial structure. Consistency matters more than intensity. Results come from repetition.
            </Text>
            <View style={styles.section}>
              {selectedExercises
                .filter((item: any) => {
                  const selection = item.selection as ExerciseSelection;
                  return selection.state !== 'excluded';
                })
                .map((item: any) => renderExerciseCard(item))}
            </View>
          </>
        )}
      </ScrollView>
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        onPurchaseComplete={() => {
          setShowPaywall(false);
          // After purchase, allow adding ingredients
          setShowAddIngredient(true);
        }}
      />
      {/* Configure Modal for Active Products */}
      {configureProductId && (() => {
        const product = selectedIngredients.find((item: any) => item.ingredient_id === configureProductId);
        if (!product) return null;
        const selection = product.selection as IngredientSelection;
        const state = selection.state === 'added' ? 'active' :
                      selection.state === 'not_received' ? (selection.waiting_for_delivery ? 'deferred' : 'pending') :
                      selection.state;

        // Show PendingProductModal for pending/deferred/skipped products
        if (state === 'pending' || state === 'deferred' || state === 'skipped') {
          return (
            <PendingProductModal
              visible={true}
              onClose={() => setConfigureProductId(null)}
              ingredientId={product.ingredient_id}
              ingredientName={product.display_name}
              shortDescription={product.short_description}
              onUpdate={() => {
                setConfigureProductId(null);
                // Data will update via subscription
              }}
            />
          );
        }

        // Show active product modal
        if (state === 'active') {
          // If modal is open, always use editingProductName (even if empty) since user is editing
          // Otherwise fall back to original product name
          const currentName = configureProductId === product.ingredient_id
            ? editingProductName
            : (selection.product_name || '');
          return (
            <ActiveProductModal
              visible={true}
              onClose={() => {
                setConfigureProductId(null);
                setEditingProductName('');
              }}
              ingredientId={product.ingredient_id}
              ingredientName={product.display_name}
              productName={currentName}
              onProductNameChange={setEditingProductName}
              onUpdate={async () => {
                if (!user) return;
                if (currentName.trim() && currentName.trim() !== selection.product_name) {
                  await handleIngredientEdit(product.ingredient_id, {
                    product_name: currentName.trim(),
                  });
                }
                setConfigureProductId(null);
                setEditingProductName('');
              }}
              onRemove={() => {
                Alert.alert(
                  'Remove this ingredient?',
                  `${product.display_name} helps with ${getIngredientBenefit(product)}. Your routine will be less effective without it.\n\nYou can re-add it anytime here in the Protocol tab.`,
                  [
                    { text: 'Keep it', style: 'cancel' },
                    {
                      text: 'Remove anyway',
                      style: 'destructive',
                      onPress: async () => {
                        await handleIngredientRemove(product.ingredient_id);
                        setConfigureProductId(null);
                        setEditingProductName('');
                      },
                    },
                  ]
                );
              }}
              activeProductModalStyles={activeProductModalStyles}
              theme={theme}
            />
          );
        }

        return null;
      })()}
      {/* Exercise Configuration Modal */}
      {configureExerciseId && (() => {
        const exercise = selectedExercises.find((item: any) => item.exercise_id === configureExerciseId);
        if (!exercise) return null;
        const selection = exercise.selection as ExerciseSelection;

        return (
          <Modal
            visible={true}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setConfigureExerciseId(null)}
          >
            <View style={activeProductModalStyles.overlay}>
              <View style={activeProductModalStyles.modal}>
                <View style={activeProductModalStyles.header}>
                  <Text style={activeProductModalStyles.title}>{exercise.display_name.toUpperCase()}</Text>
                  <TouchableOpacity onPress={() => setConfigureExerciseId(null)}>
                    <Text style={activeProductModalStyles.closeButton}>✕</Text>
                  </TouchableOpacity>
                </View>

                <View style={activeProductModalStyles.divider} />

                <TouchableOpacity
                  style={activeProductModalStyles.removeButton}
                  onPress={() => {
                    setConfigureExerciseId(null);
                    handleExerciseExclude(exercise.exercise_id);
                  }}
                >
                  <Text style={activeProductModalStyles.removeText}>Exclude from routine</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        );
      })()}
    </View>
  );
}

function getStyles(theme: Theme) {
  const isPro = theme.key === 'pro';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      // paddingHorizontal is set dynamically
      paddingVertical: theme.spacing.lg,
      paddingTop: theme.spacing.xl,
    },
    heading: {
      ...theme.typography.heading,
      fontSize: 32,
      marginBottom: theme.spacing.lg,
      textAlign: 'center',
    },
    protocolHeading: {
      marginTop: theme.spacing.xxl,
      paddingTop: theme.spacing.xxl * 1.5,
      marginBottom: theme.spacing.xxl,
    },
    problemsTitle: {
      ...theme.typography.heading,
      marginBottom: theme.spacing.xl,
      textAlign: 'center',
    },
    protocolIntro: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
    },
    infoIntro: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.xl,
      lineHeight: 22,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.md,
    },
    sectionTitle: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
    },
    problemSection: {
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    problemTitle: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.sm,
    },
    problemParagraph: {
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
    },
    solutionTitle: {
      ...theme.typography.headingSmall,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    ingredientCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    ingredientName: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.xs,
    },
    ingredientDescription: {
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
    },
    examplesContainer: {
      marginBottom: theme.spacing.sm,
    },
    examplesLabel: {
      ...theme.typography.label,
      marginBottom: theme.spacing.xs,
    },
    exampleText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    addedContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    addedText: {
      ...theme.typography.body,
      color: theme.colors.accent,
      flex: 1,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    changeText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textDecorationLine: 'underline',
    },
    removeText: {
      ...theme.typography.body,
      color: theme.colors.error,
      textDecorationLine: 'underline',
    },
    notReceivedContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: theme.spacing.sm,
      paddingTop: theme.spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.borderLight,
    },
    notReceivedText: {
      ...theme.typography.body,
      color: theme.colors.warning,
      flex: 1,
    },
    skippedText: {
      ...theme.typography.body,
      color: theme.colors.textMuted,
      flex: 1,
    },
    inputContainer: {
      marginTop: theme.spacing.sm,
    },
    productInput: {
      ...theme.typography.body,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
    },
    checkbox: {
      marginBottom: theme.spacing.sm,
    },
    checkboxText: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    actionButton: {
      flex: 1,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
    },
    addButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
    },
    skipButton: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.border,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    actionButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    exerciseCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    exerciseCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.xs,
    },
    exerciseName: {
      ...theme.typography.headingSmall,
      flex: 1,
    },
    exerciseDescription: {
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
      color: theme.colors.textSecondary,
    },
    exerciseInstructions: {
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
      color: theme.colors.text,
    },
    exerciseExplanation: {
      ...theme.typography.body,
      marginBottom: theme.spacing.md,
      lineHeight: 22,
      color: theme.colors.text,
    },
    exerciseTip: {
      ...theme.typography.bodySmall,
      marginTop: theme.spacing.xs,
      color: theme.colors.textMuted,
      fontStyle: 'italic',
      lineHeight: 20,
    },
    exercisesIntro: {
      ...theme.typography.body,
      color: theme.colors.text,
      marginBottom: theme.spacing.lg,
      lineHeight: 22,
    },
    variationsTitle: {
      ...theme.typography.headingSmall,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      color: theme.colors.text,
    },
    variationListItem: {
      ...theme.typography.body,
      marginBottom: theme.spacing.xs,
      color: theme.colors.text,
      lineHeight: 22,
    },
    addButtonContainer: {
      backgroundColor: theme.colors.accentSecondary,
      borderWidth: 1,
      borderColor: theme.colors.accentSecondary,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    addButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.background,
    },
    cancelButtonContainer: {
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    cancelButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textDecorationLine: 'underline',
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    settingsButton: {
      position: 'absolute',
      top: 60,
      // right is set dynamically to match content padding
      zIndex: 1000,
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
    },
    settingsButtonIcon: {
      width: 22,
      height: 22,
      tintColor: theme.colors.text,
    },
    productCard: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    productCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    productCardLeft: {
      flex: 1,
    },
    productCardRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    productIngredientName: {
      fontFamily: theme.typography.label.fontFamily,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.xs,
    },
    productName: {
      ...theme.typography.body,
      color: theme.colors.text,
    },
    productDescription: {
      ...theme.typography.body,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      lineHeight: 22,
      color: theme.colors.text,
    },
    productExamplesContainer: {
      marginBottom: theme.spacing.sm,
    },
    productExamplesLabel: {
      ...theme.typography.label,
      marginBottom: theme.spacing.xs,
    },
    productExampleText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginLeft: theme.spacing.sm,
    },
    configureButton: {
      padding: theme.spacing.xs,
    },
    configureButtonText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      fontSize: 16,
      letterSpacing: 2,
    },
    badge: {
      alignSelf: 'flex-start',
      borderWidth: 1,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      backgroundColor: 'transparent',
    },
    badgeText: {
      fontFamily: theme.typography.label.fontFamily,
      fontSize: 11,
      fontWeight: '500',
    },
    missingProductsBanner: {
      backgroundColor: isPro ? 'rgba(168, 85, 247, 0.08)' : '#171A17',
      borderWidth: 1,
      borderColor: isPro ? 'rgba(168, 85, 247, 0.2)' : '#0D360D',
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    missingProductsBannerText: {
      ...theme.typography.body,
      color: theme.colors.accent,
      fontWeight: '600',
    },
  });
}

function getActiveProductModalStyles(theme: Theme) {
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      ...theme.typography.headingSmall,
      flex: 1,
    },
    closeButton: {
      ...theme.typography.body,
      fontSize: 24,
      color: theme.colors.textMuted,
      padding: theme.spacing.xs,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.md,
    },
    sectionLabel: {
      ...theme.typography.body,
      marginBottom: theme.spacing.sm,
    },
    input: {
      ...theme.typography.body,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    updateButton: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    updateButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.text,
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    removeText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      textDecorationLine: 'underline',
    },
    removeButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
    },
  });
}
