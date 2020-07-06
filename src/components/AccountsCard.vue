<template>
	<CollapsingCard header="Accounts">
		<div>
			<button v-for="account in accounts" :key="account.id"
					style="max-width: 100%;"
					:disabled="disableToggle"
					class="text-truncate mr-1 mb-1 btn"
					:class="{
						'btn-primary': !disabled[account.id],
						'btn-outline-primary': disabled[account.id],
						'btn-danger': account.error !== undefined,
					}"
					@click="toggleAccount(account.id)">{{account.name}}</button>
		</div>
		<hr />
		<div class="text-center mt-3">
			<button class="btn btn-block btn-secondary" @click="manageAccounts()">
				<i class="fab fa-aws"></i>
				Manage Accounts
			</button>

			<div v-if="accounts.some(a => a.error !== undefined)" class="mt-3 alert alert-danger">
				Some of your accounts have invalid credentials.
			</div>
		</div>
	</CollapsingCard>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import CollapsingCard from './CollapsingCard.vue';

@Component({
	components: {
		CollapsingCard,
	},
})
export default class AccountsCard extends Vue {
	@Prop({type: Boolean, required: false, default: false}) disableToggle!: boolean;

	disabled: {[id: string]: string} = {};

	private toggle(id: string, list: {[id: string]: string}): void {
		if (id in list) {
			Vue.delete(list, id);
		}
		else {
			Vue.set(list, id, id);
		}
	}

	toggleAccount(id: string) {
		this.toggle(id, this.disabled);
		this.$emit('toggle', id);
	}

	get accounts() {
		return this.$store.direct.state.accounts.all.sortBy(a => a.name.toLowerCase());
	}

	manageAccounts(): void {
		this.$router.push('/accounts');
	}
}
</script>

<style scoped lang="scss">
</style>
