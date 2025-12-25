/**
 * Matrix-style Redacted Text Component
 * Shows randomized characters that keep changing for free users
 * Shows actual data for premium users
 * Can be used as standalone or nested within Text components
 */

import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, TextProps } from 'react-native';
import { usePremium } from '../contexts/PremiumContext';
import { MONOSPACE_FONT } from '../constants/theme';

interface MatrixRedactedTextProps extends TextProps {
  value: string | number;
  style?: any;
  inline?: boolean; // If true, returns just the text (for nesting in Text components)
  fixedLength?: number; // If set, generates exactly this many characters (for consistent sizing)
  addLinebreak?: boolean; // If true, adds a linebreak after the text (only for free users)
}

// Matrix-style characters for redaction
const MATRIX_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん■▢▣▤▥▦▧▨▩';

/**
 * Generate a random matrix character
 */
const getRandomChar = (): string => {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
};

/**
 * Generate randomized string matching the length of the original value
 * Or generate a fixed-length string if fixedLength is provided
 */
const generateMatrixText = (originalValue: string | number, fixedLength?: number): string => {
  // If fixedLength is specified, generate exactly that many characters
  if (fixedLength !== undefined) {
    return Array(fixedLength)
      .fill(0)
      .map(() => getRandomChar())
      .join('');
  }
  
  const str = String(originalValue);
  
  return str
    .split('')
    .map((char, index) => {
      // Keep spaces, punctuation, and common formatting characters
      const isSpaceOrPunct = /[\s\(\)%\:\/xhm]/.test(char);
      
      // Check if we're part of "AM" or "PM" 
      let isAMPM = false;
      if (char === 'A' || char === 'M' || char === 'P') {
        const prevChar = index > 0 ? str[index - 1] : '';
        const nextChar = index < str.length - 1 ? str[index + 1] : '';
        isAMPM = 
          (char === 'M' && prevChar === 'A') ||
          (char === 'M' && prevChar === 'P') ||
          (char === 'A' && nextChar === 'M') ||
          (char === 'P' && nextChar === 'M');
      }
      
      if (isSpaceOrPunct || isAMPM) {
        return char;
      }
      
      // Replace alphanumeric characters with matrix chars
      return getRandomChar();
    })
    .join('');
};

export default function MatrixRedactedText({ 
  value, 
  style, 
  inline = false, 
  fixedLength,
  addLinebreak = false,
  ...textProps 
}: MatrixRedactedTextProps) {
  const { isPremium } = usePremium();
  const [matrixText, setMatrixText] = useState(() => generateMatrixText(value, fixedLength));

  useEffect(() => {
    if (isPremium) {
      return; // Don't animate for premium users
    }

    // Update matrix text every 100ms for animation effect
    const interval = setInterval(() => {
      setMatrixText(generateMatrixText(value, fixedLength));
    }, 100);

    return () => clearInterval(interval);
  }, [value, isPremium, fixedLength]);

  // For inline use (nested in Text components), return a Text component that can be nested
  if (inline) {
    const textValue = isPremium ? String(value) : matrixText;
    const displayValue = isPremium 
      ? textValue 
      : (addLinebreak ? `${textValue}\n` : textValue);
    
    return (
      <Text style={[style, !isPremium && styles.matrixText]} {...textProps}>
        {displayValue}
      </Text>
    );
  }

  // Show actual value for premium users
  if (isPremium) {
    return (
      <Text style={style} {...textProps}>
        {value}
      </Text>
    );
  }

  // Show matrix-style redacted text for free users
  const displayText = addLinebreak ? `${matrixText}\n` : matrixText;
  return (
    <Text style={[style, styles.matrixText]} {...textProps}>
      {displayText}
    </Text>
  );
}

const styles = StyleSheet.create({
  matrixText: {
    fontFamily: MONOSPACE_FONT,
    color: '#00cc00', // Green matrix style
  },
});

