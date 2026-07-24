"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const node_assert_1 = __importDefault(require("node:assert"));
const DatabaseConnection_1 = require("../apps/desktop/src/main/infrastructure/database/DatabaseConnection");
const AccountRepository_1 = require("../apps/desktop/src/main/infrastructure/database/AccountRepository");
const FavoriteRepository_1 = require("../apps/desktop/src/main/infrastructure/database/FavoriteRepository");
const TmdbClient_1 = require("../packages/core/src/providers/TmdbClient");
async function main() {
    console.log('--- STARTING BACKEND VERIFICATION SUITE ---');
    // 1. Setup in-memory SQLite database and test migration v2
    const db = new better_sqlite3_1.default(':memory:');
    (0, DatabaseConnection_1.setDatabase)(db);
    const version = db.pragma('user_version', { simple: true });
    node_assert_1.default.strictEqual(version, 2, 'user_version must be 2 after migrations');
    const tableInfo = db.prepare('PRAGMA table_info(accounts)').all();
    const isActiveCol = tableInfo.find((c) => c.name === 'isActive');
    node_assert_1.default.ok(isActiveCol, 'accounts table must have isActive column');
    node_assert_1.default.strictEqual(isActiveCol?.type, 'INTEGER', 'isActive column must be INTEGER type');
    const indexes = db.prepare('PRAGMA index_list(accounts)').all();
    const hasActiveIndex = indexes.some((i) => i.name === 'idx_accounts_active');
    node_assert_1.default.ok(hasActiveIndex, 'idx_accounts_active index must exist on accounts table');
    const favIndexes = db.prepare('PRAGMA index_list(favorites)').all();
    const hasFavAccountIndex = favIndexes.some((i) => i.name === 'idx_favorites_account');
    node_assert_1.default.ok(hasFavAccountIndex, 'idx_favorites_account index must exist on favorites table');
    console.log('✓ Migration v2 schema & indexes verified.');
    // 2. Test AccountRepository (create, list, getActive, setActive, single active transaction)
    const accountRepo = new AccountRepository_1.AccountRepository();
    const accA = await accountRepo.create({
        name: 'Account Alpha',
        server: 'http://server-a.com:8080',
        username: 'userA',
        password: 'passA',
        output: 'm3u8',
        player: 'internal'
    });
    const accB = await accountRepo.create({
        name: 'Account Beta',
        server: 'http://server-b.com:8080',
        username: 'userB',
        password: 'passB',
        output: 'ts',
        player: 'vlc'
    });
    // Default active fallback
    const initialActive = await accountRepo.getActive();
    node_assert_1.default.ok(initialActive, 'getActive() must return a non-null account');
    // Set active to Alpha
    const setAlphaResult = await accountRepo.setActive(accA.id);
    node_assert_1.default.strictEqual(setAlphaResult.id, accA.id);
    node_assert_1.default.strictEqual(setAlphaResult.isActive, true, 'Alpha account must have isActive === true');
    const activeA = await accountRepo.getActive();
    node_assert_1.default.strictEqual(activeA?.id, accA.id);
    // Switch active to Beta
    const setBetaResult = await accountRepo.setActive(accB.id);
    node_assert_1.default.strictEqual(setBetaResult.id, accB.id);
    node_assert_1.default.strictEqual(setBetaResult.isActive, true, 'Beta account must have isActive === true');
    const activeB = await accountRepo.getActive();
    node_assert_1.default.strictEqual(activeB?.id, accB.id);
    // Verify Alpha is no longer active
    const listAll = await accountRepo.list();
    const alphaInList = listAll.find((a) => a.id === accA.id);
    node_assert_1.default.strictEqual(alphaInList?.isActive, false, 'Alpha account must now have isActive === false');
    console.log('✓ Multi-account switching & active flag transactional integrity verified.');
    // 3. Test FavoriteRepository (syncFavorites, isolation, cascade delete)
    const favoriteRepo = new FavoriteRepository_1.FavoriteRepository();
    const favoritesAlpha = [
        { contentType: 'live', streamId: 101, name: 'TV Channel 1', icon: 'http://icon1.png' },
        { contentType: 'movie', streamId: 201, name: 'Movie 1', icon: 'http://icon2.png' },
        { contentType: 'series', streamId: 301, name: 'Series 1' }
    ];
    const syncedA = await favoriteRepo.syncFavorites(accA.id, favoritesAlpha);
    node_assert_1.default.strictEqual(syncedA.length, 3, 'Alpha must have 3 favorites');
    const listBInitial = await favoriteRepo.list(accB.id);
    node_assert_1.default.strictEqual(listBInitial.length, 0, 'Beta must have 0 favorites before sync');
    const favoritesBeta = [
        { contentType: 'live', streamId: 102, name: 'TV Channel 2' }
    ];
    const syncedB = await favoriteRepo.syncFavorites(accB.id, favoritesBeta);
    node_assert_1.default.strictEqual(syncedB.length, 1, 'Beta must have 1 favorite');
    const listAFterBSync = await favoriteRepo.list(accA.id);
    node_assert_1.default.strictEqual(listAFterBSync.length, 3, 'Alpha favorites must remain isolated and untouched');
    // Re-sync Alpha with updated array
    const updatedAlpha = [
        { contentType: 'live', streamId: 101, name: 'TV Channel 1' }
    ];
    const syncedAUpdated = await favoriteRepo.syncFavorites(accA.id, updatedAlpha);
    node_assert_1.default.strictEqual(syncedAUpdated.length, 1, 'Alpha favorites must be updated to 1 item');
    // Delete Account A and verify cascade deletion of favorites
    await accountRepo.remove(accA.id);
    const listAAfterRemove = await favoriteRepo.list(accA.id);
    node_assert_1.default.strictEqual(listAAfterRemove.length, 0, 'Alpha favorites must be cascade deleted');
    const listBAfterRemoveA = await favoriteRepo.list(accB.id);
    node_assert_1.default.strictEqual(listBAfterRemoveA.length, 1, 'Beta favorites must be untouched after Alpha removal');
    console.log('✓ Transactional favorite sync & per-account isolation verified.');
    // 4. Test TMDB Integration & Fallback
    const tmdbClient = new TmdbClient_1.TmdbClient(async () => new Response());
    // Without API key and TMDB_MOCK unset -> returns null
    delete process.env.TMDB_MOCK;
    const noKeyInfo = await tmdbClient.fetchInfo('Matrix', 'movie', '');
    node_assert_1.default.strictEqual(noKeyInfo, null, 'fetchInfo without API key and without mock env must return null');
    // With TMDB_MOCK === 'true' -> returns mock info
    process.env.TMDB_MOCK = 'true';
    const mockInfo = await tmdbClient.fetchInfo('Matrix', 'movie', '');
    node_assert_1.default.ok(mockInfo, 'fetchInfo with TMDB_MOCK=true must return mock metadata');
    node_assert_1.default.strictEqual(typeof mockInfo?.overview, 'string');
    node_assert_1.default.ok(mockInfo?.overview && mockInfo.overview.includes('Matrix'), 'mock overview must reference stream title');
    const directMock = tmdbClient.getMockInfo('Inception');
    node_assert_1.default.ok(directMock.overview?.includes('Inception'));
    node_assert_1.default.strictEqual(directMock.voteAverage, 8.5);
    delete process.env.TMDB_MOCK;
    console.log('✓ TMDB integration, mock format, and fallback logic verified.');
    console.log('\nALL BACKEND TESTS PASSED: Account switching, SQLite migration v2, favorite sync, and TMDB fallback verified.');
}
main().catch((err) => {
    console.error('VERIFICATION FAILED:', err);
    process.exit(1);
});
