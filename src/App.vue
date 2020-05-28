<template>
	<div id="app">
		<nav class="navbar navbar-expand navbar-dark bg-dark">
			<div class="navbar-brand mr-5">AWS Cost Inventory</div>
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
						<a class="dropdown-item" href="https://github.com/bluematador/realtime-aws-cost-inventory" target="_blank">
							<i class="fas fa-external-link-alt"></i>
							Source (Github)
						</a>
						<a class="dropdown-item" href="https://www.bluematador.com/" target="_blank">
							<i class="fas fa-external-link-alt"></i>
							Blue Matador
						</a>
					</div>
				</li>
			</ul>
		</nav>

		<div class="main pb-5">
			<Instructions v-if="view === 'instructions'" />
			<Accounts v-if="view === 'accounts'" />
			<Resources v-if="view === 'resources'" />
		</div>

		<footer class="text-center text-light p-3 bg-dark">
			&copy; 2020 Blue Matador, Inc.
		</footer>
	</div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import Accounts from './components/Accounts.vue';
import Instructions from './components/Instructions.vue';
import Resources from './components/Resources.vue';

type View = 'accounts' | 'resources' | 'instructions';
type Dropdown = '' | 'about';

@Component({
	components: {
		Accounts,
		Instructions,
		Resources,
	},
})
export default class App extends Vue {
	private view: View = 'instructions';
	private dropdown: Dropdown = '';

	mounted(): void {
		document.addEventListener('click', this.rootClicked);

		if (!this.$store.direct.state.credentials.decrypted) {
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
		this.dropdown = '';
		this.view = ref;
	}
}
</script>

<style lang="scss">
@import 'bootstrap';
@import 'fontawesome';

nav .nav-item {
	margin-right: 20px;
}
.main {
	min-height: calc(100vh - 56px - 56px);
}

button i {
	margin-right: 8px;
}
</style>
