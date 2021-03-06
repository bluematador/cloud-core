<template>
	<div>
		<div class="jumbotron hero">
			<div class="container">
				<div class="row">
					<div class="col col-12 col-lg-6 text-center">
						<h1 class="display-2">Cloud CORE</h1>
						<h3>Cost Optimization Resource Explorer</h3>
						<hr />
						<p class="lead">See realtime, resource-specific costs from your AWS accounts.</p>
						<div class="mt-4">
							<button class="btn btn-primary" @click="scrollToForm()">
								<i class="fab fa-aws"></i>
								Enter Credentials
							</button>
						</div>
					</div>
					<div class="col col-12 col-lg-6 text-center">
						<ExplainerVideo />
					</div>
				</div>
			</div>
		</div>

		<div class="brick">
			<h2 class="text-center mb-3">Cloud CORE is Easy, Secure, and 100% Free</h2>
			<div class="container">
				<div class="row text-center">
					<div class="col col-3">
						<div class="step-number">1.</div>
						<div>
							Go to the
							<a href="https://console.aws.amazon.com/iam/home#/users" target="_blank">AWS IAM wizard</a>
							to <strong>create a new user</strong>.
						</div>
					</div>
					<div class="col col-3">
						<div class="step-number">2.</div>
						<div>Give the user<br /><strong>Programmatic Access</strong>.</div>
					</div>
					<div class="col col-3">
						<div class="step-number">3.</div>
						<div>Assign the <strong>ReadOnlyAccess</strong> managed policy.</div>
					</div>
					<div class="col col-3">
						<div class="step-number">4.</div>
						<div><strong>Enter the credentials</strong> you just created in the form below.</div>
					</div>
				</div>
			</div>
		</div>

		<div ref="ctaForm">
			<div v-if="needsDecryption" class="brick">
				<h2 class="text-center">Welcome Back!</h2>

				<div class="text-center mt-4">
					<p>There are <strong>{{encryptedCount}} encrypted accounts</strong> in local storage.</p>
					<p>You can either enter the key or delete and start from scratch.</p>
				</div>

				<EncryptionForm />
			</div>
			<div v-else-if="needsFirstAccount" class="brick">
				<h2 class="text-center">Get Started</h2>
				<p class="text-center">Enter your AWS account credentials, and you'll see cost information in seconds.</p>
				<AccountForm />
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Ref, Vue } from 'vue-property-decorator';
import AccountForm from '@/components/AccountForm.vue';
import Analytics from '@/lib/google-analytics';
import EncryptionForm from '@/components/EncryptionForm.vue';
import ExplainerVideo from '@/components/ExplainerVideo.vue';
import smoothscroll from 'smoothscroll';

@Component({
	components: {
		AccountForm,
		EncryptionForm,
		ExplainerVideo,
	}
})
export default class Onboarding extends Vue {
	@Ref('ctaForm') form!: HTMLElement;

	beforeMount(): void {
		if (!this.needsDecryption && !this.needsFirstAccount) {
			this.$router.push('/explorer');
		}
	}

	get needsFirstAccount(): boolean {
		return this.$store.direct.state.accounts.all.length === 0;
	}

	get needsDecryption(): boolean {
		return !this.$store.direct.state.accounts.decrypted;
	}

	get encryptedCount() {
		return this.$store.direct.getters.countEncryptedAccounts();
	}

	scrollToForm() {
		smoothscroll(this.form);
	}
}
</script>

<style scoped lang="scss">
@import '../variables';

.hero {
	border-radius: 0;
	background-color: $hero-color;
	color: #fff;
	margin-bottom: 0;

	hr {
		border-top: 1px solid #fff;
		margin-top: 30px;
	}
}
.step-number {
	font-size: 3rem;
	color: $hero-color;
}
.brick {
	padding: 40px 0;

	&:nth-child(odd) {
		background-color: #eee;
	}
}
</style>
