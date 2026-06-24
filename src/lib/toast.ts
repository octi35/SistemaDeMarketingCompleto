// Tiny dependency-free toast store (pub/sub). Any module can call toast.*
// and the <Toaster /> mounted in App will render the messages.

export type ToastType = "success" | "error" | "info";
export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((l) => l([...toasts]));

const remove = (id: number) => {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

const push = (type: ToastType, message: string, durationMs = 4000) => {
  const id = nextId++;
  toasts = [...toasts, { id, type, message }];
  emit();
  if (durationMs > 0) setTimeout(() => remove(id), durationMs);
  return id;
};

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message, 6000),
  info: (message: string) => push("info", message),
  dismiss: remove,
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    listener([...toasts]);
    return () => listeners.delete(listener);
  },
};
