<template>
	<div>
		<h1>Resources</h1>

		<table class="table table-striped table-hover table-bordered">
			<thead>
				<tr>
					<th>Account</th>
					<th>Service</th>
					<th>Region</th>
					<th>Name</th>
					<th>Details</th>
					<th>Usage</th>
					<th>$/hr</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="resource in resources" :key="resource.id" :class="{'table-danger': resource.error !== undefined}">
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
					<td v-if="resource.error !== undefined" colspan="3" class="text-center">
						{{resource.error}}
					</td>
					<td v-if="resource.error === undefined">
						<div v-for="(value, key) in resource.details" :key="resource.id + '|||details|||' + key">
							<strong>{{key}}</strong>
							{{value}}
						</div>
					</td>
					<td v-if="resource.error === undefined">
						<div v-for="(stats, item) in resource.usage" :key="resource.id + '|||usage|||' + item">
							<div v-for="period in ['last', 'avg1h', 'avg1d', 'avg1w']" :key="resource.id + '|||usage|||' + item + '|||' + period">
								<strong class="mr-1">{{item}}</strong>&nbsp;
								<small class="mr-1">({{period}})</small>&nbsp;
								<span class="mr-1">{{stats[period]}} {{stats['unit']}}</span>
							</div>
						</div>
					</td>
					<td v-if="resource.error === undefined">
						<div v-if="resource.costs['total'] !== undefined">
							<div>{{new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD', maximumFractionDigits: 6}).format(resource.costs['total'].last)}}</div>

							<div v-for="(stats, item) in resource.costs" :key="resource.id + '|||costs|||' + item">
								<div v-for="period in ['last', 'avg1h', 'avg1d', 'avg1w']" :key="resource.id + '|||costs|||' + item + '|||' + period">
									<strong class="mr-1">{{item}}</strong>&nbsp;
									<small class="mr-1">({{period}})</small>&nbsp;
									<span class="mr-1">
										{{new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD', maximumFractionDigits: 12}).format(stats[period])}}
									</span>
								</div>
							</div>
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
