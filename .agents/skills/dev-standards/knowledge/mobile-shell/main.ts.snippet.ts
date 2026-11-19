/** 片段：合并进 src/main.ts */
import { Lazyload } from 'vant';
import 'vant/lib/index.css';
import '@/styles/base.css';
import { configureVirtualKeyboardForResize } from '@/composables/use-keyboard-viewport';
import { registerVantFeedback } from '@/utils/feedback-vant';

configureVirtualKeyboardForResize();

const app = createApp(App);
app.use(pinia);
app.use(Lazyload);
app.use(router);
registerVantFeedback();
app.mount('#app');
