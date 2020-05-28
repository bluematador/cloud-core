<template>
	<div>
		<h1 class="p-2">
			Accounts
			<span v-if="decrypted">({{credentials.length}})</span>
		</h1>

		<AccountForm v-if="view === 'accountForm'" :id="accountFormId" @done="view = 'main'" />
		<EncryptionForm v-else-if="view === 'encryptionForm'" @done="view = 'main'" />

		<div v-else>
			<div class="text-center mb-4">
				<div v-if="!decrypted">
					<p>There are {{encryptedCount}} credentials in local storage. Would you like to decrypt or delete?</p>
					<button @click.prevent="view = 'encryptionForm'" class="ml-2 mr-2 btn btn-primary">
						<i class="fas fa-key"></i>
						Enter Decryption Key
					</button>
					<button @click.prevent="wipeEverything()" class="ml-2 mr-2 btn btn-danger">
						<i class="fas fa-trash"></i>
						Delete Encrypted Credentials
					</button>
				</div>
				<div v-else>
					<button @click.prevent="addCredentialForm()" class="ml-2 mr-2 btn btn-primary">
						<i class="fas fa-plus"></i>
						Create New
					</button>
					<button @click.prevent="view = 'encryptionForm'" class="ml-2 mr-2 btn btn-secondary">
						<i class="fas fa-lock"></i>
						{{key === undefined ? 'Encrypt &amp; Save Locally' : 'Change Encryption Key'}}
					</button>
					<button @click.prevent="wipeEverything()" class="ml-2 mr-2 btn btn-danger" v-if="key !== undefined">
						<i class="fas fa-trash"></i>
						Delete Everything
					</button>
				</div>
			</div>

			<table v-if="credentials.length > 0" class="table table-striped table-hover">
				<thead>
					<tr>
						<th>Provider</th>
						<th>Name</th>
						<th>Access ID</th>
						<th>Secret Key</th>
						<th>Enabled</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="cred in credentials" :key="cred.id" :class="{
								'table-danger': cred.error !== undefined,
								'table-secondary': !cred.enabled,
							}">
						<td><i class="fab fa-aws"></i></td>
						<td>{{cred.name}}</td>
						<td>{{cred.access.maskMiddle(3, 3)}}</td>
						<td>{{cred.secret.maskFirst(cred.secret.length - 4)}}</td>
						<td>
							<span v-if="cred.enabled"><i class="text-success fas fa-check"></i></span>
							<span v-else><i class="text-danger fas fa-times"></i></span>
						</td>
						<td>
							<span v-if="cred.error === undefined"><i class="text-success fas fa-check"></i></span>
							<span v-else>{{cred.error}}</span>
						</td>
						<td>
							<button class="mr-2 btn btn-sm btn-primary" @click.prevent="editCredentialForm(cred.id)">
								<i class="fas fa-edit"></i> Edit
							</button>
							<button class="mr-2 btn btn-sm btn-danger" @click.prevent="deleteCredential(cred.id)">
								<i class="fas fa-times"></i> Delete
							</button>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import AccountForm from './AccountForm.vue';
import EncryptionForm from './EncryptionForm.vue';

@Component({
	components: {
		AccountForm,
		EncryptionForm,
	},
})
export default class Accounts extends Vue {
	view: 'main'|'encryptionForm'|'accountForm' = 'main';
	accountFormId: string = '';

	get credentials() {
		return this.$store.direct.state.credentials.all;
	}

	get key() {
		return this.$store.direct.state.credentials.key;
	}

	get decrypted() {
		return this.$store.direct.state.credentials.decrypted;
	}

	get encryptedCount() {
		return this.$store.direct.getters.countCredentialsToDecrypt();
	}

	editCredentialForm(id: string): void {
		this.accountFormId = id;
		this.view = 'accountForm';
	}

	addCredentialForm(): void {
		this.accountFormId = '';
		this.view = 'accountForm';
	}

	deleteCredential(id: string): void {
		this.$store.direct.commit.removeCredential(id);
	}

	wipeEverything(): void {
		this.$store.direct.commit.wipeEverything();
	}
}
</script>

<style scoped lang="scss">
</style>
