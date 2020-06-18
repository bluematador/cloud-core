<template>
	<div class="container">
		<h1 class="text-center pt-2">Cloud CORE</h1>
		<div class="text-center">
			<strong>C</strong>ost <strong>O</strong>ptimization <strong>R</strong>esource <strong>E</strong>xplorer
		</div>

		<h3 class="mt-4">Instructions</h3>

		<div class="container-fluid">
			<div class="row">
				<div class="col col-12 col-lg-6">

					<p>To get a real-time snapshot of your AWS costs, do the following:</p>

					<ol>
						<li><strong>Connect your AWS accounts</strong> by entering your access and secret key under "Accounts".</li>
						<li><strong>Your browser will call the APIs</strong> in the background.</li>
						<li><strong>Browse your resource usage and costs</strong> under "Resources".</li>
					</ol>

					<h3 class="mt-4">Supported AWS Services</h3>
					<p>More coming soon - under active development</p>
					<ul>
						<li v-for="service in awsServices" :key="service">{{service}}</li>
					</ul>
				</div>
				<div class="col col-12 col-lg-6">
					<iframe width="560" height="315" src="https://www.youtube.com/embed/NHqnZRja7pM" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Info as ServiceInfo } from '@/lib/aws/services';

@Component
export default class Instructions extends Vue {
	get awsServices(): string[] {
		return ServiceInfo.map(i => i.name).sort();
	}
}
</script>

<style scoped lang="scss">
</style>
