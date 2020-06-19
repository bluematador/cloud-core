<template>
	<div>
		<h1 class="p-2">{{header}}</h1>
		<Form :id="id" />
	</div>
</template>

<script lang="ts">
import { Component, Ref, Vue } from 'vue-property-decorator';
import { Account } from '@/store/accounts';
import Form from '@/components/AccountForm.vue';
import Analytics from '@/lib/google-analytics';

@Component({
	components: {
		Form,
	}
})
export default class AccountForm extends Vue {
	private id: string | undefined = '';

	beforeMount(): void {
		this.id = this.$route.params.id;
	}

	get original(): Account | undefined {
		if (this.id !== undefined) {
			const account = this.$store.direct.state.accounts.all.find(c => c.id === this.id);
			if (account === undefined) { throw 'bad account: ' + this.id; }

			return account;
		}

		return undefined;
	}

	get header(): string {
		const account = this.original;
		if (account !== undefined) {
			return 'Edit ' + account.name;
		}

		return 'Enter AWS Credentials';
	}
}
</script>

<style scoped lang="scss">
</style>
