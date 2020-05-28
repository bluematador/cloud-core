import { defineModule } from "direct-vuex"
import { moduleActionContext, moduleGetterContext } from "./index"
import SimpleCrypto from "simple-crypto-js";
import Cookies from 'js-cookie';

export interface CredentialsState {
	all: Credential[]
	key: string|undefined
	decrypted: boolean
}

export interface Credential {
	id: string
	name: string
	access: string
	secret: string
	enabled: boolean
	error: string|undefined
}

const mod = defineModule({
	strict: process.env.NODE_ENV !== 'production',
	state: (): CredentialsState => {
		return {
			all: [],
			key: undefined,
			decrypted: persistedCount() === 0,
		};
	},
	getters: {
		keyCanDecrypt(): (key: string) => boolean {
			return (key: string) => load(key) !== undefined;
		},
		countCredentialsToDecrypt(): () => number {
			return () => persistedCount();
		},
	},
	mutations: {
		upsertCredential(state, cred: Credential) {
			const found = state.all.findIndex(c => c.id === cred.id);
			const index = (found === -1 ? state.all.length : found);
			state.all.splice(index, 1, cred);

			persistIfKey(state.key, state.all);
		},
		removeCredential(state, id: string) {
			const index = state.all.findIndex(c => c.id === id);
			if (index !== -1) {
				state.all.splice(index, 1);
			}

			persistIfKey(state.key, state.all);
		},
		setCredentialKey(state, key: string) {
			if (!state.decrypted) {
				const loaded = load(key);
				if (loaded === undefined) {
					console.log("refusing to update key because it doesn't match encryption");
					return;
				}

				loaded.forEach(cred => {
					state.all.splice(state.all.length, 0, cred);
				});

				state.decrypted = true;
			}

			state.key = key;
			persist(key, state.all);
		},
		wipeEverything(state) {
			state.key = undefined;
			state.all.splice(0, state.all.length);
			state.decrypted = true;
			wipe();
		},
	},
	actions: {},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)

const KEY_CREDENTIALS = "credentials";
const KEY_COUNT = "numCredentials";

function wipe(): void {
	if (window.localStorage) {
		window.localStorage.removeItem(KEY_CREDENTIALS);
		window.localStorage.removeItem(KEY_COUNT);
	}
	else {
		Cookies.remove(KEY_CREDENTIALS);
		Cookies.remove(KEY_COUNT);
	}
}

function persisted(): undefined | string {
	if (window.localStorage) {
		return window.localStorage.getItem(KEY_CREDENTIALS) || undefined;
	}
	else {
		return Cookies.get(KEY_CREDENTIALS);
	}
}

function load(key: string): undefined | Credential[] {
	const encrypted = persisted();
	if (encrypted === undefined) { return []; }

	const crypto = new SimpleCrypto(key);
	try {
		return crypto.decrypt(encrypted) as Credential[];
	}
	catch (e) {
		return undefined;
	}
}

function persistIfKey(key: string|undefined, credentials: Credential[]): void {
	if (key === undefined) { return; }
	persist(key, credentials);
}

function persist(key: string, credentials: Credential[]): void {
	const crypto = new SimpleCrypto(key);
	const encrypted = crypto.encrypt(JSON.stringify(credentials));

	if (window.localStorage) {
		window.localStorage.setItem(KEY_CREDENTIALS, encrypted);
		window.localStorage.setItem(KEY_COUNT, '' + credentials.length);
	}
	else {
		Cookies.set(KEY_CREDENTIALS, encrypted);
		Cookies.set(KEY_COUNT, '' + credentials.length);
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
