// CRUD 五件套的类型契约 · Vue 2 + Element UI 2 版。
// 与 Vue 3 版的差异：图标是字符串类名、日期用 timeDisplay 粒度、多一个 group 多级表头。

// ==================== 操作按钮 ====================

/** 单个操作按钮配置 */
export interface ActionButton {
  /** 按钮文字 */
  label: string;
  /** 按钮类型 */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text';
  /** 点击回调，接收当前行数据 */
  onClick: (row: Record<string, any>, index: number) => void;
  /** 是否隐藏（动态控制） */
  hidden?: (row: Record<string, any>) => boolean;
  /** Element UI 图标类名（如 'el-icon-edit'） */
  icon?: string;
  /** tooltip 文本，默认用 label */
  tooltip?: string;
}

// ==================== 日期粒度 ====================

/** 日期列的展示粒度；值为毫秒时间戳或 ISO 字符串 */
export type TimeDisplayMode = 'date' | 'datetime' | 'time';

// ==================== 列类型枚举 ====================

export type ColumnType =
  | 'selection' // 多选框（固定在左侧）
  | 'index' // 序号列（固定在左侧）
  | 'text' // 普通文本
  | 'image' // 图片（带预览）
  | 'tag' // 标签
  | 'date' // 日期（自动格式化）
  | 'custom' // 自定义插槽（外部传入 #col-{prop}）
  | 'action' // 操作列（固定在右侧）
  | 'expand' // 展开列（展开内容走 #expand 插槽）
  | 'group'; // 多级表头分组（children 为子列）

// ==================== 列 Schema ====================

/** 基础列属性 */
interface BaseColumn {
  /** 列类型 */
  type: ColumnType;
  /** 列标题 */
  label?: string;
  /** 表头多行文案（多级表头分组行或较长子列表头换行） */
  headerLines?: string[];
  /** 表头单行主文案（未设置时用 label） */
  headerTitle?: string;
  /** 悬浮表头单元格时的完整说明（\n 分行） */
  headerTip?: string;
  /** 为 true 且在 headerBadgeTip 有值时，标题旁显示 ! 徽标 */
  headerBadge?: boolean;
  /** 悬浮徽标时展示的补充说明 */
  headerBadgeTip?: string;
  /** 有 headerTip 时表头前加「…」省略前缀，默认 true */
  headerAbbrevPrefix?: boolean;
  /** 字段名（selection / index / action 可不传） */
  prop?: string;
  /** 列宽 */
  width?: string | number;
  /** 最小列宽 */
  minWidth?: string | number;
  /** 对齐方式（未设置时按 column-sizing 规则推断，业务文本列默认左对齐） */
  align?: 'left' | 'center' | 'right';
  /** 表头对齐（未设置时与 align 一致） */
  headerAlign?: 'left' | 'center' | 'right';
  /** 是否可排序 */
  sortable?: boolean | 'custom';
  /** 是否显示 tooltip 溢出文本 */
  showOverflowTooltip?: boolean;
  /** 格式化函数 */
  formatter?: (value: any, row: Record<string, any>, index: number) => string;
  /** 列附加 class */
  className?: string;
  /** 为 true 强制弹性；为 false 时仅 minWidth 视为固定宽；仅 minWidth 时默认弹性铺满 */
  flex?: boolean;
  /** 固定列：true / 'left' 左侧固定，'right' 右侧固定；操作列默认右侧固定，设 fixed=false 取消 */
  fixed?: boolean | 'left' | 'right';
  /**
   * 操作列（custom 插槽）：按行返回当前可见按钮文案，供 Table 扫描全表计算列宽。
   * 行内按钮数量/文案随状态变化时必须配置，否则列宽只会停在 minWidth。
   */
  actionLabels?: (row: Record<string, any>) => string[];
}

/** 选择列 */
export interface SelectionColumn extends BaseColumn {
  type: 'selection';
  /** 选择变化回调 */
  onSelectionChange?: (rows: any[]) => void;
}

/** 序号列 */
export interface IndexColumn extends BaseColumn {
  type: 'index';
  /** 起始序号，默认 1 */
  startIndex?: number;
}

