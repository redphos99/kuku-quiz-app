interface NumpadProps {
  /** 数字・けす を押せるか（フィードバック表示中は false） */
  inputEnabled: boolean;
  /** 「こたえる」を押せるか（未入力のときは false） */
  submitEnabled: boolean;
  /** 右下のボタンの文言（こたえる / つぎへ） */
  submitLabel: string;
  onDigit: (digit: number) => void;
  onDelete: () => void;
  onSubmit: () => void;
}

const DIGIT_ROWS = [
  [7, 8, 9],
  [4, 5, 6],
  [1, 2, 3],
];

/** 親指で押しやすいよう、画面下部に置く前提の大きなテンキー */
export function Numpad({
  inputEnabled,
  submitEnabled,
  submitLabel,
  onDigit,
  onDelete,
  onSubmit,
}: NumpadProps) {
  const digitKey = (digit: number) => (
    <button
      key={digit}
      type="button"
      className="key"
      disabled={!inputEnabled}
      onClick={() => onDigit(digit)}
    >
      {digit}
    </button>
  );

  return (
    <div className="numpad" role="group" aria-label="すうじキー">
      {DIGIT_ROWS.flat().map(digitKey)}
      <button
        type="button"
        className="key key-delete"
        disabled={!inputEnabled}
        onClick={onDelete}
        aria-label="1もじけす"
      >
        けす
      </button>
      {digitKey(0)}
      <button
        type="button"
        className="key key-submit"
        disabled={!submitEnabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </button>
    </div>
  );
}
