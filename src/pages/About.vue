<template>
	<div>
		<h1 class="page-header">About Cloud CORE</h1>

		<div class="container">
			<div class="container-fluid">
				<div class="row">
					<div class="col col-12 col-lg-6">
						<p style="font-size: 1.25rem;">
							<strong>C</strong>ost<br />
							<strong>O</strong>ptimization<br />
							<strong>R</strong>esource<br />
							<strong>E</strong>xplorer<br />
						</p>

						<p>Cloud CORE shows realtime, resource-specific costs from AWS accounts.</p>

						<p>This is a free and open source tool built by Blue Matador to help the community of engineers and devops using Amazon Web Services</p>

						<h3 class="mt-4">Security</h3>
						<p>AWS credentials are highly sensitive. Here's how we maintain their security.</p>

						<ul>
							<li>Your credentials are never transmitted anywhere. The API calls only require a signature, so the credentials aren't even sent to AWS.</li>
							<li>If you choose to store your credentials, they are encrypted using 256bit AES encryption with 1000 iterations.</li>
							<li>The encryption key is never stored or transmitted. Only you know the key.</li>
							<li>Your resource data is never stored or transmitted.</li>
							<li>This page is served over TLS.</li>
							<li>This hosted version is hosted and served using S3 and Cloudfront. There is no backend server to store information on.</li>
						</ul>
					</div>
					<div class="col col-12 col-lg-6">
						<ExplainerVideo />
					</div>
				</div>
				<div class="row">
					<div class="col col-12">
						<h3 class="mt-4">Supported AWS Services</h3>
						<p>More coming soon - under active development</p>
						<ul>
							<li v-for="service in awsServices" :key="service">{{service}}</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { Info as ServiceInfo } from '@/lib/aws/services';
import ExplainerVideo from '@/components/ExplainerVideo.vue';

@Component({
	components: {
		ExplainerVideo,
	},
})
export default class About extends Vue {
	get awsServices(): string[] {
		return ServiceInfo.map(i => i.name).sort();
	}
}
</script>

<style scoped lang="scss">
</style>
