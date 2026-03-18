// components/AppLockScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWallet } from '../contexts/WalletContext';
import CustomAlert from './CustomAlert';

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;

export default function AppLockScreen() {
  const {
    unlockApp,
    unlockAppWithBiometrics,
    biometricEnabled,
    biometricSupported,
    isLoading,
    deleteWallet,
  } = useWallet();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showResetAlert, setShowResetAlert] = useState(false);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const tryBiometric = async () => {
      if (biometricEnabled && biometricSupported) {
        setIsAuthenticating(true);
        const success = await unlockAppWithBiometrics();
        setIsAuthenticating(false);
      }
    };
    tryBiometric();
  }, [biometricEnabled, biometricSupported]);

  useEffect(() => {
    if (lockTimer > 0) {
      const timer = setTimeout(() => setLockTimer(lockTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimer === 0) {
      setIsLocked(false);
    }
  }, [lockTimer, isLocked]);

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handleBiometricUnlock = async () => {
    setIsAuthenticating(true);
    const success = await unlockAppWithBiometrics();
    setIsAuthenticating(false);
    if (!success) {
      setError('Biometric authentication failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePinSubmit = async () => {
    if (isLocked || isAuthenticating) return;

    if (pin.length < MIN_PIN_LENGTH) {
      setError(`PIN must be at least ${MIN_PIN_LENGTH} digits`);
      shake();
      Vibration.vibrate(100);
      return;
    }

    setIsAuthenticating(true);

    const success = await unlockApp(pin);

    if (success) {
      setPin('');
      setError('');
      setAttempts(0);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin('');
      shake();
      Vibration.vibrate(200);

      if (newAttempts >= 5) {
        setIsLocked(true);
        setLockTimer(30 * newAttempts);
        setError(`Too many attempts. Try again in ${30 * newAttempts}s`);
      } else {
        setError(`Invalid PIN. ${5 - newAttempts} attempts remaining`);
      }
    }
    setIsAuthenticating(false);
  };

  const handleKeypadPress = (key: string | number) => {
    if (isLocked || isAuthenticating) return;

    if (key === 'delete') {
      setPin(pin.slice(0, -1));
      setError('');
    } else if (key === 'submit') {
      handlePinSubmit();
    } else if (key !== '' && pin.length < MAX_PIN_LENGTH) {
      const newPin = pin + key.toString();
      setPin(newPin);
      setError('');
    }
  };

  const handleResetWallet = async () => {
    setShowResetAlert(false);
    try {
      await deleteWallet();
    } catch (e) {
      console.log('Reset error:', e);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Reset Wallet Alert */}
      <CustomAlert
        visible={showResetAlert}
        title="Reset Wallet"
        message="This will permanently delete your wallet from this device. You will need your recovery phrase to restore it."
        type="warning"
        buttons={[
          { text: 'Cancel', style: 'cancel', onPress: () => setShowResetAlert(false) },
          { text: 'Reset', style: 'destructive', onPress: handleResetWallet },
        ]}
        onClose={() => setShowResetAlert(false)}
      />

      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.appName}>RWA Experts</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Enter your PIN to unlock</Text>

        {/* PIN Display */}
        <Animated.View
          style={[styles.pinContainer, { transform: [{ translateX: shakeAnimation }] }]}
        >
          <View style={styles.pinDots}>
            {[...Array(MAX_PIN_LENGTH)].map((_, i) => (
              <View
                key={i}
                style={[
                  styles.pinDot,
                  pin.length > i && styles.pinDotFilled,
                  error && pin.length === 0 && styles.pinDotError,
                  i >= MIN_PIN_LENGTH && pin.length <= i && styles.pinDotOptional,
                ]}
              />
            ))}
          </View>
          <Text style={styles.pinHint}>
            {pin.length >= MIN_PIN_LENGTH ? 'Press ✓ to unlock' : `${MIN_PIN_LENGTH}-${MAX_PIN_LENGTH} digits`}
          </Text>
        </Animated.View>

        {/* Error Message */}
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={16} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {/* Lockout Timer */}
        {isLocked && lockTimer > 0 && (
          <View style={styles.lockoutContainer}>
            <Ionicons name="time-outline" size={20} color="#f59e0b" />
            <Text style={styles.lockoutText}>
              Try again in {Math.floor(lockTimer / 60)}:
              {(lockTimer % 60).toString().padStart(2, '0')}
            </Text>
          </View>
        )}

        {/* Authenticating Indicator */}
        {isAuthenticating && (
          <View style={styles.authenticatingContainer}>
            <ActivityIndicator size="small" color="#6366f1" />
            <Text style={styles.authenticatingText}>Verifying...</Text>
          </View>
        )}

        {/* Keypad */}
        <View style={styles.keypad}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'bio', 0, 'submit'].map((key, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.keypadButton,
                key === 'bio' && !biometricEnabled && styles.keypadButtonHidden,
                key === 'submit' && styles.keypadButtonSubmit,
                key === 'submit' && pin.length < MIN_PIN_LENGTH && styles.keypadButtonDisabled,
                (isLocked || isAuthenticating) && styles.keypadButtonDisabled,
              ]}
              onPress={() => {
                if (key === 'bio' && biometricEnabled && biometricSupported) {
                  handleBiometricUnlock();
                } else if (key !== 'bio') {
                  handleKeypadPress(key);
                }
              }}
              disabled={
                isLocked ||
                isAuthenticating ||
                (key === 'bio' && !biometricEnabled) ||
                (key === 'submit' && pin.length < MIN_PIN_LENGTH)
              }
              activeOpacity={0.6}
            >
              {key === 'submit' ? (
                <Ionicons
                  name="checkmark-circle"
                  size={32}
                  color={pin.length >= MIN_PIN_LENGTH ? '#10b981' : '#4b5563'}
                />
              ) : key === 'bio' ? (
                biometricEnabled && biometricSupported ? (
                  <Ionicons name="finger-print" size={28} color="#6366f1" />
                ) : null
              ) : (
                <Text style={styles.keypadText}>{key}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Delete button */}
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleKeypadPress('delete')}
          disabled={isLocked || isAuthenticating || pin.length === 0}
        >
          <Ionicons
            name="backspace-outline"
            size={24}
            color={pin.length > 0 ? '#fff' : '#4b5563'}
          />
          <Text style={[styles.deleteText, pin.length === 0 && styles.deleteTextDisabled]}>
            Delete
          </Text>
        </TouchableOpacity>

        {/* Reset Wallet */}
        <TouchableOpacity style={styles.resetButton} onPress={() => setShowResetAlert(true)}>
          <Text style={styles.resetText}>Forgot PIN? Reset Wallet</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 24,
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  pinDots: {
    flexDirection: 'row',
    gap: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#374151',
    borderWidth: 2,
    borderColor: '#4b5563',
  },
  pinDotFilled: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  pinDotError: {
    borderColor: '#ef4444',
  },
  pinDotOptional: {
    opacity: 0.5,
  },
  pinHint: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  lockoutContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: '#78350f',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  lockoutText: {
    color: '#fcd34d',
    fontSize: 14,
    fontWeight: '500',
  },
  authenticatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
  },
  authenticatingText: {
    color: '#9ca3af',
    fontSize: 14,
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 260,
    marginTop: 24,
  },
  keypadButton: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
    borderRadius: 36,
    backgroundColor: '#1f2937',
  },
  keypadButtonHidden: {
    backgroundColor: 'transparent',
  },
  keypadButtonSubmit: {
    backgroundColor: '#1f2937',
  },
  keypadButtonDisabled: {
    opacity: 0.5,
  },
  keypadText: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
  },
  deleteText: {
    color: '#fff',
    fontSize: 14,
  },
  deleteTextDisabled: {
    color: '#4b5563',
  },
  resetButton: {
    marginTop: 24,
    padding: 12,
  },
  resetText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
});
