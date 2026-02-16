/**
 * Slider Paywall Modal Component
 *
 * Displays subscription options when free user tries to use slider comparison feature.
 * Includes functional slider preview with Week 0 vs most recent photo.
 */

import React, { useState, useEffect, useMemo } from 'react';
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
  useWindowDimensions,
} from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes';
import { usePremium } from '../contexts/PremiumContext';
import { useAuth } from '../contexts/AuthContext';
import { useResponsive } from '../utils/responsive';
import LegalModal from './LegalModal';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';
import { getPhotoForWeek, loadAllPhotos, ProgressPhoto } from '../services/photoService';

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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const { user } = useAuth();
  const { refreshSubscriptionStatus } = usePremium();
  const posthog = usePostHog();
  const navigation = useNavigation();
  const responsive = useResponsive();
  const { width: SCREEN_WIDTH } = useWindowDimensions();

  // Responsive values
  const containerPadding = responsive.isNarrow ? theme.spacing.md : theme.spacing.lg;
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [week0Photo, setWeek0Photo] = useState<ProgressPhoto | null>(null);
  const [latestPhoto, setLatestPhoto] = useState<ProgressPhoto | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [sliderPosition, setSliderPosition] = useState<number>(0.5); // 0 to 1, where 0.5 is center
  const [isSliderActive, setIsSliderActive] = useState(false); // Track if slider is being dragged
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'faq'>('privacy');
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
      // Track paywall viewed event
      if (posthog) {
        posthog.capture('paywall_viewed', {
          trigger: 'slider_comparison',
        });
      }
    }
  }, [visible, posthog]);

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
    setLoading(true);
    try {
      const offering = await getOfferings();
      if (offering && offering.availablePackages.length > 0) {
        const availablePackages = offering.availablePackages;
        console.log('Loaded packages:', availablePackages.length, availablePackages.map(p => p.identifier));
        setPackages(availablePackages);

        // Pre-select annual package (default/standard)
        const annualPackage = availablePackages.find(pkg =>
          pkg.packageType === 'ANNUAL' || pkg.identifier.includes('annual') || pkg.identifier.includes('yearly')
        );
        if (annualPackage) {
          setSelectedPackage(annualPackage);
        } else if (availablePackages.length > 0) {
          setSelectedPackage(availablePackages[0]);
        }
      } else {
        console.warn('No offering available from RevenueCat.');
        setPackages([]);
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
      setPackages([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (packages.length === 0) {
      Alert.alert(
        'Subscription Unavailable',
        'Unable to load subscription options. Please check your internet connection and try again, or contact support if the issue persists.'
      );
      return;
    }

    if (!selectedPackage) {
      Alert.alert('Error', 'Please select a subscription plan');
      return;
    }

    setLoading(true);
    try {
      const result = await purchasePackage(selectedPackage);

      if (result.success) {
        // Track purchase completed event
        if (posthog && selectedPackage) {
          const packageIdentifier = selectedPackage.identifier.toLowerCase();
          const packageType = selectedPackage.packageType;
          let plan = 'monthly';
          if (packageIdentifier.includes('annual') || packageIdentifier.includes('yearly') || packageType === 'ANNUAL') {
            plan = 'annual';
          }
          const price = selectedPackage.product.priceString || selectedPackage.product.localizedPriceString || '0';

          posthog.capture('purchase_completed', {
            plan: plan,
            price: price,
          });
        }

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
    // Use localized price from RevenueCat
    const priceString = packageItem.product.priceString;
    const identifier = packageItem.identifier.toLowerCase();

    if (identifier.includes('annual') || packageItem.packageType === 'ANNUAL') {
      return `${priceString}/year`;
    } else if (identifier.includes('monthly') || packageItem.packageType === 'MONTHLY') {
      return `${priceString}/month`;
    }

    // Fallback to product title if we can't determine type
    return packageItem.product.title || priceString;
  };

  const getPackageSubtitle = (packageItem: PurchasesPackage): string => {
    const identifier = packageItem.identifier.toLowerCase();
    if (identifier.includes('annual') || packageItem.packageType === 'ANNUAL') {
      return '50% off • 1 week free trial';
    } else if (identifier.includes('monthly') || packageItem.packageType === 'MONTHLY') {
      return 'Maximize your efficiency';
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
            {
              paddingTop: insets.top + theme.spacing.lg,
              paddingHorizontal: responsive.safeHorizontalPadding,
            }
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!isSliderActive}
        >
          <View style={[styles.container, { padding: containerPadding }]}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={styles.mainTitle}>Unlock Full Protocol</Text>
              <Text style={styles.subtitle}>Compare any two photos with the slider</Text>
            </View>

            {/* Photo Slider Comparison */}
            <View style={styles.photoSliderContainer}>
              {loadingData ? (
                <ActivityIndicator size="large" color={theme.colors.text} style={styles.photoLoading} />
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
                    const containerWidth = sliderLayout.width || (SCREEN_WIDTH - theme.spacing.lg * 2 - theme.spacing.lg * 2);
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
                          <Text style={[styles.sliderPhotoLabel, { left: theme.spacing.sm }]}>Week 0</Text>
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
                          <Text style={[styles.sliderPhotoLabel, { right: theme.spacing.sm, left: 'auto' }]}>
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
              <Text style={styles.sellHeadline}>Full Protocol Features</Text>
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
              <Text style={styles.detailedInsightButtonText}>Preview Detailed Insight</Text>
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
            {packages.map((pkg) => {
              const isSelected = selectedPackage?.identifier === pkg.identifier;

              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[
                    styles.option,
                    isSelected && styles.optionSelected,
                  ]}
                  onPress={() => {
                    console.log('Package selected:', pkg.identifier);
                    setSelectedPackage(pkg);
                  }}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionContent} pointerEvents="none">
                    <Text style={styles.optionTitle}>
                      {getPackageLabel(pkg)}
                    </Text>
                    <Text style={styles.optionSubtitle}>
                      {getPackageSubtitle(pkg)}
                    </Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkmark} pointerEvents="none">
                      <Text style={styles.checkmarkText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Purchase Button */}
          <TouchableOpacity
            style={[styles.purchaseButton, (loading || (packages.length === 0)) && styles.purchaseButtonDisabled]}
            onPress={handlePurchase}
            disabled={loading || packages.length === 0 || !selectedPackage}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : packages.length === 0 ? (
              <Text style={styles.purchaseButtonText}>Loading subscription options...</Text>
            ) : (
              <Text style={styles.purchaseButtonText}>
                {(selectedPackage && (selectedPackage.packageType === 'ANNUAL' || selectedPackage.identifier.toLowerCase().includes('annual') || selectedPackage.identifier.toLowerCase().includes('yearly')))
                  ? 'Try Full Protocol For Free'
                  : 'Try Full Protocol'}
              </Text>
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

            {/* Legal Links and Auto-Renewal Disclosure */}
            <View style={styles.legalSection}>
              <Text style={styles.autoRenewalText}>
                Subscription automatically renews unless cancelled at least 24 hours before the end of the current period.
              </Text>
              <View style={styles.legalLinks}>
                <TouchableOpacity
                  onPress={() => {
                    setLegalModalType('terms');
                    setLegalModalVisible(true);
                  }}
                >
                  <Text style={styles.legalLink}>Terms of Use</Text>
                </TouchableOpacity>
                <Text style={styles.legalLinkSeparator}> • </Text>
                <TouchableOpacity
                  onPress={() => {
                    setLegalModalType('privacy');
                    setLegalModalVisible(true);
                  }}
                >
                  <Text style={styles.legalLink}>Privacy Policy</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Legal Modal Overlay */}
      <LegalModal
        visible={legalModalVisible}
        onClose={() => setLegalModalVisible(false)}
        type={legalModalType}
      />
    </Modal>
  );
}

function getStyles(theme: Theme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scrollView: {
      flex: 1,
      width: '100%',
    },
    scrollContent: {
      // paddingHorizontal is set dynamically
      paddingBottom: theme.spacing.lg,
      justifyContent: 'center',
      minHeight: '100%',
    },
    container: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.lg,
      // padding is set dynamically
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    titleSection: {
      marginBottom: theme.spacing.xl,
      marginTop: theme.spacing.lg,
      alignItems: 'center',
    },
    mainTitle: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 24,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      marginBottom: theme.spacing.xs,
      textAlign: 'center',
    },
    photoSliderContainer: {
      marginBottom: theme.spacing.xl,
      width: '100%',
    },
    photoLoading: {
      paddingVertical: theme.spacing.xl,
      width: '100%',
    },
    sliderWrapper: {
      width: '100%',
      aspectRatio: 1,
      position: 'relative',
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
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
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderBottomLeftRadius: theme.borderRadius.md,
      borderBottomRightRadius: theme.borderRadius.md,
    },
    sliderBannerText: {
      ...theme.typography.label,
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
      bottom: theme.spacing.sm,
      backgroundColor: theme.colors.overlay,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
      borderRadius: 2,
      color: '#FFFFFF',
      fontSize: 11,
    },
    placeholderContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    placeholderText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
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
      backgroundColor: theme.colors.text,
    },
    sliderHandleCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.text,
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
      borderRightColor: theme.colors.background,
    },
    sliderHandleArrowRight: {
      width: 0,
      height: 0,
      borderTopWidth: 5,
      borderBottomWidth: 5,
      borderLeftWidth: 6,
      borderTopColor: 'transparent',
      borderBottomColor: 'transparent',
      borderLeftColor: theme.colors.background,
    },
    descriptionContainer: {
      marginBottom: theme.spacing.lg,
      paddingHorizontal: theme.spacing.md,
    },
    descriptionText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.border,
      marginVertical: theme.spacing.lg,
    },
    sellSection: {
      marginBottom: theme.spacing.lg,
    },
    sellHeadline: {
      ...theme.typography.headingSmall,
      marginBottom: theme.spacing.md,
      textAlign: 'center',
    },
    comparisonTable: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      marginTop: theme.spacing.md,
    },
    tableHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tableHeaderCell: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    tableHeaderCellFull: {
      backgroundColor: TABLE_FULL_PROTOCOL_HEADER_BG,
      borderRightWidth: 0,
    },
    tableHeaderText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.text,
      textAlign: 'center',
    },
    tableHeaderTextFull: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 15,
      fontWeight: '600',
      lineHeight: 24,
      color: theme.colors.background,
      textAlign: 'center',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    tableRowLast: {
      borderBottomWidth: 0,
    },
    tableCell: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
    },
    tableCellFull: {
      backgroundColor: theme.colors.background,
      borderRightWidth: 0,
    },
    tableCellText: {
      ...theme.typography.body,
      color: theme.colors.text,
      fontSize: 14,
      textAlign: 'center',
    },
    tableCellTextFull: {
      ...theme.typography.body,
      color: '#00cc00',
      fontWeight: '600',
      fontSize: 14,
      textAlign: 'center',
    },
    detailedInsightButton: {
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.lg,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      backgroundColor: '#00B800',
    },
    detailedInsightButtonText: {
      fontFamily: theme.typography.heading.fontFamily,
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.background,
    },
    benefitsSection: {
      marginBottom: theme.spacing.lg,
    },
    benefitsTitle: {
      ...theme.typography.body,
      fontWeight: '600',
      marginBottom: theme.spacing.md,
      color: theme.colors.text,
    },
    benefitsList: {
      gap: theme.spacing.xs,
    },
    benefitItem: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: theme.spacing.xs,
    },
    benefitBullet: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      marginRight: theme.spacing.sm,
      marginTop: 2,
    },
    benefitText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      flex: 1,
    },
    optionsContainer: {
      marginBottom: theme.spacing.lg,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    optionSelected: {
      borderColor: theme.colors.accent,
      backgroundColor: theme.colors.surface,
    },
    optionContent: {
      flex: 1,
    },
    optionTitle: {
      ...theme.typography.body,
      fontWeight: '600',
      marginBottom: theme.spacing.xs,
    },
    optionSubtitle: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
    },
    checkmark: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: theme.colors.accent,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: theme.spacing.md,
    },
    checkmarkText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
    purchaseButton: {
      backgroundColor: theme.colors.accentSecondary,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    purchaseButtonDisabled: {
      opacity: 0.5,
    },
    purchaseButtonText: {
      ...theme.typography.body,
      fontWeight: '600',
      color: theme.colors.background,
    },
    declineButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    declineButtonText: {
      ...theme.typography.body,
      color: theme.colors.textSecondary,
    },
    restoreButton: {
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    restoreText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    legalSection: {
      marginTop: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
    },
    autoRenewalText: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      fontSize: 11,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
      lineHeight: 16,
    },
    legalLinks: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    legalLink: {
      ...theme.typography.bodySmall,
      color: theme.colors.textSecondary,
      fontSize: 11,
      textDecorationLine: 'underline',
    },
    legalLinkSeparator: {
      ...theme.typography.bodySmall,
      color: theme.colors.textMuted,
      fontSize: 11,
    },
  });
}
