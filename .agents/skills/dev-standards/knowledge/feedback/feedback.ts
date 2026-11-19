/** 反馈门面：request 只 import 本文件，不直接 import Vant。 */

export type FeedbackAdapter = {
  error: (message: string) => void;
  success: (message: string) => void;
};

let adapter: FeedbackAdapter = {
  error(message) {
    console.error('[feedback]', message);
  },
  success(message) {
    console.log('[feedback]', message);
  },
};

export function setFeedbackAdapter(next: FeedbackAdapter): void {
  adapter = next;
}

export function msgError(message: string): void {
  adapter.error(message);
}

export function msgSuccess(message: string): void {
  adapter.success(message);
}
