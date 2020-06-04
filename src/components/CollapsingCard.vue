<template>
	<div class="card">
		<div class="card-header" @click="toggle">
			<span class="mr-3">
				<i v-if="show" class="fas fa-minus align-middle"></i>
				<i v-else class="fas fa-plus align-middle"></i>
			</span>
			<strong>{{header}}</strong>
			<span v-if="badge" class="badge badge-pill badge-secondary ml-2">{{badge}}</span>
		</div>

		<div class="collapse" :class="{'show': show}">
			<div class="card-body">
				<slot></slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class CollapsingCard extends Vue {
	@Prop({type: String, required: true}) header!: string;
	@Prop({type: String}) badge!: string;
	@Prop({type: Boolean}) collapsed!: boolean;
	show: boolean = true;

	mounted(): void {
		this.show = !this.collapsed;
	}

	toggle(): void {
		this.show = !this.show;
	}
}
</script>

<style scoped lang="scss">
.card-header {
	cursor: pointer;
}
</style>
