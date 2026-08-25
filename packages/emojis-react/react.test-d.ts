import { createElement, useState } from 'react'
import bundledData from '@quotidianlabs/emojis-data'
import type { EmojiMartData } from '@quotidianlabs/emojis-data'
import EmojiPicker, {
  EmojiPickerProps,
  EmojiSet,
  PickerData,
  PreviewPosition,
  SearchPosition,
  SelectedEmoji,
  Theme,
} from './react'

const data: PickerData = {
  categories: [{ id: 'people', emojis: ['+1'] }],
  emojis: {
    '+1': {
      id: '+1',
      name: 'Thumbs Up',
      keywords: ['approve'],
      skins: [{ unified: '1f44d', native: '👍' }],
      version: 1,
    },
  },
  aliases: { thumbsup: '+1' },
  sheet: { cols: 62, rows: 62 },
}

export const suppliedData = (supplied: EmojiMartData): EmojiPickerProps => ({
  data: supplied,
})

export const bundledSatisfiesPickerData: PickerData = bundledData

export const valid: EmojiPickerProps = {
  autoFocus: true,
  categories: ['frequent', 'people'],
  categoryIcons: { people: { src: './people.png' } },
  custom: [
    {
      id: 'github',
      name: 'GitHub',
      emojis: [
        {
          id: 'octocat',
          name: 'Octocat',
          keywords: ['github'],
          skins: [{ src: './octocat.png' }],
        },
      ],
    },
  ],
  data,
  dynamicWidth: false,
  emojiButtonColors: ['#f00'],
  emojiButtonRadius: '6px',
  emojiButtonSize: 36,
  emojiSize: 24,
  emojiVersion: 13.1,
  exceptEmojis: ['poop'],
  getImageURL: (set, unified) => `./${set}/${unified}.png`,
  getSpritesheetURL: (set) => `./${set}.png`,
  icons: 'outline',
  locale: 'fr',
  maxFrequentRows: 4,
  navPosition: 'bottom',
  noCountryFlags: true,
  noResultsEmoji: 'cry',
  onAddCustomEmoji: (event) => event.preventDefault(),
  onClickOutside: (event) => event.preventDefault(),
  onEmojiSelect: (emoji, event) => {
    const shortcodes: string = emoji.shortcodes
    const native: string | undefined = emoji.native
    const keywords: string[] | undefined = emoji.keywords
    const src: string | undefined = emoji.src
    void [shortcodes, native, keywords, src, event.type]
  },
  perLine: 9,
  previewEmoji: 'point_up',
  previewPosition: 'none',
  searchPosition: 'static',
  set: 'twitter',
  skin: 6,
  skinTonePosition: 'search',
  theme: 'dark',
}

export const asyncData: EmojiPickerProps = {
  data: async () => data,
  i18n: () => ({
    search: 'Search',
    search_no_results_1: 'Oh no!',
    search_no_results_2: 'That emoji couldn’t be found',
    pick: 'Pick an emoji…',
    add_custom: 'Add custom emoji',
    categories: { people: 'Smileys & People' },
    skins: { choose: 'Choose default skin tone', 1: 'Default' },
  }),
}

export const element = createElement(EmojiPicker, {
  data,
  theme: 'auto',
  onEmojiSelect: (emoji: SelectedEmoji) => void emoji.id,
})

export const themes: Theme[] = ['auto', 'light', 'dark']
export const sets: EmojiSet[] = [
  'native',
  'apple',
  'facebook',
  'google',
  'twitter',
]
export const searchPositions: SearchPosition[] = ['sticky', 'static', 'none']
export const previewPositions: PreviewPosition[] = ['top', 'bottom', 'none']

export const invalidTheme: EmojiPickerProps = {
  // @ts-expect-error `blue` is not a Theme
  theme: 'blue',
}

export const invalidSet: EmojiPickerProps = {
  // @ts-expect-error `emojione` is not an EmojiSet
  set: 'emojione',
}

export const invalidSearchPosition: EmojiPickerProps = {
  // @ts-expect-error `fixed` is not a SearchPosition
  searchPosition: 'fixed',
}

export const invalidPreviewPosition: EmojiPickerProps = {
  // @ts-expect-error `left` is not a PreviewPosition
  previewPosition: 'left',
}

export const invalidThemeOnComponent = createElement(EmojiPicker, {
  // @ts-expect-error `blue` is not a Theme
  theme: 'blue',
})

export const invalidSetOnComponent = createElement(EmojiPicker, {
  // @ts-expect-error `emojione` is not an EmojiSet
  set: 'emojione',
})

export const invalidSearchPositionOnComponent = createElement(EmojiPicker, {
  // @ts-expect-error `fixed` is not a SearchPosition
  searchPosition: 'fixed',
})

export const invalidPreviewPositionOnComponent = createElement(EmojiPicker, {
  // @ts-expect-error `left` is not a PreviewPosition
  previewPosition: 'left',
})

// The typed example from README.md, kept compiling. Mirror edits both ways.
export function EmojiField({ theme }: { theme: Theme }) {
  const [chosen, setChosen] = useState('')

  const handleSelect = (emoji: SelectedEmoji) => {
    setChosen(emoji.native ?? emoji.shortcodes)
  }

  const options: EmojiPickerProps = {
    data: bundledData,
    theme,
    previewPosition: 'none',
    onEmojiSelect: handleSelect,
  }

  return createElement(
    'div',
    null,
    createElement('output', null, chosen),
    createElement(EmojiPicker, options),
  )
}
