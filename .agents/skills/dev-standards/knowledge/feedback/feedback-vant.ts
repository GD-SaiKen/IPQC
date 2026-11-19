import { showDialog, showToast } from 'vant';

import { setFeedbackAdapter } from '@/utils/feedback';

/** 在 createApp(App) 之后、mount 之前调用 */
export function registerVantFeedback(): void {
  setFeedbackAdapter({
    error(message) {
      showToast({ message, type: 'fail' });
    },
    success(message) {
      showToast({ message, type: 'success' });
    },
  });
}

export { showDialog };
