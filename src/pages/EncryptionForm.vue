<template>
	<div>
		<h1 class="page-header">Set Encryption Key</h1>
		<EncryptionForm />
	</div>
</template>

<script lang="ts">
import { Component, Prop, Ref, Vue } from 'vue-property-decorator';
import Analytics from '@/lib/google-analytics';
import EncryptionForm from '@/components/EncryptionForm.vue';

@Component({
	components: {
		EncryptionForm,
	},
})
export default class EncryptionPage extends Vue {
}
</script>

<style scoped lang="scss">
</style>
