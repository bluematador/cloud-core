import { defineModule } from "direct-vuex"
import { moduleActionContext, moduleGetterContext } from "./index"
import Vue from "vue"

export interface ResourcesState {
	all: Resource[]
}

export interface Resource {
	id: string
	accountId: string
	name: string
	service: string
	region: string
	url: string
	details: {[key: string]: string}
	costs?: Costs
}

export interface Costs {
	last: Breakdown
	avg1h: Breakdown
	avg1d: Breakdown
	avg1w: Breakdown
}

export interface Breakdown {
	total: number
	[key: string]: number
}

const mod = defineModule({
	strict: process.env.NODE_ENV !== 'production',
	state: (): ResourcesState => {
		return {
			all: [],
		};
	},
	getters: {},
	mutations: {
		addResources(state, resources: Resource[]): void {
			for (const resource of resources) {
				Vue.set(state.all, state.all.length, resource);
			}
		},
		upsertDetails(state, payload: UpsertDetailsPayload): void {
			const item = state.all.find(r => r.id === payload.id);
			if (item) {
				Vue.set(item, 'details', payload.details);
			}
		},
		upsertCosts(state, payload: UpsertCostsPayload): void {
			const item = state.all.find(r => r.id === payload.id);
			if (item) {
				Vue.set(item, 'costs', payload.costs);
			}
		},
		deleteAccountResources(state, accountId: string): void {
			// reverse order so indices don't change
			for (let i = state.all.length - 1; i >= 0; i--) {
				const one = state.all[i];
				if (one.accountId === accountId) {
					state.all.splice(i, 1);
				}
			}
		},
	},
	actions: {},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)

interface UpsertDetailsPayload {
	id: string
	details: {[key: string]: string}
}

interface UpsertCostsPayload {
	id: string
	costs?: Costs
}
