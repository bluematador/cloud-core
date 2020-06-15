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

		<div class="container-fluid">
			<div class="row">
				<div class="col col-4 col-xl-3">
					<div class="accordion mb-3">
						<CollapsingCard header="Cost Calculations">
							<div class="text-center">
								<div>Extrapolate costs from the last:</div>
								<div class="btn-group">
									<button v-for="(name, key) in costIndexes" :key="key"
											:disabled="costIndex === key"
											@click="costIndex = key"
											class="btn btn-primary">{{name}}</button>
								</div>
								<div class="mt-3 mb-3">
									<span style="border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 3px 5px; font-size: 0.75rem;">and then</span>
								</div>
								<div>Forecast costs for:</div>
								<div class="btn-group">
									<button v-for="(name, seconds) in forecasts" :key="name"
											:disabled="forecast === Number(seconds)"
											@click="forecast = Number(seconds)"
											class="btn btn-primary">{{name}}</button>
								</div>
							</div>
						</CollapsingCard>
					</div>

					<div class="accordion mb-3">
						<CollapsingCard header="Accounts" collapsed :badge="'' + (accounts.length - Object.keys(disabledAccounts).length)">
							<button v-for="account in accounts" :key="account.id"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledAccounts[account.id], 'btn-light': disabledAccounts[account.id]}"
									@click="toggleAccount(account.id)">{{account.name}}</button>
						</CollapsingCard>
						<CollapsingCard header="Services" collapsed :badge="'' + (services.length - Object.keys(disabledServices).length)">
							<button v-for="service in services" :key="service"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledServices[service], 'btn-light': disabledServices[service]}"
									@click="toggleService(service)">{{service}}</button>
						</CollapsingCard>
						<CollapsingCard header="Resource Types" collapsed :badge="'' + (kinds.length - Object.keys(disabledKinds).length)">
							<button v-for="kind in kinds" :key="kind"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledKinds[kind], 'btn-light': disabledKinds[kind]}"
									@click="toggleKind(kind)">{{kind}}</button>
						</CollapsingCard>
						<CollapsingCard header="Regions" collapsed :badge="'' + (regions.length - Object.keys(disabledRegions).length)">
							<button v-for="region in regions" :key="region"
									class="filter-option text-truncate mr-1 mb-1 btn"
									:class="{'btn-primary': !disabledRegions[region], 'btn-light': disabledRegions[region]}"
									@click="toggleRegion(region)">{{region}}</button>
						</CollapsingCard>
					</div>
				</div>
				<div class="col col-8 col-xl-9">
					<table class="table table-striped table-hover table-bordered">
						<thead>
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
										{{costFormat.format(forecast * resource.calculations[costIndex]['total'].subtotal1h)}}
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
						<h2 v-if="pagedResources.length === 0">No Resources Found</h2>
						<Pages v-else :page="page" :total="pageCount" @page="changePage" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Account } from '../store/accounts';
import { Resource } from '../store/resources';
import CollapsingCard from './CollapsingCard.vue';
import ga from '@/lib/google-analytics';
import Pages from './Pages.vue';

type SortOptions = 'account'|'service'|'kind'|'region'|'name'|'forecast';
type CostOptions = 'last'|'avg1h'|'avg1d'|'avg1w'

@Component({
	components: {
		CollapsingCard,
		Pages,
	},
})
export default class Resources extends Vue {
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
	costIndexes = {
		'last': 'Value',
		'avg1h': 'Hour',
		'avg1d': 'Day',
		'avg1w': 'Week',
	};

	forecast = 720;
	forecasts = {
		'1': '1 Hour',
		'24': '1 Day',
		'720': '30 Days',
	};

	disabledAccounts: {[id: string]: string} = {};
	disabledServices: {[id: string]: string} = {};
	disabledKinds: {[id: string]: string} = {};
	disabledRegions: {[id: string]: string} = {};

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
		ga.event('Resources', 'filter-account').send();
		this.toggle(id, this.disabledAccounts);
	}

	toggleService(id: string) {
		ga.event('Resources', 'filter-service').send();
		this.toggle(id, this.disabledServices);
	}

	toggleKind(id: string) {
		ga.event('Resources', 'filter-kind').send();
		this.toggle(id, this.disabledKinds);
	}

	toggleRegion(id: string) {
		ga.event('Resources', 'filter-region').send();
		this.toggle(id, this.disabledRegions);
	}

	changePage(newPage: number) {
		ga.event('Resources', 'switch-page').send();
		this.page = newPage;
		window.scrollTo(0, 0);
	}

	changePageSize(size: number) {
		ga.event('Resources', 'page-size').send();
		this.page = 0;
		this.pageSize = size;
	}

	changeSort(id: SortOptions) {
		ga.event('Resources', 'sort-' + id).send();
		if (id === this.sort) {
			this.sortAsc = !this.sortAsc;
		}
		else {
			this.sort = id;
			this.sortAsc = (id !== 'forecast');
		}
	}

	linkTrack(resource: Resource) {
		ga.event('Resources', 'link', [resource.region, resource.service].join(' ')).send();
	}
}
</script>

<style scoped lang="scss">
.filter-option {
	max-width: 100%;
}

th.sortable {
	transition: background-color 0.35s ease;
	cursor: pointer;

	&:hover {
		background-color: #aaa;
	}
}

.resource-error {
	max-width: 200px;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
</style>
