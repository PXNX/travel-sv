<!-- src/routes/location/new/+page.svelte -->
<script lang="ts">
	import { Map, TileLayer, Marker } from 'sveaflet';
	import L from 'leaflet';
	import { categoryInfo, bestTimeInfo, type Category, type BestTime } from '$lib/types';
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	// Import Fluent icons
	import IconArrowLeft from '~icons/fluent/arrow-left-24-regular';
	import IconSave from '~icons/fluent/save-24-regular';
	import IconDismiss from '~icons/fluent/dismiss-24-regular';
	import IconLocation from '~icons/fluent/location-24-regular';
	import IconWarning from '~icons/fluent/warning-24-regular';

	interface Props {
		data: {
			isSignedIn: boolean;
			user?: { id: string; name: string; isAdmin: boolean };
		};
		form?: {
			error?: string;
			duplicateWarning?: {
				title: string;
				distance: number;
			};
		};
	}

	let { data, form }: Props = $props();

	// Get coordinates from URL params or use defaults
	const urlLat = $page.url.searchParams.get('lat');
	const urlLng = $page.url.searchParams.get('lng');

	let latitude = $state(urlLat ? parseFloat(urlLat) : 51.505);
	let longitude = $state(urlLng ? parseFloat(urlLng) : -0.09);
	let category = $state<Category>('food');
	let tags = $state<string[]>([]);

	let newTag = $state('');
	let mapInstance: L.Map | undefined = $state();
	let isSubmitting = $state(false);
	let addressInput = $state('');

	// Center map on provided coordinates
	$effect(() => {
		if (urlLat && urlLng && mapInstance) {
			mapInstance.setView([latitude, longitude], 15);
		}
	});

	function getCategoryIcon(cat: Category) {
		const info = categoryInfo[cat];
		return L.divIcon({
			html: `<div style="background-color: ${info.color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">${info.icon}</div>`,
			className: 'custom-marker',
			iconSize: [40, 40],
			iconAnchor: [20, 20]
		});
	}

	function handleMapClick(e: L.LeafletMouseEvent) {
		latitude = e.latlng.lat;
		longitude = e.latlng.lng;
	}

	function addTag() {
		if (newTag.trim() && !tags.includes(newTag.trim())) {
			tags = [...tags, newTag.trim()];
			newTag = '';
		}
	}

	function removeTag(tag: string) {
		tags = tags.filter((t) => t !== tag);
	}

	async function searchAddress() {
		if (!addressInput.trim()) return;

		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(addressInput)}`
			);
			const results = await response.json();

			if (results.length > 0) {
				latitude = parseFloat(results[0].lat);
				longitude = parseFloat(results[0].lon);
				mapInstance?.setView([latitude, longitude], 15);
			} else {
				alert('Location not found. Please try a different address or click on the map.');
			}
		} catch (error) {
			console.error('Search error:', error);
			alert('Failed to search for address. Please try again.');
		}
	}

	function cancel() {
		goto(resolve('/'));
	}
</script>

<div class="bg-base-200 min-h-screen">
	<!-- Header -->
	<div class="bg-primary text-primary-content p-4">
		<div class="container mx-auto flex items-center gap-4">
			<button class="btn btn-ghost btn-sm btn-circle" onclick={cancel}>
				<IconArrowLeft class="h-5 w-5" />
			</button>
			<h1 class="text-xl font-bold">Add New Location</h1>
		</div>
	</div>

	<div class="container mx-auto max-w-4xl p-4">
		{#if form?.error}
			<div class="alert alert-error mb-6">
				<IconDismiss class="h-5 w-5" />
				<span>{form.error}</span>
			</div>
		{/if}

		{#if form?.duplicateWarning}
			<div class="alert alert-warning mb-6">
				<IconWarning class="h-5 w-5" />
				<div>
					<div class="font-bold">Possible Duplicate Location</div>
					<div class="text-sm">
						There's already a location "{form.duplicateWarning.title}" within
						{form.duplicateWarning.distance}m of this position. Please verify this isn't a
						duplicate.
					</div>
				</div>
			</div>
		{/if}

		<form
			method="POST"
			class="grid grid-cols-1 gap-6 lg:grid-cols-2"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ result, update }) => {
					isSubmitting = false;
					await update();
				};
			}}
		>
			<!-- Hidden fields -->
			<input type="hidden" name="latitude" value={latitude} />
			<input type="hidden" name="longitude" value={longitude} />
			<input type="hidden" name="category" value={category} />
			<input type="hidden" name="tags" value={JSON.stringify(tags)} />

			<!-- Form -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h2 class="card-title">Location Details</h2>

					<div class="space-y-4">
						<div class="form-control">
							<label class="label"><span class="label-text">Title *</span></label>
							<input
								type="text"
								name="title"
								class="input input-bordered"
								placeholder="Name of the place"
								required
							/>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Description *</span></label>
							<textarea
								name="description"
								class="textarea textarea-bordered h-24"
								placeholder="Tell us about this place..."
								required
							></textarea>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Address</span></label>
							<div class="flex gap-2">
								<input
									type="text"
									name="address"
									class="input input-bordered flex-1"
									bind:value={addressInput}
									placeholder="Street address or place name"
									onkeydown={(e) => e.key === 'Enter' && (e.preventDefault(), searchAddress())}
								/>
								<button type="button" class="btn btn-square" onclick={searchAddress}>
									<IconLocation class="h-5 w-5" />
								</button>
							</div>
							<label class="label">
								<span class="label-text-alt">Or click on the map to set location</span>
							</label>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div class="form-control">
								<label class="label"><span class="label-text">Category *</span></label>
								<select class="select select-bordered" bind:value={category}>
									{#each Object.values(categoryInfo) as cat}
										<option value={cat.value}>{cat.icon} {cat.label}</option>
									{/each}
								</select>
							</div>

							<div class="form-control">
								<label class="label"><span class="label-text">Duration (min) *</span></label>
								<input
									type="number"
									name="duration_minutes"
									class="input input-bordered"
									value={60}
									min="15"
									step="15"
									required
								/>
							</div>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Best Time to Visit</span></label>
							<select name="best_time_to_visit" class="select select-bordered">
								<option value="">Not specified</option>
								{#each Object.values(bestTimeInfo) as time}
									<option value={time.value}>{time.label}</option>
								{/each}
							</select>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Image URL</span></label>
							<input
								type="url"
								name="image_url"
								class="input input-bordered"
								placeholder="https://example.com/image.jpg"
							/>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Google Maps URL</span></label>
							<input
								type="url"
								name="google_maps_url"
								class="input input-bordered"
								placeholder="https://maps.google.com/..."
							/>
						</div>

						<div class="form-control">
							<label class="label"><span class="label-text">Tags</span></label>
							<div class="flex gap-2">
								<input
									type="text"
									class="input input-bordered flex-1"
									bind:value={newTag}
									placeholder="Add a tag..."
									onkeydown={(e) => {
										if (e.key === 'Enter') {
											e.preventDefault();
											addTag();
										}
									}}
								/>
								<button type="button" class="btn" onclick={addTag}>Add</button>
							</div>
							{#if tags.length > 0}
								<div class="mt-2 flex flex-wrap gap-2">
									{#each tags as tag (tag)}
										<div class="badge badge-lg gap-2">
											{tag}
											<button
												type="button"
												class="btn btn-ghost btn-xs btn-circle"
												onclick={() => removeTag(tag)}
											>
												<IconDismiss class="h-3 w-3" />
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>

						<div class="divider"></div>

						<div class="flex gap-3">
							<button
								type="button"
								class="btn btn-ghost flex-1"
								onclick={cancel}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button type="submit" class="btn btn-primary flex-1 gap-2" disabled={isSubmitting}>
								<IconSave class="h-4 w-4" />
								{isSubmitting ? 'Adding...' : 'Add Location'}
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Map -->
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body p-0">
					<div class="h-[600px]">
						<Map
							options={{
								center: [latitude, longitude],
								zoom: 13
							}}
							class="h-full w-full rounded-2xl"
							bind:instance={mapInstance}
							on:click={handleMapClick}
						>
							<TileLayer url={'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'} />
							<Marker latLng={[latitude, longitude]} icon={getCategoryIcon(category)} />
						</Map>
					</div>
					<div class="p-4">
						<p class="text-base-content/70 text-sm">
							Click on the map to set the location, or enter an address and click the search button.
						</p>
						<p class="text-base-content/50 mt-2 text-xs">
							Coordinates: {latitude.toFixed(6)}, {longitude.toFixed(6)}
						</p>
					</div>
				</div>
			</div>
		</form>
	</div>
</div>
