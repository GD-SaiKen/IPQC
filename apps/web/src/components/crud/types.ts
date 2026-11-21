// CRUD 五件套的类型契约。与具体业务无关，整份可直接复制。
// Vue 3 + Element Plus 版；Vue 2 版见 ../vue2/types.ts（差异：图标用字符串类名、日期用 timeDisplay）。

import type { Component } from 'vue'

// ==================== 操作按钮 ====================

/** 单个操作按钮配置 */
export interface ActionButton {
  /** 按钮文字 */
  label: string
  /** 按钮类型（'text' 会渲染成 link 文字按钮） */
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text'
  /** 点击回调，接收当前行数据 */
  onClick: (row: Record<string, any>, index: number) => void
  /** 是否隐藏（动态控制） */
  hidden?: (row: Record<string, any>) => boolean
  /**
   * 图标组件（@element-plus/icons-vue）。
   * 未传时按 label 匹配默认图标（查看/编辑/删除等，见 action-button-icons.ts）；
   * 传 false 表示不要图标。
   */
  icon?: Component | false
  /** tooltip 文本，默认用 label */
  tooltip?: string
}

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

// ==================== 列 Schema ====================

/** 基础列属性 */
interface BaseColumn {
  /** 列类型 */
  type: ColumnType
  /** 列标题 */
  label?: string
  /** 字段名（selection / index / action 可不传） */
  prop?: string
  /** 列宽 */
  width?: string | number
  /** 最小列宽 */
  minWidth?: string | number
  /** 对齐方式（未设置时按 column-sizing 的规则推断，业务文本列默认左对齐） */
  align?: 'left' | 'center' | 'right'
  /** 表头对齐（未设置时与 align 一致） */
  headerAlign?: 'left' | 'center' | 'right'
  /** 是否可排序 */
  sortable?: boolean | 'custom'
  /** 是否显示 tooltip 溢出文本 */
  showOverflowTooltip?: boolean
  /** 格式化函数 */
  formatter?: (value: any, row: Record<string, any>, index: number) => string
  /** 列附加 class */
  className?: string
  /** 为 true 强制弹性；为 false 时仅 minWidth 视为固定宽；仅 minWidth 时默认弹性铺满 */
  flex?: boolean
  /** 固定列：true / 'left' 左侧固定，'right' 右侧固定；操作列默认右侧固定，设 fixed=false 取消 */
  fixed?: boolean | 'left' | 'right'
  /**
   * 操作列（custom 插槽）：按行返回当前可见按钮文案，供 Table 扫描全表计算列宽。
   * 行内按钮数量/文案随状态变化时必须配置，否则列宽只会停在 minWidth。
   */
  actionLabels?: (row: Record<string, any>) => string[]
}

/** 选择列 */
export interface SelectionColumn extends BaseColumn {
  type: 'selection'
  /** 已选中的行数据 */
  modelValue?: any[]
  /** 选择变化回调 */
  onSelectionChange?: (rows: any[]) => void
}

/** 序号列 */
export interface IndexColumn extends BaseColumn {
  type: 'index'
  /** 起始序号，默认 1（分页场景传 (page-1)*pageSize+1） */
  startIndex?: number
}

/** 文本列 */
export interface TextColumn extends BaseColumn {
  type: 'text'
  prop: string
  /** 点击回调（如名称跳转详情） */
  onClick?: (value: any, row: Record<string, any>) => void
}

/** 图片列 */
export interface ImageColumn extends BaseColumn {
  type: 'image'
  prop: string
  /** 缩略图宽度 */
  imageWidth?: number
  /** 缩略图高度 */
  imageHeight?: number
  /** 预览图片列表字段（默认取 prop，可配数组字段） */
  previewSrcList?: string
}

/** 标签列 */
export interface TagColumn extends BaseColumn {
  type: 'tag'
  prop: string
  /** 标签类型映射：值 -> 类型 */
  tagMap?: Record<string, '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'>
  /** 统一的标签类型 */
  tagType?: '' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  /** 是否圆角 */
  round?: boolean
  /** 点击回调 */
  onClick?: (value: any, row: Record<string, any>) => void
}

