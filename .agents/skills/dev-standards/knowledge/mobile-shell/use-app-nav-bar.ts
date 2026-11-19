import { reactive, readonly, type DeepReadonly } from 'vue';

export type AppNavBarOverride = {
  title?: string;
  rightText?: string;
  rightLabel?: string;
  onRightClick?: () => void;
};

const override = reactive<AppNavBarOverride>({});

export function resetAppNavBarOverride(): void {
  override.title = undefined;
  override.rightText = undefined;
  override.rightLabel = undefined;
  override.onRightClick = undefined;
}

export function getAppNavBarOverride(): DeepReadonly<AppNavBarOverride> {
  return readonly(override);
}

/** 页面级覆盖全局顶栏（路由切换时自动清空）。 */
export function useAppNavBar(): {
  setTitle: (title: string) => void;
  setRight: (options: {
    text?: string;
    label?: string;
    onClick?: () => void;
  }) => void;
  clear: () => void;
} {
  function setTitle(title: string): void {
    override.title = title;
  }

  function setRight(options: {
    text?: string;
    label?: string;
    onClick?: () => void;
  }): void {
    if (options.text !== undefined) {
      override.rightText = options.text;
      override.rightLabel = undefined;
      override.onRightClick = options.onClick;
      return;
    }
    override.rightText = undefined;
    override.rightLabel = options.label;
    override.onRightClick = undefined;
  }

  return {
    setTitle,
    setRight,
    clear: resetAppNavBarOverride,
  };
}
