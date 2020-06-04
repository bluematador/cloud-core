import { defineModule } from "direct-vuex"
import { moduleActionContext, moduleGetterContext } from "./index"
import Vue from "vue"
import AWSDiscoveryManager from '../lib/aws/manager';

export interface ProgressState {
	all: {[id: string]: Progress};
}

export interface Progress {
	done: number
	total: number
	error: number
}

const mod = defineModule({
	strict: process.env.NODE_ENV !== 'production',
	state: (): ProgressState => {
		return {
			all: {},
		};
	},
	getters: {
		overallProgress(...args): Progress {
			const { state } = modGetterContext(args);

			const overall: Progress = {
				done: 0,
				total: 0,
				error: 0,
			};

			Object.values(state.all).forEach(p => {
				overall.done += p.done;
				overall.total += p.total;
				overall.error += p.error;
			});

			return overall;
		},
	},
	mutations: {
		upsertProgress(state, payload: UpsertPayload): void {
			if (!(payload.id in state.all)) {
				window.setTimeout(updateProgress, 1);
			}

			Vue.set(state.all, payload.id, {
				done: payload.done,
				total: payload.total,
				error: payload.error,
			});
		},
		deleteProgress(state, id: string): void {
			Vue.delete(state.all, id);
		},
	},
	actions: {},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)

interface UpsertPayload extends Progress {
	id: string
}

function updateProgress() {
	if (updateProgressTimer) {
		window.clearTimeout(updateProgressTimer);
	}

	const working = AWSDiscoveryManager.values().map(a => {
		const progress = a.updateProgress();
		return a.running || progress.total === 0;
	}).some(w => w);

	const timeout = working ? 500 : 10000;
	updateProgressTimer = window.setTimeout(updateProgress, timeout);
}

let updateProgressTimer: number = window.setTimeout(updateProgress, 1000);
