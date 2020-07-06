<template>
	<div>
		<h1 class="page-header">Breakdown</h1>

		<div class="container-fluid">
			<div class="row">
				<div class="col col-4 col-xl-3">
					<div class="mb-3">
						<AccountsCard disableToggle />
					</div>

					<div class="accordion mb-3">
						<CostCalculations @forecast="setForecast" @costIndex="setCostIndex" />
					</div>
				</div>

				<div class="col col-8 col-xl-9">
					<div v-if="!ready">
						<div class="text-center">
							<div class="spinner-border mb-3 mt-3" style="width: 2rem; height: 2rem;"></div><br />
							<h4>Breakdown will be ready once discovery is complete.</h4>
						</div>
					</div>
					<div v-else>
						<div class="bread">
							<div v-for="(filter, index) in filters" :key="filter.key" class="bread-group">
								<div class="bread-sep" v-if="index > 0">
									<i class="fas fa-angle-right"></i>
								</div>
								<div class="bread-item">
									<div class="name">
										<span v-if="index === (filters.length - 1)">{{filter.label}}</span>
										<a v-else href="#" @click.prevent="removeFiltersAfter(index)">{{filter.label}}</a>
									</div>
									<div class="cost">
										{{costFormat.format(costForFilter(index))}}
									</div>
									<div class="percent">
										{{percentFormat.format(percentForFilter(index))}}
									</div>
								</div>
							</div>
						</div>

						<div class="mb-4 text-center">
							<h3>Select Breakdown</h3>
							<div class="btn-group">
								<button v-for="key in graphKeys" :key="key"
										v-if="chartAvailable(key)"
										type="button"
										@click.prevent="selectGraph(key)"
										class="btn text-capitalize"
										:class="{
											'btn-primary': currentGraph === key,
											'btn-outline-primary': currentGraph !== key,
										}">{{key}}</button>
							</div>
						</div>

						<div class="row mb-4 mt-4">
							<div class="col col-12 col-lg-6">
								<div class="sticky-graph sticky-top">
									<canvas id='piechart'
											:makeshiftReload="loadChart(currentGraph)"
											@click="drilldown(currentGraph, $event)"
											width="100" height="100"></canvas>
								</div>
							</div>
							<div class="col col-12 col-lg-6">
								<table class="table table-striped table-hover table-bordered">
									<thead class="thead-light">
										<tr>
											<th width="50%" class="text-capitalize">{{currentGraph}}</th>
											<th width="25%">
												<i class="fas fa-caret-down"></i>
												Forecast
											</th>
											<th width="25%">Size</th>
										</tr>
									</thead>
									<tbody>
										<tr v-for="(data, index) in currentGraphChartData" :key="index">
											<td>
												<div class="d-inline-block"
														style="width:15px; height: 0.75rem;"
														:style="'background-color: ' + chartColor(index)">
												</div>
												{{data.label}}
											</td>
											<td><strong>{{costFormat.format(data.value)}}</strong></td>
											<td>{{percentFormat.format(data.value / costForFilter(filters.length-1))}}</td>
										</tr>
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import 'chartjs-plugin-colorschemes';
import AccountsCard from '@/components/AccountsCard.vue';
import Analytics from '@/lib/google-analytics';
import Chart from 'chart.js';
import CollapsingCard from '@/components/CollapsingCard.vue';
import CostCalculations from '@/components/CostCalculations.vue';
import { Component, Ref, Vue } from 'vue-property-decorator';
import { Resource } from '@/store/resources';

type CostOptions = 'last'|'avg1h'|'avg1d'|'avg1w';

// https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
const graphColorScheme = 'brewer.SetOne9';
const colors = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00', '#ffff33', '#a65628', '#f781bf', '#999999'];