/** 日期列 */
export interface DateColumn extends BaseColumn {
  type: 'date'
  prop: string
  /** 日期格式，默认 'YYYY-MM-DD HH:mm:ss'（dayjs 风格大写；Vue 2 版是 yyyy-MM-dd） */
  format?: string
}

/** 自定义列 */
export interface CustomColumn extends BaseColumn {
  type: 'custom'
  prop: string
  /** 插槽名（默认 col-{prop}） */
  slotName?: string
}

/** 操作列 */
export interface ActionColumn extends BaseColumn {
  type: 'action'
  /** 操作按钮列表 */
  buttons: ActionButton[]
  /** 超出此数量后折叠到「更多」下拉，默认 3 */
  maxVisible?: number
}

/** 展开列 */
export interface ExpandColumn extends BaseColumn {
  type: 'expand'
  /** 列宽，默认 48 */
  width?: string | number
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

// ==================== 分页配置 ====================

export interface PaginationConfig {
  /** 当前页 */
  page?: number
  /** 每页条数 */
  pageSize?: number
  /** 总条数 */
  total: number
  /** 布局，默认 'total, sizes, prev, pager, next, jumper' */
  layout?: string
  /** 每页条数选项 */
  pageSizes?: number[]
  /** 背景色 */
  background?: boolean
  /** 是否小型 */
  small?: boolean
  /** 是否禁用 */
  disabled?: boolean
  /** 页码变化 */
  onPageChange?: (page: number) => void
  /** 每页条数变化 */
  onSizeChange?: (size: number) => void
}

// ==================== 筛选配置 ====================

/** 筛选器类型 */
export type FilterType = 'input' | 'select'

/** 单个筛选项 */
export interface FilterItem {
  /** 唯一标识，对应 filterValues 的 key */
  key: string
  /** 左侧标签文字 */
  label?: string
  /** 控件类型 */
  type?: FilterType
  /** 占位文字 */
  placeholder?: string
  /** select 的选项（type='select' 时有效） */
  options?: { label: string; value: string | number }[]
  /** 控件宽度 */
  width?: string
  /** 是否可清空 */
  clearable?: boolean
  /** 文本输入防抖毫秒（默认 300；0 表示不防抖） */
  debounceMs?: number
}

// ==================== 表格 Props ====================

export interface TableProps {
  /** 列配置 */
  columns: ColumnSchema[]
  /** 表格数据 */
  data: Record<string, any>[]
  /** 表格尺寸 */
  size?: '' | 'small' | 'large'
  /** 加载状态 */
  loading?: boolean
  /** 是否显示边框 */
  border?: boolean
  /** 是否斑马纹 */
  stripe?: boolean
  /** 行 key */
  rowKey?: string
  /** 最大高度 */
  maxHeight?: string | number
  /** 空表时是否撑满父容器高度（嵌套展开子表设为 false，避免 body 塌缩） */
  emptyFill?: boolean
  /** 表头行高亮 */
  highlightCurrentRow?: boolean
  /** 已选中行（配合 v-model:selection） */
  selection?: any[]
  /** 行点击 */
  onRowClick?: (row: Record<string, any>, column: any, event: Event) => void
}

// ==================== 分页组件 Props ====================

export interface PaginationProps {
  /** 分页配置 */
  config: PaginationConfig
  /** 是否固定在底部 */
  fixed?: boolean
}

// ==================== 表单配置 ====================

/** 表单字段类型 */
export type FormFieldType =
  | 'input' // 文本输入
  | 'textarea' // 多行文本
  | 'select' // 下拉选择
  | 'radio' // 单选组
  | 'checkbox' // 多选组
  | 'switch' // 开关
  | 'date' // 日期选择
  | 'number' // 数字输入
  | 'readonly' // 只读展示（详情页用）
  | 'custom' // 自定义插槽

/** 表单校验规则（只覆盖 required / min / max；复杂规则请在页面里用 el-form 自定义校验） */
export interface FormFieldRule {
  required?: boolean
  message?: string
  trigger?: string | string[]
  min?: number
  max?: number
  pattern?: RegExp
  validator?: (rule: any, value: any, callback: (error?: Error) => void) => void
}

/** 单个表单字段配置 */
export interface FormField {
  /** 字段类型 */
  type: FormFieldType
  /** 字段名，对应 model 的 key */
  prop: string
  /** 标签文字 */
  label?: string
  /** 占位文字 */
  placeholder?: string
  /** 校验规则 */
  rules?: FormFieldRule | FormFieldRule[]
  /** 是否禁用 */
  disabled?: boolean
  /** 是否只读 */
  readonly?: boolean
  /** 是否隐藏（支持动态） */
  hidden?: boolean | ((model: Record<string, any>) => boolean)
  /** 控件宽度（如 '100%'、'200px'） */
  width?: string
  /** 字段级 label 宽度（如 '72px'），覆盖表单级 labelWidth */
  labelWidth?: string

