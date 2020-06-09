<template>
	<div class="container">
		<h1 class="p-2">FAQ</h1>
		<h3 class="mt-4 mb-3">Does this tool cost money?</h3>
		<p>
			No, <strong>this tool is completely free.</strong>
			There are no hosting costs, subscriptions, or gotchas associated with this tool.
			Your cloud provider may charge based on API calls, but the tool itself is free.
		</p>

		<h3 class="mt-4">Where is my data stored?</h3>
		<p>Resource and queried data is not stored at all.</p>
		<p>Credentials are stored in your browser (local storage and cookies), but only if you choose to store them by specifying an encryption key.</p>

		<h3 class="mt-4">What happens if I close my browser?</h3>
		<p>
			When the browser closes, all your resource data is lost, and only the encrypted local storage remains.
			The discovery process must restart when you come back.
		</p>

		<h3 class="mt-4">Who made this tool?</h3>
		<p>Blue Matador made Cloud CORE to help engineers understand cloud costs at a more granular level.</p>
		<p>
			Our main product is an <a href="https://www.bluematador.com/" target="_blank">infrastructure monitoring tool</a> that uses machine learning
			to automatically monitor your cloud infrastructure. Check it out!
		</p>
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
