const PROMPTS = {
  SPRING: {
    outfit: [
      'Korean fashion lookbook, spring warm color palette outfit, peach coral blouse with cream wide-leg trousers, gold accessories, full body professional fashion photo, soft natural light, clean background',
      'Korean street style, warm spring tones, ivory knit cardigan over salmon pink midi skirt, warm and fresh aesthetic, full body fashion photo',
    ],
    hair: [
      'Korean beauty portrait, layered warm-toned hair with caramel highlights, fresh spring warmth, professional portrait photography, high quality, detailed face',
      'Korean hairstyle photo, honey golden waves with warm bronze tones, feminine spring vibe, beauty photography, close-up portrait',
    ],
    makeup: [
      'Korean makeup look, spring warm palette, coral peach lips, warm peachy blush, golden bronze eye shadow, dewy fresh skin, beauty photography closeup portrait',
      'Korean spring beauty, salmon lip gloss, light apricot blush, champagne shimmer eyes, natural glass skin, professional beauty photo',
    ],
  },
  SUMMER: {
    outfit: [
      'Korean fashion lookbook, summer cool color palette outfit, lavender mauve chiffon dress with powder blue cardigan, silver accessories, full body fashion photo, soft studio light',
      'Korean minimal style, cool summer tones, dusty rose blouse with steel blue wide-leg trousers, refined chic look, full body fashion photo',
    ],
    hair: [
      'Korean beauty portrait, cool-toned ash hair with lavender highlights, soft summer aesthetic, professional portrait photography, high quality, detailed face',
      'Korean hairstyle photo, platinum silver waves with cool violet tones, ethereal summer vibes, beauty photography, close-up portrait',
    ],
    makeup: [
      'Korean makeup look, summer cool palette, muted rose lips, soft lavender blush, cool gray-violet eye shadow, porcelain skin, beauty photography closeup portrait',
      'Korean summer beauty, dusty pink lip, periwinkle eye, mauve blush, cool dewy skin, professional beauty photo',
    ],
  },
  AUTUMN: {
    outfit: [
      'Korean fashion lookbook, autumn warm color palette outfit, rust orange turtleneck with camel wool long coat, brown leather boots, full body professional fashion photo, warm golden lighting',
      'Korean street style, warm autumn tones, mustard yellow oversized sweater over olive green midi skirt, cozy chic aesthetic, full body fashion photo',
    ],
    hair: [
      'Korean beauty portrait, rich copper-brown hair with warm amber highlights, deep autumn richness, professional portrait photography, high quality, detailed face',
      'Korean hairstyle photo, warm chestnut waves with golden bronze tones, sophisticated autumn vibe, beauty photography, close-up portrait',
    ],
    makeup: [
      'Korean makeup look, autumn warm palette, brick red lips, warm terracotta blush, deep earthy brown eye shadow, rich warm skin, beauty photography closeup portrait',
      'Korean autumn beauty, burnt sienna lip, caramel blush, golden bronze smoky eyes, warm glowing skin, professional beauty photo',
    ],
  },
  WINTER: {
    outfit: [
      'Korean fashion lookbook, winter cool color palette outfit, navy double-breasted blazer with crisp white shirt and black tailored trousers, silver jewelry, full body professional fashion photo, dramatic studio light',
      'Korean minimal style, cool winter tones, burgundy wine structured coat over black turtleneck, sleek and polished, full body fashion photo',
    ],
    hair: [
      'Korean beauty portrait, jet black glossy hair with cool blue-black tones, sharp winter elegance, professional portrait photography, high quality, detailed face',
      'Korean hairstyle photo, dark near-black hair with cool graphite highlights, dramatic winter sophistication, beauty photography, close-up portrait',
    ],
    makeup: [
      'Korean makeup look, winter cool palette, true red lips, cool rosy blush, deep navy-gray eye shadow, porcelain cool skin, beauty photography closeup portrait',
      'Korean winter beauty, wine red lip, icy pink blush, dramatic dark eye, flawless cool skin, professional beauty photo',
    ],
  },
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

  let season, type, faceImage, count
  try {
    const body = JSON.parse(event.body || '{}')
    season = body.season
    type = body.type || 'outfit'
    faceImage = body.faceImage || null
    count = Math.min(body.count || 2, 2)
  } catch {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid request body' }),
    }
  }

  const seasonPrompts = PROMPTS[season]
  if (!seasonPrompts) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Invalid season' }),
    }
  }

  const prompts = seasonPrompts[type] || seasonPrompts.outfit

  const generate = async (prompt) => {
    const requestBody = {
      model: 'Kwai-Kolors/Kolors',
      prompt,
      image_size: type === 'outfit' ? '512x768' : '512x768',
      num_inference_steps: 20,
      guidance_scale: faceImage ? 7 : 5,
      n: 1,
    }

    if (faceImage) {
      requestBody.image = faceImage
    }

    const res = await fetch('https://api.siliconflow.cn/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`SiliconFlow ${res.status}: ${text}`)
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
    const selectedPrompts = prompts.slice(0, count)
    const images = await Promise.all(selectedPrompts.map(generate))
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
