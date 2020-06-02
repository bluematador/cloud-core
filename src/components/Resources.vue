<template>
	<div>
		<h1>Resources</h1>

		<table class="table table-striped table-hover table-bordered">
			<thead>
				<tr>
					<th>ID</th>
					<th>Account</th>
					<th>Service</th>
					<th>Region</th>
					<th>Name</th>
					<th>Details</th>
					<th>$/hr</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="resource in resources" :key="resource.id">
					<td>{{resource.id}}</td>
					<td>
						<i class="fab fa-aws"></i>
						{{account(resource.accountId).name}}
					</td>
					<td>{{resource.service}}</td>
					<td>{{resource.region}}</td>
					<td>
						<a :href="resource.url" target="_blank" class="mr-2"><i class="fas fa-external-link-alt"></i></a>
						{{resource.name}}
					</td>
					<td>
						<div v-for="(value, key) in resource.details" :key="resource.id + '|||' + key">
							<strong>{{key}}</strong>
							{{value}}
						</div>
					<td>
						<div v-if="resource.costs !== undefined">
							{{new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD', maximumFractionDigits: 6}).format(resource.costs.last.total)}}
						</div>
						<div v-else class="spinner-border spinner-border-sm"></div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class Resources extends Vue {
	get resources() {
		return this.$store.direct.state.resources.all.sortBy(r => r.name);
	}

	account(id: string) {
		return this.$store.direct.state.accounts.all.find(a => a.id === id);
	}
}
</script>

<style scoped lang="scss">
</style>
