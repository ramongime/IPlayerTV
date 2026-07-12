import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { accountsRepo, watchedRepo } from '@/lib/repositories';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { PinModal } from '@/components/PinModal';

export default function SettingsScreen() {
  const accountId = useAppStore((s) => s.activeAccountId);
  const setActiveAccountId = useAppStore((s) => s.setActiveAccountId);
  const parentalPin = useAppStore((s) => s.parentalPin);
  const setParentalPin = useAppStore((s) => s.setParentalPin);
  
  const [showPin, setShowPin] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const accountsQuery = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsRepo.list(),
  });

  const infoQuery = useQuery({
    queryKey: ['account-info', accountId],
    enabled: !!accountId,
    queryFn: async () => {
      const account = await resolveAccount(accountId!);
      const result = await xtream.authenticate(account);
      const info = result.data.user_info;
      return {
        status: info?.status ?? 'unknown',
        expDate: info?.exp_date ? new Date(Number(info.exp_date) * 1000).toLocaleDateString('pt-BR') : 'Sem data',
        activeConnections: info?.active_cons ?? 0,
        maxConnections: info?.max_connections ?? '?',
      };
    },
  });

  const accounts = accountsQuery.data ?? [];

  const switchAccount = (id: string) => {
    setActiveAccountId(id);
    queryClient.invalidateQueries();
  };

  const removeAccount = (id: string, name: string) => {
    Alert.alert(t('common.removeAccount'), name, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: async () => {
          await accountsRepo.remove(id);
          const remaining = await accountsRepo.list();
          if (accountId === id) {
            setActiveAccountId(remaining[0]?.id ?? null);
          }
          queryClient.invalidateQueries();
          if (remaining.length === 0) router.replace('/login');
        },
      },
    ]);
  };

  const clearHistory = () => {
    Alert.alert(t('common.history'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.remove'),
        style: 'destructive',
        onPress: async () => {
          await watchedRepo.clear(accountId ?? undefined);
          queryClient.invalidateQueries({ queryKey: ['watched', accountId] });
        },
      },
    ]);
  };

  const resetHiddenCategories = () => {
    useAppStore.setState((state) => {
      if (!accountId) return state;
      const newHidden = { ...state.hiddenCategories };
      Object.keys(newHidden).forEach(key => {
        if (key.startsWith(`${accountId}:`)) {
          delete newHidden[key];
        }
      });
      return { hiddenCategories: newHidden };
    });
    Alert.alert(t('common.success'), t('settings.hiddenCategoriesReset'));
  };

  const handleResetRequest = () => {
    if (parentalPin) {
      setShowPin(true);
    } else {
      resetHiddenCategories();
    }
  };

  const handleSetPin = () => {
    Alert.prompt(
      t('settings.parentalPin'),
      t('settings.enterNewPin'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { 
          text: t('common.save'), 
          onPress: (pin?: string) => setParentalPin(pin || undefined)
        }
      ],
      'secure-text',
      parentalPin || '',
      'number-pad'
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}>
      <Text style={styles.heading}>{t('common.settings')}</Text>

      <Text style={styles.sectionTitle}>{t('common.accountInfo')}</Text>
      <View style={styles.card}>
        {infoQuery.isLoading ? (
          <Text style={styles.muted}>{t('common.loadingInfo')}</Text>
        ) : infoQuery.data ? (
          <>
            <InfoRow label={t('common.status')} value={infoQuery.data.status} />
            <InfoRow label={t('common.expiration')} value={infoQuery.data.expDate} />
            <InfoRow label={t('common.connections')} value={`${infoQuery.data.activeConnections} / ${infoQuery.data.maxConnections}`} />
          </>
        ) : (
          <Text style={styles.muted}>{t('common.errorInfo')}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>{t('common.accounts')}</Text>
      <View style={styles.card}>
        {accounts.map((account) => (
          <Pressable
            key={account.id}
            onPress={() => switchAccount(account.id)}
            onLongPress={() => removeAccount(account.id, account.name)}
            style={styles.accountRow}
          >
            <View style={[styles.dot, account.id === accountId && styles.dotActive]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.accountName}>{account.name}</Text>
              <Text numberOfLines={1} style={styles.muted}>{account.server}</Text>
            </View>
          </Pressable>
        ))}
        <Pressable onPress={() => router.push('/login')} style={styles.button}>
          <Text style={styles.buttonText}>+ {t('common.addAccount')}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('common.history')}</Text>
      <View style={styles.card}>
        <Pressable onPress={clearHistory} style={[styles.button, styles.buttonDanger]}>
          <Text style={styles.buttonDangerText}>{t('common.remove')} {t('common.history').toLowerCase()}</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.preferences')}</Text>
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.muted}>{t('settings.parentalPin')}</Text>
          <Pressable onPress={handleSetPin}>
            <Text style={styles.infoValue}>{parentalPin ? '****' : t('settings.notSet')}</Text>
          </Pressable>
        </View>

        <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, marginTop: 4 }]}>
          <Text style={styles.muted}>{t('settings.tmdbKey')}</Text>
          <Pressable onPress={() => {
            Alert.prompt(
              t('settings.tmdbKey'),
              'TMDB API Key (v3 auth)',
              [
                { text: t('common.cancel'), style: 'cancel' },
                { 
                  text: t('common.save'), 
                  onPress: (key?: string) => useAppStore.getState().setTmdbApiKey(key || undefined)
                }
              ],
              'plain-text',
              useAppStore.getState().tmdbApiKey || ''
            );
          }}>
            <Text style={styles.infoValue}>
              {useAppStore.getState().tmdbApiKey 
                ? '••••' + useAppStore.getState().tmdbApiKey!.slice(-4) 
                : t('settings.notSet')}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={handleResetRequest} style={[styles.button, { marginTop: 16 }]}>
          <Text style={styles.buttonText}>{t('settings.resetHiddenCategories')}</Text>
        </Pressable>
      </View>
      
      <PinModal 
        visible={showPin} 
        correctPin={parentalPin || ''}
        onSuccess={() => {
          setShowPin(false);
          resetHiddenCategories();
        }}
        onCancel={() => setShowPin(false)}
      />
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  heading: { color: colors.text, fontSize: 22, fontWeight: '700', margin: 16, marginBottom: 8 },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 6,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    padding: 12,
    gap: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoValue: { color: colors.text, fontWeight: '500' },
  muted: { color: colors.textMuted, fontSize: 13 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  accountName: { color: colors.text, fontSize: 15, fontWeight: '500' },
  button: {
    marginTop: 4,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: colors.surfaceHighlight,
  },
  buttonText: { color: colors.accent, fontWeight: '600' },
  buttonDanger: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.danger },
  buttonDangerText: { color: colors.danger, fontWeight: '600' },
});
