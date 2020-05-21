<template>
	<div class="container mt-2 mb-2">
		<h1 class="text-center">Realtime AWS Cost Inventory</h1>
		<p>Tracking cloud inventory and costs in realtime isn't possible with any major cloud provider. There are a number of reasons for this.</p>
		<ul>
			<li>Your usage is elastic, including bandwidth, function invocations, IOPS, and more.</li>
			<li>Your credentials are widely distributed. Anyone can launch more resources at the drop of a hat.</li>
			<li>Your cloud footprint can easily extend beyond a single account at a single IaaS provider.</li>
			<li>The major cloud providers provide tooling to get billing forecasts and historical costs, but they always fall short of providing helpful information on pinpointing waste and reducing your bill. They don't support multiple accounts and definitely don't dive into resource-specific usage.</li>
		</ul>
		<p>
			This tool queries AWS for all your resources and usage, across all services and all regions,
			using IAM credentials supplied by you. This allows you to:
		</p>
		<ul>
			<li>Find the most costly resources in your account.</li>
			<li>Track inventory between regions and services.</li>
			<li>Project monthly costs based on instantaneous usage.</li>
			<li>Drill into specific resources and associated costs.</li>
		</ul>
		<p>Overall, it's a great way to see what the cloud providers don't want you to see - how to reduce your cloud spend.</p>

		<hr />

		<h1 class="text-center">Instructions</h1>
		<p>All this tool needs is your cloud credentials and a little bit of time to call APIs.</p>
		<p>
			You can enter your credentials on the "Accounts" tab. Once your credentials have been verified,
			the discovery process will begin automatically.
		</p>
		<p>While discovery is running, you can add more accounts, watch the progress, or leave and come back.</p>
		<p class="alert alert-danger"><strong>Don't close your browser!</strong></p>
		<p>This tool has no data persistence, so leave your browser open until all discovery and analysis is finished.</p>

		<hr />

		<h1 class="text-center">FAQ</h1>
		<p>
			If your question isn't here, check the
			<a href="https://github.com/bluematador/realtime-aws-cost-inventory" target="_blank">Github project</a>.
		</p>

		<h3>Does this tool cost money?</h3>
		<p>
			This tool is open source and totally free. There are no hosting costs, data costs, or usage costs
			associated with this tool. There may be costs associated with calling your cloud APIs for resource
			inventories and cost projections.
		</p>

		<h3>Where is my data stored?</h3>
		<p>
			By design, this tool does not store any data. The entire page is standalone, and doesn't transmit credentials or
			resource information to us.
		</p>
		<p>
			For convenience, you can opt-in to have a subset of your data stored in the following places:
		</p>
		<ul>
			<li><strong>Cloud Credentials</strong> may be stored as an encrypted cookie.</li>
			<li><strong>Email Address</strong> may be stored as a cookie and for future updates or marketing materials.</li>
		</ul>

		<h3>What happens if I close the browser?</h3>
		<p>
			When you close the browser, all data that hasn't been saved in cookies will be lost. Any in-progress API calls
			or aggregations will be cancelled, and you will need to restart the discovery process again.
		</p>

		<hr />

		<h1 class="text-center">Liability</h1>
		<p>Use this tool at your own risk, cost, and liability.</p>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component
export default class Instructions extends Vue {
}
</script>

<style scoped lang="scss">
</style>
