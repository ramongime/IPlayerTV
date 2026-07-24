import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, Pressable, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DownloadManager, type DownloadTaskRecord } from '@/lib/DownloadManager';
import { useAppStore } from '@/lib/store';
import { colors } from '@/lib/theme';

const AnyFlashList = FlashList as any;

export default function DownloadsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const accountId = useAppStore((s) => s.activeAccountId);
  const [tasks, setTasks] = useState<DownloadTaskRecord[]>([]);

  useEffect(() => {
    if (!accountId) return;

    // Initial load
    DownloadManager.getDownloads(accountId).then(setTasks);

    // Subscribe to updates
    const unsubscribe = DownloadManager.subscribe((allTasks) => {
      setTasks(allTasks.filter((task) => task.accountId === accountId));
    });

    return () => unsubscribe();
  }, [accountId]);

  const handlePlay = (task: DownloadTaskRecord) => {
    if (task.status !== 'COMPLETED') return;
    router.push({
      pathname: '/player',
      params: {
        contentType: task.contentType,
        streamId: String(task.streamId),
        title: task.title,
        extension: task.remoteUrl.split('.').pop() || '',
      },
    });
  };

  const handleAction = async (task: DownloadTaskRecord) => {
    try {
      if (task.status === 'DOWNLOADING') {
        await DownloadManager.pauseDownload(task.id);
      } else if (task.status === 'PAUSED' || task.status === 'FAILED') {
        await DownloadManager.startDownload(task.id);
      }
    } catch (err: any) {
      Alert.alert(t('common.error', 'Erro'), err.message);
    }
  };

  const handleDelete = (task: DownloadTaskRecord) => {
    Alert.alert(
      t('downloads.deleteTitle', 'Excluir Download'),
      t('downloads.deleteMessage', 'Tem certeza que deseja excluir {{title}}?', { title: task.title }),
      [
        { text: t('common.cancel', 'Cancelar'), style: 'cancel' },
        {
          text: t('common.delete', 'Excluir'),
          style: 'destructive',
          onPress: () => {
            DownloadManager.deleteDownload(task.id);
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: DownloadTaskRecord }) => {
    const isCompleted = item.status === 'COMPLETED';
    const isDownloading = item.status === 'DOWNLOADING';
    const isPaused = item.status === 'PAUSED';
    const isFailed = item.status === 'FAILED';

    const progress = item.totalBytes > 0 ? (item.downloadedBytes / item.totalBytes) * 100 : 0;
    const mbDownloaded = (item.downloadedBytes / (1024 * 1024)).toFixed(1);
    const mbTotal = (item.totalBytes / (1024 * 1024)).toFixed(1);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Pressable hitSlop={10} onPress={() => handleDelete(item)}>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </Pressable>
        </View>

        {!isCompleted && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.statusText}>
            {isCompleted
              ? t('downloads.completed', 'Concluído')
              : isFailed
              ? t('downloads.failed', 'Falhou')
              : isPaused
              ? t('downloads.paused', 'Pausado')
              : `${progress.toFixed(1)}% (${mbDownloaded} MB / ${mbTotal} MB)`}
          </Text>

          {isCompleted ? (
            <Pressable style={styles.actionBtn} onPress={() => handlePlay(item)}>
              <Text style={styles.actionText}>▶ {t('common.play', 'Reproduzir')}</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.actionBtn, isFailed && styles.retryBtn]} onPress={() => handleAction(item)}>
              <Text style={styles.actionText}>
                {isDownloading ? '⏸ ' + t('common.pause', 'Pausar') : '▶ ' + t('common.resume', 'Continuar')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Text style={styles.headerTitle}>{t('common.downloads', 'Downloads')}</Text>
      
      {tasks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('downloads.empty', 'Nenhum download offline.')}</Text>
        </View>
      ) : (
        <AnyFlashList
          data={tasks}
          estimatedItemSize={120}
          keyExtractor={(item: DownloadTaskRecord) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surfaceHighlight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
  },
  deleteIcon: {
    fontSize: 18,
    color: colors.danger,
  },
  progressContainer: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    backgroundColor: colors.accent,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryBtn: {
    backgroundColor: 'rgba(220,38,38,0.2)',
  },
  actionText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
