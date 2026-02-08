/**
 * Responsive Design Utilities
 * 
 * Handles ALL screen sizes including iPad compatibility mode where
 * the screen width can be NARROWER than typical iPhones (~320px).
 * 
 * Key insight: iPad with "supportsTablet: false" runs in a zoomed mode
 * that reports SMALLER dimensions than real iPhones. We need to handle
 * both narrow AND wide screens.
 */

import { Dimensions, PixelRatio } from 'react-native';

// Get initial dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints
const NARROW_THRESHOLD = 375;  // iPad compatibility mode reports 375px but needs scaling
const NORMAL_MIN = 390;        // Standard iPhone width
const LARGE_THRESHOLD = 428;   // iPhone 14 Pro Max

/**
 * Base design width - we designed for standard iPhone (375-390px)
 * Scale everything relative to this
 */
const BASE_DESIGN_WIDTH = 375;

/**
 * Get current window width (call this when you need fresh dimensions)
 */
export const getScreenWidth = (): number => {
  return Dimensions.get('window').width;
};

/**
 * Get current window height
 */
export const getScreenHeight = (): number => {
  return Dimensions.get('window').height;
};

/**
 * Check if screen is narrow (iPad compatibility mode or small devices)
 * Note: iPad compatibility mode reports 375px but needs scaling
 */
export const isNarrowScreen = (width?: number): boolean => {
  const w = width ?? getScreenWidth();
  return w <= NARROW_THRESHOLD; // <= 375px includes iPad compat mode
};

/**
 * Check if screen is tablet-sized (wider than largest iPhone)
 */
export const isTabletScreen = (width?: number): boolean => {
  const w = width ?? getScreenWidth();
  return w > LARGE_THRESHOLD;
};

/**
 * Scale a value based on screen width
 * On narrow screens (like iPad compat mode), values are scaled DOWN
 * On wide screens, values stay at base or slightly up
 * 
 * @param size - The base size designed for 375px width
 * @param options - Optional min/max constraints
 */
export const scale = (
  size: number, 
  options?: { min?: number; max?: number }
): number => {
  const width = getScreenWidth();
  const scaleFactor = width / BASE_DESIGN_WIDTH;
  
  let scaled = Math.round(size * scaleFactor);
  
  // Apply constraints
  if (options?.min !== undefined) scaled = Math.max(scaled, options.min);
  if (options?.max !== undefined) scaled = Math.min(scaled, options.max);
  
  return scaled;
};

/**
 * Scale font size with more conservative scaling
 * Fonts shouldn't shrink too much on narrow screens for readability
 */
export const scaleFont = (
  size: number,
  options?: { min?: number; max?: number }
): number => {
  const width = getScreenWidth();
  const scaleFactor = width / BASE_DESIGN_WIDTH;
  
  // More conservative scaling for fonts (don't shrink below 85%)
  const fontScale = Math.max(0.85, Math.min(1.1, scaleFactor));
  let scaled = Math.round(size * fontScale);
  
  // Apply constraints
  const minSize = options?.min ?? Math.round(size * 0.8);
  const maxSize = options?.max ?? Math.round(size * 1.2);
  
  scaled = Math.max(scaled, minSize);
  scaled = Math.min(scaled, maxSize);
  
  return scaled;
};

/**
 * Get responsive padding based on screen width
 * On narrow screens, we use smaller padding to maximize content area
 */
export const getResponsivePadding = (): {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
} => {
  const width = getScreenWidth();
  
  if (width < NARROW_THRESHOLD) {
    // iPad compatibility mode - very tight padding
    return {
      xs: 2,
      sm: 4,
      md: 10,
      lg: 14,
      xl: 20,
      xxl: 32,
    };
  }
  
  if (width < NORMAL_MIN) {
    // Small phones - slightly reduced padding
    return {
      xs: 3,
      sm: 6,
      md: 12,
      lg: 18,
      xl: 26,
      xxl: 40,
    };
  }
  
  // Normal and large phones - standard padding
  return {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  };
};

/**
 * Get responsive font sizes
 */
export const getResponsiveFonts = (): {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
} => {
  const width = getScreenWidth();
  
  if (width <= NARROW_THRESHOLD) {
    // iPad compatibility mode (375px) and smaller - 75% scaled fonts
    return {
      xs: 9,
      sm: 11,
      md: 12,
      lg: 14,
      xl: 18,
      xxl: 24,
    };
  }
  
  if (width < NORMAL_MIN) {
    // Small phones
    return {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 22,
      xxl: 30,
    };
  }
  
  // Normal and large phones
  return {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 24,
    xxl: 32,
  };
};

/**
 * Hook-compatible function to get all responsive values
 * Call this in useEffect or useMemo when dimensions change
 */
export const getResponsiveValues = () => {
  const width = getScreenWidth();
  const height = getScreenHeight();
  
  return {
    width,
    height,
    isNarrow: isNarrowScreen(width),
    isTablet: isTabletScreen(width),
    padding: getResponsivePadding(),
    fonts: getResponsiveFonts(),
    scale,
    scaleFont,
  };
};

/**
 * Get content width constraint
 * On narrow screens: use full width with minimal padding
 * On normal screens: use full width  
 * On tablet screens: constrain to max width
 */
export const getContentMaxWidth = (): number | '100%' => {
  const width = getScreenWidth();
  
  if (width > LARGE_THRESHOLD) {
    // Tablet - constrain content
    return 400;
  }
  
  // Phone or iPad compat mode - use full width
  return '100%' as const;
};

