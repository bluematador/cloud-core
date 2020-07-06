<template>
	<div class="text-center">
		<div class="d-inline-block">
			<div class="btn-toolbar">
				<div class="btn-group ml-3 mr-3">
					<button type="button" class="btn btn-outline-primary" :disabled="page === 0" @click="clicker(0)">&lt;&lt;</button>
					<button type="button" class="btn btn-outline-primary" :disabled="page === 0" @click="clicker(page - 1)">&lt;</button>
				</div>
				<div class="btn-group ml-3 mr-3">
					<button v-for="index in pages" :key="index"
							@click="clicker(index)"
							type="button"
							class="btn"
							:class="{
								'btn-primary': page === index,
								'btn-outline-primary': page !== index,
							}">
						{{index + 1}}
					</button>
				</div>
				<div class="btn-group ml-3 mr-3">
					<button type="button" class="btn btn-outline-primary" :disabled="page === pages.length - 1" @click="clicker(page + 1)">&gt;</button>
					<button type="button" class="btn btn-outline-primary" :disabled="page === pages.length - 1" @click="clicker(pages.length - 1)">&gt;&gt;</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class Pages extends Vue {
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
