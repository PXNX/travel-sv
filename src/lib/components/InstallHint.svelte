<script lang="ts">
	// A quiet invitation to install the app — only after the browser says it can,
	// only when it is useful, and never more than once a week after dismissal.
	import { onMount } from 'svelte';
	import IconInstall from '~icons/material-symbols/install-mobile-rounded';
	import IconClose from '~icons/material-symbols/close-rounded';

	interface InstallPromptEvent extends Event {
		prompt: () => Promise<void>;
		userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
	}

	const DISMISS_KEY = 'travel-install-hint-dismissed';
	const DISMISS_DAYS = 7;

	let visible = $state(false);
	let promptEvent: InstallPromptEvent | null = null;
	let installed = $state(false);

	function dismissedRecently(): boolean {
		try {
			const stored = Number(localStorage.getItem(DISMISS_KEY));
			if (!stored) return false;
			return Date.now() - stored < DISMISS_DAYS * 24 * 60 * 60 * 1000;
		} catch {
			return false;
		}
	}

	function dismiss() {
		visible = false;
		try {
			localStorage.setItem(DISMISS_KEY, String(Date.now()));
		} catch {
			// Storage can be unavailable in private browsing; the hint still closes.
		}
	}

	async function install() {
		if (!promptEvent) return;
		await promptEvent.prompt();
		await promptEvent.userChoice.catch(() => undefined);
		promptEvent = null;
		visible = false;
	}

	onMount(() => {
		if (window.matchMedia('(display-mode: standalone)').matches || 'standalone' in navigator) {
			return;
		}
		if (dismissedRecently()) return;

		const onPrompt = (event: Event) => {
			event.preventDefault();
			promptEvent = event as InstallPromptEvent;
			visible = true;
		};
		const onInstalled = () => {
			installed = true;
			visible = false;
		};

		window.addEventListener('beforeinstallprompt', onPrompt);
		window.addEventListener('appinstalled', onInstalled);
		return () => {
			window.removeEventListener('beforeinstallprompt', onPrompt);
			window.removeEventListener('appinstalled', onInstalled);
		};
	});
</script>

{#if visible && !installed}
	<aside
		class="install-hint animate-slide-up fixed right-0 bottom-0 left-0 z-[2500] mx-auto max-w-md p-3 sm:right-4 sm:bottom-4 sm:left-auto sm:p-0"
		aria-label="Install the app"
	>
		<div
			class="flex items-center gap-3 border border-l-4 border-[#172a45]/45 border-l-[#e6a527] bg-[#fffdf7] px-3.5 py-3 shadow-[6px_7px_0_rgba(23,42,69,0.14)]"
		>
			<span
				class="relative flex h-10 w-10 shrink-0 items-center justify-center border border-[#172a45]/25 bg-[#f4eee0]"
			>
				<IconInstall class="animate-sway h-5 w-5 text-[#172a45]" />
				<span class="animate-sparkle absolute -top-1 -right-1 text-base leading-none text-[#e6a527]"
					>✦</span
				>
			</span>

			<div class="min-w-0 flex-1">
				<p class="travel-display text-base leading-tight text-[#172a45]">Journeys in your pocket</p>
				<p class="mt-0.5 text-[11px] leading-snug text-[#a45e38]">
					Install for quick access and offline maps.
				</p>
			</div>

			<button class="btn btn-primary btn-sm shrink-0" onclick={install}>Install</button>
			<button
				class="-mr-1 shrink-0 p-1 text-[#172a45]/45 hover:text-[#a45e38]"
				aria-label="Dismiss install hint"
				onclick={dismiss}
			>
				<IconClose class="h-4 w-4" />
			</button>
		</div>
	</aside>
{/if}