/**
 * Get safe horizontal padding that leaves enough content width
 * Ensures at least 280px of content width on any device
 */
export const getSafeHorizontalPadding = (): number => {
  const width = getScreenWidth();
  const minContentWidth = 280;
  const maxPadding = (width - minContentWidth) / 2;
  
  // Calculate ideal padding based on screen size
  // <= 375px includes iPad compatibility mode
  const idealPadding = width <= NARROW_THRESHOLD ? 8 : 
                       width < NORMAL_MIN ? 14 : 
                       24;
  
  // Return the smaller of ideal or max safe padding
  return Math.min(idealPadding, Math.max(4, maxPadding));
};

// ============================================
// HOOK-BASED API FOR REACT COMPONENTS
// ============================================

import { useWindowDimensions } from 'react-native';

/**
 * Hook to get responsive values that update when dimensions change
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  const isNarrow = width <= NARROW_THRESHOLD; // <= 375px includes iPad compat mode
  const isTablet = width > LARGE_THRESHOLD;
  
  // Scale factor: 75% on narrow screens (including iPad compat mode at 375px), 100% on normal screens
  const scaleFactor = isNarrow ? 0.75 : 1;
  
  // Calculate padding based on current width (also scaled)
  const padding = (() => {
    if (width <= NARROW_THRESHOLD) {
      return { xs: 1, sm: 2, md: 4, lg: 6, xl: 8, xxl: 16 };
    }
    if (width < NORMAL_MIN) {
      return { xs: 3, sm: 6, md: 12, lg: 18, xl: 26, xxl: 40 };
    }
    return { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };
  })();
  
  // Calculate fonts based on current width (scaled down on narrow)
  const fonts = (() => {
    if (width <= NARROW_THRESHOLD) {
      // 75% of normal sizes
      return { xs: 9, sm: 11, md: 12, lg: 14, xl: 18, xxl: 24 };
    }
    if (width < NORMAL_MIN) {
      return { xs: 11, sm: 13, md: 15, lg: 17, xl: 22, xxl: 30 };
    }
    return { xs: 12, sm: 14, md: 16, lg: 18, xl: 24, xxl: 32 };
  })();
  
  // Calculate safe padding that ensures minimum content width
  const minContentWidth = 260; // Reduced for narrow screens
  const maxPadding = (width - minContentWidth) / 2;
  const idealPadding = isNarrow ? 4 : width < NORMAL_MIN ? 14 : 24;
  const safeHorizontalPadding = Math.min(idealPadding, Math.max(4, maxPadding));
  
  // Content max width
  const contentMaxWidth = isTablet ? 400 : width;
  const contentAlign = isTablet ? 'center' : 'stretch';
  
  return {
    width,
    height,
    isNarrow,
    isTablet,
    scaleFactor,
    padding,
    fonts,
    safeHorizontalPadding,
    contentMaxWidth,
    contentAlign: contentAlign as 'center' | 'stretch',
    // Scale any size by the scale factor (75% on narrow, 100% normal)
    sz: (size: number) => Math.round(size * scaleFactor),
    // Scale font with minimum readability (75% on narrow screens)
    font: (size: number) => Math.max(9, Math.round(size * scaleFactor)),
    // Scaling functions (more granular control)
    scale: (size: number, min?: number, max?: number) => {
      let scaled = Math.round(size * scaleFactor);
      if (min !== undefined) scaled = Math.max(scaled, min);
      if (max !== undefined) scaled = Math.min(scaled, max);
      return scaled;
    },
  };
};

// ============================================
// LEGACY EXPORTS (for backward compatibility)
// ============================================

/**
 * @deprecated Use useResponsive() hook instead
 */
export const useIsTablet = (): boolean => {
  const { width } = useWindowDimensions();
  return width > LARGE_THRESHOLD;
};

/**
 * @deprecated Use useResponsive() hook instead
 */
export const useContentMaxWidth = (): number => {
  const { width } = useWindowDimensions();
  return width > LARGE_THRESHOLD ? 400 : width;
};

/**
 * @deprecated Use useResponsive() hook instead
 */
export const useContentAlign = (): 'center' | 'stretch' => {
  const { width } = useWindowDimensions();
  return width > LARGE_THRESHOLD ? 'center' : 'stretch';
};

/**
 * @deprecated Use useResponsive() hook instead
 */
export const useContentPadding = (): number => {
  const { width } = useWindowDimensions();
  if (width < NARROW_THRESHOLD) return 10;
  if (width < NORMAL_MIN) return 16;
  return 24;
};

/**
 * Debug info for development - helps identify iPad compat mode issues
 */
export const useDeviceDebugInfo = () => {
  const { width, height } = useWindowDimensions();
  const isNarrow = width < NARROW_THRESHOLD;
  const isTablet = width > LARGE_THRESHOLD;
  
  let deviceType = 'Normal Phone';
  if (isNarrow) deviceType = 'Narrow (iPad Compat?)';
  else if (isTablet) deviceType = 'Tablet/Large';
  else if (width < NORMAL_MIN) deviceType = 'Small Phone';
  
  return {
    isTablet,
    isNarrow,
    deviceType,
    deviceInfo: `${width}x${height} | ${deviceType}`,
    windowWidth: width,
    windowHeight: height,
    safeHorizontalPadding: getSafeHorizontalPadding(),
  };
};
