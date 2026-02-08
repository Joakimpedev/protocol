/**
 * Generic Paywall Modal Component
 * 
 * Displays subscription options for premium features throughout the app.
 * Use PhotoPaywallModal for Week 5 photo-specific paywall.
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
} from 'react-native';
import { usePostHog } from 'posthog-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { colors, typography, spacing, borderRadius, MONOSPACE_FONT } from '../constants/theme';
import { usePremium } from '../contexts/PremiumContext';
import { useResponsive } from '../utils/responsive';
import LegalModal from './LegalModal';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
} from '../services/subscriptionService';
import { PurchasesPackage } from 'react-native-purchases';

// Table color controls - adjust these to change the Full Protocol column colors
const TABLE_FULL_PROTOCOL_HEADER_BG = '#00B800'; // Green background for "Full Protocol" header

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  onPurchaseComplete?: () => void;
  title?: string;
  subtitle?: string;
  showFeatures?: boolean; // Whether to show premium features list
}

export default function PaywallModal({
  visible,
  onClose,
  onPurchaseComplete,
  title,
  subtitle,
  showFeatures = true,
}: PaywallModalProps) {
  const { refreshSubscriptionStatus } = usePremium();
  const posthog = usePostHog();
  const navigation = useNavigation();
  const responsive = useResponsive();
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [legalModalVisible, setLegalModalVisible] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'privacy' | 'terms' | 'faq'>('privacy');
  const insets = useSafeAreaInsets();
  
  // Responsive values - 85% scaling on narrow screens (iPad compatibility mode)
  const containerPadding = responsive.sz(24);
  const tableFontSize = responsive.font(14);
  const tablePadding = responsive.sz(16);
  const buttonPadding = responsive.sz(16);
  const titleFontSize = responsive.font(24);
  const bodyFontSize = responsive.font(16);
  const smallFontSize = responsive.font(14);

  useEffect(() => {
    if (visible) {
      loadOfferings();
      // Track paywall viewed event
      if (posthog) {
        posthog.capture('paywall_viewed', {
          trigger: 'general',
        });
      }
    }
  }, [visible, posthog]);

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
          // Determine plan type from package identifier or packageType
          const packageIdentifier = selectedPackage.identifier.toLowerCase();
          const packageType = selectedPackage.packageType;
          let plan = 'monthly';
          if (packageIdentifier.includes('annual') || packageIdentifier.includes('yearly') || packageType === 'ANNUAL') {
            plan = 'annual';
          }
          
          // Get price - use product.priceString if available, otherwise use localizedPriceString
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
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { 
              paddingTop: insets.top + spacing.lg,
              paddingHorizontal: responsive.safeHorizontalPadding,
            }
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.container, { padding: containerPadding }]}>
            {/* Title Section */}
            <View style={styles.titleSection}>
              <Text style={[styles.mainTitle, { fontSize: titleFontSize }]}>
                {title || 'Try Full Protocol'}
              </Text>
              {subtitle && (
                <Text style={[styles.subtitle, { fontSize: bodyFontSize }]}>{subtitle}</Text>
              )}
            </View>

            {/* Main Sell Section */}
            {showFeatures && (
              <>
                <View style={styles.sellSection}>
                  <Text style={[styles.sellHeadline, { fontSize: responsive.font(18) }]}>Ready for the full protocol?</Text>
                  {/* Comparison Table */}
                  <View style={styles.comparisonTable}>
                    {/* Header */}
                    <View style={styles.tableHeader}>
                      <View style={[styles.tableHeaderCell, { padding: tablePadding }]}>
                        <Text style={[styles.tableHeaderText, { fontSize: tableFontSize }]}>Basic</Text>
                      </View>
                      <View style={[styles.tableHeaderCell, styles.tableHeaderCellFull, { padding: tablePadding }]}>
                        <Text style={[styles.tableHeaderTextFull, { fontSize: tableFontSize }]}>Full Protocol</Text>
                      </View>
                    </View>

                    {/* Rows */}
                    <View style={styles.tableRow}>
                      <View style={[styles.tableCell, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellText, { fontSize: tableFontSize }]}>Core ingredients</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellFull, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellTextFull, { fontSize: tableFontSize }]}>All ingredients</Text>
                      </View>
                    </View>

                    <View style={styles.tableRow}>
                      <View style={[styles.tableCell, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellText, { fontSize: tableFontSize }]}>1 month photos</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellFull, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellTextFull, { fontSize: tableFontSize }]}>Unlimited photos</Text>
                      </View>
                    </View>

                    <View style={styles.tableRow}>
                      <View style={[styles.tableCell, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellText, { fontSize: tableFontSize }]}>Basic summary</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellFull, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellTextFull, { fontSize: tableFontSize }]}>Detailed analytics</Text>
                      </View>
                    </View>

                    <View style={[styles.tableRow, styles.tableRowLast]}>
                      <View style={[styles.tableCell, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellText, { fontSize: tableFontSize }]}>Stacked preview</Text>
                      </View>
                      <View style={[styles.tableCell, styles.tableCellFull, { padding: tablePadding }]}>
                        <Text style={[styles.tableCellTextFull, { fontSize: tableFontSize }]}>Slider preview</Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* See Detailed Insight Button */}
                <TouchableOpacity
                  style={[styles.detailedInsightButton, { padding: buttonPadding }]}
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
                  <Text style={[styles.detailedInsightButtonText, { fontSize: smallFontSize }]}>See Detailed Insight</Text>
                </TouchableOpacity>

                {/* Secondary Benefits Section */}
                <View style={styles.benefitsSection}>
                  <Text style={[styles.benefitsTitle, { fontSize: bodyFontSize }]}>Also unlocks:</Text>
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <Text style={[styles.benefitBullet, { fontSize: smallFontSize }]}>•</Text>
                      <Text style={[styles.benefitText, { fontSize: smallFontSize }]}>See how you rank against other users</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={[styles.benefitBullet, { fontSize: smallFontSize }]}>•</Text>
                      <Text style={[styles.benefitText, { fontSize: smallFontSize }]}>Monthly insights: Strengths and weaknesses</Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <Text style={[styles.benefitBullet, { fontSize: smallFontSize }]}>•</Text>
                      <Text style={[styles.benefitText, { fontSize: smallFontSize }]}>Breakdown by morning / evening / exercises</Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />
              </>
            )}

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
              style={[styles.purchaseButton, { padding: buttonPadding }, (loading || (packages.length === 0)) && styles.purchaseButtonDisabled]}
              onPress={handlePurchase}
              disabled={loading || packages.length === 0 || !selectedPackage}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : packages.length === 0 ? (
                <Text style={[styles.purchaseButtonText, { fontSize: bodyFontSize }]}>Loading...</Text>
              ) : (
              <Text style={[styles.purchaseButtonText, { fontSize: bodyFontSize }]}>
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
    // paddingHorizontal is set dynamically based on screen width
    paddingBottom: spacing.lg,
    justifyContent: 'center',
    minHeight: '100%',
  },
  container: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    // padding is set dynamically based on screen width
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  titleSection: {
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
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
  legalSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  autoRenewalText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 16,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legalLink: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  legalLinkSeparator: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontSize: 11,
  },
});

