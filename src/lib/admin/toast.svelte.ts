export interface Toast {
	id: number;
	message: string;
	tone: 'success' | 'error' | 'info';
}

let nextId = 1;

class ToastStore {
	items = $state<Toast[]>([]);

	push(message: string, tone: Toast['tone'] = 'success', ms = 3500) {
		const id = nextId++;
		this.items.push({ id, message, tone });
		setTimeout(() => this.dismiss(id), ms);
	}
	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toasts = new ToastStore();
