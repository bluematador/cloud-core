import './prototypes';
import Vue from 'vue';
import VueRouter from 'vue-router';
import App from './App.vue';
import store from './store';
import router from './router';
import './lib/google-analytics';

Vue.config.productionTip = false;

new Vue({
	router,
	store: store.original,
	render: h => h(App)
}).$mount('#app')
