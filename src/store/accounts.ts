import { defineModule } from "direct-vuex"
import Vue from "vue"
import store, { moduleActionContext, moduleGetterContext } from "./index"
import Cookies from 'js-cookie';
import SimpleCrypto from "simple-crypto-js";
import { testCredentials as testAWSCredentials } from '../lib/aws/credentials';

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
	enabled: boolean
	cloudId?: string
	error?: string
}

const mod = defineModule({
	strict: process.env.NODE_ENV !== 'production',
	state: (): AccountsState => {
		return {
			all: [],
			encryptionKey: undefined,
			decrypted: persistedCount() === 0,
		};
	},
	getters: {
		keyCanDecrypt(): (key: string) => boolean {
			return (key: string) => load(key) !== undefined;
		},
		countEncryptedAccounts(): () => number {
			return () => persistedCount();
		},
	},
	mutations: {
		upsertAccount(state, account: Account) {
			const found = state.all.findIndex(a => a.id === account.id);
			const index = (found === -1 ? state.all.length : found);
			state.all.splice(index, 1, account);

			persistIfKey(state.encryptionKey, state.all);
			test(account);
		},
		accountTested(state, payload: {id: string, error?: string, cloudId?: string}) {
			state.all.forEach(a => {
				if (a.id === payload.id) {
					Vue.set(a, 'error', payload.error);

					if (payload.cloudId) {
						Vue.set(a, 'cloudId', payload.cloudId);
					}
				}
			});
		},
		removeAccount(state, id: string) {
			const index = state.all.findIndex(a => a.id === id);
			if (index !== -1) {
				state.all.splice(index, 1);
			}

			persistIfKey(state.encryptionKey, state.all);
		},
		setEncryptionKey(state, key: string) {
			if (!state.decrypted) {
				const loaded = load(key);
				if (loaded === undefined) {
					console.log("refusing to update key because it doesn't match encryption");
					return;
				}

				loaded.forEach(account => {
					state.all.splice(state.all.length, 0, account);
					test(account);
				});

				state.decrypted = true;
			}

			state.encryptionKey = key;
			persist(key, state.all);
		},
		wipeEverything(state) {
			state.encryptionKey = undefined;
			state.all.splice(0, state.all.length);
			state.decrypted = true;
			wipe();
		},
	},
	actions: {
		testAccountCredentials(context, id: string) {
			const { state } = modActionContext(context);
			const account = state.all.find(a => a.id === id);
			if (account === undefined) { return; }
			test(account);
		},
	},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)

const KEY_ACCOUNTS = "accounts";
const KEY_COUNT = "numAccounts";

function wipe(): void {
	if (window.localStorage) {
		window.localStorage.removeItem(KEY_ACCOUNTS);
		window.localStorage.removeItem(KEY_COUNT);
	}
	else {
		Cookies.remove(KEY_ACCOUNTS);
		Cookies.remove(KEY_COUNT);
	}
}

function persisted(): undefined | string {
	if (window.localStorage) {
		return window.localStorage.getItem(KEY_ACCOUNTS) || undefined;
	}
	else {
		return Cookies.get(KEY_ACCOUNTS);
	}
}

function load(key: string): undefined | Account[] {
	const encrypted = persisted();
	if (encrypted === undefined) { return []; }

	const crypto = new SimpleCrypto(key);
	try {
		const accounts = crypto.decrypt(encrypted) as Account[];
		accounts.forEach(account => {
			delete account.error;
		});
		return accounts;
	}
	catch (e) {
		return undefined;
	}
}

function persistIfKey(key: string|undefined, accounts: Account[]): void {
	if (key === undefined) { return; }
	persist(key, accounts);
}

function persist(key: string, accounts: Account[]): void {
	const crypto = new SimpleCrypto(key);
	const encrypted = crypto.encrypt(JSON.stringify(accounts));

	if (window.localStorage) {
		window.localStorage.setItem(KEY_ACCOUNTS, encrypted);
		window.localStorage.setItem(KEY_COUNT, '' + accounts.length);
	}
	else {
		Cookies.set(KEY_ACCOUNTS, encrypted);
		Cookies.set(KEY_COUNT, '' + accounts.length);
	}
}

function persistedCount(): number {
	if (window.localStorage) {
		return Number(window.localStorage.getItem(KEY_COUNT)) || 0;
	}
	else {
		return Number(Cookies.get(KEY_COUNT)) || 0;
	}
}

async function test(account: Account) {
	testAWSCredentials(account).then((data) => {
		store.commit.accountTested({
			id: account.id,
			cloudId: data.Account,
		});
	}).catch((err) => {
		store.commit.accountTested({
			id: account.id,
			error: err.toString(),
		});
	});
}
