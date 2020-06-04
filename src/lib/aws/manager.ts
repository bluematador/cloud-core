import Account from './account';
import { Maybe } from 'purify-ts/Maybe';

export class Manager {
	private accounts = new Map<string, Account>();

	add(account: Account): void {
		this.kill(account.model.id);
		this.accounts.set(account.model.id, account);
	}

	get(id: string): Maybe<Account> {
		return Maybe.fromNullable(this.accounts.get(id));
	}

	keys(): string[] {
		return [...this.accounts.keys()];
	}

	values(): Account[] {
		return [...this.accounts.values()];
	}

	kill(id: string): void {
		this.get(id).map(account => {
			account.stop();
			account.purge();
		});

		this.accounts.delete(id);
	}

	clear(): void {
		[...this.accounts.keys()].forEach(id => {
			this.kill(id);
		});
	}
}

export default new Manager();
