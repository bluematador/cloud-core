<template>
	<div id="app">
		<nav class="navbar navbar-expand navbar-dark bg-dark">
			<router-link to="/explorer" class="navbar-brand mr-5" title="Cloud Cost Optimization Resource Explorer">Cloud CORE</router-link>
			<ul class="navbar-nav mr-auto">
				<li class="nav-item">
					<router-link to="/explorer" class="nav-link">Explorer</router-link>
				</li>
				<li class="nav-item">
					<router-link to="/breakdown" class="nav-link">Breakdown</router-link>
				</li>
				<li class="nav-item">
					<router-link to="/about" class="nav-link">About</router-link>
				</li>
			</ul>
			<ul class="navbar-nav">
				<li class="nav-item">
					<a class="nav-link" href="https://www.bluematador.com/" @click="linkTracker('bluematador')" target="_blank">
						<i class="fas fa-external-link-alt"></i>
						Blue Matador
					</a>
				</li>
				<li class="nav-item">
					<a class="nav-link" href="https://github.com/bluematador/cloud-core" @click="linkTracker('github')" target="_blank">
						<i class="fab fa-github"></i>
						Github
					</a>
				</li>
			</ul>
		</nav>

		<div class="router-view">
			<router-view></router-view>
		</div>

		<footer class="text-center text-light p-3 bg-dark">
			&copy; 2020 Blue Matador, Inc.
		</footer>

		<div class="progress-floater d-none d-md-block">
			<Progress />
		</div>

		<ExitIntent />
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Analytics from '@/lib/google-analytics';
import ExitIntent from './components/ExitIntent.vue';
import Progress from './components/Progress.vue';

@Component({
	components: {
		ExitIntent,
		Progress,
	},
})
export default class App extends Vue {
	mounted(): void {
		this.$router.push('/');
	}

	private linkTracker(name: string): void {
		Analytics.event('link', name);
	}
}
</script>

<style lang="scss">
@import 'app';

#app {
	position: relative;
}

nav .nav-item {
	margin-right: 20px;
}

.router-view {
	min-height: calc(100vh - 56px - 56px);
}

.progress-floater {
	position: fixed;
	right: 3px; top: 59px;
	width: 400px;
}
</style>