@Component({
	components: {
		AccountsCard,
		CollapsingCard,
		CostCalculations,
	},
})
export default class Breakdown extends Vue {
	percentFormat = new Intl.NumberFormat(undefined, {
		style: 'percent',
		maximumSignificantDigits: 4,
	});
	costFormat = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 4,
	});

	filters: Filter[] = [{
		key: 'base',
		value: 'base',
		label: 'Total Spend',
	}];
	graphKeys = [
		'account',
		'service',
		'region',
		'kind',
		'resource',
		'calculations',
	];

	currentGraph: string = 'service';
	private chart!: Chart;

	costIndex: CostOptions = 'avg1d';
	forecast: number = 720;

	beforeMount(): void {
		if (!this.$store.direct.state.accounts.decrypted || this.$store.direct.state.accounts.all.length === 0) {
			this.$router.push('/');
		}
	}

	get ready(): boolean {
		const done = this.$store.direct.getters.overallProgress.done;
		const total = this.$store.direct.getters.overallProgress.total;
		return done > 0 && done === total;
	}

	chartColor(index: number): string {
		return colors[index % colors.length];
	}

	chartAvailable(option: string): boolean {
		const filteredByResource = this.filters.some(f => f.key === 'resource');
		const filteredByPassedOption = this.filters.some(f => f.key === option);

		if (option === 'resource') {
			return !filteredByPassedOption;
		}
		else if (option === 'calculations') {
			return filteredByResource;
		}
		else {
			return !filteredByPassedOption && !filteredByResource;
		}
	}

	selectGraph(value: string): void {
		Analytics.event('breakdown', 'show-graph-' + value);
		this.currentGraph = value;
	}

	setCostIndex(value: CostOptions): void {
		Analytics.event('breakdown', 'cost-index-' + value);
		this.costIndex = value;
	}

	setForecast(value: number): void {
		Analytics.event('breakdown', 'forecast-' + value);
		this.forecast = value;
	}

	removeFiltersAfter(index: number): void {
		Analytics.event('breakdown', 'filter-remove');
		this.filters.splice(index + 1, this.filters.length - index);
		this.ensureGraphSelected();
	}

	costForFilter(index: number): number {
		return this.filterResources(this.filters.slice(0, index + 1))
				.map(r => this.projectedCostForResource(r))
				.sum();
	}

	percentForFilter(index: number): number {
		const total = this.costForFilter(0);
		if (total <= 0) {
			return 0;
		}

		return this.costForFilter(index) / total;
	}

	private filterResources(filters: Filter[]): Resource[] {
		const effectiveFilters = filters.filter(f => f.key !== 'base');

		return this.allResources.filter(r => {
			return r.calculations !== undefined;
		}).filter(r => {
			return effectiveFilters.every(f => {
				if (f.key === 'account') {
					return f.value === r.accountId;
				}
				else if (f.key === 'service') {
					return f.value === r.service;
				}
				else if (f.key === 'region') {
					return f.value === r.region;
				}
				else if (f.key === 'kind') {
					return f.value === r.kind;
				}
				else if (f.key === 'resource') {
					return f.value === r.id;
				}

				throw 'invalid filter';
			});
		});
	}

	private get allResources(): Resource[] {
		return this.$store.direct.state.resources.all;
	}

	get filteredResources(): Resource[] {
		return this.filterResources(this.filters);
	}

	get currentGraphChartData(): ChartData {
		return this.chartData(this.currentGraph);
	}

	private chartData(key: string): ChartData {
		if (key === 'calculations') {
			if (this.filteredResources.length !== 1) {
				throw 'cannot show calculations chart with > 1 resources';
			}

			const resource = this.filteredResources[0];
			if (resource.calculations === undefined) { throw 'no calculations for this resource.'; }

			const calculations = resource.calculations[this.costIndex];
			const keys = Object.keys(calculations).filter(k => k !== 'total');
			return keys.map(key => {
				return {
					id: key,
					label: key,
					value: calculations[key].subtotal1h * this.forecast,
				};
			}).sortNumBy(e => e.value).reverse();
		}
		else {
			return [...this.filteredResources.groupBy(r => {
				if (key === 'account') { return r.accountId; }
				if (key === 'service') { return r.service; }
				if (key === 'region') { return r.region; }
				if (key === 'kind') { return r.kind; }
				if (key === 'resource') { return r.id; }
				throw 'not supported';
			}).entries()].map(([group, resources]) => {
				let id = group;
				let label = group;
				if (key === 'account') {
					label = this.accountName(group);
				}
				else if (key === 'resource') {
					id = resources[0].id;
					label = resources[0].name;
				}

				const value = resources.map(r => this.projectedCostForResource(r)).sum();

				return {
					id,
					label,
					value,
				};
			}).sortNumBy(d => d.value).reverse();
		}
	}

	private projectedCostForResource(r: Resource): number {
		if (r.calculations === undefined) { return 0; }
		return r.calculations[this.costIndex].total.subtotal1h * this.forecast;
	}

	private loadChart(key: string): void {
		const data = this.chartData(key);
		const dataset = data.map(d => d.value);
		const labels = data.map(d => d.label);

		// the canvas elements won't be available until the next tick
		this.$nextTick(() => {
			const me = this;

			if (this.chart !== undefined) {
				// i tried updating the chart, but
				// 1) we're completely changing every datapoint anyway
				// 2) it doesn't work for some reason
				this.chart.destroy();
			}

			this.chart = new Chart('piechart', {
				type: 'pie',
				data: {
					datasets: [{
						data: dataset,
					}],
					labels: labels,
				},
				options: {
					legend: {
						display: false,
					},
					hover: {
						onHover: function(e) {
							const point = this.getElementAtEvent(e);

							if (!e.target) { return; }
							const target = (e.target as HTMLElement);

							target.style.cursor = point.length ? 'pointer' : 'default';
						},
					},
					tooltips: {
						callbacks: {
							title: (_1, _2) => {
								return key;
							},
							label: (tooltipItem, _) => {
								if (tooltipItem.index === undefined) {
									return '';
								}

								const index = tooltipItem.index;
								return labels[index];
							},
							afterLabel: (tooltipItem, _2) => {
								if (tooltipItem.index === undefined) {
									return '';
								}

								const index = tooltipItem.index;
								const value = dataset[index]

								return [
									me.costFormat.format(value),
									'',
									...me.filters.map((filter, index) => {
										const total = me.costForFilter(index);
										const percent = total <= 0 ? 0 : (value / total);
										const formatted = me.percentFormat.format(percent);
										return `${formatted} ~ ${filter.label}`;
									}),
								];
							},
						},
					},
					plugins: {
						colorschemes: {
							scheme: graphColorScheme,
						},
					},
				},
			});
		});
	}

	private accountName(id: string): string {
		const one = this.$store.direct.state.accounts.all.find(a => a.id === id);
		if (!one) { throw 'liar'; }
		return one.name;
	}

	drilldown(key: string, event: Event): void {
		if (key === 'calculations') {
			// can't drill into calculations
			return;
		}

		Analytics.event('breakdown', 'filter-' + key);

		const elements = this.chart.getElementsAtEvent(event);
		if (elements.length > 0) {
			const element = (elements[0] as any);
			if (element._index !== undefined) {
				const data = this.chartData(key);
				const selectedDatum = data[element._index];

				this.filters.push({
					key,
					value: selectedDatum.id,
					label: selectedDatum.label,
				});
			}
		}

		this.ensureGraphSelected();
	}

	private ensureGraphSelected(): void {
		if (!this.chartAvailable(this.currentGraph)) {
			let selectedNewGraph = false;
			this.graphKeys.forEach(key => {
				if (!selectedNewGraph && this.chartAvailable(key)) {
					selectedNewGraph = true;
					this.currentGraph = key;
				}
			});
		}
	}
}

interface Filter {
	key: string
	value: string
	label: string
}
interface ChartDatum {
	id: string
	value: number
	label: string
}
type ChartData = ChartDatum[]
</script>

<style scoped lang="scss">
@import '../variables';

// based on bootstrap's breadcrumb, but must be multi-line
.bread {
	background-color: $table-head-bg;
	padding: $breadcrumb-padding-y $breadcrumb-padding-x;
	margin-bottom: $breadcrumb-margin-bottom;
	border-radius: $breadcrumb-border-radius;
	border: 1px solid $table-border-color;
	color: $body-color;

	.bread-group {
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: flex-start;
		align-items: center;
		display: inline-flex;
		vertical-align: top;
	}

	.bread-sep, .bread-item {
		margin-right: 30px;
	}

	.bread-sep {
		font-size: 2rem;
		display: inline-block;
	}

	.bread-item {
		display: inline-block;
		text-align: center;

		.name {
			font-weight: bold;
			max-width: 200px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.cost, .percent {
			font-size: 0.8rem;
		}
	}
}
</style>
