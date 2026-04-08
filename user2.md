コードレビュー結果

  1. バグ（実際に壊れる/壊れうる問題）

  parser.ts:360 — For ループの children で filter(Boolean) を使っている

  return { type: "For", children: [init, test, update, body].filter(Boolean) };
  一方、generator.ts:703 では固定位置で destructure している：
  const [init, test, update, body] = node.children;
  for(; i < 5; i++) のように init が null の場合、filter(Boolean) で除去されるので children = [test,
  update, body] になり、generator 側の destructuring がずれる。init が test に、test が update
  に割り当てられてしまう。 filter(Boolean) を外して null を保持するか、generator
  側で名前付きプロパティを使うべき。

  normalize.ts — 文字列リテラル内の // や /* を壊す

  text = text.replace(/\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, " "));
  String url = "http://example.com"; のような入力で、//example.com がコメントとして除去される。normalize
  は文字列リテラルの中をスキップする必要がある。

  scope-guard.ts:15 — ジェネリクス検出が機能しない

  { re: /\bgeneric\s*</, why: "Generics are out of scope." },
  Java のジェネリクスは List<String> のように書く。generic というキーワードは Java に存在しない。<\w+>
  のようなパターンか、ArrayList, HashMap などの型名を検出すべき。

  ---
  2. 設計上の問題

  parser.ts — parseDeclaration が int[] arr 構文を扱えない

  int を消費した直後に identifier を期待するので、int[] arr は [ で失敗する。Java では int[] arr
  の方が一般的な書き方。int arr[] 形式のみ対応。IB CS の範囲内で十分かもしれないが、生徒が int[] arr
  と書いたらエラーになる。

  convert.ts — エラーハンドリングが不統一

  - tokenize() → エラーを戻り値として返す
  - parse() → エラーを throw する

  同じパイプラインなのに 2 つのパターンが混在している。どちらかに統一した方が良い。

  parser.ts:135 — isAssignmentAhead() が雑すぎる

  if (next.type === "operator") return true;
  次のトークンがどんな operator でも true を返す。x + 5; のような式文も代入として扱おうとし、+
  が代入演算子でないとエラーになる。=, +=, -= 等に限定すべき。

  page.tsx:19-27 — サンプル出力が実際の変換結果と不一致

  const pseudoFromSample = [
    "PROGRAM main",
    "  DECLARE sum ← 0",
    ...
  大文字キーワード（PROGRAM, DECLARE, FOR）と ← を使っているが、実際のコンバーターは小文字キーワード（loop,
   output）と = を出力する。初期表示と実際の変換結果が食い違い、ユーザーを混乱させる。

  ---
  3. コード品質

  parser.ts — 大量のコード重複

  - parseUpdateExpression (251行目) と parseUpdateStatement (272行目) はセミコロンの有無だけが違う
  - parseAssignment, parseUpdateExpression, parseUpdateStatement
  の3つで配列アクセスのパース部分がコピペされている
  - generator.ts の Assignment ケース (590行目) と AssignmentExpr ケース (620行目) もほぼ同一
  - CallStatement と ExpressionStatement のハンドラも同一

  共通処理をヘルパーに抽出すべき。

  tokenize.ts — ループ内で毎回オブジェクト生成

  while (i < source.length) {
    ...
    const twoOps = ["==", "!=", ...]; // 毎回配列を作る
    const singleMap: Record<string, string> = { ... }; // 毎回オブジェクトを作る
  twoOps と singleMap はループの外（または module
  レベル定数）に出すべき。パフォーマンス的な実害はまだ小さいが、無駄な処理。

  generator.ts:101 — ハードコードされた変数名チェック

  if (objectText === "map") {
    return remove ${objectText}[${args[0]}];
  }
  変数名が "map" かどうかで分岐している。変数名が myMap や hashTable
  だったら機能しない。型情報やメソッド呼び出しパターンで判断すべき。

  parser.ts:6 — AstNode 型が緩すぎる

  export type AstNode = {
    type: string;
    [key: string]: any;
  };
  [key: string]: any では型安全性がゼロ。discriminated
  union（判別共用体）を使えば、各ノード型のプロパティに型チェックが効く。

  ---
  4. その他

  - node_modules が無い（npm install されていない）ので、テストが全て失敗する
  - convert.ts:21 の _options: Record<string, never>
  は使われていない引数。将来のために残しているなら良いが、YAGNI
  - tokenize.ts:1 の ConvertError は type-only import にすべき（import type { ConvertError }）