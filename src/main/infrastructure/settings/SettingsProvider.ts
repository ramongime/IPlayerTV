import Store from 'electron-store';

interface AppSettings {
  externalPlayers: {
    vlcPath?: string;
    mpvPath?: string;
  };
  stream: {
    probeTimeoutMs: number;
  };
}

const store = new Store<AppSettings>({
  defaults: {
    externalPlayers: {},
    stream: {
      probeTimeoutMs: 3500
    }
  }
});

export class SettingsProvider {
  get() {
    return store.store;
  }

  update(settings: AppSettings) {
    store.set(settings);
    return store.store;
  }
}
