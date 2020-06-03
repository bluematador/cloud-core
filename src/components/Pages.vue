<template>
	<div class="text-center">
		<div class="d-inline-block">
			<div class="btn-toolbar">
				<div class="btn-group ml-3 mr-3">
					<button type="button" class="btn btn-primary" :disabled="page === 0" @click="clicker(page - 1)">Prev</button>
				</div>
				<div class="btn-group ml-3 mr-3">
					<button v-if="!pages.includes(0)"
							:disabled="page === 0"
							@click="clicker(0)"
							type="button" class="btn btn-primary">1</button>

					<button v-if="!pages.includes(1) && pages.length > 2"
							disabled
							type="button" class="btn btn-light">...</button>

					<button v-for="index in pages" :key="index"
							:disabled="index === page"
							@click="clicker(index)"
							type="button" class="btn btn-primary">{{index + 1}}</button>

					<button v-if="!pages.includes(total - 2) && pages.length > 2"
							disabled
							type="button" class="btn btn-light">...</button>

					<button v-if="!pages.includes(total - 1)"
							:disabled="page === total - 1"
							@click="clicker(total - 1)"
							type="button" class="btn btn-primary">{{total}}</button>
				</div>
				<div class="btn-group ml-3 mr-3">
					<button type="button" class="btn btn-primary" :disabled="page === total - 1" @click="clicker(page + 1)">Next</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Resources extends Vue {
	@Prop({type: Number, required: true}) page!: number;
	@Prop({type: Number, required: true}) total!: number;

	clicker(index: number) {
		this.$emit('page', index);
	}

	get pages(): number[] {
		const ret: number[] = [];
		for (let offset = -3; offset <= 3; offset++) {
			const index = this.page + offset;
			if (index >= 0 && index < this.total) {
				ret.push(index);
			}
		}

		return ret;
	}
}
</script>

<style scoped lang="scss">
</style>
