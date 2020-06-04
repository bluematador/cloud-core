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
	details: {[key: string]: Detail}
	tags: {[key: string]: string}
	error?: any
	calculations?: Calculations
}

export type Detail = string|number;
export type AggregationTimeframe = 'last'|'avg1h'|'avg1d'|'avg1w';
const aggregationTimeframes: AggregationTimeframe[] = ['last', 'avg1h', 'avg1d', 'avg1w'];

export interface Calculations {
	last: Calculation
	avg1h: Calculation
	avg1d: Calculation
	avg1w: Calculation
}

export interface Calculation {
	[item: string]: CalculationDetail
}

export interface CalculationDetail {
	usage: number // actual usage in the enclosing timeframe
	unit?: string
	rate: number // rate per usage
	subtotal: number // usage * rate
	subtotal1h: number // subtotal for 1 hour (normalized)
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

				if (payload.tags) {
					for (const key in payload.tags) {
						Vue.set(resource.tags, key, payload.tags[key]);
					}
				}

				if (payload.calculations) {
					Vue.set(resource, 'calculations', payload.calculations);
					if (!resource.calculations) { throw 'never'; }

					for (const time of aggregationTimeframes) {
						const items = resource.calculations[time];

						let subtotal = 0;
						let subtotal1h = 0;

						for (const item in items) {
							if (item === 'total') { continue; }

							subtotal += items[item].subtotal;
							subtotal1h += items[item].subtotal1h;
						}

						const totalItem: CalculationDetail = {
							usage: 0,
							rate: 0,
							subtotal,
							subtotal1h,
						};

						Vue.set(resource.calculations[time], 'total', totalItem);
					}
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
	details?: {[key: string]: Detail}
	tags?: {[key: string]: string}
	calculations?: Calculations
}
