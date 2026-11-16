<script lang="ts">
	// A recovery sheet that actually tells you what to copy when something breaks.
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import IconContentCopy from '~icons/material-symbols/content-copy-rounded';
	import IconCheck from '~icons/material-symbols/check-rounded';
	import IconWiCloud from '~icons/material-symbols/cloud-off-outline-rounded';

	let { error, status, data }: {
		error?: App.Error & { message?: string };
		status: number;
		data: { requestId?: string };
	} = $props();

	const requestId = $derived(error?.requestId ?? data.requestId ?? 'not reported');
	const hint = $derived(
		error?.hint ??
			(status === 404 ? 'That page does not exist.' : 'An unexpected server error occurred.')
	);
	const title = $derived(status === 404 ? 'Page not found' : 'Something went wrong');
	const titleId = 'error-title';
	let copied = $state(false);

	const details = $derived(
		[
			`status: ${status}`,
			`path: ${typeof window === 'undefined' ? '' : page.url.pathname}`,
			`request: ${requestId}`,
			`time: ${new Date().toISOString()}`
		].join('\n')
	);

	async function copyDetails() {
		try {
			await navigator.clipboard.writeText(details);
			copied = true;
			setTimeout(() => (copied = false), 1800);
		} catch {
			copied = false;
		}
	}
</script>

<svelte:head><title>{title} — Travel Planner</title></svelte:head>

<main class="travel-page grid min-h-screen place-items-center p-5">
	<section class="travel-error-sheet w-full max-w-md p-7" aria-labelledby={titleId}>
		<div class="flex items-start gap-4">
			<span class="mt-1 flex h-11 w-11 shrink-0 items-center justify-center border border-[#a24e2c]/30 bg-[#f4ecdc] text-[#a24e2c]">
				<IconWiCloud class="h-5 w-5" />
			</span>
			<div class="min-w-0 flex-1">
				<p class="travel-error-kicker animate-glide-in">Error {status}</p>
				<h1 id={titleId} class="animate-glide-in" style="animation-delay: 60ms">{title}</h1>
			</div>
		</div>

		<p class="travel-error-copy animate-glide-in" style="animation-delay: 120ms">{hint}</p>

		<div class="mt-5 border-y border-[#1b2b3a]/15 py-3">
			<p class="travel-error-request">Diagnostic details</p>
			<pre class="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-[#1b2b3a]/70">{details}</pre>
			<button class="btn btn-ghost btn-xs mt-2 gap-1.5" onclick={copyDetails}>
				{#if copied}<IconCheck class="h-3.5 w-3.5 text-[#2f7d58]" /> Copied{:else}<IconContentCopy class="h-3.5 w-3.5" /> Copy details{/if}
			</button>
		</div>

		{#if dev && error?.message}
			<p class="mt-4 break-words border-l-2 border-[#a24e2c] pl-2 font-mono text-[11px] text-[#a24e2c]">
				{error.message}
			</p>
		{/if}

		<div class="mt-6 flex flex-wrap gap-3">
			<button class="btn btn-primary" onclick={() => location.reload()}>Retry</button>
			<button class="btn btn-ghost" onclick={() => goto('/')}>Travel Planner</button>
		</div>
	</section>
</main>
