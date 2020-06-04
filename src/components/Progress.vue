<template>
	<div v-if="total > 0">
		<CollapsingCard header="Discovery Progress" :badge="done ? 'DONE' : undefined">
			<div class="container-fluid">
				<div class="row">
					<div class="col">
						Calls Made:
					</div>
					<div class="col text-right">
						<strong>{{done}} / {{total}}</strong>
					</div>
				</div>
				<div class="row">
					<div class="col">
						Errors:
					</div>
					<div class="col text-right">
						<strong>{{errors}}</strong>
					</div>
				</div>
			</div>
			<div class="progress mt-3 ml-2 mr-2">
				<div class="progress-bar"
						:class="{'progress-bar-striped': !allDone, 'progress-bar-animated': !allDone, 'bg-success': allDone}"
						:style="'width: ' + percentDone + '%'"></div>
			</div>
		</CollapsingCard>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import CollapsingCard from './CollapsingCard.vue';

@Component({
	components: {
		CollapsingCard,
	},
})
export default class Progress extends Vue {
	get done(): number {
		return this.$store.getters.overallProgress.done;
	}

	get total(): number {
		return this.$store.getters.overallProgress.total;
	}

	get errors(): number {
		return this.$store.getters.overallProgress.error;
	}

	get allDone(): boolean {
		return this.done === this.total;
	}

	get percentDone(): number {
		return 100 * this.done / this.total;
	}
}
</script>

<style scoped lang="scss">
@import '../bootstrap';

.card {
	border: 1px solid $dark;
}
.card-header {
	cursor: pointer;
}
.card-body {
	background-color: #aaa;
}
</style>
