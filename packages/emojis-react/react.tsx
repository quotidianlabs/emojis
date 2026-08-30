import React, { useEffect, useRef } from 'react'
import { Picker } from '@quotidianlabs/emojis'

export type EmojiSet = 'native' | 'apple' | 'facebook' | 'google' | 'twitter'

export type EmojiVersion =
  1 | 2 | 3 | 4 | 5 | 11 | 12 | 12.1 | 13 | 13.1 | 14 | 15 | 15.1 | 16

export type Icons = 'auto' | 'outline' | 'solid'

export type Locale =
  | 'en'
  | 'ar'
  | 'be'
  | 'cs'
  | 'de'
  | 'es'
  | 'fa'
  | 'fi'
  | 'fr'
  | 'hi'
  | 'it'
  | 'ja'
  | 'ko'
  | 'nl'
  | 'pl'
  | 'pt'
  | 'ru'
  | 'sa'
  | 'tr'
  | 'uk'
  | 'vi'
  | 'zh'

export type NavPosition = 'top' | 'bottom' | 'none'

export type PreviewPosition = 'top' | 'bottom' | 'none'

export type SearchPosition = 'sticky' | 'static' | 'none'

export type SkinIndex = 1 | 2 | 3 | 4 | 5 | 6

export type SkinTonePosition = 'preview' | 'search' | 'none'

export type Theme = 'auto' | 'light' | 'dark'

export interface PickerSkin {
  unified?: string
  native?: string
  shortcodes?: string
  src?: string
  x?: number
  y?: number
}

export interface PickerEmoji {
  id: string
  name: string
  keywords?: string[]
  skins: PickerSkin[]
  version?: number
  emoticons?: string[]
}

export interface PickerCategory {
  id: string
  emojis: string[]
}

export interface PickerData {
  categories: PickerCategory[]
  emojis: { [id: string]: PickerEmoji }
  aliases: { [alias: string]: string }
  sheet: { cols: number; rows: number }
}

export interface PickerI18n {
  search: string
  search_no_results_1: string
  search_no_results_2: string
  pick: string
  add_custom: string
  categories: { [category: string]: string }
  skins: { choose: string; [index: string]: string }
}

export interface CategoryIcon {
  src?: string
  svg?: string
}

export interface CustomEmoji {
  id: string
  name: string
  keywords?: string[]
  skins: PickerSkin[]
}

export interface CustomCategory {
  id?: string
  name?: string
  icon?: CategoryIcon
  emojis: CustomEmoji[]
}

export interface SelectedEmoji {
  id: string
  name: string
  shortcodes: string
  native?: string
  unified?: string
  keywords?: string[]
  aliases?: string[]
  emoticons?: string[]
  skin?: SkinIndex
  src?: string
}

export interface EmojiPickerProps {
  autoFocus?: boolean
  dynamicWidth?: boolean
  emojiButtonColors?: string[]
  emojiButtonRadius?: string
  emojiButtonSize?: number
  emojiSize?: number
  emojiVersion?: EmojiVersion
  exceptEmojis?: string[]
  icons?: Icons
  locale?: Locale
  maxFrequentRows?: number
  navPosition?: NavPosition
  noCountryFlags?: boolean
  noResultsEmoji?: string
  perLine?: number
  previewEmoji?: string
  previewPosition?: PreviewPosition
  searchPosition?: SearchPosition
  set?: EmojiSet
  skin?: SkinIndex
  skinTonePosition?: SkinTonePosition
  theme?: Theme

  categories?: string[]
  categoryIcons?: { [category: string]: CategoryIcon }
  custom?: CustomCategory[]
  data?: PickerData | (() => PickerData | Promise<PickerData>)
  i18n?: PickerI18n | (() => PickerI18n | Promise<PickerI18n>)

  getImageURL?: (set: EmojiSet, unified: string) => string
  getSpritesheetURL?: (set: EmojiSet) => string
  onAddCustomEmoji?: (event: MouseEvent) => void
  onClickOutside?: (event: MouseEvent) => void
  onEmojiSelect?: (
    emoji: SelectedEmoji,
    event: MouseEvent | KeyboardEvent,
  ) => void

  /** @deprecated Use `searchPosition` instead. */
  stickySearch?: boolean
}

interface PickerInstance {
  update(props: EmojiPickerProps): void
}

export default function EmojiPicker(
  props: EmojiPickerProps,
): React.ReactElement {
  const ref = useRef<HTMLDivElement>(null)
  const instance = useRef<PickerInstance | null>(null)

  if (instance.current) {
    instance.current.update(props)
  }

  useEffect(() => {
    instance.current = new Picker({ ...props, ref })

    return () => {
      instance.current = null
    }
  }, [])

  return React.createElement('div', { ref })
}
