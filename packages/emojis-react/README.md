# `@quotidianlabs/emojis-react`

A React wrapper for [EmojiMart](https://missiveapp.com/open/emoji-mart).

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

## 📚 Documentation
See https://github.com/missive/emoji-mart#react