/** 文本列 */
export interface TextColumn extends BaseColumn {
  type: 'text';
  prop: string;
  /** 点击回调（如名称跳转详情） */
  onClick?: (value: any, row: Record<string, any>) => void;
}

/** 图片列 */
export interface ImageColumn extends BaseColumn {
  type: 'image';
  prop: string;
  /** 缩略图宽度 */
  imageWidth?: number;
  /** 缩略图高度 */
  imageHeight?: number;
  /** 预览图片列表字段（默认取 prop，可配数组字段） */
  previewSrcList?: string;
}

/** 标签列 */
export interface TagColumn extends BaseColumn {
  type: 'tag';
  prop: string;
  /** 标签类型映射：值 -> 类型（Element UI 2 无 primary，默认标签用 ''） */
  tagMap?: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'>;
  /** 统一的标签类型 */
  tagType?: '' | 'success' | 'warning' | 'danger' | 'info';
  /** 是否圆角 */
  round?: boolean;
  /** 点击回调 */
  onClick?: (value: any, row: Record<string, any>) => void;
}

/** 日期列 */
export interface DateColumn extends BaseColumn {
  type: 'date';
  prop: string;
  /** 展示粒度，默认仅日期；值为毫秒时间戳或 ISO 字符串 */
  timeDisplay?: TimeDisplayMode;
}

/** 自定义列 */
export interface CustomColumn extends BaseColumn {
  type: 'custom';
  prop: string;
  /** 插槽名（默认 col-{prop}） */
  slotName?: string;
}

/** 操作列 */
export interface ActionColumn extends BaseColumn {
  type: 'action';
  /** 操作按钮列表 */
  buttons: ActionButton[];
  /** 超出此数量后折叠到「更多」下拉，默认 3 */
  maxVisible?: number;
}

/** 展开列 */
export interface ExpandColumn extends BaseColumn {
  type: 'expand';
  /** 列宽，默认 48 */
  width?: string | number;
}

/** 多级表头分组 */
export interface GroupColumn extends BaseColumn {
  type: 'group';
  children: ColumnSchema[];
  /** 分组表头多行文案；未设置时用 label 单行 */
  headerLines?: string[];
}

// ==================== 联合类型 ====================

export type ColumnSchema =
  | SelectionColumn
  | IndexColumn
  | TextColumn
  | ImageColumn
  | TagColumn
  | DateColumn
  | CustomColumn
  | ActionColumn
  | ExpandColumn
  | GroupColumn;

// ==================== 分页配置 ====================

export interface PaginationConfig {
  /** 当前页 */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
  /** 总条数 */
  total: number;
  /** 布局，默认 'total, sizes, prev, pager, next, jumper' */
  layout?: string;
  /** 每页条数选项 */
  pageSizes?: number[];
  /** 背景色 */
  background?: boolean;
  /** 是否小型 */
  small?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 页码变化 */
  onPageChange?: (page: number) => void;
  /** 每页条数变化 */
  onSizeChange?: (size: number) => void;
}

// ==================== 筛选配置 ====================

/** 筛选器类型 */
export type FilterType = 'input' | 'select' | 'daterange';

/** 单个筛选项 */
export interface FilterItem {
  /** 唯一标识，对应 filterValues 的 key */
  key: string;
  /** 左侧标签文字（省略时仅用 placeholder 提示含义） */
  label?: string;
  /** 控件类型 */
  type?: FilterType;
  /** 占位文字 */
  placeholder?: string;
  /** daterange 开始日期占位 */
  startPlaceholder?: string;
  /** daterange 结束日期占位 */
  endPlaceholder?: string;
  /** select 的选项（type='select' 时有效） */
  options?: { label: string; value: string | number }[];
  /** 控件宽度 */
  width?: string;
  /** 是否可清空 */
  clearable?: boolean;
  /** select 多选 */
  multiple?: boolean;
  /** select 多选时折叠标签 */
  collapseTags?: boolean;
  /** 文本输入防抖毫秒（默认 300；0 表示不防抖） */
  debounceMs?: number;
  /** filtersCollapsible 为 true 时，收起后仍展示该项 */
  pinned?: boolean;
}

