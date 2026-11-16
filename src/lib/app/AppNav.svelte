<script lang="ts">
	// Travel Planner shell: bottom tabs on phones, a slim left rail on desktop.
	import { page } from '$app/state';
	import IconTrain from '~icons/material-symbols/train-outline-rounded';
	import IconRoute from '~icons/material-symbols/route-rounded';
	import IconCheckCircle from '~icons/material-symbols/check-circle-rounded';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	const tabs = [
		{ href: '/', label: 'Plan', icon: IconTrain },
		{ href: '/journeys/map', label: 'Routes', icon: IconRoute },
		{ href: '/journeys/completed', label: 'Done', icon: IconCheckCircle }
	];

	const active = $derived((href: string) =>
		href === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(href)
	);
</script>

<div class="min-h-dvh lg:pl-20">
	<!-- desktop rail -->
	<aside
		class="fixed inset-y-0 left-0 z-30 hidden w-20 flex-col items-center border-r border-[#1b2b3a]/20 bg-[#fffdf7]/95 py-5 backdrop-blur lg:flex"
	>
		<a
			href="/"
			class="travel-display mb-8 flex h-11 w-11 items-center justify-center border-2 border-[#1b2b3a] bg-[#c98a1f] text-lg text-white"
			aria-label="Travel Planner home"
		>
			<IconTrain class="h-6 w-6" />
		</a>
		<nav class="flex flex-1 flex-col gap-2" aria-label="Main navigation">
			{#each tabs as tab (tab.href)}
				{@const Icon = tab.icon}
				<a
					href={tab.href}
					aria-current={active(tab.href) ? 'page' : undefined}
					class="group relative flex h-14 w-14 items-center justify-center rounded-lg transition-all duration-200 {active(
						tab.href
					)
						? 'bg-[#1b2b3a] text-white shadow-md'
						: 'text-[#1b2b3a]/45 hover:bg-[#f4ecdc] hover:text-[#a24e2c]'}"
					title={tab.label}
				>
					<Icon class="h-5 w-5 {active(tab.href) ? 'animate-soft-pop' : ''}" />
					<span class="paper-eyebrow absolute -bottom-0.5 text-[8px] tracking-normal"
						>{tab.label}</span
					>
				</a>
			{/each}
		</nav>
		<span class="paper-eyebrow mt-4 rotate-180 text-[8px]" style="writing-mode: vertical-rl"
			>Travel Planner</span
		>
	</aside>

	{@render children()}

	<!-- mobile tabs -->
	<nav
		class="fixed inset-x-0 bottom-0 z-30 flex border-t border-[#1b2b3a]/25 bg-[#fffdf7]/97 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden"
		aria-label="Main navigation"
	>
		{#each tabs as tab (tab.href)}
			{@const Icon = tab.icon}
			<a
				href={tab.href}
				aria-current={active(tab.href) ? 'page' : undefined}
				class="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-bold transition-colors {active(
					tab.href
				)
					? 'text-[#a24e2c]'
					: 'text-[#1b2b3a]/45'}"
			>
				<span class="relative flex h-7 w-10 items-center justify-center">
					<span
						class="paper-rule-drawn absolute inset-x-2 top-0 h-0.5 {active(tab.href)
							? 'animate-draw-line'
							: 'opacity-0'}"
					></span>
					<Icon class="h-5 w-5 {active(tab.href) ? 'animate-soft-pop' : ''}" />
				</span>
				{tab.label}
			</a>
		{/each}
	</nav>
</div>
