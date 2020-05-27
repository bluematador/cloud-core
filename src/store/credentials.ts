import { defineModule } from "direct-vuex"
import { moduleActionContext, moduleGetterContext } from "./index"

export interface CredentialsState {
	all: Credential[]
}

export interface Credential {
	id: string
	name: string
	access: string
	secret: string
	enabled: boolean
	error: string|undefined
}

const mod = defineModule({
	state: (): CredentialsState => {
		return {
			all: [],
		};
	},
	getters: {},
	mutations: {
		upsertCredential(state, cred: Credential) {
			const found = state.all.findIndex(c => c.id === cred.id);
			const index = (found === -1 ? state.all.length : found);
			state.all.splice(index, 1, cred);
		},
		removeCredential(state, id: string) {
			const index = state.all.findIndex(c => c.id === id);
			if (index !== -1) {
				state.all.splice(index, 1);
			}
		},
	},
	actions: {},
})

export default mod;
const modGetterContext = (args: [any, any, any, any]) => moduleGetterContext(args, mod)
const modActionContext = (context: any) => moduleActionContext(context, mod)
