export type ItemAction = 'visible' | 'hidden' | 'focused' | 'blurred';


export interface BaseComponentProps {
  fKey: string
  onFocus?: (key: string) => void
  onBlurred?: (key: string) => void
  onRegister?: (key: string) => void
  onUnregister?: (key: string) => void
}
