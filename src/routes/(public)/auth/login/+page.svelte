<script lang="ts">
	import { page } from '$app/state';
	import { dev } from '$app/environment';
	import { goto } from '$app/navigation';
	import IconMap from '~icons/material-symbols/map-outline-rounded';
	import IconSparkle from '~icons/material-symbols/auto-awesome-rounded';

	const next = $derived(page.url.searchParams.get('next') || '/');
</script>

<svelte:head>
	<title>Login — Journey Planner</title>
	<meta name="description" content="Sign in to plan your journeys" />
</svelte:head>

<main class="travel-page flex min-h-[100dvh] items-center justify-center p-4">
	<div class="animate-fade-in-up w-full max-w-md text-center">
		<!-- folded map stamp -->
		<div class="relative mx-auto mb-8 flex w-28 justify-center">
			<span
				class="animate-sway absolute inset-x-3 top-2 h-16 border border-[#172a45]/20 bg-[#f4eee0]"
			></span>
			<span
				class="relative flex h-20 w-20 -rotate-3 items-center justify-center border border-t-4 border-[#172a45]/60 border-t-[#e6a527] bg-[#fffdf7] shadow-[6px_7px_0_rgba(23,42,69,0.14)]"
			>
				<IconMap class="h-9 w-9 text-[#172a45]" />
				<IconSparkle class="animate-sparkle absolute -top-2 -right-2 h-5 w-5 text-[#b0781b]" />
			</span>
		</div>

		<p class="travel-eyebrow">Journey planner</p>
		<h1 class="travel-display mt-1 text-4xl leading-none text-[#172a45]">
			Every route<br />has a story.
		</h1>
		<p class="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#172a45]/60">
			Plan stops, trace connections and keep your journeys close — even offline.
		</p>

		<div
			class="animate-fade-in-scale mt-8 border border-t-4 border-[#172a45]/45 border-t-[#e6a527] bg-[#fffdf7] px-6 py-6 shadow-[8px_9px_0_rgba(23,42,69,0.12)]"
			style="animation-delay: 120ms"
		>
			<a
				class="btn btn-primary btn-block gap-2.5 py-2"
				href={`/auth/login/google?next=${encodeURIComponent(next)}`}
			>
				<svg class="size-5 bg-white p-0.5" viewBox="0 0 48 48" aria-hidden="true">
					<path
						fill="#EA4335"
						d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
					/>
					<path
						fill="#4285F4"
						d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
					/>
					<path
						fill="#FBBC05"
						d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
					/>
					<path
						fill="#34A853"
						d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
					/>
				</svg>
				Continue with Google
			</a>

			{#if dev}
				<button class="btn btn-ghost btn-sm btn-block mt-2" onclick={() => goto('/preview')}>
					Preview the UI without signing in
				</button>
			{/if}

			<p class="mt-5 text-[11px] text-[#172a45]/45">
				By signing in, you agree to our
				<a
					href="/privacy-policy"
					class="font-semibold text-[#a45e38] underline underline-offset-2 hover:text-[#172a45]"
					>privacy policy</a
				>.
			</p>
		</div>
	</div>
</main>
