<template>
	<div>
		<h1 class="page-header">Explorer</h1>

		<div class="container-fluid">
			<div class="row">
				<div class="col col-4 col-xl-3">
					<div class="accordion mb-3">
						<AccountsCard @toggle="toggleAccount" />
					</div>

					<div class="accordion mb-3">
						<CostCalculations @forecast="setForecast" @costIndex="setCostIndex" />
					</div>

					<div class="accordion mb-3">
						<CollapsingCard header="Services" collapsed :badge="`${services.length - Object.keys(disabledServices).length} / ${services.length}`">
							<button v-for="service in services" :key="service"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledServices[service], 'btn-outline-primary': disabledServices[service]}"
									@click="toggleService(service)">{{service}}</button>
						</CollapsingCard>
						<CollapsingCard header="Resource Types" collapsed :badge="`${kinds.length - Object.keys(disabledKinds).length} / ${kinds.length}`">
							<button v-for="kind in kinds" :key="kind"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledKinds[kind], 'btn-outline-primary': disabledKinds[kind]}"
									@click="toggleKind(kind)">{{kind}}</button>
						</CollapsingCard>
						<CollapsingCard header="Regions" collapsed :badge="`${regions.length - Object.keys(disabledRegions).length} / ${regions.length}`">
							<button v-for="region in regions" :key="region"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledRegions[region], 'btn-outline-primary': disabledRegions[region]}"
									@click="toggleRegion(region)">{{region}}</button>
						</CollapsingCard>
					</div>

					<div class="accordion mb-3">
						<CollapsingCard header="Options" collapsed>
							<div class="d-inline-block w-50">Page Size:</div>
							<div class="d-inline-block w-50">
								<div class="btn-group">
									<button v-for="n in pageSizeOptions" :key="n"
											:disabled="pageSize === n"
											@click="changePageSize(n)"
											class="btn btn-primary">{{n}}</button>
								</div>
							</div>
						</CollapsingCard>
					</div>
				</div>
				<div class="col col-8 col-xl-9">
					<div class="d-flex justify-content-between align-items-middle data-summary pt-2 pb-2 pl-4 pr-4 mb-4">
						<span>
							<span>{{costFormat.format(totalSpend)}}</span>
							<small class="ml-2">Forecast</small>
						</span>
						<span>
							<span>{{resources.length}}</span>
							<small class="ml-2">Resources</small>
						</span>
					</div>

					<table class="table table-striped table-hover table-bordered">
						<thead class="thead-light">
							<tr>
								<th class="sortable" @click="changeSort('name')" width="30%">
									<i v-if="sort === 'name' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'name' && sortAsc" class="fas fa-caret-up"></i>
									Name
								</th>
								<th class="sortable" @click="changeSort('forecast')" width="10%">
									<i v-if="sort === 'forecast' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'forecast' && sortAsc" class="fas fa-caret-up"></i>
									Forecast
								</th>
								<th class="sortable" @click="changeSort('service')" width="20%">
									<i v-if="sort === 'service' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'service' && sortAsc" class="fas fa-caret-up"></i>
									Service
								</th>
								<th class="sortable" @click="changeSort('kind')" width="10%">
									<i v-if="sort === 'kind' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'kind' && sortAsc" class="fas fa-caret-up"></i>
									Type
								</th>
								<th class="sortable" @click="changeSort('region')" width="15%">
									<i v-if="sort === 'region' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'region' && sortAsc" class="fas fa-caret-up"></i>
									Region
								</th>
								<th class="sortable" @click="changeSort('account')" width="15%">
									<i v-if="sort === 'account' && !sortAsc" class="fas fa-caret-down"></i>
									<i v-if="sort === 'account' && sortAsc" class="fas fa-caret-up"></i>
									Account
								</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="resource in pagedResources" :key="resource.id" :class="{'table-danger': resource.error !== undefined}">
								<td>
									<a :href="resource.url" target="_blank" @click="linkTrack(resource)" class="mr-2"><i class="fas fa-external-link-alt"></i></a>
									{{resource.name}}
								</td>
								<td v-if="resource.error !== undefined" colspan="1" class="text-center">
									<div class="resource-error">
										<i class="fas fa-question-circle" :title="resource.error.toString()"></i>
										{{resource.error}}
									</div>
								</td>
								<td v-if="resource.error === undefined">
									<div v-if="resource.calculations">
										<strong>{{costFormat.format(forecast * resource.calculations[costIndex]['total'].subtotal1h)}}</strong>
									</div>
									<div v-else class="spinner-border spinner-border-sm"></div>
								</td>
								<td>{{resource.service}}</td>
								<td>{{resource.kind}}</td>
								<td>{{resource.region}}</td>
								<td>
									<i class="fab fa-aws"></i>
									{{account(resource.accountId).name}}
								</td>
							</tr>
						</tbody>
					</table>

					<div class="mt-3 mb-3 text-center">
						<Pages v-if="resources.length > 0" :page="page" :total="pageCount" @page="changePage" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Account } from '@/store/accounts';
import { Resource } from '@/store/resources';
import AccountsCard from '@/components/AccountsCard.vue';
import Analytics from '@/lib/google-analytics';
import CollapsingCard from '@/components/CollapsingCard.vue';
import CostCalculations from '@/components/CostCalculations.vue';
import Pages from '@/components/Pages.vue';

