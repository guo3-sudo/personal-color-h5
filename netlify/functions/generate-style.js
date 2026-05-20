const SEASON_PROMPTS = {
  SPRING: [
    'Korean fashion lookbook, spring warm color palette outfit, peach coral chiffon blouse with cream wide-leg trousers, gold accessories, fresh vibrant feminine, full body professional fashion photo, soft natural light, clean background',
    'Korean street style, warm spring tones, ivory knit cardigan over salmon pink floral midi skirt, straw bag, bright airy aesthetic, full body fashion photo, sunny outdoor setting',
    'Korean feminine style, spring warm palette, warm beige blazer with apricot blouse and camel culottes, delicate gold jewelry, fresh polished look, full body fashion editorial',
    'Korean casual chic, spring warm colors, coral off-shoulder top with khaki linen wide pants, woven sandals, warm natural vibe, full body lookbook photo, light bokeh',
  ],
  SUMMER: [
    'Korean fashion lookbook, summer cool color palette outfit, lavender mauve chiffon wrap dress with powder blue cardigan, silver accessories, soft muted elegant feminine, full body professional fashion photo, soft studio light',
    'Korean minimal style, cool summer tones, dusty rose silk blouse with steel blue wide-leg trousers, understated chic, full body fashion photo, clean white background',
    'Korean feminine style, summer cool palette, soft lilac blazer set with periwinkle inner top, silver jewelry, refined graceful look, full body fashion editorial, pastel background',
    'Korean casual chic, summer cool colors, mauve ribbed knit top with light gray palazzo pants, lavender tote bag, ethereal soft aesthetic, full body lookbook photo',
  ],
  AUTUMN: [
    'Korean fashion lookbook, autumn warm color palette outfit, rust orange turtleneck with camel wool long coat, brown leather boots, rich earthy sophisticated, full body professional fashion photo, warm golden lighting',
    'Korean street style, warm autumn tones, mustard yellow oversized sweater over olive green midi skirt, brown belt and boots, cozy chic aesthetic, full body fashion photo, autumn leaves background',
    'Korean feminine style, autumn warm palette, terracotta suede wrap dress with warm brown leather belt, amber earrings, elegant grounded look, full body fashion editorial',
    'Korean casual chic, autumn warm colors, burnt sienna blazer with dark chocolate turtleneck and camel wide pants, tortoiseshell accessories, sophisticated warm aesthetic, full body lookbook photo',
  ],
  WINTER: [
    'Korean fashion lookbook, winter cool color palette outfit, navy double-breasted blazer with crisp white shirt and black tailored trousers, silver jewelry, sharp polished, full body professional fashion photo, dramatic studio light',
    'Korean minimal style, cool winter tones, burgundy wine structured wool coat over black turtleneck and charcoal trousers, sleek editorial look, full body fashion photo, dark minimal background',
    'Korean feminine style, winter cool palette, cobalt blue midi dress with black structured jacket, bold silver necklace, dramatic chic, full body fashion editorial',
    'Korean casual chic, monochrome winter outfit, all-black coordinated set with white statement bag and silver boots, modern aesthetic, full body lookbook photo',
  ],
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
      },
      body: '',
    }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  const apiKey = process.env.SILICON_FLOW_KEY
  if (!apiKey) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'API key not configured' }),
    }
  }

  let season
  try {
    const body = JSON.parse(event.body || '{}')
    season = body.season
  } catch {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid request body' }),
    }
  }

  const prompts = SEASON_PROMPTS[season]
  if (!prompts) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid season' }),
    }
  }

  const generate = async (prompt) => {
    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Kwai-Kolors/Kolors',
        prompt,
        image_size: '512x768',
        num_inference_steps: 20,
        guidance_scale: 5,
        n: 1,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SiliconFlow error ${res.status}: ${text}`)
    }

    const data = await res.json()
    const url = data?.images?.[0]?.url || data?.data?.[0]?.url
    if (!url) throw new Error('No image URL in response')

    const imgRes = await fetch(url)
    const buf = await imgRes.arrayBuffer()
    const b64 = Buffer.from(buf).toString('base64')
    const ct = imgRes.headers.get('content-type') || ''
    const mime = ct.startsWith('image/') ? ct : 'image/jpeg'
    return `data:${mime};base64,${b64}`
  }

  try {
    const images = await Promise.all(prompts.map(generate))
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ images }),
    }
  } catch (err) {
    console.error('generate-style error:', err)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: String(err) }),
    }
  }
}
