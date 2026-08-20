/**
 * Shared bookkeeping for every stacked overlay (modals, sheets, confirms).
 *
 * Two things have to be coordinated globally rather than per-component:
 *  - body scroll locking, which must be reference counted so closing the inner
 *    modal of a stack does not unlock the page behind the outer one;
 *  - "who owns Escape", so a keypress dismisses only the topmost overlay.
 */

const stack: symbol[] = [];
let previousOverflow: string | null = null;

export function registerOverlay(id: symbol): void {
	if (stack.includes(id)) return;
	stack.push(id);
	if (stack.length === 1 && typeof document !== 'undefined') {
		previousOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
	}
}

export function unregisterOverlay(id: symbol): void {
	const index = stack.lastIndexOf(id);
	if (index === -1) return;
	stack.splice(index, 1);
	if (stack.length === 0 && typeof document !== 'undefined') {
		document.body.style.overflow = previousOverflow ?? '';
		previousOverflow = null;
	}
}

export function isTopOverlay(id: symbol): boolean {
	return stack.length > 0 && stack[stack.length - 1] === id;
}

const FOCUSABLE =
	'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Keeps Tab cycling inside `node` and hands focus back to whatever was focused
 * before the overlay opened.
 */
export function focusTrap(node: HTMLElement) {
	const previouslyFocused = document.activeElement as HTMLElement | null;
	node.focus({ preventScroll: true });

	function onKeydown(event: KeyboardEvent) {
		if (event.key !== 'Tab') return;
		const focusable = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
			(el) => el.offsetParent !== null || el === document.activeElement
		);
		if (focusable.length === 0) return;
		const first = focusable[0];
		const last = focusable[focusable.length - 1];
		if (event.shiftKey && document.activeElement === first) {
			event.preventDefault();
			last.focus();
		} else if (!event.shiftKey && document.activeElement === last) {
			event.preventDefault();
			first.focus();
		}
	}

	node.addEventListener('keydown', onKeydown);

	return {
		destroy() {
			node.removeEventListener('keydown', onKeydown);
			previouslyFocused?.focus?.({ preventScroll: true });
		}
	};
}
