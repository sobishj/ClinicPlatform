<script lang="ts">
	/** Chatbot widget — implemented in Phase 5 (provider: embed script or self-hosted endpoint). */
	interface Props {
		config: { provider: string; title: string; greeting: string; buttonLabel: string; hasEndpoint: boolean };
	}
	let { config: _config }: Props = $props();
</script>
