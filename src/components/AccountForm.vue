<template>
	<div>
		<div class="container">
			<form ref="form" novalidate :class="{'was-validated': validated}">
				<div class="form-group">
					<label for="AccountFormName">Name</label>
					<input v-model="name" ref="name" type="text" class="form-control" id="AccountFormName" placeholder="Account Name" required />
					<div class="invalid-feedback">Name is required</div>
				</div>
				<div class="form-group">
					<label for="AccountFormAccess">Access ID</label>
					<input v-model="access" type="password" class="form-control" id="AccountFormAccess" placeholder="Access ID" required minlength="20" maxlength="30" />
					<div class="invalid-feedback">Required from IAM</div>
				</div>
				<div class="form-group">
					<label for="AccountFormSecret">Secret Key</label>
					<input v-model="secret" type="password" class="form-control" id="AccountFormSecret" placeholder="Secret Key" required minlength="40" maxlength="50" />
					<div class="invalid-feedback">Required from IAM</div>
				</div>
				<div v-if="!encryptionKeySet">
					<div class="form-group form-check">
						<input v-model="addEncryptionKey" type="checkbox" class="form-check-input" id="AccountFormAddEncryptionKey" />
						<label class="form-check-label" for="AccountFormAddEncryptionKey">Encrypt &amp; Save to Local Storage</label>
					</div>
					<div class="form-group" v-if="addEncryptionKey">
						<label for="EncryptionFormKey">Encryption Key</label>
						<input v-model="encryptionKey" ref="key" type="password" class="form-control" id="EncryptionFormKey" placeholder="Encryption Key" required minlength="1" />
						<small class="form-text text-muted">
							All credentials will be encrypted using this key. Lost keys cannot be retrieved.<br />
							Credentials are never transmitted, except in direct API calls to the provider.<br />
							Encryption is through <a tabindex="-1" href="https://github.com/danang-id/simple-crypto-js" target="_blank">simple-crypto-js</a>, which uses AES with 256bit keys over 100 iterations.
						</small>
						<div class="invalid-feedback">Encryption key is required and should be a strong password.</div>
					</div>
				</div>
				<div class="text-right">
					<button type="button" class="ml-2 btn btn-secondary" @click.prevent="close()" v-if="!isFirstAccount">Cancel</button>
					<button type="submit" class="ml-2 btn btn-primary" @click.prevent="save()">Submit</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator';
import { Account } from '@/store/accounts';
import Analytics from '@/lib/google-analytics';

@Component
export default class AccountForm extends Vue {
	@Prop({type: String, required: false}) id!: string;
	@Ref('form') readonly formRef!: HTMLInputElement;
	@Ref('name') readonly nameRef!: HTMLElement;

	validated: boolean = false;

	addEncryptionKey: boolean = false;
	encryptionKey: string = '';

	name: string = '';
	access: string = '';
	secret: string = '';

	mounted(): void {
		this.nameRef.focus();

		if (this.id !== undefined) {
			const original  = this.original;
			if (!original) { throw 'liar'; }

			this.validated = true;
			this.name = original.name;
			this.access = original.access;
			this.secret = original.secret;
		}
	}

	get original(): Account | undefined {
		if (this.id !== undefined) {
			const account = this.$store.direct.state.accounts.all.find(c => c.id === this.id);
			if (account === undefined) { throw 'bad account: ' + this.id; }

			return account;
		}

		return undefined;
	}

	get encryptionKeySet(): boolean {
		return this.$store.direct.state.accounts.encryptionKey !== undefined;
	}

	get isFirstAccount(): boolean {
		return this.$store.direct.state.accounts.all.length === 0;
	}

	save(): void {
		this.validated = true;
		if (!this.formRef.checkValidity()) {
			Analytics.event('accounts', 'edit-invalid');
			return;
		}

		const isFirstAccount = this.isFirstAccount;

		const original = this.original;
		this.$store.direct.commit.upsertAccount({
			id: original ? original.id : ('' + new Date().getTime()),
			name: this.name,
			access: this.access,
			secret: this.secret,
			cloudId: original ? original.cloudId : undefined,
			error: original ? original.error : undefined,
		});
		Analytics.event('accounts', 'save');

		if (this.addEncryptionKey) {
			Analytics.event('accounts', 'encrypt-save');
			this.$store.direct.commit.setEncryptionKey(this.encryptionKey);
		}

		if (isFirstAccount) {
			this.$router.push('/explorer');
		}
		else {
			this.$router.go(-1);
		}
	}

	close(): void {
		this.$router.go(-1);
	}
}
</script>

<style scoped lang="scss">
</style>
