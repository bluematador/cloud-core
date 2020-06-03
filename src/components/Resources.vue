<template>
	<div>
		<h1 class="p-2">Resources</h1>

		<div class="text-right p-3">
			<span class="mr-3">Found {{resources.length}} Resources</span>
			<span class="mr-1">Page Size:</span>
			<div class="d-inline-block">
				<div class="btn-group">
					<button v-for="n in pageSizeOptions" :key="n"
							:disabled="pageSize === n"
							@click="changePageSize(n)"
							class="btn btn-primary">{{n}}</button>
				</div>
			</div>
		</div>

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
				<tr v-for="resource in pagedResources" :key="resource.id" :class="{'table-danger': resource.error !== undefined}">
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

		<div class="mt-3 mb-3">
			<Pages :page="page" :total="pageCount" @page="changePage" />
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Pages from './Pages.vue';

@Component({
	components: {
		Pages,
	},
})
export default class Resources extends Vue {
	pageSize: number = 10;
	page: number = 0;

	get resources() {
		return this.$store.direct.state.resources.all.sortBy(r => r.name);
	}

	get pageCount(): number {
		return Math.ceil(this.resources.length / this.pageSize);
	}

	get pagedResources() {
		return this.resources.slice(this.page * this.pageSize, (this.page + 1) * this.pageSize);
	}

	get pageSizeOptions() {
		return [10, 25, 50, 100];
	}

	account(id: string) {
		return this.$store.direct.state.accounts.all.find(a => a.id === id);
	}

	changePage(newPage: number) {
		this.page = newPage;
		window.scrollTo(0, 0);
	}

	changePageSize(size: number) {
		this.page = 0;
		this.pageSize = size;
	}
}
</script>

<style scoped lang="scss">
</style>
