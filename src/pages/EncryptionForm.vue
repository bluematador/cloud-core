<template>
	<div>
		<h1 class="p-2">{{header}}</h1>

		<div class="container">
			<form ref="form" novalidate :class="{'was-validated': validated}">
				<div class="alert alert-danger" v-if="decryptionFailed">The key you entered failed to decrypt the existing credentials. Please try again.</div>
				<div class="form-group">
					<label for="EncryptionFormKey">Encryption Key</label>
					<input v-model="key" ref="key" type="password" class="form-control" id="EncryptionFormKey" placeholder="Encryption Key" required minlength="1" />
					<small class="form-text text-muted">
						All credentials will be encrypted using this key. Lost keys cannot be retrieved.<br />
						Credentials are never transmitted, except in direct API calls to the provider.<br />
						Encryption is through <a tabindex="-1" href="https://github.com/danang-id/simple-crypto-js" target="_blank">simple-crypto-js</a>, which uses AES with 256bit keys over 100 iterations.
					</small>
					<div class="invalid-feedback">Encryption key is required and should be a strong password.</div>
				</div>
				<div class="text-right">
					<button type="button" class="ml-2 btn btn-secondary" @click.prevent="close()">Cancel</button>
					<button type="submit" class="ml-2 btn btn-primary" @click.prevent="save()">Submit</button>
				</div>
			</form>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator';
import Analytics from '@/lib/google-analytics';

@Component
export default class EncryptionForm extends Vue {
	@Ref('form') readonly formRef!: HTMLInputElement;
	@Ref('key') readonly keyInputRef!: HTMLElement;

	validated: boolean = false;
	decryptionFailed: boolean = false;

	key: string = '';

	mounted(): void {
		this.keyInputRef.focus();
	}

	get header(): string {
		if (this.decryptingMode) {
			return 'Enter Decryption Key';
		}
		if (this.updateMode) {
			return 'Update Encryption Key';
		}
		return 'Enter Encryption Key';
	}

	get decryptingMode(): boolean {
		return !this.$store.direct.state.accounts.decrypted;
	}

	get updateMode(): boolean {
		return this.$store.direct.state.accounts.encryptionKey !== undefined;
	}

	save(): void {
		this.decryptionFailed = false;
		this.validated = true;

		if (!this.formRef.checkValidity()) {
			Analytics.event('accounts', 'encrypt-invalid');
			return;
		}

		if (this.decryptingMode && !this.$store.direct.getters.keyCanDecrypt(this.key)) {
			Analytics.event('accounts', 'decrypt-fail');
			this.decryptionFailed = true;
			this.keyInputRef.focus();
			return;
		}

		const decrypting = this.decryptingMode;
		this.$store.direct.commit.setEncryptionKey(this.key);
		Analytics.event('accounts', 'encrypt-save');

		if (decrypting) {
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
