import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View, Switch, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { Category, ContentType } from '@iplayertv/core';
import { resolveAccount, xtream } from '@/lib/services';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ManageCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
  accountId: string;
}

export function ManageCategoriesModal({ visible, onClose, accountId }: ManageCategoriesModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ContentType>('live');

  const hiddenCategories = useAppStore(s => s.hiddenCategories);
  const toggleHiddenCategory = useAppStore(s => s.toggleHiddenCategory);

  const categoriesQuery = useQuery({
    queryKey: ['categories', accountId, activeTab],
    enabled: visible && !!accountId,
    queryFn: async () => {
      const account = await resolveAccount(accountId);
      return xtream.categories(account, activeTab);
    },
  });

  const categories = categoriesQuery.data ?? [];
  const hiddenForCurrentTab = hiddenCategories[`${accountId}:${activeTab}`] || [];

  const handleToggle = (categoryId: string) => {
    toggleHiddenCategory(accountId, activeTab, categoryId);
  };

  const renderItem = ({ item }: { item: Category }) => {
    const isHidden = hiddenForCurrentTab.includes(item.category_id);
    return (
      <View style={styles.row}>
        <Text style={styles.categoryName} numberOfLines={1}>{item.category_name}</Text>
        <Switch 
          value={!isHidden} 
          onValueChange={() => handleToggle(item.category_id)}
          trackColor={{ false: colors.border, true: colors.accent }}
        />
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('settings.manageCategories', 'Gerenciar Categorias')}</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>{t('common.close', 'Fechar')}</Text>
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <TabButton 
            title={t('tabs.live', 'Ao Vivo')} 
            isActive={activeTab === 'live'} 
            onPress={() => setActiveTab('live')} 
          />
          <TabButton 
            title={t('tabs.movie', 'Filmes')} 
            isActive={activeTab === 'movie'} 
            onPress={() => setActiveTab('movie')} 
          />
          <TabButton 
            title={t('tabs.series', 'Séries')} 
            isActive={activeTab === 'series'} 
            onPress={() => setActiveTab('series')} 
          />
        </View>

        {categoriesQuery.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : categories.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.muted}>{t('common.noData', 'Nenhum dado encontrado')}</Text>
          </View>
        ) : (
          <FlashList
            data={categories}
            keyExtractor={c => c.category_id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
    </Modal>
  );
}

function TabButton({ title, isActive, onPress }: { title: string; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, isActive && styles.tabActive]}>
      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  closeButton: { padding: 8 },
  closeButtonText: { color: colors.accent, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  tabActive: { backgroundColor: colors.surfaceHighlight },
  tabText: { color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.text },
  listContent: { paddingHorizontal: 16, paddingBottom: 32 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryName: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    marginRight: 16,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { color: colors.textMuted },
});
