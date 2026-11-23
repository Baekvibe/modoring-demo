const L = require('../logic.js'); let bad = 0;
const t = (n, c, x) => { console.log((c ? 'OK  ' : 'FAIL') + ' ' + n + (c ? '' : '  → ' + JSON.stringify(x))); if (!c) bad++; };
// 검진표 분석
for (const e of L.ELDERS) { const a = L.analyzeCheckup(L.SAMPLE_CK[e.id], e.age); console.log(`${e.name}(${e.age}) 확인할것 ${a.flagged.length}개 [${a.flagged.map(i => i.label + ':' + i.word).join(', ')}] 낙상위험=${a.fall.level}(${a.fall.points}점) 추천=${a.recs.map(r => r.id).join(',')} 관찰=${a.watch.join(',')}`); }
const a1 = L.analyzeCheckup(L.SAMPLE_CK.e1, 82), a3 = L.analyzeCheckup(L.SAMPLE_CK.e3, 85);
t('e1: 혈압·골밀도·일어나걷기 high, 낙상 위험 높음', a1.items.find(i => i.k === 'bp').status === 'high' && a1.items.find(i => i.k === 'bmd').status === 'high' && a1.items.find(i => i.k === 'tug').status === 'high' && a1.fall.level === 'high');
t('e3: 정상 수치면 확인할 것 0, 위험 낮음', a3.flagged.length === 0 && a3.fall.level === 'low' && a3.recs.length === 0 && a3.summary.includes('모두 일반 기준'), a3);
t('경계값: 혈압 139/89=주의, 140/80=확인 필요, 119/79=정상', ['139/89|watch', '140/80|high', '119/79|ok'].every(s => { const [bp, st] = s.split('|'); const [x, y] = bp.split('/').map(Number); return L.analyzeCheckup({ sbp: x, dbp: y }, 70).items[0].status === st; }));
t('경계값: 혈당 99/100/126', [[99, 'ok'], [100, 'watch'], [126, 'high']].every(([v, s]) => L.analyzeCheckup({ glucose: v }, 70).items[0].status === s));
t('경계값: BMI 18.4 low / 22.9 ok / 23 watch / 25 high', [[18.4, 'low'], [22.9, 'ok'], [23, 'watch'], [25, 'high']].every(([b, s]) => L.analyzeCheckup({ height: 100, weight: b }, 70).items[0].status === s));
t('경계값: 골밀도 -1 정상, -1.1 주의, -2.5 확인필요', [[-1, 'ok'], [-1.1, 'watch'], [-2.5, 'high']].every(([v, s]) => L.analyzeCheckup({ bmd: v }, 70).items[0].status === s));
t('일부 항목만 입력해도 동작', L.analyzeCheckup({ glucose: 130 }, 70).items.length === 1 && L.analyzeCheckup({}, 70).summary.includes('없어요'));
t('혈압은 한쪽만 있으면 판정 안 함(잘못된 판정 방지)', L.analyzeCheckup({ sbp: 150 }, 70).items.length === 0);
t('추천 할 일은 최대 4개', L.analyzeCheckup({ sbp: 150, dbp: 95, glucose: 130, bmd: -3, tug: 14, tchol: 250, height: 150, weight: 40 }, 85).recs.length <= 4);
// 낙상 감지
for (const lv of ['low', 'mid', 'high']) {
  const f = L.detectFall(L.traceFor('fall'), lv), r = L.detectFall(L.traceFor('recover'), lv), w = L.detectFall(L.traceFor('walk'), lv), s = L.detectFall(L.traceFor('shake'), lv);
  t(`[${lv}] 넘어지고 못 일어남 → 감지`, f.fall === true && f.peak >= L.FALL_LEVELS[lv].impact, f);
  t(`[${lv}] 넘어졌다 바로 일어남 → 감지 안 함(움직임 있음)`, r.fall === false && r.why === 'moved', r);
  t(`[${lv}] 걷다 앉기 → 감지 안 함`, w.fall === false, w);
  t(`[${lv}] 흔들기 → 감지 안 함`, s.fall === false, s);
}
t('실시간: 정지 구간을 다 보기 전에는 pending', L.detectFall(L.traceFor('fall').filter(x => x.t < 4000), 'mid').why === 'pending');
t('빈 입력/짧은 입력 안전', L.detectFall([], 'mid').fall === false && L.detectFall([{ t: 0, a: 1 }], 'mid').fall === false);
t('민감할수록 정지 구간이 짧고 응답 대기가 짧음', L.FALL_LEVELS.high.still < L.FALL_LEVELS.mid.still && L.FALL_LEVELS.mid.still < L.FALL_LEVELS.low.still && L.FALL_LEVELS.high.wait < L.FALL_LEVELS.low.wait);
// 약한 충격(2.2g)은 보통에서는 무시, 민감에서는 감지
const weak = L.traceFor('fall').map(x => x.a > 3 ? { t: x.t, a: 2.2 } : x);
t('약한 충격 2.2g: 보통=무시 / 민감=감지', L.detectFall(weak, 'mid').fall === false && L.detectFall(weak, 'high').fall === true);
// 상태: 낙상 의심 → 빨강
const e = L.ELDERS[0]; e.fallAlert = { when: '방금' }; t('낙상 의심이면 신호등 빨강', L.status(e).level === 'red' && L.status(e).reasons[0].includes('낙상')); e.fallAlert = null; t('해제하면 원래대로(초록)', L.status(e).level === 'green');
console.log(bad ? `실패 ${bad}건` : 'ALL PASS');
