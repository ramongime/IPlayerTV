import Store from 'electron-store';
import type { AppConfig } from '@iplayertv/core';

const store = new Store<AppConfig>({
  defaults: {
    externalPlayers: {},
    stream: {
      probeTimeoutMs: 3500
    },
    player: {
      defaultAudioLanguage: '',
      defaultSubtitleLanguage: '',
      splitAudio: false
    }
  }
});

export class SettingsProvider {
  get() {
    return store.store;
  }

  update(settings: AppConfig) {
    store.set(settings);
    return store.store;
  }
}
