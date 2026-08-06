exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let image, mimeType;
  try {
    ({ image, mimeType } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'リクエストの形式が不正です' }) };
  }
  if (!image || !mimeType) {
    return { statusCode: 400, body: JSON.stringify({ error: '画像データがありません' }) };
  }

  let response;
  try {
    response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: image }
          },
          {
            type: 'text',
            text: `この食事の写真を分析してください。判定前に必ず以下の手順で進めること:

1. 皿数を数え、それぞれが主食／主菜／副菜／汁物のどれかを分類する
2. 食材の種類（魚類／貝類／甲殻類／肉類／卵／大豆製品など）を形・質感・殻の有無で見分ける。断定できない場合は「魚」のような曖昧な総称ではなく最も近い具体名（例:帆立、鮭、鶏もも）を使う
3. 下記の基準分量表と、器・箸（約23cm）・手など写っているものとの相対サイズを比較して、皿ごとにg数を見積もる
4. 焼き色・とろみ・油の照りから、タレ／油／ドレッシングの使用量を加味する
5. 手順1〜4で見積もった皿ごとのカロリー・PFCを合算して最終値にする（合算の内訳をmemoに残す）

基準分量表（目安）:
- 茶碗のご飯: 普通盛り約150g、大盛り約220g
- 味噌汁・スープ椀: 1杯約150〜180ml
- 小鉢の副菜・お浸し: 約60〜80g
- 中皿のメイン(魚・肉・貝など): 約80〜150g
- 中皿の生野菜サラダ: 約100〜150g

以下のJSON形式のみで返答してください（他のテキスト不要）:
{
  "food_name": "食べたものの名前（日本語、具体的な食材名。複数あればカンマ区切り）",
  "calories": 推定カロリー（整数、kcal）,
  "protein": タンパク質（小数点1桁、g）,
  "fat": 脂質（小数点1桁、g）,
  "carbs": 炭水化物（小数点1桁、g）,
  "memo": "皿ごとの内訳（食材名・g数・kcal）と、誤差が出やすい点"
}`
          }
        ]
      }]
    })
    });
  } catch (e) {
    return { statusCode: 502, body: JSON.stringify({ error: 'AI APIへの通信に失敗しました: ' + e.message }) };
  }

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
