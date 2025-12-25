/**
 * Slider Paywall Modal Component
 * 
 * Displays subscription options when free user tries to use slider comparison feature.
 * Includes functional slider preview with Week 0 vs most recent photo.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Image,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, MONOSPACE_FONT } from '../constants/theme';
import { usePremium } from '../contexts/PremiumContext';
import { useAuth } from '../contexts/AuthContext';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { getPhotoForWeek, loadAllPhotos, ProgressPhoto } from '../services/photoService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Table color controls - adjust these to change the Full Protocol column colors
const TABLE_FULL_PROTOCOL_HEADER_BG = '#00B800'; // Green background for "Full Protocol" header

interface SliderPaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
}

export default function SliderPaywallModal({
  visible,
  onClose,
  onPurchaseComplete,
}: SliderPaywallModalProps) {
  const { user } = useAuth();
  const { refreshSubscriptionStatus } = usePremium();
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [week0Photo, setWeek0Photo] = useState<ProgressPhoto | null>(null);
  const [latestPhoto, setLatestPhoto] = useState<ProgressPhoto | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [sliderPosition, setSliderPosition] = useState<number>(0.5); // 0 to 1, where 0.5 is center
  const [isSliderActive, setIsSliderActive] = useState(false); // Track if slider is being dragged
  const insets = useSafeAreaInsets();
  
  // Slider refs and state
  const sliderContainerRef = React.useRef<View>(null);
  const [sliderLayout, setSliderLayout] = useState({ x: 0, width: 0, y: 0 });
  const sliderStartPosition = React.useRef(0.5);
  const isDragging = React.useRef(false);
  const layoutWidthRef = React.useRef(0);
  const scrollViewRef = React.useRef<ScrollView>(null);

  useEffect(() => {
    if (visible) {
      loadOfferings();
      loadPhotos();
    }
  }, [visible]);

  const loadPhotos = async () => {
    if (!user) return;

    setLoadingData(true);
    try {
      // Load Week 0 photo
      const week0 = await getPhotoForWeek(0);
      setWeek0Photo(week0);

      // Load all photos and get the most recent (excluding Week 0)
      const allPhotos = await loadAllPhotos();
      const photosWithoutWeek0 = allPhotos.filter(p => p.weekNumber !== 0);
      if (photosWithoutWeek0.length > 0) {
        // Get the photo with the highest week number (most recent)
        const latest = photosWithoutWeek0.reduce((prev, current) => 
          current.weekNumber > prev.weekNumber ? current : prev
        );
        setLatestPhoto(latest);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Update layout width ref when layout changes
  useEffect(() => {
    layoutWidthRef.current = sliderLayout.width;
  }, [sliderLayout.width]);

  // Pan responder for slider drag
  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const width = layoutWidthRef.current;
        if (width === 0) return;
        isDragging.current = true;
        setIsSliderActive(true); // Disable scrolling
        const touchX = evt.nativeEvent.locationX;
        const initialPosition = Math.max(0, Math.min(1, touchX / width));
        sliderStartPosition.current = initialPosition;
        setSliderPosition(initialPosition);
      },
      onPanResponderMove: (evt, gestureState) => {
        const width = layoutWidthRef.current;
        if (width === 0 || !isDragging.current) return;
        const deltaX = gestureState.dx;
        const deltaRatio = deltaX / width;
        const newPosition = Math.max(0, Math.min(1, sliderStartPosition.current + deltaRatio));
        setSliderPosition(newPosition);
      },
      onPanResponderRelease: () => {
        isDragging.current = false;
        setIsSliderActive(false); // Re-enable scrolling
      },
      onPanResponderTerminate: () => {
        isDragging.current = false;
        setIsSliderActive(false); // Re-enable scrolling
      },
    })
  ).current;

  const loadOfferings = async () => {
    try {
      const offering = await getOfferings();
      if (offering) {
        const availablePackages = offering.availablePackages;
        setPackages(availablePackages);
        
        // Pre-select annual package (better value)
        const annualPackage = availablePackages.find(pkg => 
          pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual')
        );
        if (annualPackage) {
          setSelectedPackage(annualPackage);
        } else if (availablePackages.length > 0) {
          setSelectedPackage(availablePackages[0]);
        }
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      Alert.alert('Error', 'Failed to load subscription options. Please try again.');
    }
  };

  const handlePurchase = async () => {
    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    setLoading(true);
    try {
      const result = await purchasePackage(selectedPackage);
      
      if (result.success) {
        // Refresh subscription status
        await refreshSubscriptionStatus();
        
        if (onPurchaseComplete) {
          onPurchaseComplete();
        }
        onClose();
      } else if (result.error && result.error !== 'Purchase cancelled') {
        Alert.alert('Error', result.error || 'Purchase failed. Please try again.');
      }
    } catch (error: any) {
      console.error('Error during purchase:', error);
      Alert.alert('Error', error.message || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      
      if (result.success && result.isPremium) {
        await refreshSubscriptionStatus();
        Alert.alert('Success', 'Purchases restored');
        onClose();
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.');
      }
    } catch (error: any) {
      console.error('Error restoring purchases:', error);
      Alert.alert('Error', 'Failed to restore purchases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPackageLabel = (packageItem: PurchasesPackage): string => {
    const identifier = packageItem.identifier.toLowerCase();
    if (identifier.includes('annual') || packageItem.packageType === 'ANNUAL') {
      return '$29.99/year';
    } else if (identifier.includes('monthly') || packageItem.packageType === 'MONTHLY') {
      return '$4.99/month';
    }
    return packageItem.product.title;
  };

  const getPackageSubtitle = (packageItem: PurchasesPackage): string => {
    const identifier = packageItem.identifier.toLowerCase();
    if (identifier.includes('annual') || packageItem.packageType === 'ANNUAL') {
      return '50% off';
    } else if (identifier.includes('monthly') || packageItem.packageType === 'MONTHLY') {
      return '1 week free';
    }
    return '';
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <ScrollView 
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + spacing.xl }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isSliderActive}
        >
          <View style={styles.container}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>UNLOCK FULL PROTOCOL</Text>
              <Text style={styles.subtitle}>Compare any two photos with the slider</Text>
            </View>

            {/* Photo Slider Comparison */}
            <View style={styles.photoSliderContainer}>
              {loadingData ? (
                <ActivityIndicator size="large" color={colors.text} style={styles.photoLoading} />
              ) : (
                <View 
                  ref={sliderContainerRef}
                  style={styles.sliderWrapper}
                  onLayout={(event) => {
                    const { x, y, width } = event.nativeEvent.layout;
                    setSliderLayout({ x, y, width });
                  }}
                  {...(panResponder.panHandlers)}
                  collapsable={false}
                >
                  {/* Slider Preview Banner */}
                  <View style={styles.sliderBanner}>
                    <View style={styles.sliderBannerInner}>
                      <Text style={styles.sliderBannerText}>Slider preview</Text>
                    </View>
                  </View>

                  {(() => {
                    const containerWidth = sliderLayout.width || (SCREEN_WIDTH - spacing.lg * 2 - spacing.lg * 2);
                    const sliderX = sliderPosition * containerWidth;
                    const leftImageWidth = sliderX;
                    const rightImageWidth = containerWidth - sliderX;

                    return (
                      <>
                        {/* Left Photo (Week 0) */}
                        <View style={[styles.sliderPhotoContainer, { width: containerWidth }]} pointerEvents="none">
                          {week0Photo ? (
                            <Image 
                              source={{ uri: week0Photo.uri }} 
                              style={[styles.sliderPhoto, { width: containerWidth }]} 
                              resizeMode="cover" 
                            />
                          ) : (
                            <View style={styles.placeholderContainer}>
                              <Text style={styles.placeholderText}>Week 0</Text>
                            </View>
                          )}
                          <Text style={[styles.sliderPhotoLabel, { left: spacing.sm }]}>Week 0</Text>
                        </View>

                        {/* Right Photo (Latest) - clipped */}
                        <View 
                          style={[
                            styles.sliderPhotoContainer, 
                            styles.sliderPhotoRight,
                            { width: rightImageWidth }
                          ]}
                          pointerEvents="none"
                        >
                          {latestPhoto ? (
                            <Image 
                              source={{ uri: latestPhoto.uri }} 
                              style={[styles.sliderPhoto, { width: containerWidth, marginLeft: -leftImageWidth }]} 
                              resizeMode="cover" 
                            />
                          ) : (
                            <View style={styles.placeholderContainer}>
                              <Text style={styles.placeholderText}>Latest</Text>
                            </View>
                          )}
                          <Text style={[styles.sliderPhotoLabel, { right: spacing.sm, left: 'auto' }]}>
                            Week {latestPhoto?.weekNumber || 0}
                          </Text>
                        </View>

                        {/* Slider Handle */}
                        <View style={[styles.sliderHandle, { left: sliderX - 15 }]} pointerEvents="none">
                          <View style={styles.sliderHandleLine} />
                          <View style={styles.sliderHandleCircle}>
                            <View style={styles.sliderHandleArrowLeft} />
                            <View style={styles.sliderHandleArrowRight} />
                          </View>
                          <View style={styles.sliderHandleLine} />
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>

            {/* Description Text */}
            <View style={styles.descriptionContainer}>
              <Text style={styles.descriptionText}>
                Full Protocol lets you pick any two photos and compare them side by side.
              </Text>
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Main Sell Section */}
            <View style={styles.sellSection}>
              <Text style={styles.sellHeadline}>Ready for the full protocol?</Text>
              {/* Comparison Table */}
              <View style={styles.comparisonTable}>
                {/* Header */}
                <View style={styles.tableHeader}>
                  <View style={styles.tableHeaderCell}>
                    <Text style={styles.tableHeaderText}>Basic</Text>
                  </View>
                  <View style={[styles.tableHeaderCell, styles.tableHeaderCellFull]}>
                    <Text style={styles.tableHeaderTextFull}>Full Protocol</Text>
                  </View>
                </View>

                {/* Rows */}
                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>Core ingredients</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellFull]}>
                    <Text style={styles.tableCellTextFull}>All ingredients</Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>1 month of photos</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellFull]}>
                    <Text style={styles.tableCellTextFull}>Unlimited photos</Text>
                  </View>
                </View>

                <View style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>Basic summary</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellFull]}>
                    <Text style={styles.tableCellTextFull}>Detailed analytics</Text>
                  </View>
                </View>

                <View style={[styles.tableRow, styles.tableRowLast]}>
                  <View style={styles.tableCell}>
                    <Text style={styles.tableCellText}>Stacked preview</Text>
                  </View>
                  <View style={[styles.tableCell, styles.tableCellFull]}>
                    <Text style={styles.tableCellTextFull}>Slider preview</Text>
                  </View>
                </View>

              </View>
            </View>

            {/* See Detailed Insight Button */}
            <TouchableOpacity
              style={styles.detailedInsightButton}
              onPress={() => {
                onClose();
                // Navigate to PremiumInsight screen
                // Use nested navigation to ensure it works from any context
                const nav = navigation as any;
                // Try to navigate to PremiumInsight - React Navigation will handle routing
                // If we're in Progress stack, it will navigate directly
                // Otherwise, we'll need to navigate to Progress tab first
                try {
                  nav.navigate('PremiumInsight');
                } catch {
                  // Fallback: navigate to Progress tab, then to PremiumInsight
                  nav.navigate('App', {
                    screen: 'Progress',
                    params: {
                      screen: 'PremiumInsight',
                    },
                  });
                }
              }}
            >
              <Text style={styles.detailedInsightButtonText}>See Detailed Insight</Text>
            </TouchableOpacity>

            {/* Secondary Benefits Section */}
            <View style={styles.benefitsSection}>
                  <Text style={styles.benefitsTitle}>Also unlocks:</Text>
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitBullet}>•</Text>
                      <Text style={styles.benefitText}>See how you rank against other users</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitBullet}>•</Text>
                      <Text style={styles.benefitText}>Monthly insights: Strengths and weaknesses</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={styles.benefitBullet}>•</Text>
                      <Text style={styles.benefitText}>Breakdown by morning / evening / exercises</Text>
                    </View>
                  </View>
                </View>

            {/* Divider */}
            <View style={styles.divider} />

          {/* Subscription Options */}
          <View style={styles.optionsContainer}>
            {packages.length > 0 ? (
              packages.map((pkg) => {
                const isSelected = selectedPackage?.identifier === pkg.identifier;
                
                return (
                  <TouchableOpacity
                    key={pkg.identifier}
                    style={[
                      styles.option,
                      isSelected && styles.optionSelected,
                    ]}
                    onPress={() => setSelectedPackage(pkg)}
                    disabled={loading}
                  >
                    <View style={styles.optionContent}>
                      <Text style={styles.optionTitle}>
                        {getPackageLabel(pkg)}
                      </Text>
                      <Text style={styles.optionSubtitle}>
                        {getPackageSubtitle(pkg)}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              // Fallback when packages aren't loaded yet
              <>
                <TouchableOpacity
                  style={[styles.option, styles.optionSelected]}
                  disabled={true}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>$4.99/month</Text>
                    <Text style={styles.optionSubtitle}>Accelerated progress</Text>
                  </View>
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.option}
                  disabled={true}
                >
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>$29.99/year</Text>
                    <Text style={styles.optionSubtitle}>50% off - limited offer</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, loading && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading || !selectedPackage}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={styles.purchaseButtonText}>Try Full Protocol</Text>
            )}
          </TouchableOpacity>

            {/* Decline Button */}
            <TouchableOpacity
              style={styles.declineButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.declineButtonText}>Stay on Basic Protocol</Text>
            </TouchableOpacity>

            {/* Restore Purchases */}
            <TouchableOpacity
              style={styles.restoreButton}
              onPress={handleRestore}
              disabled={loading}
            >
              <Text style={styles.restoreText}>Restore purchases</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleSection: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  mainTitle: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  photoSliderContainer: {
    marginBottom: spacing.xl,
    width: '100%',
  },
  photoLoading: {
    paddingVertical: spacing.xl,
    width: '100%',
  },
  sliderWrapper: {
    width: '100%',
    aspectRatio: 1,
    position: 'relative',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    zIndex: 1,
  },
  sliderBanner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  sliderBannerInner: {
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomLeftRadius: borderRadius.md,
    borderBottomRightRadius: borderRadius.md,
  },
  sliderBannerText: {
    ...typography.label,
    fontSize: 11,
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  sliderPhotoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    overflow: 'hidden',
  },
  sliderPhotoRight: {
    right: 0,
    left: 'auto',
  },
  sliderPhoto: {
    height: '100%',
  },
  sliderPhotoLabel: {
    position: 'absolute',
    bottom: spacing.sm,
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 2,
    color: '#FFFFFF',
    fontSize: 11,
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  sliderHandle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  sliderHandleLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.text,
  },
  sliderHandleCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.text,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  sliderHandleArrowLeft: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderRightWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: colors.background,
  },
  sliderHandleArrowRight: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: colors.background,
  },
  descriptionContainer: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  descriptionText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  sellSection: {
    marginBottom: spacing.lg,
  },
  sellHeadline: {
    ...typography.headingSmall,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  comparisonTable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginTop: spacing.md,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tableHeaderCellFull: {
    backgroundColor: TABLE_FULL_PROTOCOL_HEADER_BG,
    borderRightWidth: 0,
  },
  tableHeaderText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.text,
    textAlign: 'center',
  },
  tableHeaderTextFull: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 24,
    color: colors.background,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tableCellFull: {
    backgroundColor: colors.background,
    borderRightWidth: 0,
  },
  tableCellText: {
    ...typography.body,
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
  },
  tableCellTextFull: {
    ...typography.body,
    color: '#00cc00',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  detailedInsightButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    backgroundColor: '#00B800',
  },
  detailedInsightButtonText: {
    fontFamily: MONOSPACE_FONT,
    fontSize: 14,
    fontWeight: '600',
    color: colors.background,
  },
  benefitsSection: {
    marginBottom: spacing.lg,
  },
  benefitsTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.md,
    color: colors.text,
  },
  benefitsList: {
    gap: spacing.xs,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  benefitBullet: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  benefitText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  optionsContainer: {
    marginBottom: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  optionSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  optionSubtitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.md,
  },
  checkmarkText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  purchaseButton: {
    backgroundColor: colors.accentSecondary,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  purchaseButtonDisabled: {
    opacity: 0.5,
  },
  purchaseButtonText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.background,
  },
  declineButton: {
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  declineButtonText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  restoreButton: {
    padding: spacing.md,
    alignItems: 'center',
  },
  restoreText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 12,
  },
});

