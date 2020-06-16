<template>
	<div class="modal-bg" :class="{'show': show}" @mousedown="close()">
		<div class="modal">
			<div class="modal-dialog">
				<div class="modal-content" @mousedown.stop="">
					<div class="modal-header">
						<h5 class="modal-title">Like Cloud CORE?</h5>
						<button type="button" class="close" @click.stop="close()">
							<span>&times;</span>
						</button>
					</div>
					<div class="modal-body">
						<div id="exit-form-target"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts">
import Cookies from 'js-cookie';
import ga from '@/lib/google-analytics';
import { Component, Vue } from 'vue-property-decorator';

const formId = '973bffb2-729a-44c8-ab03-5a4d91856daf';
const portalId = '3917309';
const cookie = 'exit-intent';

@Component
export default class ExitIntent extends Vue {
	private show: boolean = false;
	private shown: boolean = false;
	private submitted: boolean = Cookies.get(cookie) === '1';

	mounted(): void {
		document.addEventListener('mouseout', this.mouseout);
		window.addEventListener('message', this.hubspotFormCallbacks);

		this.manageHubspotForm();
	}

	private manageHubspotForm(): void {
		const w: any = window;
		const createHubspotForm = () => {
			w.hbspt.forms.create({
				portalId,
				formId,
				target: "#exit-form-target",
			});
		}

		if (w.hbspt && w.hbspt.forms) {
			createHubspotForm();
		}
		else {
			window.addEventListener("load", () => {
				createHubspotForm();
			}, {once: true});
		}
	}

	private hubspotFormCallbacks(event: any): void {
		// https://developers.hubspot.com/global-form-events
		if(event.data.type === 'hsFormCallback' && event.data.eventName === 'onFormSubmitted' && event.data.id === formId) {
			ga.event('ExitIntent', 'submit').send();
			this.submitted = true;
			Cookies.set(cookie, '1');

			setTimeout(() => {
				this.show = false;
			}, 1000);
		}
	}

	beforeDestroy(): void {
		document.removeEventListener('mouseout', this.mouseout);
		window.removeEventListener('message', this.hubspotFormCallbacks)
	}

	close(): void {
		ga.event('ExitIntent', 'close').send();
		this.show = false;
	}

	private mouseout(event: any): void {
		if (event.toElement == null && event.relatedTarget == null ) {
			if (!this.submitted && !this.shown && process.env.NODE_ENV === 'production') {
				ga.event('ExitIntent', 'show').send();
				this.show = true;
				this.shown = true;
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.modal-bg {
	position: absolute;
	top: 0; left: 0; bottom: 0; right: 0;
	transition: background-color 0.35s ease;
	background-color: #fff;
	display: none;

	&.show {
		display: block;
		background-color: rgba(0, 0, 0, 0.8);
	}

	.modal {
		display: block;
	}
}
</style>