type SortOptions = 'account'|'service'|'kind'|'region'|'name'|'forecast';
type CostOptions = 'last'|'avg1h'|'avg1d'|'avg1w';

@Component({
	components: {
		AccountsCard,
		CollapsingCard,
		CostCalculations,
		Pages,
	},
})
export default class Explorer extends Vue {
	costFormat = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 4,
		maximumFractionDigits: 4,
	});

	pageSize: number = 50;
	page: number = 0;
	sort: SortOptions = 'forecast';
	sortAsc: boolean = false;

	costIndex: CostOptions = 'avg1d';
	forecast: number = 720;

	disabledAccounts: {[id: string]: string} = {};
	disabledServices: {[id: string]: string} = {};
	disabledKinds: {[id: string]: string} = {};
	disabledRegions: {[id: string]: string} = {};

	beforeMount(): void {
		if (!this.$store.direct.state.accounts.decrypted || this.$store.direct.state.accounts.all.length === 0) {
			this.$router.push('/');
		}
	}

	setCostIndex(value: CostOptions): void {
		Analytics.event('explorer', 'cost-index-' + value);
		this.costIndex = value;
	}

	setForecast(value: number): void {
		Analytics.event('explorer', 'forecast-' + value);
		this.forecast = value;
	}

	get totalSpend(): number {
		return this.resources.map(r => {
			return r.calculations ? r.calculations[this.costIndex]['total'].subtotal1h * this.forecast : 0;
		}).sum();
	}

	get resources() {
		const filtered = this.$store.direct.state.resources.all.filter(r => {
			return !(r.accountId in this.disabledAccounts) &&
			       !(r.service in this.disabledServices) &&
			       !(r.kind in this.disabledKinds) &&
			       !(r.region in this.disabledRegions);
		});

		let sorted: Resource[];
		switch (this.sort) {
			case 'account':
				const accounts = Object.fromEntries(this.accounts.map(a => [a.id, a.name.toLowerCase()]));
				sorted = filtered.sortBy(r => accounts[r.accountId]);
				break;
			case 'service':
				sorted = filtered.sortBy(r => r.service);
				break;
			case 'kind':
				sorted = filtered.sortBy(r => r.kind);
				break;
			case 'region':
				sorted = filtered.sortBy(r => r.region);
				break;
			case 'name':
				sorted = filtered.sortBy(r => r.name.toLowerCase());
				break;
			case 'forecast':
				sorted = filtered.sortNumBy(r => r.calculations ? r.calculations[this.costIndex]['total'].subtotal1h : -1);
				break;
		}

		if (!this.sortAsc) {
			sorted.reverse();
		}

		return sorted;
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

	get accounts() {
		return this.$store.direct.state.accounts.all.sortBy(a => a.name.toLowerCase());
	}

	get services() {
		return this.$store.direct.state.resources.all.map(r => r.service).distinct().sort();
	}

	get regions() {
		return this.$store.direct.state.resources.all.map(r => r.region).distinct().sort();
	}

	get kinds() {
		return this.$store.direct.state.resources.all.filter(r => {
			return !(r.service in this.disabledServices);
		}).map(r => r.kind).distinct().sort();
	}

	account(id: string) {
		return this.$store.direct.state.accounts.all.find(a => a.id === id);
	}

	private toggle(id: string, list: {[id: string]: string}): void {
		if (id in list) {
			Vue.delete(list, id);
		}
		else {
			Vue.set(list, id, id);
		}
	}

	toggleAccount(id: string) {
		Analytics.event('explorer', 'filter-account');
		this.toggle(id, this.disabledAccounts);
	}

	toggleService(id: string) {
		Analytics.event('explorer', 'filter-service');
		this.toggle(id, this.disabledServices);
	}

	toggleKind(id: string) {
		Analytics.event('explorer', 'filter-kind');
		this.toggle(id, this.disabledKinds);
	}

	toggleRegion(id: string) {
		Analytics.event('explorer', 'filter-region');
		this.toggle(id, this.disabledRegions);
	}

	changePage(newPage: number) {
		Analytics.event('explorer', 'switch-page');
		this.page = newPage;
		window.scrollTo(0, 0);
	}

	changePageSize(size: number) {
		Analytics.event('explorer', 'page-size');
		this.page = 0;
		this.pageSize = size;
	}

	changeSort(id: SortOptions) {
		Analytics.event('explorer', 'sort-' + id);
		if (id === this.sort) {
			this.sortAsc = !this.sortAsc;
		}
		else {
			this.sort = id;
			this.sortAsc = (id !== 'forecast');
		}
	}

	manageAccounts(): void {
		this.$router.push('/accounts');
	}

	linkTrack(resource: Resource) {
		Analytics.event('explorer', 'link-' + [resource.region, resource.service].join('-'));
	}
}
</script>

<style scoped lang="scss">
@import '../variables';

.data-summary {
	background-color: #7ED321;
	border-radius: 0.5rem;
	border: 1px solid darken(#7ED321, 10%);
	color: #fff;
	font-size: 3rem;
	font-weight: bold;

	small {
		font-size: 14px;
		font-weight: bold;
	}
}

.filter-option {
	max-width: 100%;
}

th.sortable {
	transition: background-color 0.35s ease;
	cursor: pointer;

	&:hover {
		background-color: $table-hover-bg;
	}
}

.resource-error {
	max-width: 200px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