  // ---- 类型特有配置 ----
  /** select / radio / checkbox 的选项 */
  options?: { label: string; value: string | number | boolean }[]
  /** textarea 行数 */
  rows?: number
  /** number 最小值 */
  min?: number
  /** number 最大值 */
  max?: number
  /** number 步长 */
  step?: number
  /** date 显示格式 */
  format?: string
  /** date 值格式（回传 model 用） */
  valueFormat?: string
  /** 是否可清空（select / date / input） */
  clearable?: boolean
  /** 是否可筛选（select） */
  filterable?: boolean
  /** 是否允许输入创建新选项（select，需配合 filterable） */
  allowCreate?: boolean
  /** 是否多选（select） */
  multiple?: boolean
  /** readonly 的格式化函数 */
  formatter?: (value: any, model: Record<string, any>) => string
  /** 标签旁悬浮说明 */
  tip?: string
  /** 后缀文字 */
  suffix?: string
  /** 前置图标组件 */
  prefixIcon?: Component
  /** 后置图标组件 */
  suffixIcon?: Component
  /** 最大长度（input / textarea） */
  maxlength?: number
  /** 是否显示字数统计（input / textarea） */
  showWordLimit?: boolean
  /** 是否显示密码切换图标（input，凭据字段用） */
  showPassword?: boolean
  /** 插槽名（type='custom' 时生效，默认 `form-{prop}`） */
  slotName?: string
  /** 字段占几列（1=继承分区 cols，2=占满一行），默认 1 */
  colSpan?: number

  /** 值变化回调 */
  onChange?: (value: any, model: Record<string, any>) => void
}

/** 表单分区（一组字段） */
export interface FormSection {
  /** 分区标题（如「一、基本信息」） */
  title?: string
  /** 分区描述 */
  description?: string
  /** 是否隐藏（支持动态判断） */
  hidden?: boolean | ((model: Record<string, any>) => boolean)
  /** 是否可折叠 */
  collapsible?: boolean
  /** 默认折叠状态 */
  defaultCollapsed?: boolean
  /** 分区内字段列表 */
  fields: FormField[]
  /** 每行列数（默认 1），设置 2 则一行 2 个字段 */
  cols?: number
  /** 插槽名，渲染自定义内容（如 section-basic，会忽略 fields） */
  slotName?: string
  /** 分区卡片化（边框 + 浅色表头条），用于弹窗内分区区隔 */
  boxed?: boolean
}

/** 表单 Props */
export interface FormProps {
  /** v-model 绑定数据 */
  modelValue: Record<string, any>
  /** 表单分区配置 */
  sections: FormSection[]
  /** 标签宽度，默认 '100px' */
  labelWidth?: string
  /** 标签位置 */
  labelPosition?: 'left' | 'top' | 'right'
  /** 表单尺寸 */
  size?: '' | 'small' | 'large'
  /** 是否全局禁用 */
  disabled?: boolean
  /** 是否包一层白色边框盒子（默认 false，父容器自行处理边框） */
  box?: boolean
  /** HTML class */
  className?: string
}
