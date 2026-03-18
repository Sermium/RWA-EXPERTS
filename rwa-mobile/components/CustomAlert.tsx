// components/CustomAlert.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm';

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
  onClose?: () => void;
}

const alertConfig: Record<AlertType, { icon: string; color: string; bgColor: string }> = {
  success: { icon: 'checkmark-circle', color: '#10b981', bgColor: '#064e3b' },
  error: { icon: 'close-circle', color: '#ef4444', bgColor: '#7f1d1d' },
  warning: { icon: 'warning', color: '#f59e0b', bgColor: '#78350f' },
  info: { icon: 'information-circle', color: '#6366f1', bgColor: '#312e81' },
  confirm: { icon: 'help-circle', color: '#6366f1', bgColor: '#312e81' },
};

export default function CustomAlert({
  visible,
  title,
  message,
  type = 'info',
  buttons = [{ text: 'OK', style: 'default' }],
  onClose,
}: CustomAlertProps) {
  const config = alertConfig[type];

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.alertContainer}>
              {/* Icon */}
              <View style={[styles.iconContainer, { backgroundColor: config.bgColor }]}>
                <Ionicons name={config.icon as any} size={32} color={config.color} />
              </View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Message */}
              {message && <Text style={styles.message}>{message}</Text>}

              {/* Buttons */}
              <View style={styles.buttonContainer}>
                {buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      button.style === 'cancel' && styles.buttonCancel,
                      button.style === 'destructive' && styles.buttonDestructive,
                      button.style === 'default' && styles.buttonDefault,
                      buttons.length === 1 && styles.buttonFull,
                    ]}
                    onPress={() => handleButtonPress(button)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        button.style === 'cancel' && styles.buttonTextCancel,
                        button.style === 'destructive' && styles.buttonTextDestructive,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// Hook for easier usage
import { useState, useCallback } from 'react';

interface AlertState {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: AlertButton[];
}

export function useCustomAlert() {
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
  });

  const showAlert = useCallback(
    (
      title: string,
      message?: string,
      buttons?: AlertButton[],
      type?: AlertType
    ) => {
      setAlertState({
        visible: true,
        title,
        message,
        buttons: buttons || [{ text: 'OK', style: 'default' }],
        type: type || 'info',
      });
    },
    []
  );

  const hideAlert = useCallback(() => {
    setAlertState((prev) => ({ ...prev, visible: false }));
  }, []);

  const AlertComponent = useCallback(
    () => (
      <CustomAlert
        visible={alertState.visible}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        buttons={alertState.buttons}
        onClose={hideAlert}
      />
    ),
    [alertState, hideAlert]
  );

  return { showAlert, hideAlert, AlertComponent };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonFull: {
    flex: 1,
  },
  buttonDefault: {
    backgroundColor: '#6366f1',
  },
  buttonCancel: {
    backgroundColor: '#374151',
  },
  buttonDestructive: {
    backgroundColor: '#dc2626',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonTextCancel: {
    color: '#9ca3af',
  },
  buttonTextDestructive: {
    color: '#fff',
  },
});