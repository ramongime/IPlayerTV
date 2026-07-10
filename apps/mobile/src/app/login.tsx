import { accountInputSchema, parseM3uUrl } from '@iplayertv/core';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ZodError } from 'zod';
import { accountsRepo } from '@/lib/repositories';
import { xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function LoginScreen() {
  const [name, setName] = useState('');
  const [server, setServer] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [m3u, setM3u] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const setActiveAccountId = useAppStore((s) => s.setActiveAccountId);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const applyM3u = (value: string) => {
    setM3u(value);
    const parsed = parseM3uUrl(value);
    if (parsed) {
      setServer(parsed.server);
      setUsername(parsed.username);
      setPassword(parsed.password);
    }
  };

  const save = async () => {
    setError(null);
    setSaving(true);
    try {
      const input = accountInputSchema.parse({
        name: name || username,
        server,
        username,
        password,
        output: 'm3u8',
        player: 'internal',
      });

      // Validate credentials against the server before persisting (same rule as desktop)
      const result = await xtream.authenticate(input);
      if (!result.ok) {
        throw new Error('Não foi possível validar a conta: credenciais inválidas ou servidor Xtream inacessível.');
      }

      const account = await accountsRepo.create(input);
      setActiveAccountId(account.id);
      queryClient.invalidateQueries();
      router.replace('/(tabs)');
    } catch (e) {
      if (e instanceof ZodError) {
        setError(e.issues.map((issue) => issue.message).join(', '));
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{t('emptyState.title')}</Text>
        <Text style={styles.subtitle}>{t('emptyState.subtitle')}</Text>

        <Text style={styles.label}>Link M3U (opcional — preenche os campos)</Text>
        <TextInput
          value={m3u}
          onChangeText={applyM3u}
          placeholder="http://servidor:80/get.php?username=...&password=..."
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Text style={styles.label}>Nome</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Minha conta"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Servidor</Text>
        <TextInput
          value={server}
          onChangeText={setServer}
          placeholder="http://servidor.com:8080"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          style={styles.input}
        />

        <Text style={styles.label}>Usuário</Text>
        <TextInput
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          style={styles.input}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable onPress={save} disabled={saving} style={[styles.button, saving && { opacity: 0.6 }]}>
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('common.save')}</Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 48 },
  title: { color: colors.text, fontSize: 22, fontWeight: '700' },
  subtitle: { color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
  },
  error: { color: colors.danger, marginTop: 14 },
  button: {
    marginTop: 24,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
