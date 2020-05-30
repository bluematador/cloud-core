import Cookies from 'js-cookie';
import SimpleCrypto from "simple-crypto-js";
import { Account } from '../../store/accounts';

const KEY_ACCOUNTS = "accounts";
const KEY_COUNT = "numAccounts";

export class AccountStorage {
	private getStored(): undefined | string {
		if (window.localStorage) {
			return window.localStorage.getItem(KEY_ACCOUNTS) || undefined;
		}
		else {
			return Cookies.get(KEY_ACCOUNTS);
		}
	}

	clear(): void {
		if (window.localStorage) {
			window.localStorage.removeItem(KEY_ACCOUNTS);
			window.localStorage.removeItem(KEY_COUNT);
		}
		else {
			Cookies.remove(KEY_ACCOUNTS);
			Cookies.remove(KEY_COUNT);
		}
	}

	canLoad(encryptionKey: string): boolean {
		try {
			this.load(encryptionKey);
			return true;
		}
		catch (e) {
			return false;
		}
	}

	load(encryptionKey: string): Account[] {
		const encrypted = this.getStored();
		if (encrypted === undefined) { return []; }

		const crypto = new SimpleCrypto(encryptionKey);
		const accounts = crypto.decrypt(encrypted) as Account[];
		accounts.forEach(account => {
			delete account.error;
		});

		return accounts;
	}

	save(encryptionKey: string, accounts: Account[]): void {
		const crypto = new SimpleCrypto(encryptionKey);
		const encrypted = crypto.encrypt(JSON.stringify(accounts));
		const count = accounts.length.toString();

		if (window.localStorage) {
			window.localStorage.setItem(KEY_ACCOUNTS, encrypted);
			window.localStorage.setItem(KEY_COUNT, count);
		}
		else {
			Cookies.set(KEY_ACCOUNTS, encrypted);
			Cookies.set(KEY_COUNT, count);
		}
	}

	get length(): number {
		if (window.localStorage) {
			return Number(window.localStorage.getItem(KEY_COUNT)) || 0;
		}
		else {
			return Number(Cookies.get(KEY_COUNT)) || 0;
		}
	}
}

export default new AccountStorage();
