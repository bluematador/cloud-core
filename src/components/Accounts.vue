<template>
	<div>
		<h1 class="p-2">Accounts</h1>

		<AccountForm v-if="view === 'accountForm'" :id="accountFormId" @done="view = 'main'" />
		<EncryptionForm v-else-if="view === 'encryptionForm'" @done="view = 'main'" />

		<div v-else>
			<div class="text-center mb-4">
				<div v-if="!decrypted">
					<p>There are {{encryptedCount}} encrypted accounts in local storage. Would you like to decrypt or delete?</p>
					<button @click.prevent="view = 'encryptionForm'" class="ml-2 mr-2 btn btn-primary">
						<i class="fas fa-key"></i>
						Enter Decryption Key
					</button>
					<button @click.prevent="wipeEverything()" class="ml-2 mr-2 btn btn-danger">
						<i class="fas fa-trash"></i>
						Delete Encrypted Accounts
					</button>
				</div>
				<div v-else>
					<button @click.prevent="addAccount()" class="ml-2 mr-2 btn btn-primary">
						<i class="fas fa-plus"></i>
						Create New
					</button>
					<button @click.prevent="encrypt()" class="ml-2 mr-2 btn btn-secondary">
						<i class="fas fa-lock"></i>
						{{encryptionKey === undefined ? 'Encrypt &amp; Save Locally' : 'Change Encryption Key'}}
					</button>
					<button @click.prevent="wipeEverything()" class="ml-2 mr-2 btn btn-danger" v-if="encryptionKey !== undefined">
						<i class="fas fa-trash"></i>
						Delete Everything
					</button>
				</div>
			</div>

			<div v-if="accounts.length > 0">
				<div class="text-right p-3">{{accounts.length}} Accounts</div>
				<table class="table table-striped table-hover">
					<thead>
						<tr>
							<th>Cloud</th>
							<th>Account ID</th>
							<th>Name</th>
							<th>Credentials</th>
							<th>Enabled</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="account in accounts" :key="account.id" :class="{
									'table-danger': account.error !== undefined,
									'table-secondary': !account.enabled,
								}">
							<td><i class="fab fa-aws"></i></td>
							<td>{{account.cloudId || ''}}</td>
							<td>{{account.name}}</td>
							<td>{{account.access.mask(4)}}</td>
							<td>
								<span v-if="account.enabled"><i class="text-success fas fa-check"></i></span>
								<span v-else><i class="text-danger fas fa-times"></i></span>
							</td>
							<td>
								<span v-if="account.error === undefined"><i class="text-success fas fa-check"></i></span>
								<span v-else>
									<i class="text-danger fas fa-times" style="cursor: help; text-decoration: underline;" :title="account.error"></i>
								</span>
							</td>
							<td>
								<button class="mr-2 btn btn-sm btn-primary" @click.prevent="editAccount(account.id)">
									<i class="fas fa-edit"></i> Edit
								</button>
								<button class="mr-2 btn btn-sm btn-primary" @click.prevent="testAccount(account.id)">
									<i class="fas fa-heartbeat"></i> Test
								</button>
								<button class="btn btn-sm btn-danger" @click.prevent="deleteAccount(account.id)">
									<i class="fas fa-times"></i> Delete
								</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import AccountForm from './AccountForm.vue';
import EncryptionForm from './EncryptionForm.vue';
import ga from '@/lib/google-analytics';

@Component({
	components: {
		AccountForm,
		EncryptionForm,
	},
})
export default class Accounts extends Vue {
	view: 'main'|'encryptionForm'|'accountForm' = 'main';
	accountFormId: string = '';

	get accounts() {
		return this.$store.direct.state.accounts.all;
	}

	get encryptionKey() {
		return this.$store.direct.state.accounts.encryptionKey;
	}

	get decrypted() {
		return this.$store.direct.state.accounts.decrypted;
	}

	get encryptedCount() {
		return this.$store.direct.getters.countEncryptedAccounts();
	}

	encrypt() {
		ga.event('Accounts', 'encrypt-form').send();
		this.view = 'encryptionForm';
	}

	editAccount(id: string): void {
		ga.event('Accounts', 'edit-form').send();
		this.accountFormId = id;
		this.view = 'accountForm';
	}

	addAccount(): void {
		ga.event('Accounts', 'add-form').send();
		this.accountFormId = '';
		this.view = 'accountForm';
	}

	deleteAccount(id: string): void {
		ga.event('Accounts', 'delete').send();
		this.$store.direct.commit.removeAccount(id);
	}

	testAccount(id: string): void {
		ga.event('Accounts', 'test').send();
		this.$store.direct.dispatch.testAccountCredentials(id);
	}

	wipeEverything(): void {
		ga.event('Accounts', 'wipe').send();
		this.$store.direct.commit.wipeEverything();
	}
}
</script>

<style scoped lang="scss">
</style>
