<template>
	<div>
		<h1 class="p-2">Accounts ({{credentials.length}})</h1>

		<AccountForm v-if="showForm" :id="editing" @done="hideForm()" />

		<div v-else>
			<div class="text-center">
				<button @click.prevent="addForm()" class="m-2 btn btn-primary">Create New</button>
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
							<button class="mr-2 btn btn-sm btn-primary" @click.prevent="editForm(cred.id)">
								<i class="fas fa-edit"></i> Edit
							</button>
							<button class="mr-2 btn btn-sm btn-danger" @click.prevent="del(cred.id)">
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

@Component({
	components: {
		AccountForm,
	},
})
export default class Accounts extends Vue {
	showForm: boolean = false;
	editing: string = '';

	get credentials() {
		return this.$store.direct.state.credentials.all;
	}

	editForm(id: string): void {
		this.editing = id;
		this.showForm = true;
	}

	addForm(): void {
		this.editing = '';
		this.showForm = true;
	}

	hideForm(): void {
		this.showForm = false;
	}

	del(id: string): void {
		this.$store.direct.commit.removeCredential(id);
	}
}
</script>

<style scoped lang="scss">
</style>
