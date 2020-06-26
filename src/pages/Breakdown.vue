<template>
	<div>
		<h1 class="p-2">Breakdown</h1>

		<div class="container-fluid">
			<div class="row">
				<div class="col col-4 col-xl-3">
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

						<div class="row">
							<div v-for="key in graphKeys" :key="key"
									v-if="showChart(key)"
									class="col col-12 col-lg-6 text-center pb-3">
								<h4 class="graph-header">By {{key}}</h4>
								<div :id="'container-' + key" class="chart-container w-100">
									<canvas :id="canvasIdForKey(key)"
											:makeshiftReload="loadChart(key)"
											@click="drilldown(key, $event)"
											width="100" height="150"></canvas>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Analytics from '@/lib/google-analytics';
import Chart from 'chart.js';
import CollapsingCard from '@/components/CollapsingCard.vue';
import CostCalculations from '@/components/CostCalculations.vue';
import { Component, Ref, Vue } from 'vue-property-decorator';
import { Resource } from '@/store/resources';
import 'chartjs-plugin-colorschemes';

type CostOptions = 'last'|'avg1h'|'avg1d'|'avg1w';

@Component({
	components: {
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

	private charts: {[key: string]: Chart} = {};

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

	showChart(option: string): boolean {
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
		const canvasId = this.canvasIdForKey(key);
		const dataset = data.map(d => d.value);
		const labels = data.map(d => d.label);

		// the canvas elements won't be available until the next tick
		this.$nextTick(() => {
			const me = this;

			if (key in this.charts) {
				// i tried updating the chart, but
				// 1) we're completely changing every datapoint anyway
				// 2) it doesn't work for some reason
				this.charts[key].destroy();
				delete this.charts[key];
			}

			this.charts[key] = new Chart(canvasId, {
				type: 'pie',
				data: {
					datasets: [{
						data: dataset,
					}],
					labels: labels,
				},
				options: {
					legend: {
						position: 'top',
						labels: {
							filter: (legendItem, _) => {
								// the number of elements shown impacts space available for the graph,
								// and can also cause confusion because of repeating colors.
								return legendItem.index !== undefined && legendItem.index < 9;
							},
						},
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
							// https://nagix.github.io/chartjs-plugin-colorschemes/colorchart.html
							scheme: 'brewer.SetOne9',
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

	private canvasIdForKey(key: string): string {
		return 'graph-' + key;
	}

	drilldown(key: string, event: Event): void {
		if (key === 'calculations') {
			// can't drill into calculations
			return;
		}

		Analytics.event('breakdown', 'filter-' + key);

		const chart = this.charts[key];
		const elements = chart.getElementsAtEvent(event);
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

.graph-header {
	text-transform: capitalize;
}

// based on bootstrap's breadcrumb, but must be multi-line
.bread {
	background-color: $breadcrumb-bg;
	padding: $breadcrumb-padding-y $breadcrumb-padding-x;
	margin-bottom: $breadcrumb-margin-bottom;
	border-radius: $breadcrumb-border-radius;

	.bread-group {
		flex-direction: row;
		flex-wrap: nowrap;
		justify-content: flex-start;
		align-items: center;
		display: inline-flex;
		vertical-align: top;
	}

	.bread-sep {
		margin-left: 15px;
		font-size: 2rem;
		display: inline-block;
	}

	.bread-item {
		margin-left: 15px;
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
