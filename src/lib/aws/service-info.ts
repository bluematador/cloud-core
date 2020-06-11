import Pricing from './pricing';

export interface ServiceInfo {
	readonly name: string
	readonly regions: string[]
	readonly caveats: string[]
	readonly pricing: Pricing
}

export const Global = 'global';

export default ServiceInfo;
