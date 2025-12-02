<!-- src/lib/components/EditTransportDialog.svelte -->
<script lang="ts">
    import type { TripTransport, TransportType } from '$lib/types';
    import { transportInfo } from '$lib/types';
    import IconDismiss from '~icons/fluent/dismiss-24-regular';
    import IconSave from '~icons/fluent/save-24-regular';

    interface Props {
        show: boolean;
        transport: TripTransport | null;
        onsave: (transport: TripTransport) => void;
    }

    let { show = $bindable(), transport, onsave }: Props = $props();

    let editedTransport = $state<TripTransport | null>(null);

    $effect(() => {
        if (show && transport) {
            editedTransport = { ...transport };
        }
    });

    function handleSave() {
        if (editedTransport) {
            onsave(editedTransport);
            show = false;
        }
    }

    function close() {
        show = false;
    }

    const isTrainMode = $derived(editedTransport?.type === 'train');
</script>

{#if show && editedTransport}
    <div class="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4" onclick={close}>
        <div class="bg-base-100 w-full max-w-md rounded-lg shadow-xl" onclick={(e) => e.stopPropagation()}>
            <div class="p-6">
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="text-xl font-bold">Edit Transport</h2>
                    <button class="btn btn-ghost btn-sm btn-circle" onclick={close}>
                        <IconDismiss class="size-5" />
                    </button>
                </div>

                <div class="space-y-4">
                    <div class="bg-base-200 rounded-lg p-3 text-sm text-center">
                        Stop #{editedTransport.fromStopOrder} → Stop #{editedTransport.toStopOrder}
                    </div>

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Transport Type</span>
                        </label>
                        <select class="select select-bordered" bind:value={editedTransport.type}>
                            {#each Object.values(transportInfo) as info}
                                <option value={info.value}>
                                    {info.icon} {info.label}
                                </option>
                            {/each}
                        </select>
                    </div>

                    {#if isTrainMode}
                        <div class="grid grid-cols-2 gap-3">
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Train Number</span>
                                </label>
                                <input
                                    type="text"
                                    class="input input-bordered font-mono"
                                    bind:value={editedTransport.trainNumber}
                                    placeholder="ICE 123"
                                />
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Platform</span>
                                </label>
                                <input
                                    type="text"
                                    class="input input-bordered"
                                    bind:value={editedTransport.platform}
                                    placeholder="7"
                                />
                            </div>
                        </div>

                        <div class="grid grid-cols-2 gap-3">
                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Departure</span>
                                </label>
                                <input
                                    type="time"
                                    class="input input-bordered font-mono"
                                    bind:value={editedTransport.departureTime}
                                />
                            </div>

                            <div class="form-control">
                                <label class="label">
                                    <span class="label-text">Arrival</span>
                                </label>
                                <input
                                    type="time"
                                    class="input input-bordered font-mono"
                                    bind:value={editedTransport.arrivalTime}
                                />
                            </div>
                        </div>
                    {:else}
                        <div class="form-control">
                            <label class="label">
                                <span class="label-text">Walking Duration (minutes)</span>
                            </label>
                            <input
                                type="number"
                                class="input input-bordered"
                                bind:value={editedTransport.durationMinutes}
                                min="1"
                                step="1"
                            />
                            <label class="label">
                                <span class="label-text-alt">Estimated time to walk between locations</span>
                            </label>
                        </div>
                    {/if}

                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Notes</span>
                        </label>
                        <textarea
                            class="textarea textarea-bordered"
                            bind:value={editedTransport.notes}
                            placeholder="Additional transport notes..."
                            rows="2"
                        ></textarea>
                    </div>

                    <div class="flex gap-3 pt-2">
                        <button class="btn btn-ghost flex-1" onclick={close}>
                            Cancel
                        </button>
                        <button class="btn btn-primary flex-1 gap-2" onclick={handleSave}>
                            <IconSave class="size-4" />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
{/if}