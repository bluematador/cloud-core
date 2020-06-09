<template>
	<div class="container">
		<h1 class="text-center pt-2">Cloud CORE</h1>
		<div class="text-center">
			<strong>C</strong>ost <strong>O</strong>ptimization <strong>R</strong>esource <strong>E</strong>xplorer
		</div>

		<h3 class="mt-4">Instructions</h3>

		<p>To get a real-time snapshot of your AWS costs, do the following:</p>

		<ol>
			<li><strong>Connect your AWS accounts</strong> by entering your access and secret key under "Accounts".</li>
			<li><strong>Your browser will call the APIs</strong> in the background.</li>
			<li><strong>Browse your resource usage and costs</strong> under "Resources".</li>
		</ol>

		<h3 class="mt-4">Supported AWS Services</h3>
		<ul>
			<li v-for="service in awsServices" :key="service">{{service}}</li>
		</ul>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { All as Services } from '@/lib/aws/services';

@Component
export default class Instructions extends Vue {
	get awsServices(): string[] {
		return Services.sortBy(a => a);
	}
}
</script>

<style scoped lang="scss">
</style>
