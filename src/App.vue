<template>
	<div id="app">
		<nav class="navbar navbar-expand navbar-dark bg-dark">
			<div class="navbar-brand mr-5">
				<span title="Cloud Cost Optimization Resource Explorer">Cloud CORE</span>
			</div>
			<ul class="navbar-nav">
				<li class="nav-item">
					<a href="#" @click.stop.prevent="navigate('accounts')" :class="{'nav-link': true, 'active': view === 'accounts'}">
						Accounts
					</a>
				</li>
				<li class="nav-item">
					<a href="#" @click.stop.prevent="navigate('resources')" :class="{'nav-link': true, 'active': view === 'resources'}">
						Resources
					</a>
				</li>
				<li class="nav-item dropdown">
					<a href="#" @click.stop.prevent="drop('about')" :class="'nav-link dropdown-toggle ' + (['faq', 'instructions'].includes(view) ? 'active' : '')">
						About
					</a>
					<div :class="'dropdown-menu '  + (dropdown === 'about' ? 'show' : '')">
						<a :class="'dropdown-item ' + (view === 'instructions' ? 'active' : '')" href="#" @click.stop.prevent="navigate('instructions')">
							Instructions
						</a>
						<a :class="'dropdown-item ' + (view === 'faq' ? 'active' : '')" href="#" @click.stop.prevent="navigate('faq')">
							FAQ
						</a>
						<a class="dropdown-item" href="https://www.bluematador.com/" @click="linkTracker('bluematador')" target="_blank">
							<i class="fas fa-external-link-alt"></i>
							Blue Matador
						</a>
						<a class="dropdown-item" href="https://github.com/bluematador/realtime-aws-cost-inventory" @click="linkTracker('github')" target="_blank">
							<i class="fas fa-external-link-alt"></i>
							Source (Github)
						</a>
						<a class="dropdown-item" href="https://github.com/bluematador/realtime-aws-cost-inventory/issues" @click="linkTracker('issues')" target="_blank">
							<i class="fas fa-external-link-alt"></i>
							Issue Tracker
						</a>
					</div>
				</li>
			</ul>
		</nav>

		<div class="main pb-5">
			<Instructions v-if="view === 'instructions'" />
			<Faq v-if="view === 'faq'" />
			<Accounts v-if="view === 'accounts'" />
			<Resources v-if="view === 'resources'" />
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
import Accounts from './components/Accounts.vue';
import ExitIntent from './components/ExitIntent.vue';
import Faq from './components/Faq.vue';
import ga, { host as gaHost } from '@/lib/google-analytics';
import Instructions from './components/Instructions.vue';
import Progress from './components/Progress.vue';
import Resources from './components/Resources.vue';
import { Component, Vue } from 'vue-property-decorator';

type View = 'accounts' | 'faq' | 'resources' | 'instructions';
type Dropdown = '' | 'about';

@Component({
	components: {
		Accounts,
		ExitIntent,
		Faq,
		Instructions,
		Progress,
		Resources,
	},
})
export default class App extends Vue {
	private view: View = 'instructions';
	private dropdown: Dropdown = '';

	mounted(): void {
		document.addEventListener('click', this.rootClicked);

		if (!this.$store.direct.state.accounts.decrypted) {
			this.view = 'accounts';
		}
	}

	beforeDestroy(): void {
		document.removeEventListener('click', this.rootClicked);
	}

	private rootClicked(): void {
		if (this.dropdown) {
			this.dropdown = '';
		}
	}

	private drop(ref: Dropdown): void {
		this.dropdown = ref;
	}

	private navigate(ref: View): void {
		ga.pageview(window.location.pathname + ref, gaHost).send();
		this.dropdown = '';
		this.view = ref;
	}

	private linkTracker(name: string): void {
		ga.event('Link', name).send();
	}
}
</script>

<style lang="scss">
@import 'bootstrap';
@import 'fontawesome';

#app {
	position: relative;
}

nav .nav-item {
	margin-right: 20px;
}
.main {
	min-height: calc(100vh - 56px - 56px);
}

button i {
	margin-right: 8px;
}

.progress-floater {
	position: fixed;
	left: 10px; bottom: 3px;
	width: 300px;
}
</style>
