<template>
	<div class="container">
		<h2>{{header}}</h2>

		<form ref="form" novalidate :class="{'was-validated': validated}">
			<div class="alert alert-danger" v-if="decryptionFailed">The key you entered failed to decrypt the existing credentials. Please try again.</div>
			<div class="form-group">
				<label for="EncryptionFormKey">Encryption Key</label>
				<input v-model="key" ref="key" type="text" class="form-control" id="EncryptionFormKey" placeholder="Encryption Key" required minlength="1" />
				<small class="form-text text-muted">
					All credentials will be encrypted using this key. The credentials will be stored on your local machine.
					Lost keys cannot be retrieved.
				</small>
				<div class="invalid-feedback">Encryption key is required and should be a strong password.</div>
			</div>
			<div class="text-right">
				<button type="button" class="ml-2 btn btn-secondary" @click.prevent="close()">Cancel</button>
				<button type="submit" class="ml-2 btn btn-primary" @click.prevent="save()">Submit</button>
			</div>
		</form>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator';

@Component
export default class AccountForm extends Vue {
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
		return !this.$store.direct.state.credentials.decrypted;
	}

	get updateMode(): boolean {
		return this.$store.direct.state.credentials.key !== undefined;
	}

	save(): void {
		this.decryptionFailed = false;
		this.validated = true;

		if (!this.formRef.checkValidity()) {
			return;
		}

		if (this.decryptingMode && !this.$store.direct.getters.keyCanDecrypt(this.key)) {
			this.decryptionFailed = true;
			this.keyInputRef.focus();
			return;
		}

		this.$store.direct.commit.setCredentialKey(this.key);
		this.close();
	}

	close(): void {
		this.$emit('done', {});
	}
}
</script>

<style scoped lang="scss">
</style>
