import { defineModule } from "direct-vuex"
import { moduleActionContext, moduleGetterContext } from "./index"
import AWSDiscovery from '../lib/aws/account';
import AWSDiscoveryManager from '../lib/aws/manager';
import Storage from '../lib/storage/accounts';
import Vue from "vue"

export interface AccountsState {
	all: Account[]
	encryptionKey: string|undefined
	decrypted: boolean
}

export interface Account {
	id: string
	name: string
	access: string
	secret: string
	cloudId?: string
	error?: string
}

function manageDiscoveryAccount(account: Account): void {
	// need to use a copy because vuex does weird things
	const copy = JSON.parse(JSON.stringify(account));

	AWSDiscoveryManager.get(copy.id).ifNothing(() => {
		const discovery = new AWSDiscovery(copy);
		AWSDiscoveryManager.add(discovery);
		discovery.test();
	}).ifJust((discovery) => {
		// do asynchronously to avoid test -> error loop
		setTimeout(() => {
			discovery.updateModel(copy);
		}, 1);
	});
}

const mod = defineModule({
	strict: process.env.NODE_ENV !== 'production',
	state: (): AccountsState => {
		return {
			all: [],
			encryptionKey: undefined,
			decrypted: Storage.length === 0,
		};
	},
	getters: {
		keyCanDecrypt(): (key: string) => boolean {
			return (key: string) => Storage.canLoad(key);
		},
		countEncryptedAccounts(): () => number {
			return () => Storage.length;
		},
	},
	mutations: {
		upsertAccount(state, account: Account) {
			const index = state.all.findIndex(a => a.id === account.id);
			const original = state.all[index];

			// update vuex model
			const replaceIndex = index === -1 ? state.all.length : index;
			state.all.splice(replaceIndex, 1, account);

			// persist if able
			if (state.encryptionKey !== undefined) {
				Storage.save(state.encryptionKey, state.all);
			}

			// update discovery workers
			manageDiscoveryAccount(account);
		},
		accountTested(state, payload: {id: string, error?: string, cloudId?: string}) {
			const account = state.all.find(a => a.id === payload.id);
			if (account !== undefined) {
				const original = JSON.parse(JSON.stringify(account)) as Account;

				Vue.set(account, 'error', payload.error);

				if (payload.cloudId) {
					Vue.set(account, 'cloudId', payload.cloudId);
				}

				// update discovery workers
				manageDiscoveryAccount(account);
			}
		},
		removeAccount(state, id: string) {
			const index = state.all.findIndex(a => a.id === id);
			if (index !== -1) {
				state.all.splice(index, 1);
			}

			if (state.encryptionKey !== undefined) {
				Storage.save(state.encryptionKey, state.all);
			}

			AWSDiscoveryManager.kill(id);
		},
		setEncryptionKey(state, key: string) {
			if (!state.decrypted) {
				let loaded: Account[];
				try {
					loaded = Storage.load(key);
				}
				catch (e) {
					console.log("refusing to update key because it doesn't match encryption");
					return;
				}

				loaded.forEach(account => {
					state.all.splice(state.all.length, 0, account);
					manageDiscoveryAccount(account);
				});

				state.decrypted = true;
			}

			state.encryptionKey = key;
			Storage.save(key, state.all);
		},
		wipeEverything(state) {
			state.encryptionKey = undefined;
			state.all.splice(0, state.all.length);
			state.decrypted = true;
			Storage.clear();
			AWSDiscoveryManager.clear();
		},
	},
	actions: {
		testAccountCredentials(context, id: string) {
			const { state } = modActionContext(context);
			const account = state.all.find(a => a.id === id);
			AWSDiscoveryManager.get(id).map(discovery => {
				discovery.test();
			});
		},
	},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)
