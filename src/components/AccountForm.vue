<template>
	<div class="container">
		<h2>{{header}}</h2>

		<form ref="form" novalidate :class="{'was-validated': validated}">
			<div class="form-group">
				<label for="AccountFormName">Name</label>
				<input v-model="name" ref="name" type="text" class="form-control" id="AccountFormName" placeholder="Account Name" required />
				<small class="form-text text-muted">
					Name of this account. Must be unique.
				</small>
				<div class="invalid-feedback">Name is required</div>
			</div>
			<div class="form-group">
				<label for="AccountFormAccess">Access ID</label>
				<input v-model="access" type="text" class="form-control" id="AccountFormAccess" placeholder="Access ID" required minlength="20" maxlength="30" />
				<small class="form-text text-muted">
					Create a new <a tabindex="-1" href="https://console.aws.amazon.com/iam/home#/users" target="_blank">IAM user</a> with ReadOnlyAccess, and enter the Access ID here.
				</small>
				<div class="invalid-feedback">Required from IAM</div>
			</div>
			<div class="form-group">
				<label for="AccountFormSecret">Secret Key</label>
				<input v-model="secret" type="password" class="form-control" id="AccountFormSecret" placeholder="Secret Key" required minlength="40" maxlength="50" />
				<small class="form-text text-muted">
					Enter the Secret Key for your readonly IAM user here.
				</small>
				<div class="invalid-feedback">Required from IAM</div>
			</div>
			<div class="form-group form-check">
				<input v-model="enabled" type="checkbox" class="form-check-input" id="AccountFormEnabled" />
				<label class="form-check-label" for="AccountFormEnabled">Enabled</label>
				<small class="form-text text-muted">
					Enabled accounts will be crawled and summarized.
				</small>
			</div>
			<div v-if="!encryptionKeySet">
				<hr class="encryption-sep" />
				<div class="form-group form-check">
					<input v-model="addEncryptionKey" type="checkbox" class="form-check-input" id="AccountFormAddEncryptionKey" />
					<label class="form-check-label" for="AccountFormAddEncryptionKey">Encrypt All Credentials &amp; Save Locally</label>
					<small class="form-text text-muted">
						You can specify the encryption key and save all your credentials for next time.
					</small>
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
				<button type="button" class="ml-2 btn btn-secondary" @click.prevent="close()">Cancel</button>
				<button type="button" class="ml-2 btn btn-warning" @click.prevent="reset()">Reset</button>
				<button type="submit" class="ml-2 btn btn-primary" @click.prevent="save()">Submit</button>
			</div>
		</form>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator';

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
	enabled: boolean = true;

	beforeMount(): void {
		this.reset();
		this.validated = this.editMode;
	}

	mounted(): void {
		this.nameRef.focus();
	}

	reset(): void {
		this.addEncryptionKey = false;
		this.encryptionKey = '';

		if (this.editMode) {
			const account = this.$store.direct.state.accounts.all.find(c => c.id === this.id);
			if (account === undefined) {
				throw 'bad account: ' + this.id;
			}

			this.name = account.name;
			this.access = account.access;
			this.secret = account.secret;
			this.enabled = account.enabled;
		}
		else {
			this.name = '';
			this.access = '';
			this.secret = '';
			this.enabled = true;
		}
	}

	get editMode(): boolean {
		return this.id !== '';
	}

	get addMode(): boolean {
		return this.id === '';
	}

	get encryptionKeySet(): boolean {
		return this.$store.direct.state.accounts.encryptionKey !== undefined;
	}

	get header(): string {
		const account = this.$store.direct.state.accounts.all.find(c => c.id === this.id);
		if (account !== undefined) {
			return 'Edit ' + account.name;
		}

		return 'New Account';
	}

	save(): void {
		this.validated = true;
		if (this.formRef.checkValidity()) {
			const id = this.id !== '' ? this.id : ('' + new Date().getTime());

			this.$store.direct.commit.upsertAccount({
				id: id,
				name: this.name,
				access: this.access,
				secret: this.secret,
				enabled: this.enabled,
				error: undefined,
			});

			if (this.addEncryptionKey) {
				this.$store.direct.commit.setEncryptionKey(this.encryptionKey);
			}

			this.close();
		}
	}

	close(): void {
		this.$emit('done', {});
	}
}
</script>

<style scoped lang="scss">
hr.encryption-sep {
	border-top: 2px dashed #000;
}
</style>
