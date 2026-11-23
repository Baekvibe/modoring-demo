// 모두링 안부 — 더미 데이터 + 판단 로직 (UI와 분리)
(function (root) {
  const N = 28; // 최근 28일
  const BASE_DAYS = 14; // 처음 14일 = 개인 기준선(F1)

  // high:true → 값이 '높을수록' 주의 / false → '낮을수록' 주의
  const METRICS = {
    sleep:  { label: '수면', tech: '수면 시간', unit: '시간', dec: 1, high: false, labels: ['좋음', '보통', '부족'], icon: '🌙', desc: '어젯밤 주무신 시간이에요.' },
    steps:  { label: '걸음', tech: '활동량', unit: '보', dec: 0, high: false, labels: ['좋음', '보통', '부족'], icon: '🚶', desc: '하루 동안 걸으신 걸음 수예요.' },
    hr:     { label: '심박수', tech: '안정 시 심박수', unit: '회/분', dec: 0, high: true, labels: ['안정', '보통', '높음'], icon: '❤️', desc: '쉬고 계실 때 1분 동안 심장이 뛰는 횟수예요.' },
    hrv:    { label: '맥박 안정도', tech: '심박변이도(HRV)', unit: 'ms', dec: 0, high: false, labels: ['좋음', '보통', '낮음'], icon: '💓', desc: '심장이 얼마나 여유 있게 뛰는지 보는 값이에요. 높을수록 좋은 편이에요.' },
    spo2:   { label: '혈중 산소', tech: '혈중산소포화도(SpO₂)', unit: '%', dec: 0, high: false, labels: ['좋음', '보통', '낮음'], icon: '🫁', desc: '피 속에 산소가 얼마나 있는지 보는 값이에요.' },
    resp:   { label: '숨 쉬는 횟수', tech: '호흡수', unit: '회/분', dec: 0, high: true, labels: ['안정', '보통', '빠름'], icon: '🌬️', desc: '자는 동안 1분에 숨 쉬는 횟수예요.' },
    temp:   { label: '피부 온도', tech: '피부 온도(체온 아님)', unit: '℃', dec: 1, high: true, labels: ['평소 같음', '보통', '높음'], icon: '🌡️', desc: '손가락 피부의 온도예요. 체온과는 달라요.' },
    stress: { label: '스트레스', tech: '스트레스 지수', unit: '점', dec: 0, high: true, labels: ['편안', '보통', '높음'], icon: '🧘', desc: '심박 변화로 마음의 긴장 정도를 추정한 값(0~100)이에요. 낮을수록 편안해요.' },
  };
  const STATUS_METRICS = ['sleep', 'steps', 'hr', 'stress']; // 신호등 판단에 쓰는 지표

  // 시연 설정 (보호자 설정 화면에서 바뀜)
  const S = { inactH: 4, sens: 1.5, notifyFrom: '07:00', notifyTo: '21:00' };

  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gauss(r) { let u = 0; while (!u) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  const EXTRA = ['hrv', 'spo2', 'resp', 'temp', 'stress'];
  const EXN = { hrv: 5, spo2: 0.6, resp: 0.8, temp: 0.25, stress: 6 };
  function gen(p, seed) {
    const r = rng(seed), r2 = rng(seed + 1000), o = {};
    Object.keys(METRICS).forEach(function (m) { o[m] = []; });
    for (let i = 0; i < N; i++) {
      const fromEnd = N - 1 - i; // 0 = 오늘
      let s = p.base.sleep + gauss(r) * p.noise.sleep;
      let st = p.base.steps + gauss(r) * p.noise.steps;
      let h = p.base.hr + gauss(r) * p.noise.hr;
      const x = {};
      EXTRA.forEach(function (m) { x[m] = p.base[m] + gauss(r2) * EXN[m]; });
      if (p.scn === 'lowSleep' && fromEnd < 3) { s -= 1.9; h += 5; x.stress += 12; x.hrv -= 6; x.resp += 1; }
      if (p.scn === 'unsent' && fromEnd < 2) { s = st = h = null; EXTRA.forEach(function (m) { x[m] = null; }); }
      o.sleep.push(s == null ? null : +s.toFixed(1));
      o.steps.push(st == null ? null : Math.max(0, Math.round(st / 10) * 10));
      o.hr.push(h == null ? null : Math.round(h));
      o.hrv.push(x.hrv == null ? null : Math.max(5, Math.round(x.hrv)));
      o.spo2.push(x.spo2 == null ? null : Math.min(100, Math.round(x.spo2)));
      o.resp.push(x.resp == null ? null : Math.round(x.resp));
      o.temp.push(x.temp == null ? null : +x.temp.toFixed(1));
      o.stress.push(x.stress == null ? null : Math.max(0, Math.min(100, Math.round(x.stress))));
    }
    return o;
  }

  const ELDERS = [
    { id: 'e1', name: '김순자', age: 82, rel: '어머니', scn: 'normal',
      base: { sleep: 7, steps: 3800, hr: 68 }, noise: { sleep: 0.5, steps: 600, hr: 2 }, seed: 11,
      battery: 68, chargedAgo: 1, inactivity: 1.2, lastActive: '10분 전', hello: false },
    { id: 'e2', name: '박영철', age: 78, rel: '아버지', scn: 'lowSleep',
      base: { sleep: 6.8, steps: 4500, hr: 70 }, noise: { sleep: 0.4, steps: 700, hr: 2 }, seed: 23,
      battery: 41, chargedAgo: 2, inactivity: 2.0, lastActive: '35분 전', hello: true },
    { id: 'e3', name: '이말순', age: 85, rel: '시어머니', scn: 'unsent',
      base: { sleep: 6.5, steps: 2600, hr: 72 }, noise: { sleep: 0.5, steps: 450, hr: 2 }, seed: 37,
      battery: 0, chargedAgo: 4, inactivity: 0, lastActive: '이틀 전', hello: false },
    { id: 'e4', name: '최복례', age: 80, rel: '이모', scn: 'inactive',
      base: { sleep: 7.2, steps: 3200, hr: 66 }, noise: { sleep: 0.4, steps: 500, hr: 2 }, seed: 51,
      battery: 55, chargedAgo: 1, inactivity: 4.6, lastActive: '4시간 전', hello: false },
  ];
  const EX = {
    e1: { hrv: 38, spo2: 97, resp: 14, temp: 33.7, stress: 30 },
    e2: { hrv: 31, spo2: 96, resp: 16, temp: 33.5, stress: 38 },
    e3: { hrv: 28, spo2: 96, resp: 16, temp: 33.4, stress: 40 },
    e4: { hrv: 34, spo2: 97, resp: 15, temp: 33.8, stress: 34 },
  };
  ELDERS.forEach(function (e) {
    Object.assign(e.base, EX[e.id]);
    e.data = gen(e, e.seed);
    e.shared = {}; // 어르신이 정하는 공유 범위
    Object.keys(METRICS).forEach(function (m) { e.shared[m] = true; });
    e.meds = [
      { t: '08:00', n: '혈압약', done: true, on: true },
      { t: '13:00', n: '당뇨약', done: e.id === 'e1' ? false : true, on: true },
      { t: '20:00', n: '혈압약', done: false, on: true },
    ];
    e.tasks = [
      { icon: '🚶', text: '산책 20분', time: '16:00', done: false, by: 'guardian' },
      { icon: '💧', text: '물 한 잔 드시기', time: '', done: false, by: 'elder' },
    ];
  });

  const CONTACTS = [
    { name: '딸 김지은', role: '주 연락', phone: '010-0000-0001' },
    { name: '아들 김민수', role: '참고용', phone: '010-0000-0002' },
    { name: '동네 복지사 박OO', role: '참고용', phone: '010-0000-0003' },
  ];

  function nums(a) { return a.filter(function (v) { return v != null; }); }
  function mean(a) { return a.reduce(function (x, y) { return x + y; }, 0) / a.length; }
  function sd(a) { const m = mean(a); return Math.sqrt(mean(a.map(function (v) { return (v - m) * (v - m); }))); }

  // F1 개인 기준선: 처음 14일 평균 ± 표준편차
  function baseline(e, m) {
    const b = nums(e.data[m].slice(0, BASE_DAYS));
    const mu = mean(b);
    return { mean: mu, sd: Math.max(sd(b), Math.abs(mu) * 0.03) };
  }
  // 최근 3일 평균이 기준선에서 몇 표준편차 벗어났나
  function recentZ(e, m) {
    const r = nums(e.data[m].slice(-3));
    if (!r.length) return null;
    const b = baseline(e, m);
    return { z: (mean(r) - b.mean) / b.sd, recent: mean(r), base: b };
  }
  // 하루치 상태: 0=좋음 1=보통 2=부족 / null=기록 없음
  function dayGrade(e, m, i) {
    const v = e.data[m][i];
    if (v == null) return null;
    const b = baseline(e, m);
    let z = (v - b.mean) / b.sd;
    if (METRICS[m].high) z = -z;
    return z > -1 ? 0 : z > -1.5 ? 1 : 2;
  }

  // 하루 컨디션 점수(0~100): 모든 지표가 '내 평소'에서 나쁜 쪽으로 얼마나 벗어났는지 평균. 진단이 아님.
  function score(e, i, onlyShared) {
    let sum = 0, n = 0;
    Object.keys(METRICS).forEach(function (m) {
      if (onlyShared && !e.shared[m]) return;
      const v = e.data[m][i]; if (v == null) return;
      const b = baseline(e, m); let z = (v - b.mean) / b.sd; if (!METRICS[m].high) z = -z;
      sum += Math.max(0, Math.min(3, z)); n++;
    });
    return n ? Math.max(0, Math.min(100, Math.round(96 - (sum / n) * 22))) : null;
  }
  function scoreWord(sc) { return sc == null ? '기록 없음' : sc >= 80 ? '좋아요' : sc >= 65 ? '보통이에요' : '살펴보세요'; }

  function f(v, d) { return v.toFixed(d); }

  // F2 상태 신호등
  function status(e) {
    if (e.fallAlert) {
      return { level: 'red', reasons: ['낙상이 의심돼요 (' + e.fallAlert.when + ')'],
        cause: '먼저 전화해 보세요. 연락이 안 되면 마지막 위치를 확인하고, 필요하면 119에 연락하세요.' };
    }
    if (e.battery === 0) {
      return { level: 'gray', reasons: ['링이 꺼져 있어요 (마지막 충전 ' + e.chargedAgo + '일 전)'],
        cause: '배터리 방전으로 추정돼요. 이상 신호가 아니라 충전이 필요한 상황일 수 있어요.' };
    }
    if (e.inactivity >= S.inactH) {
      return { level: 'red', reasons: ['낮 시간 ' + f(e.inactivity, 1) + '시간째 움직임이 없어요'],
        cause: '먼저 전화해 보세요. 링을 빼 두셨을 수도 있어요.' };
    }
    const reasons = [], phrases = [];
    STATUS_METRICS.forEach(function (m) {
      if (!e.shared[m]) return;
      const r = recentZ(e, m);
      if (!r) return;
      const bad = METRICS[m].high ? r.z >= S.sens : r.z <= -S.sens;
      if (!bad) return;
      if (m === 'sleep') {
        reasons.push('최근 3일 평균 수면 ' + f(r.recent, 1) + '시간 · 평소 ' + f(r.base.mean, 1) + '시간보다 ' + f(r.base.mean - r.recent, 1) + '시간 짧아요');
        phrases.push('요즘 잠을 평소보다 덜 주무셨어요.');
      } else if (m === 'steps') {
        reasons.push('최근 3일 걸음 수가 평소보다 ' + Math.round((1 - r.recent / r.base.mean) * 100) + '% 적어요');
        phrases.push('요즘 평소보다 덜 걸으셨어요.');
      } else if (m === 'stress') {
        reasons.push('최근 3일 스트레스 지수가 평소보다 ' + Math.round(r.recent - r.base.mean) + '점 높아요');
        phrases.push('요즘 마음이 조금 긴장되어 있는 것 같아요.');
      } else {
        reasons.push('최근 3일 쉴 때 심박이 평소보다 ' + Math.round(r.recent - r.base.mean) + '회 높아요');
        phrases.push('요즘 맥박이 평소보다 조금 빨라요.');
      }
    });
    if (reasons.length) return { level: 'yellow', reasons: reasons, phrases: phrases, cause: '' };
    return { level: 'green', reasons: [], phrases: [], cause: '' };
  }


  /* ================= 건강검진표 분석 =================
     시연 버전: 일반 참고 기준과 비교하는 규칙으로 계산한다. (실제 서비스는 검진표에 인쇄된 판정 기준을 읽어 AI가 해석)
     의사의 진단이 아니다. */
  const CK_FIELDS = [
    { k: 'sbp', label: '수축기 혈압 (높은 쪽)', unit: 'mmHg', ph: '138', min: 60, max: 260 },
    { k: 'dbp', label: '이완기 혈압 (낮은 쪽)', unit: 'mmHg', ph: '86', min: 30, max: 160 },
    { k: 'glucose', label: '공복 혈당', unit: 'mg/dL', ph: '104', min: 40, max: 500 },
    { k: 'tchol', label: '총 콜레스테롤', unit: 'mg/dL', ph: '205', min: 80, max: 500 },
    { k: 'ldl', label: 'LDL 콜레스테롤', unit: 'mg/dL', ph: '132', min: 20, max: 400 },
    { k: 'height', label: '키', unit: 'cm', ph: '155', min: 100, max: 220 },
    { k: 'weight', label: '몸무게', unit: 'kg', ph: '58', min: 25, max: 200 },
    { k: 'bmd', label: '골밀도 (T-점수)', unit: '', ph: '-2.1', min: -6, max: 4 },
    { k: 'tug', label: '일어나 걷기 시간', unit: '초', ph: '11', min: 3, max: 60 },
  ];
  const SAMPLE_CK = {
    e1: { date: '2026-09-14', sbp: 148, dbp: 88, glucose: 112, tchol: 215, ldl: 138, height: 154, weight: 57, bmd: -2.8, tug: 13.2 },
    e2: { date: '2026-08-22', sbp: 128, dbp: 82, glucose: 118, tchol: 232, ldl: 151, height: 168, weight: 73, bmd: -1.4, tug: 10.5 },
    e3: { date: '2026-10-05', sbp: 118, dbp: 76, glucose: 92, tchol: 184, ldl: 108, height: 150, weight: 49, bmd: -0.6, tug: 8.9 },
    e4: { date: '2026-07-30', sbp: 124, dbp: 79, glucose: 97, tchol: 196, ldl: 120, height: 156, weight: 54, bmd: -0.9, tug: 9.4 },
  };
  const WORD = { ok: '정상 범위', watch: '주의', high: '확인 필요', low: '낮아요' };
  const TXT = {
    bp: { ok: '혈압이 정상 범위예요.', watch: '혈압이 조금 높은 편이에요. 짠 음식을 줄이고 꾸준히 재 보세요.', high: '혈압이 높게 나왔어요. 병원에서 한 번 더 확인해 보세요.' },
    glucose: { ok: '공복 혈당이 정상 범위예요.', watch: '공복 혈당이 조금 높아요. 식사 뒤 가볍게 걸어 보세요.', high: '공복 혈당이 높게 나왔어요. 병원 상담을 권해요.' },
    tchol: { ok: '총 콜레스테롤이 정상 범위예요.', watch: '조금 높아요. 기름진 음식을 줄이고 채소를 늘려 보세요.', high: '높게 나왔어요. 병원 상담을 권해요.' },
    ldl: { ok: 'LDL 콜레스테롤이 정상 범위예요.', watch: '조금 높아요. 기름진 음식을 줄여 보세요.', high: '높게 나왔어요. 병원 상담을 권해요.' },
    bmi: { ok: '몸무게가 알맞은 범위예요.', watch: '과체중 범위예요. 무리하지 않는 걷기가 도움이 돼요.', high: '비만 범위예요. 병원이나 보건소에서 상담해 보세요.', low: '몸무게가 적은 편이에요. 영양을 잘 챙겨 드세요.' },
    bmd: { ok: '뼈 상태가 괜찮아요.', watch: '뼈가 약해지기 시작한 상태(골감소)예요. 칼슘이 든 음식과 가벼운 근력 운동이 도움이 돼요.', high: '뼈가 약한 편(골다공증 의심)이에요. 넘어지면 다치기 쉬워서 병원 상담과 낙상 조심이 중요해요.' },
    tug: { ok: '일어나 걷는 속도가 안정적이에요.', watch: '조금 느린 편이에요. 다리 힘을 키우는 운동이 도움이 돼요.', high: '일어나 걷는 속도가 느려서 넘어질 위험이 높은 편이에요.' },
  };
  function bmiOf(v) { return (v.height && v.weight) ? v.weight / Math.pow(v.height / 100, 2) : null; }
  function analyzeCheckup(v, age) {
    const items = [];
    const add = function (k, label, value, unit, status) { items.push({ k: k, label: label, value: value, unit: unit, status: status, word: WORD[status], text: TXT[k][status] }); };
    if (v.sbp != null && v.dbp != null) add('bp', '혈압', v.sbp + '/' + v.dbp, 'mmHg', (v.sbp >= 140 || v.dbp >= 90) ? 'high' : (v.sbp >= 120 || v.dbp >= 80) ? 'watch' : 'ok');
    if (v.glucose != null) add('glucose', '공복 혈당', v.glucose, 'mg/dL', v.glucose >= 126 ? 'high' : v.glucose >= 100 ? 'watch' : 'ok');
    if (v.tchol != null) add('tchol', '총 콜레스테롤', v.tchol, 'mg/dL', v.tchol >= 240 ? 'high' : v.tchol >= 200 ? 'watch' : 'ok');
    if (v.ldl != null) add('ldl', 'LDL 콜레스테롤', v.ldl, 'mg/dL', v.ldl >= 160 ? 'high' : v.ldl >= 130 ? 'watch' : 'ok');
    const bmi = bmiOf(v);
    if (bmi != null) add('bmi', '체질량지수(BMI)', bmi.toFixed(1), '', bmi < 18.5 ? 'low' : bmi >= 25 ? 'high' : bmi >= 23 ? 'watch' : 'ok');
    if (v.bmd != null) add('bmd', '골밀도(T-점수)', v.bmd, '', v.bmd <= -2.5 ? 'high' : v.bmd < -1 ? 'watch' : 'ok');
    if (v.tug != null) add('tug', '일어나 걷기', v.tug, '초', v.tug >= 12 ? 'high' : v.tug >= 10 ? 'watch' : 'ok');
    const by = {}; items.forEach(function (i) { by[i.k] = i.status; });
    const bad = function (k) { return !!by[k] && by[k] !== 'ok'; };
    // 낙상 위험도: 뼈가 약한지, 일어나 걷기가 느린지, 몸무게, 나이
    let pts = 0; const reasons = [];
    if (by.bmd === 'high') { pts += 3; reasons.push('뼈가 약한 편이라 넘어지면 다치기 쉬워요'); } else if (by.bmd === 'watch') { pts += 1; reasons.push('골밀도가 조금 낮아요'); }
    if (by.tug === 'high') { pts += 3; reasons.push('일어나 걷는 속도가 느려요'); } else if (by.tug === 'watch') { pts += 1; reasons.push('일어나 걷는 속도가 조금 느려요'); }
    if (by.bmi === 'low') { pts += 1; reasons.push('몸무게가 적은 편이에요'); }
    if (age >= 80) { pts += 1; reasons.push('80세 이상이에요'); }
    const level = pts >= 4 ? 'high' : pts >= 2 ? 'mid' : 'low';
    const recs = [];
    if (bad('bp')) recs.push({ id: 'bp', icon: '🩺', text: '혈압 재기', time: '08:00', why: '혈압이 기준보다 높게 나왔어요' });
    if (bad('glucose')) recs.push({ id: 'walk', icon: '🚶', text: '식사 뒤 가볍게 걷기 15분', time: '13:30', why: '식사 뒤 가볍게 걸으면 혈당 관리에 도움이 돼요' });
    if (bad('bmd')) recs.push({ id: 'ca', icon: '🍚', text: '칼슘이 든 음식 챙기기 (우유·두부 등)', time: '09:00', why: '뼈 건강에 도움이 돼요' });
    if (by.tug === 'high' || by.tug === 'watch' || by.bmd === 'high') recs.push({ id: 'chair', icon: '🧘', text: '의자에 앉았다 일어나기 (무리하지 않게)', time: '17:00', why: '다리 힘을 키우면 넘어짐이 줄어요' });
    if (bad('tchol') || bad('ldl')) recs.push({ id: 'veg', icon: '🍚', text: '채소 먼저 드시기', time: '', why: '콜레스테롤 관리에 도움이 돼요' });
    if (by.bmi === 'low') recs.push({ id: 'snack', icon: '🍚', text: '간식 챙겨 드시기', time: '15:00', why: '몸무게가 적은 편이라 영양을 챙기면 좋아요' });
    recs.length = Math.min(recs.length, 4);
    const watch = []; const addW = function (m) { if (watch.indexOf(m) < 0) watch.push(m); };
    if (bad('bp')) { addW('hr'); addW('stress'); }
    if (bad('glucose') || bad('bmi') || bad('bmd') || bad('tug')) addW('steps');
    const flagged = items.filter(function (i) { return i.status !== 'ok'; });
    let summary;
    if (!items.length) summary = '입력된 수치가 없어요.';
    else if (!flagged.length) summary = '검진표 수치가 모두 일반 기준 안에 있어요. 지금처럼 꾸준히 지내세요.';
    else summary = '확인해 볼 것이 ' + flagged.length + '가지 있어요: ' + flagged.map(function (i) { return i.label; }).join(', ') + '. 병원에서 한 번 더 확인해 보세요.';
    if (items.length && level !== 'low') summary += ' 넘어지지 않게 특히 조심하시고, 낙상 감지를 더 민감하게 맞춰 드릴게요.';
    const tips = [];
    if (level !== 'low') tips.push('밤에 화장실 가는 길에 불을 켜 두세요', '욕실에 미끄럼 방지 매트를 깔아 주세요', '자리에서 일어날 때 잠깐 앉았다가 천천히 일어나세요');
    return { items: items, flagged: flagged, summary: summary, fall: { level: level, points: pts, reasons: reasons }, recs: recs, watch: watch, tips: tips };
  }

  /* ================= 낙상 감지 =================
     충격 전 '자유낙하'(힘이 거의 0g) -> '충격'(큰 힘) -> '움직임 없음'(1g 근처로 가만히) 순서를 본다.
     링·폰 센서 기준 정확도는 아직 검증 전이다. 오탐은 "괜찮으세요?" 확인 질문으로 줄인다. */
  const FALL_LEVELS = {
    low: { label: '낮음', sens: '둔감', impact: 3.0, still: 4000, wait: 40 },
    mid: { label: '보통', sens: '보통', impact: 2.5, still: 3000, wait: 30 },
    high: { label: '높음', sens: '민감', impact: 2.0, still: 2000, wait: 20 },
  };
  function detectFall(samples, level) {
    const P = FALL_LEVELS[level] || FALL_LEVELS.mid, FF = 0.5, FF_MIN = 80, WIN = 1000, SETTLE = 500, BAND = 0.25, RATIO = 0.95;
    const n = samples.length; let i = 0, best = null;
    while (i < n) {
      if (samples[i].a < FF) {
        let j = i; while (j < n && samples[j].a < FF) j++;
        const tFF0 = samples[i].t, tFF1 = samples[j - 1].t;
        if (tFF1 - tFF0 >= FF_MIN) {
          let peak = 0, tp = null;
          for (let k = j; k < n && samples[k].t - tFF1 <= WIN; k++) if (samples[k].a > peak) { peak = samples[k].a; tp = samples[k].t; }
          // 충격은 직전 1.5초의 움직임보다 확연히 커야 한다 (흔들다 내려놓는 동작과 구분)
          let prevMax = 1; for (let k = 0; k < i; k++) if (samples[k].t >= tFF0 - 1500 && samples[k].a > prevMax) prevMax = samples[k].a;
          if (tp != null && peak >= P.impact && peak >= prevMax * 1.25) {
            const t0 = tp + SETTLE, t1 = t0 + P.still;
            const win = samples.filter(function (s) { return s.t >= t0 && s.t <= t1; });
            const ph = { peak: peak, tFF0: tFF0, tFF1: tFF1, tImpact: tp, stillFrom: t0, stillTo: t1 };
            if (win.length && win[win.length - 1].t - t0 >= P.still * 0.9) {
              const calm = win.filter(function (s) { return Math.abs(s.a - 1) <= BAND; }).length / win.length;
              if (calm >= RATIO) return Object.assign({ fall: true, level: level }, ph);
              best = best || Object.assign({ fall: false, why: 'moved' }, ph);
            } else best = best || Object.assign({ fall: false, why: 'pending' }, ph);
          } else best = best || { fall: false, why: 'no-impact', peak: peak, tFF0: tFF0, tFF1: tFF1 };
        }
        i = j;
      } else i++;
    }
    return best || { fall: false, why: 'no-freefall' };
  }
  // 시연용 가짜 센서 기록 (50Hz): walk=걷다 앉기 / fall=넘어지고 못 일어남 / recover=넘어졌다 바로 일어남 / shake=흔들기
  function traceFor(kind, seed) {
    const r = rng(seed || 7), dt = 20, S = []; let t = 0;
    const push = function (a) { S.push({ t: t, a: Math.max(0, +(a + gauss(r) * 0.03).toFixed(3)) }); t += dt; };
    const walk = function (ms) { for (let k = 0; k < ms / dt; k++) push(1 + 0.28 * Math.sin(2 * Math.PI * 1.9 * (t / 1000))); };
    const lie = function (ms) { for (let k = 0; k < ms / dt; k++) push(1); };
    const fall = function () { for (let k = 0; k < 15; k++) push(0.15 + 0.1 * r()); [1.8, 3.6, 3.1, 2.4, 1.7, 1.3, 1.15].forEach(push); };
    if (kind === 'walk') { walk(4000); [1.2, 1.5, 1.6, 1.3].forEach(push); lie(6000); }
    else if (kind === 'fall') { walk(3000); fall(); lie(7000); }
    else if (kind === 'recover') { walk(3000); fall(); lie(1200); for (let k = 0; k < 150; k++) push(1 + 0.5 * Math.sin(2 * Math.PI * 1.5 * (t / 1000)) + 0.2 * Math.sin(2 * Math.PI * 4 * (t / 1000))); walk(2000); }
    else if (kind === 'shake') { for (let k = 0; k < 150; k++) push(1.2 + 1.2 * Math.sin(2 * Math.PI * 3.5 * (t / 1000))); lie(5000); }
    return S;
  }

  const out = { N: N, BASE_DAYS: BASE_DAYS, METRICS: METRICS, S: S, ELDERS: ELDERS, CONTACTS: CONTACTS,
    STATUS_METRICS: STATUS_METRICS, CK_FIELDS: CK_FIELDS, SAMPLE_CK: SAMPLE_CK, analyzeCheckup: analyzeCheckup, bmiOf: bmiOf, FALL_LEVELS: FALL_LEVELS, detectFall: detectFall, traceFor: traceFor, score: score, scoreWord: scoreWord, baseline: baseline, recentZ: recentZ, dayGrade: dayGrade, status: status, mean: mean, nums: nums };
  if (typeof module !== 'undefined') module.exports = out; else root.ML = out;
})(this);
