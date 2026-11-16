<script lang="ts">
	// Shared recovery panel for every SvelteKit error page. Safe diagnostics only:
	// raw messages and stacks stay in the server logs.
	import { dev } from '$app/environment';
	import { page } from '$app/state';
	import IconContentCopy from '~icons/material-symbols/content-copy-rounded';
	import IconCheck from '~icons/material-symbols/check-rounded';
	import IconCloudOff from '~icons/material-symbols/cloud-off-outline-rounded';
	import IconError from '~icons/material-symbols/error-outline-rounded';
	import IconLock from '~icons/material-symbols/lock-outline-rounded';

	type Props = {
		status: number;
		error?: App.Error & { message?: string };
		data?: { requestId?: string };
		/** Compact panel for public/auth errors without the app shell. */
		compact?: boolean;
	};

	let { status, error, data, compact = false }: Props = $props();

	const requestId = $derived(error?.requestId ?? data?.requestId ?? 'not reported');
	let copied = $state(false);

	const content = $derived.by(() => {
		switch (status) {
			case 404:
				return {
					title: 'Page not found',
					hint: error?.hint ?? 'That page does not exist.',
					icon: IconError
				};
			case 401:
			case 403:
				return {
					title: 'Not allowed',
					hint: error?.hint ?? 'You do not have access to this page. Sign in and try again.',
					icon: IconLock
				};
			case 503:
				return {
					title: 'Temporarily unavailable',
					hint: error?.hint ?? 'An upstream service is unavailable. Try again shortly.',
					icon: IconCloudOff
				};
			default:
				return {
					title: 'Something went wrong',
					hint: error?.hint ?? 'An unexpected server error occurred.',
					icon: IconCloudOff
				};
		}
	});

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

	const Icon = $derived(content.icon);
</script>

<section
	class="travel-error-sheet w-full {compact ? 'max-w-md p-6' : 'max-w-md p-7'}"
	aria-labelledby="error-title"
>
	<div class="flex items-start gap-4">
		<span
			class="mt-1 flex h-11 w-11 shrink-0 items-center justify-center border border-[#a24e2c]/30 bg-[#f4ecdc] text-[#a24e2c]"
		>
			<Icon class="h-5 w-5" />
		</span>
		<div class="min-w-0 flex-1">
			<p class="travel-error-kicker animate-glide-in">Error {status}</p>
			<h1 id="error-title" class="animate-glide-in" style="animation-delay: 60ms">
				{content.title}
			</h1>
		</div>
	</div>

	<p class="travel-error-copy animate-glide-in" style="animation-delay: 120ms">{content.hint}</p>

	<div class="mt-5 border-y border-[#1b2b3a]/15 py-3">
		<p class="travel-error-request">Diagnostic details</p>
		<pre
			class="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed text-[#1b2b3a]/70">{details}</pre>
		<button class="btn btn-ghost btn-xs mt-2 gap-1.5" onclick={copyDetails}>
			{#if copied}
				<IconCheck class="h-3.5 w-3.5 text-[#2f7d58]" /> Copied
			{:else}
				<IconContentCopy class="h-3.5 w-3.5" /> Copy details
			{/if}
		</button>
	</div>

	{#if dev && error?.message}
		<p
			class="mt-4 border-l-2 border-[#a24e2c] pl-2 font-mono text-[11px] break-words text-[#a24e2c]"
		>
			{error.message}
		</p>
	{/if}

	<div class="mt-6 flex flex-wrap gap-3">
		<button class="btn btn-primary" onclick={() => location.reload()}>Retry</button>
		<a class="btn btn-ghost" href="/">Travel Planner</a>
	</div>
</section>
