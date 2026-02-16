/**
 * Matrix-style Redacted Text Component
 * Shows randomized characters that keep changing for free users
 * Shows actual data for premium users
 * Can be used as standalone or nested within Text components
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Text, StyleSheet, Platform, TextProps } from 'react-native';
import { usePremium } from '../contexts/PremiumContext';
import { useTheme } from '../hooks/useTheme';
import { Theme } from '../constants/themes/types';

interface MatrixRedactedTextProps extends TextProps {
  value: string | number;
  style?: any;
  inline?: boolean;
  fixedLength?: number;
  addLinebreak?: boolean;
}

// Matrix-style characters for redaction
const MATRIX_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん■▢▣▤▥▦▧▨▩';

const getRandomChar = (): string => {
  return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)];
};

const generateMatrixText = (originalValue: string | number, fixedLength?: number): string => {
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
      const isSpaceOrPunct = /[\s\(\)%\:\/xhm]/.test(char);

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
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [matrixText, setMatrixText] = useState(() => generateMatrixText(value, fixedLength));

  useEffect(() => {
    if (isPremium) {
      return;
    }

    const interval = setInterval(() => {
      setMatrixText(generateMatrixText(value, fixedLength));
    }, 100);

    return () => clearInterval(interval);
  }, [value, isPremium, fixedLength]);

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

  if (isPremium) {
    return (
      <Text style={style} {...textProps}>
        {value}
      </Text>
    );
  }

  const displayText = addLinebreak ? `${matrixText}\n` : matrixText;
  return (
    <Text style={[style, styles.matrixText]} {...textProps}>
      {displayText}
    </Text>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  matrixText: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    color: theme.colors.accent,
  },
});