// ==================== 表单配置 ====================

/** 表单字段类型 */
export type FormFieldType =
  | 'input'
  | 'textarea'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'switch'
  | 'date'
  | 'number'
  | 'readonly'
  | 'custom';

/** 表单校验规则（只覆盖 required / min / max） */
export interface FormFieldRule {
  required?: boolean;
  message?: string;
  trigger?: string | string[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (rule: any, value: any, callback: (error?: Error) => void) => void;
}

/** 单个表单字段配置 */
export interface FormField {
  /** 字段类型 */
  type: FormFieldType;
  /** 字段名，对应 model 的 key */
  prop: string;
  /** 标签文字 */
  label?: string;
  /** 占位文字 */
  placeholder?: string;
  /** 校验规则 */
  rules?: FormFieldRule | FormFieldRule[];
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否只读 */
  readonly?: boolean;
  /** 是否隐藏（支持动态） */
  hidden?: boolean | ((model: Record<string, any>) => boolean);
  /** 控件宽度（如 '100%'、'200px'） */
  width?: string;
  /** 字段级 label 宽度（如 '72px'），覆盖表单级 labelWidth */
  labelWidth?: string;
  /** select / radio / checkbox 的选项 */
  options?: { label: string; value: string | number | boolean }[];
  /** textarea 行数 */
  rows?: number;
  /** number 最小值 */
  min?: number;
  /** number 最大值 */
  max?: number;
  /** number 步长 */
  step?: number;
  /** date 显示格式（Element UI 2 用 yyyy-MM-dd） */
  format?: string;
  /** date 值格式（回传 model 用） */
  valueFormat?: string;
  /** 是否可清空 */
  clearable?: boolean;
  /** 是否可筛选（select） */
  filterable?: boolean;
  /** 是否多选（select） */
  multiple?: boolean;
  /** readonly 的格式化函数 */
  formatter?: (value: any, model: Record<string, any>) => string;
  /** 标签旁 ? 悬浮说明；`tipInline: true` 时同时在控件下方展示 */
  tip?: string;
  tipInline?: boolean;
  /** 后缀文字 */
  suffix?: string;
  /** 前置图标类名 */
  prefixIcon?: string;
  /** 后置图标类名 */
  suffixIcon?: string;
  /** 最大长度（input / textarea） */
  maxlength?: number;
  /** 是否显示字数统计 */
  showWordLimit?: boolean;
  /** 是否显示密码切换图标 */
  showPassword?: boolean;
  /** 插槽名（type='custom' 时生效，默认 `form-{prop}`） */
  slotName?: string;
  /** 字段占几列（1=继承分区 cols，2=占满一行），默认 1 */
  colSpan?: number;
  /** 值变化回调 */
  onChange?: (value: any, model: Record<string, any>) => void;
}

/** 表单分区（一组字段） */
export interface FormSection {
  /** 分区标题 */
  title?: string;
  /** 步骤序号，展示在标题左侧 */
  step?: number | string;
  /** 分区描述 */
  description?: string;
  /** 是否隐藏（支持动态判断） */
  hidden?: boolean | ((model: Record<string, any>) => boolean);
  /** 是否可折叠 */
  collapsible?: boolean;
  /** 默认折叠状态 */
  defaultCollapsed?: boolean;
  /** 分区内字段列表 */
  fields: FormField[];
  /** 每行列数（默认 1） */
  cols?: number;
  /** 插槽名，渲染自定义内容（会忽略 fields） */
  slotName?: string;
  /** 分区卡片化（边框 + 浅色表头条） */
  boxed?: boolean;
}

/** 表单 Props */
export interface FormProps {
  /** 分区配置 */
  sections: FormSection[];
  /** 标签宽度，默认 '100px' */
  labelWidth?: string;
  /** 标签位置 */
  labelPosition?: 'left' | 'top' | 'right';
  /** 表单尺寸 */
  size?: '' | 'small' | 'large';
  /** 是否全局禁用 */
  disabled?: boolean;
  /** 是否包一层白色边框盒子 */
  box?: boolean;
  /** HTML class */
  className?: string;
}
