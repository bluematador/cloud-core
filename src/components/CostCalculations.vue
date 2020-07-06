<template>
	<CollapsingCard header="Cost Calculations">
		<div class="text-center">
			<div>Extrapolate costs from the last:</div>
			<div class="btn-group">
				<button v-for="(name, key) in costIndexes" :key="key"
						@click="setCostIndex(key)"
						class="btn"
						:class="{
							'btn-primary': costIndex === key,
							'btn-outline-primary': costIndex !== key,
						}">{{name}}</button>
			</div>
			<div class="mt-3 mb-3">
				<span style="border-top: 1px solid #ccc; border-bottom: 1px solid #ccc; padding: 3px 5px; font-size: 0.75rem;">and then</span>
			</div>
			<div>Forecast costs for:</div>
			<div class="btn-group">
				<button v-for="(name, seconds) in forecasts" :key="name"
						@click="setForecast(seconds)"
						class="btn"
						:class="{
							'btn-primary': forecast === Number(seconds),
							'btn-outline-primary': forecast !== Number(seconds),
						}">{{name}}</button>
			</div>
		</div>
	</CollapsingCard>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import CollapsingCard from './CollapsingCard.vue';

@Component({
	components: {
		CollapsingCard,
	},
})
export default class CostCalculations extends Vue {
	costIndex: string = 'avg1d';
	costIndexes = {
		'last': 'Value',
		'avg1h': 'Hour',
		'avg1d': 'Day',
		'avg1w': 'Week',
	};

	forecast: number = 720;
	forecasts = {
		'1': '1 Hour',
		'24': '1 Day',
		'720': '30 Days',
	};

	setCostIndex(value: string): void {
		this.costIndex = value;
		this.$emit('costIndex', this.costIndex);
	}

	setForecast(value: string): void {
		this.forecast = Number(value);
		this.$emit('forecast', this.forecast);
	}
}
</script>

<style scoped lang="scss">
</style>
