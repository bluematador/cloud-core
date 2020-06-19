import About from '@/pages/About.vue';
import AccountForm from '@/pages/AccountForm.vue';
import Accounts from '@/pages/Accounts.vue';
import Analytics from '@/lib/google-analytics';
import Onboarding from '@/pages/Onboarding.vue';
import EncryptionForm from '@/pages/EncryptionForm.vue';
import Explorer from '@/pages/Explorer.vue';
import Vue from 'vue';
import VueRouter from 'vue-router';

Vue.use(VueRouter);

const router = new VueRouter({
	mode: 'abstract',
	linkActiveClass: 'active',
	linkExactActiveClass: 'active',
	routes: [{
		path: '/',
		component: Onboarding,
	}, {
		path: '/explorer',
		component: Explorer,
	}, {
		path: '/encrypt',
		component: EncryptionForm,
	}, {
		path: '/accounts',
		component: Accounts,
	}, {
		path: '/accounts/edit/:id',
		component: AccountForm,
	}, {
		path: '/accounts/add',
		component: AccountForm,
	}, {
		path: '/about',
		component: About,
	}],
});

router.afterEach((to, _) => {
	// record a pageview
	const base = window.location.pathname.replace(/\/$/, '');
	const url = base + to.fullPath;
	Analytics.pageview(url);

	// scroll to the top of the page. must be done in the next loop
	setTimeout(() => {
		window.scrollTo(0, 0);
	}, 1);
});

export default router;
