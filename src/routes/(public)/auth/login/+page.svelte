<!-- src/routes/auth/login/+page.svelte -->
<script lang="ts">
	import { page } from '$app/state';

	import FluentEmojiStation from '~icons/fluent-emoji/station';
	import LogosGoogleIcon from '~icons/logos/google-icon';
</script>

<svelte:head>
	<title>Login - Travel Tips</title>
	<meta name="description" content="Login to access Travel Tips" />
</svelte:head>

<!-- Header -->
<header class="mb-10 text-center">
	<div class="mb-4 flex justify-center">
		<FluentEmojiStation class="size-16" />
	</div>
	<h1 class="text-3xl font-bold text-white">Travel Tips</h1>
	<p class="mt-2 text-lg text-white/70">Sign in to continue</p>
</header>

<!-- Login Card -->
<div class="mx-auto max-w-md">
	<div class="card border border-white/30 bg-white/10 backdrop-blur-md">
		<div class="card-body items-center justify-center gap-6 p-8 md:p-10">
			<a
				class="btn border-[#e5e5e5] bg-white text-black"
				href={`/auth/login/google?next=${encodeURIComponent(page.url.searchParams.get('next') || '/')}`}
			>
				<LogosGoogleIcon class="size-6" />
				Continue with Google
			</a>

			<div class="mt-4 text-center text-sm text-white/60">
				By signing in, you agree to our terms of service
			</div>
		</div>
	</div>
</div>
