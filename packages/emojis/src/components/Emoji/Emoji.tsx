import { Data } from '../../config'
import { SearchIndex } from '../../helpers'

// Must equal the emoji-datasource the Data package builds against. See ADR-0008.
const DATASOURCE_VERSION = '16.0.0'

// Interpolated into an image URL, so it has to stay inside its path segment.
const DATASOURCE_VERSION_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/

let warnedAboutFallback = false

function resolveDatasourceVersion() {
  const declared = Data?.datasourceVersion

  if (
    typeof declared === 'string' &&
    DATASOURCE_VERSION_PATTERN.test(declared)
  ) {
    return declared
  }

  if (!warnedAboutFallback) {
    warnedAboutFallback = true
    console.warn(
      `[EmojiMart] The data supplied does not declare the emoji-datasource version it was built against, so images fall back to ${DATASOURCE_VERSION}. Sprites built against another version will be drawn from the wrong cell.`,
    )
  }

  return DATASOURCE_VERSION
}

export default function Emoji(props) {
  let { id, skin, emoji } = props

  if (props.shortcodes) {
    const matches = props.shortcodes.match(SearchIndex.SHORTCODES_REGEX)

    if (matches) {
      id = matches[1]

      if (matches[2]) {
        skin = matches[2]
      }
    }
  }

  emoji || (emoji = SearchIndex.get(id || props.native))
  if (!emoji) return props.fallback

  const emojiSkin = emoji.skins[skin - 1] || emoji.skins[0]

  // Lazy and memoised: a consumer who supplies both URLs resolves nothing.
  let version
  const datasourceVersion = () =>
    version || (version = resolveDatasourceVersion())

  const imageSrc =
    emojiSkin.src ||
    (props.set != 'native' && !props.spritesheet
      ? typeof props.getImageURL === 'function'
        ? props.getImageURL(props.set, emojiSkin.unified)
        : `https://cdn.jsdelivr.net/npm/emoji-datasource-${props.set}@${datasourceVersion()}/img/${props.set}/64/${emojiSkin.unified}.png`
      : undefined)

  const spritesheetSrc = () =>
    typeof props.getSpritesheetURL === 'function'
      ? props.getSpritesheetURL(props.set)
      : `https://cdn.jsdelivr.net/npm/emoji-datasource-${props.set}@${datasourceVersion()}/img/${props.set}/sheets-256/64.png`

  return (
    <span class="emoji-mart-emoji" data-emoji-set={props.set}>
      {imageSrc ? (
        <img
          style={{
            maxWidth: props.size || '1em',
            maxHeight: props.size || '1em',
            display: 'inline-block',
          }}
          alt={emojiSkin.native || emojiSkin.shortcodes}
          src={imageSrc}
        />
      ) : props.set == 'native' ? (
        <span
          style={{
            fontSize: props.size,
            fontFamily:
              '"EmojiMart", "Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Twemoji Mozilla", "Noto Color Emoji", "Android Emoji"',
          }}
        >
          {emojiSkin.native}
        </span>
      ) : (
        <span
          style={{
            display: 'block',
            width: props.size,
            height: props.size,
            backgroundImage: `url(${spritesheetSrc()})`,
            backgroundSize: `${100 * Data.sheet.cols}% ${
              100 * Data.sheet.rows
            }%`,
            backgroundPosition: `${
              (100 / (Data.sheet.cols - 1)) * emojiSkin.x
            }% ${(100 / (Data.sheet.rows - 1)) * emojiSkin.y}%`,
          }}
        ></span>
      )}
    </span>
  )
}
