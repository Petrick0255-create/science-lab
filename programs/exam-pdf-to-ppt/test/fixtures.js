// Original test data, not copied from the supplied exam.
export const sampleQuestion = {
  number: '1', sourcePage: 1,
  blocks: [{ kind: 'text', text: '아래 표기의 위첨자와 아래첨자를 확인한다.' },
    { kind: 'passage', text: '물: H<sub>2</sub>O\n이온: SO<sub>4</sub><sup>2−</sup>\n속도: v<sub>0</sub>\n넓이: 3 m<sup>2</sup>\n<u>표기 확인</u>' }],
  choices: ['① H₂O', '② x²', '③ Na⁺', '④ v₀', '⑤ CO₂'],
  visual_note: '', warnings: [],
};
export function sampleExam(expectedCount = 25) {
  return { title: '첨자 검증용 자체 예시', expectedCount, warnings: [],
    questions: Array.from({ length: expectedCount }, (_, i) => ({ ...structuredClone(sampleQuestion), number: String(i + 1), sourcePage: Math.floor(i / 5) + 1 })) };
}
