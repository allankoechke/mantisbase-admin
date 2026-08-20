const HEAD_SCRIPTS =
  process.env.HEAD_SCRIPTS?.trim() ??
  process.env.NEXT_PUBLIC_HEAD_SCRIPTS?.trim() ??
  ''

function parseScriptTags(html: string) {
  return html.match(/<script[\s\S]*?<\/script>/gi) ?? []
}

function renderScriptTag(tag: string, index: number) {
  const src = tag.match(/\bsrc="([^"]+)"/)?.[1]
  const defer = /\bdefer\b/.test(tag)
  const dataDomain = tag.match(/\bdata-domain="([^"]+)"/)?.[1]
  const inline = tag.match(/<script[^>]*>([\s\S]*?)<\/script>/i)?.[1]?.trim()

  if (src) {
    return (
      <script
        key={index}
        defer={defer || undefined}
        data-domain={dataDomain}
        src={src}
      />
    )
  }

  if (inline) {
    return (
      <script key={index} dangerouslySetInnerHTML={{ __html: inline }} />
    )
  }

  return null
}

export function ScriptHeaders() {
  if (!HEAD_SCRIPTS) {
    return null
  }

  return <>{parseScriptTags(HEAD_SCRIPTS).map(renderScriptTag)}</>
}
