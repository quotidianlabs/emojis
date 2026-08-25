# `@quotidianlabs/emojis-react`

A React wrapper for [@quotidianlabs/emojis](https://github.com/quotidianlabs/emojis).

## 🧑‍💻 Usage
```sh
npm install --save @quotidianlabs/emojis @quotidianlabs/emojis-data @quotidianlabs/emojis-react
```

```js
import data from '@quotidianlabs/emojis-data'
import Picker from '@quotidianlabs/emojis-react'

function App() {
  return (
    <Picker data={data} onEmojiSelect={console.log} />
  )
}
```

## 🧷 TypeScript
Type declarations ship with the package, so there is no `@types/` package to
install. Alongside the default export, the wrapper exports a name for every
enumerated prop value it accepts and for every object it hands back.

```tsx
import { useState } from 'react'
import data from '@quotidianlabs/emojis-data'
import Picker from '@quotidianlabs/emojis-react'
import type {
  EmojiPickerProps,
  SelectedEmoji,
  Theme,
} from '@quotidianlabs/emojis-react'

export function EmojiField({ theme }: { theme: Theme }) {
  const [chosen, setChosen] = useState('')

  const handleSelect = (emoji: SelectedEmoji) => {
    // `native` is undefined for a Custom Emoji, which has no codepoints.
    setChosen(emoji.native ?? emoji.shortcodes)
  }

  const options: EmojiPickerProps = {
    data,
    theme,
    previewPosition: 'none',
    onEmojiSelect: handleSelect,
  }

  return (
    <>
      <output>{chosen}</output>
      <Picker {...options} />
    </>
  )
}
```

### Prop value types
Each of these is a union, so a value the picker would silently ignore fails to
compile instead. See [Options / Props](https://github.com/quotidianlabs/emojis#options--props)
for what each prop does.

| Type | Prop | Values |
| ---- | ---- | ------ |
| **EmojiSet** | `set` | `native`, `apple`, `facebook`, `google`, `twitter` |
| **EmojiVersion** | `emojiVersion` | `1`, `2`, `3`, `4`, `5`, `11`, `12`, `12.1`, `13`, `13.1`, `14`, `15` |
| **Icons** | `icons` | `auto`, `outline`, `solid` |
| **Locale** | `locale` | `en`, `ar`, `be`, `cs`, `de`, `es`, `fa`, `fi`, `fr`, `hi`, `it`, `ja`, `ko`, `nl`, `pl`, `pt`, `ru`, `sa`, `tr`, `uk`, `vi`, `zh` |
| **NavPosition** | `navPosition` | `top`, `bottom`, `none` |
| **PreviewPosition** | `previewPosition` | `top`, `bottom`, `none` |
| **SearchPosition** | `searchPosition` | `sticky`, `static`, `none` |
| **SkinIndex** | `skin` | `1`, `2`, `3`, `4`, `5`, `6` |
| **SkinTonePosition** | `skinTonePosition` | `preview`, `search`, `none` |
| **Theme** | `theme` | `auto`, `light`, `dark` |

### Object types
| Type | Describes |
| ---- | --------- |
| **EmojiPickerProps** | Every prop the picker accepts. All are optional. |
| **SelectedEmoji** | The Emoji handed to `onEmojiSelect`. |
| **PickerData** | The Data passed to `data`. |
| **PickerCategory** | One Category of **PickerData**: an id and the Emoji ids it holds. |
| **PickerEmoji** | One Emoji of **PickerData**, carrying **PickerSkin** values. |
| **PickerSkin** | One Skin of an Emoji: its codepoints, or a `src` for a Custom Emoji. |
| **PickerI18n** | The translations passed to `i18n`. |
| **CustomCategory** | One entry of `custom`, holding **CustomEmoji** values. |
| **CustomEmoji** | One Custom Emoji inside a **CustomCategory**. |
| **CategoryIcon** | A `categoryIcons` value, and a **CustomCategory**'s own icon. |

### Two things worth knowing
**`SelectedEmoji.native`, `unified` and `keywords` are optional.** They are read
off the selected Skin, and a Custom Emoji's Skin carries only `src`, so they are
genuinely absent when a custom emoji is picked. `shortcodes` is always present,
which makes it the safe fallback shown above.

**`PickerData` is structural.** It is not imported from
`@quotidianlabs/emojis-data`, so the wrapper does not take a dependency for the
sake of a type. `EmojiMartData` satisfies it, so passing the bundled data
type-checks and so does supplying your own.

## 📚 Documentation
See https://github.com/quotidianlabs/emojis#react
