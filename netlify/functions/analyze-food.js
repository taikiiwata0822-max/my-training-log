exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { image, mimeType } = JSON.parse(event.body);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: image }
          },
          {
            type: 'text',
            text: `この食事の写真を分析してください。判定前に必ず以下を確認すること:
- 食材の種類（魚類／貝類／甲殻類／肉類／卵／大豆製品など）を形・質感・殻の有無で見分け、断定できない場合は「魚」のような曖昧な総称ではなく最も近い具体名（例:帆立、鮭、鶏もも）を使う
- 器の大きさを目安に量（g）を見積もり、ご飯・味噌汁・小鉢それぞれで別に見積もる
- 焼き色・とろみ・油の照りから、タレ／油／ドレッシングの使用量を加味する

以下のJSON形式のみで返答してください（他のテキスト不要）:
{
  "food_name": "食べたものの名前（日本語、具体的な食材名。複数あればカンマ区切り）",
  "calories": 推定カロリー（整数、kcal）,
  "protein": タンパク質（小数点1桁、g）,
  "fat": 脂質（小数点1桁、g）,
  "carbs": 炭水化物（小数点1桁、g）,
  "memo": "食材の見分け根拠と量の目安、誤差が出やすい点（任意）"
}`
          }
        ]
      }]
    })
  });

  const result = await response.json();

  if (!response.ok) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: result.error?.message || 'API error' })
    };
  }

  const text = result.content[0].text.trim();

  try {
    const json = JSON.parse(text.replace(/^```json\n?/, '').replace(/\n?```$/, ''));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(json)
    };
  } catch {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ food_name: text, calories: null, protein: null, fat: null, carbs: null })
    };
  }
};
