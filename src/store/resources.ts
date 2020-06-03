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
	details: {[key: string]: string|number}
	error?: any

	/* actual usage in the specified timeframe */
	usage: {
		[key: string]: UsageBreakdown
	}

	/* $/hr, extrapolated from the timeframe */
	costs: {
		[key: string]: Breakdown
	}
}

export interface Breakdown {
	last: number
	avg1h: number
	avg1d: number
	avg1w: number
}

export type UsageBreakdown = Breakdown & { unit?: string }

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
		updateResource(state, payload: UpdatePayload): void {
			const resource = state.all.find(r => r.id === payload.id);
			if (resource !== undefined) {
				if ('error' in payload) {
					Vue.set(resource, 'error', payload.error);
				}

				if (payload.details) {
					for (const key in payload.details) {
						Vue.set(resource.details, key, payload.details[key]);
					}
				}

				if (payload.usage) {
					for (const key in payload.usage) {
						Vue.set(resource.usage, key, payload.usage[key]);
					}
				}

				if (payload.costs) {
					for (const key in payload.usage) {
						if (key === 'total') {
							throw 'resource total is updated automatically';
						}

						Vue.set(resource.costs, key, payload.costs[key]);
					}

					const total: Breakdown = {
						last: 0,
						avg1h: 0,
						avg1d: 0,
						avg1w: 0,
					};

					for (const key in resource.costs) {
						if (key !== 'total') {
							total.last += resource.costs[key].last;
							total.avg1h += resource.costs[key].avg1h;
							total.avg1d += resource.costs[key].avg1d;
							total.avg1w += resource.costs[key].avg1w;
						}
					}

					Vue.set(resource.costs, 'total', total);
				}
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

interface UpdatePayload {
	id: string
	error?: any
	details?: {[key: string]: number|string}
	usage?: {[key: string]: UsageBreakdown}
	costs?: {[key: string]: Breakdown}
}
