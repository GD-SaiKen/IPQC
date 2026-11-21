import { defineComponent, h, type PropType } from 'vue'

import {
  commitGridCell,
  type GridEditColumn,
} from '@/composables/use-ipqc-grid-cell-commit'
import { ledgerApiTableFromId } from '@/composables/ledger-table-key'

import { getGridSaveContext } from './grid-save-context'

type Row = Record<string, unknown>

export const IpqcGridFormatCell = defineComponent({
  name: 'IpqcGridFormatCell',
  props: {
    text: { type: String, required: true },
    tone: { type: String, default: '' },
  },
  setup(props) {
    return () =>
      h(
        'span',
        {
          class: [
            'et-render',
            props.tone ? `et-badge et-badge--${props.tone}` : '',
          ],
        },
        props.text,
      )
  },
})

export const IpqcGridSelectCell = defineComponent({
  name: 'IpqcGridSelectCell',
  props: {
    row: { type: Object as PropType<Row>, required: true },
    colKey: { type: String, required: true },
    label: { type: String, required: true },
    options: { type: Array as PropType<string[]>, required: true },
  },
  setup(props) {
    return () =>
      h(
        'select',
        {
          class: 'et-select',
          value: String(props.row[props.colKey] ?? ''),
          onChange: (e: Event) => {
            const value = (e.target as HTMLSelectElement).value
            void onSelect(props.row, props.colKey, props.label, props.options, value)
          },
        },
        props.options.map((op) => h('option', { value: op }, op)),
      )
  },
})

async function onSelect(
  row: Row,
  colKey: string,
  label: string,
  options: string[],
  value: string,
): Promise<void> {
  const ctx = getGridSaveContext()
  if (!ctx) return
  const before = row[colKey]
  const col: GridEditColumn = { key: colKey, label, type: 'select', options }
  const apiTable = ctx.ledgerTable() ?? ledgerApiTableFromId(ctx.tableId)
  const ok = await commitGridCell({
    row,
    col,
    value,
    before,
    apiTable,
    history: ctx.history,
    onSaved: ctx.markSaved,
  })
  if (ok) ctx.onChange(row, colKey, value)
}

export const IpqcGridDeleteCell = defineComponent({
  name: 'IpqcGridDeleteCell',
  props: {
    row: { type: Object as PropType<Row>, required: true },
  },
  setup(props) {
    return () =>
      h(
        'button',
        {
          type: 'button',
          class: 'et-del',
          title: '删除本行',
          onClick: (e: Event) => {
            e.stopPropagation()
            getGridSaveContext()?.onDelete(props.row)
          },
        },
        '×',
      )
  },
})