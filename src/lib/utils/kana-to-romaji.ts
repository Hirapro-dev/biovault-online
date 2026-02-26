/**
 * ひらがな/カタカナ → ローマ字（ヘボン式）変換
 * 苗字のID生成用
 */

const ROMAJI_MAP: Record<string, string> = {
  // 基本
  "あ": "a", "い": "i", "う": "u", "え": "e", "お": "o",
  "か": "ka", "き": "ki", "く": "ku", "け": "ke", "こ": "ko",
  "さ": "sa", "し": "shi", "す": "su", "せ": "se", "そ": "so",
  "た": "ta", "ち": "chi", "つ": "tsu", "て": "te", "と": "to",
  "な": "na", "に": "ni", "ぬ": "nu", "ね": "ne", "の": "no",
  "は": "ha", "ひ": "hi", "ふ": "fu", "へ": "he", "ほ": "ho",
  "ま": "ma", "み": "mi", "む": "mu", "め": "me", "も": "mo",
  "や": "ya", "ゆ": "yu", "よ": "yo",
  "ら": "ra", "り": "ri", "る": "ru", "れ": "re", "ろ": "ro",
  "わ": "wa", "ゐ": "wi", "ゑ": "we", "を": "wo",
  "ん": "n",
  // 濁音
  "が": "ga", "ぎ": "gi", "ぐ": "gu", "げ": "ge", "ご": "go",
  "ざ": "za", "じ": "ji", "ず": "zu", "ぜ": "ze", "ぞ": "zo",
  "だ": "da", "ぢ": "di", "づ": "du", "で": "de", "ど": "do",
  "ば": "ba", "び": "bi", "ぶ": "bu", "べ": "be", "ぼ": "bo",
  // 半濁音
  "ぱ": "pa", "ぴ": "pi", "ぷ": "pu", "ぺ": "pe", "ぽ": "po",
  // 拗音
  "きゃ": "kya", "きゅ": "kyu", "きょ": "kyo",
  "しゃ": "sha", "しゅ": "shu", "しょ": "sho",
  "ちゃ": "cha", "ちゅ": "chu", "ちょ": "cho",
  "にゃ": "nya", "にゅ": "nyu", "にょ": "nyo",
  "ひゃ": "hya", "ひゅ": "hyu", "ひょ": "hyo",
  "みゃ": "mya", "みゅ": "myu", "みょ": "myo",
  "りゃ": "rya", "りゅ": "ryu", "りょ": "ryo",
  "ぎゃ": "gya", "ぎゅ": "gyu", "ぎょ": "gyo",
  "じゃ": "ja", "じゅ": "ju", "じょ": "jo",
  "びゃ": "bya", "びゅ": "byu", "びょ": "byo",
  "ぴゃ": "pya", "ぴゅ": "pyu", "ぴょ": "pyo",
  // 促音は変換時に処理
  "っ": "",
  // 長音
  "ー": "",
};

// カタカナ → ひらがな変換
function katakanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) =>
    String.fromCharCode(match.charCodeAt(0) - 0x60)
  );
}

/**
 * ひらがな/カタカナをローマ字（小文字）に変換
 */
export function kanaToRomaji(kana: string): string {
  // カタカナ→ひらがなに統一
  const hiragana = katakanaToHiragana(kana.trim());
  let result = "";
  let i = 0;

  while (i < hiragana.length) {
    // 促音（っ）の処理: 次の子音を重ねる
    if (hiragana[i] === "っ" && i + 1 < hiragana.length) {
      // 2文字拗音チェック
      const nextTwo = hiragana.substring(i + 1, i + 3);
      const nextOne = hiragana[i + 1];
      const nextRomaji = ROMAJI_MAP[nextTwo] || ROMAJI_MAP[nextOne] || "";
      if (nextRomaji.length > 0) {
        result += nextRomaji[0]; // 子音を重ねる
      }
      i++;
      continue;
    }

    // 2文字の拗音を先にチェック
    if (i + 1 < hiragana.length) {
      const two = hiragana.substring(i, i + 2);
      if (ROMAJI_MAP[two] !== undefined) {
        result += ROMAJI_MAP[two];
        i += 2;
        continue;
      }
    }

    // 1文字
    const one = hiragana[i];
    if (ROMAJI_MAP[one] !== undefined) {
      result += ROMAJI_MAP[one];
    }
    // ひらがな/カタカナ以外はスキップ

    i++;
  }

  return result.toLowerCase();
}

/**
 * 苗字のふりがなからID用プレフィックスを生成
 * 全角スペース・半角スペースで姓名を分割し、姓部分のみをローマ字に変換
 */
export function generateCustomerIdFromKana(nameKana: string): string {
  // スペースで分割して苗字を取得
  const parts = nameKana.trim().split(/[\s\u3000]+/);
  const familyNameKana = parts[0] || "";
  const romaji = kanaToRomaji(familyNameKana);

  if (!romaji) return generateRandomDigits();

  // ローマ字 + ランダム数字4桁
  const digits = generateRandomDigits();
  return `${romaji}${digits}`;
}

/**
 * ランダム数字4桁を生成
 */
function generateRandomDigits(): string {
  const num = Math.floor(Math.random() * 10000);
  return String(num).padStart(4, "0");
}
