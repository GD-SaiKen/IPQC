import { ElMessage } from 'element-plus'

export function msgSuccess(message: string): void {
  ElMessage.success(message)
}

export function msgError(message: string): void {
  ElMessage.error(message)
}
