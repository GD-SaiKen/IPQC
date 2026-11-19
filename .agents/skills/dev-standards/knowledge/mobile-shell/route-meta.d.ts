import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** 无需登录即可访问 */
    public?: boolean;
    /** 隐藏全局顶栏与底部 Tab（如登录页） */
    hideNav?: boolean;
    /** 顶栏标题 */
    navTitle?: string;
    /** 显示返回箭头 */
    navBack?: boolean;
    /** 主内容区不滚动，由页面内键盘避让等组件接管 */
    mainEmbed?: boolean;
  }
}

export {};
