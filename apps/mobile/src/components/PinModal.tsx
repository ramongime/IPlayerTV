import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/lib/theme';

interface PinModalProps {
  visible: boolean;
  correctPin: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function PinModal({ visible, correctPin, onSuccess, onCancel }: PinModalProps) {
  const { t } = useTranslation();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin === correctPin) {
      setPin('');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{t('settings.parentalPin')}</Text>
          <Text style={styles.subtitle}>{t('settings.enterPin')}</Text>

          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={pin}
            onChangeText={(text) => {
              setPin(text);
              setError(false);
            }}
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            onSubmitEditing={handleSubmit}
          />
          
          {error && <Text style={styles.errorText}>{t('common.invalidPin')}</Text>}

          <View style={styles.actions}>
            <Pressable onPress={onCancel} style={[styles.button, styles.buttonGhost]}>
              <Text style={styles.buttonGhostText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable onPress={handleSubmit} style={[styles.button, styles.buttonPrimary]}>
              <Text style={styles.buttonPrimaryText}>{t('common.confirm')}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8 },
  subtitle: { color: colors.textMuted, fontSize: 14, marginBottom: 20 },
  input: {
    backgroundColor: colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    marginBottom: 8,
  },
  inputError: { borderColor: colors.danger },
  errorText: { color: colors.danger, fontSize: 12, textAlign: 'center', marginBottom: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  button: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonGhostText: { color: colors.textMuted, fontWeight: '600' },
  buttonPrimary: { backgroundColor: colors.accent },
  buttonPrimaryText: { color: '#fff', fontWeight: '600' },
});
