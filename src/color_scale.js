/* (最小値の色、中間の色、最大値の色、取り得る値の範囲、値) => 値をカラースケール化した色 */
/* 入出力の色は、"#RRGGBB"の16進形式。 */
function colorScale(min_color, max_color, min_num, max_num, num, interpolationColors = []) {
  let min_color_r = parseInt(min_color.slice(1, 3), 16);
  let min_color_g = parseInt(min_color.slice(3, 5), 16);
  let min_color_b = parseInt(min_color.slice(5, 7), 16);
  let max_color_r = parseInt(max_color.slice(1, 3), 16);
  let max_color_g = parseInt(max_color.slice(3, 5), 16);
  let max_color_b = parseInt(max_color.slice(5, 7), 16);

    if (interpolationColors.length === 0) {
        /* 数値をMin-Max正規化([0, 1]スケールにする)。 */
        let num_standarized;
        if (min_num === max_num) {
            num_standarized = 1; // 最小値と最大値が同じなら、最大値の色にする。
        } else {
            num_standarized = (num - min_num) / (max_num - min_num);
        }

        /* (正規化した数値) * (色の最大 - 色の最小) + (色の最小) を計算し、数値をカラースケールに変換。 */
        const result_color_r = Math.floor(num_standarized * (max_color_r - min_color_r) + min_color_r);
        const result_color_g = Math.floor(num_standarized * (max_color_g - min_color_g) + min_color_g);
        const result_color_b = Math.floor(num_standarized * (max_color_b - min_color_b) + min_color_b);

        /* RGBを#RRGGBBの形式の文字列に変換して返す。 */
        return `#${result_color_r.toString(16).padStart(2, '0')}${result_color_g.toString(16).padStart(2, '0')}${result_color_b.toString(16).padStart(2, '0')}`;
    } else { /* interpolationColorsが指定されるとき、離散的に、中間の補間色は指定された色を使う */
        let num_standarized;
        interpolationColors.push(max_color);
        interpolationColors.unshift(min_color);
        const interpolationStep = interpolationColors.length;
        if (min_num === max_num) {
            num_standarized = 1;
        } else {
            num_standarized = (num - min_num) / (max_num - min_num); 
        }
        return interpolationColors[indexFromNormalized(num_standarized, interpolationStep)]; 
    }
}

/* elementの背景色をcolorにする。colorは"#RRGGBB"の16進形式。 */
/* 前景色は背景色に応じて自動選択して指定する */
function changeColor(element, color) {
  element.style.backgroundColor = color
  element.style.color = foregroundColor(color);
}

/* 与えられたelementsの背景色を変え、カラースケール化する。 */
/* elementsはdocument.querySelectorAll()の返り値を想定。 */
function setColorScaleOnElements(elements, min_color, max_color, zero_color, null_color, interpolationColors = []) {
  /* スケール化のために、数値の最大・最小を計算する。 */
  const nums = Array.from(elements)
                    .map(td => td.innerText) // セル内のテキストを取り出す。
                    .map(txt => txt.replace(/,/g, "")) // 数字に"10,000"のようなカンマが入っているかもしれないので、除く。
                    .filter(txt => txt !== "" && !Number.isNaN(Number(txt))) // (min, maxを計算したいので)数値として妥当な値だけ取る。
                    .map(txt => Number(txt)) // 数値に変換する。
                    .filter(n => n > 0) // 0より大きい数字を有効な値とする。
  /* 0より大きい値があるときしかmax_numとかを使わないので、numsが空かどうかは気にしない。 */
  const max_num = Math.max(...nums);
  const min_num = Math.min(...nums);

  elements.forEach(td => {
    const num = Number(td.innerText.replace(/,/g, "")); // "10,000"や"1,1"のようにカンマが入っている場合はカンマを除く。
    /* 空文字列ないし数値として無効な文字列なら、null用の色に、0なら、0用の色に、それ以外ならスケール化した色にする。 */
    if (td.innerText === "-") {
      changeColor(td, null_color);
    } else if (td.innerText === "" || Number.isNaN(num) || num < 0) {
      td.innerText = ""; // 無効な文字列なら、セル内を空にする。
      changeColor(td, null_color);
    } else if (num === 0) {
      changeColor(td, zero_color);
    } else {
      changeColor(td, colorScale(min_color, max_color, min_num, max_num, num, interpolationColors))
    }
  });
}

/* 表に対し、ボディを行方向にカラースケール化する。 */
function setColorScaleHorizontal(target_class, min_color, max_color, zero_color, null_color, interpolationColors = []) {
  /* 行ごとに処理。 */
  document.querySelectorAll("tr").forEach(tr => {
    let td_nodes;
    if (target_class === "") {
      td_nodes = tr.querySelectorAll("td");
    } else {
      td_nodes = tr.querySelectorAll(`.${target_class}`);
    }

    /* 各セルの着色。 */
    if (td_nodes) {
      setColorScaleOnElements(td_nodes, min_color, max_color, zero_color, null_color, interpolationColors);
    }
  });
}

/* 表に対し、ボディを列方向にカラースケール化する。 */
function setColorScaleVertical(target_class, min_color, max_color, zero_color, null_color, interpolationColors = []) {
  /* 列数を取得。 */
  /* target_classを指定している場合、塗らなくて良い列の分も数えてしまう。
     それでも、該当するセルがない列は塗らないので、数え上げ処理の簡潔さを優先して多めに数える。 */
  const column_num = document.querySelectorAll("tr:nth-child(1) td").length;
  /* 列ごとに処理。 */
  for (let i = 1; i <= column_num; i++) {
    /* 各行のi列目を取得。 */
    let td_nodes;
    if (target_class === "") {
      td_nodes = document.querySelectorAll(`tr td:nth-of-type(${i})`);
    } else {
      td_nodes = document.querySelectorAll(`tr th.${target_class}:nth-of-type(${i}), tr td.${target_class}:nth-of-type(${i})`);
    }
    /* 各セルの着色。 */
    if (td_nodes) {
      setColorScaleOnElements(td_nodes, min_color, max_color, zero_color, null_color, interpolationColors);
    }
 }
}

function setColorScale({ is_horizontal,
                         target_class = "",
                         min_color = "#ff0000",
                         max_color = "#0000ff",
                         zero_color = "#ffff00",
                         null_color = "#ffffff", 
                         interpolationColors = []}) {
  if (is_horizontal) {
    setColorScaleHorizontal(target_class, min_color, max_color, zero_color, null_color, interpolationColors);
  } else {
    setColorScaleVertical(target_class, min_color, max_color, zero_color, null_color, interpolationColors);
  }
}

/* 補間色を指定した際の値分割用（値のばらつきは考慮せず範囲を均等に分割） */
function indexFromNormalized(normalizedNum, arrayLength) {
    const max = 1;
    const min = 0;
    const stepUnit = max / arrayLength;
    let steps = [];
    for (let i = 1; i < arrayLength - 1; i++)
        steps.push(i * stepUnit);
    steps = [min, ...steps, max];
    steps = steps.map(step => Math.abs(normalizedNum - step));
    return steps.indexOf(steps.reduce((a, b) => Math.min(a, b)));
}

/* [W3C](https://www.w3.org/TR/AERT/#color-contrast)のアルゴリズムで背景色から文字色を選択する */
function foregroundColor(bgHex) {
    var r = parseInt(bgHex.slice(1, 3), 16);
    var g = parseInt(bgHex.slice(3, 5), 16);
    var b = parseInt(bgHex.slice(5, 7), 16);
    return ((((r * 299) + (g * 587) + (b * 114)) / 1000) < 125) ? "#FFFFFF" : "#000000";
}
