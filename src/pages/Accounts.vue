<template>
	<div>
		<h1 class="page-header">Accounts</h1>

		<div class="text-center mb-4">
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

		<div v-if="accounts.length > 0">
			<div class="text-right p-3">{{accounts.length}} Accounts</div>
			<table class="table table-striped table-hover">
				<thead>
					<tr>
						<th>Account ID</th>
						<th>Name</th>
						<th>Credentials</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="account in accounts" :key="account.id" :class="{
								'table-danger': account.error !== undefined,
							}">
						<td>{{account.cloudId || ''}}</td>
						<td>{{account.name}}</td>
						<td>{{account.access.mask(4)}}</td>
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
							<button class="btn btn-sm btn-danger" @click.prevent="deleteAccount(account.id)">
								<i class="fas fa-times"></i> Delete
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<div class="mt-5 text-center">
			<button class="btn btn-secondary" @click="back()">Back to Explorer</button>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Analytics from '@/lib/google-analytics';

@Component
export default class Accounts extends Vue {
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
		this.$router.push('/encrypt');
	}

	editAccount(id: string): void {
		this.$router.push('/accounts/edit/' + id);
	}

	addAccount(): void {
		this.$router.push('/accounts/add');
	}

	deleteAccount(id: string): void {
		Analytics.event('accounts', 'delete');
		this.$store.direct.commit.removeAccount(id);
	}

	wipeEverything(): void {
		Analytics.event('accounts', 'wipe');
		this.$store.direct.commit.wipeEverything();
	}

	back(): void {
		this.$router.push('/explorer');
	}
}
</script>

<style scoped lang="scss">
</style>
