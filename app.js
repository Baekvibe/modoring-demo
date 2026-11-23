(function () {
  'use strict';
  const { ELDERS, CONTACTS, METRICS, S, N } = ML;
  const $ = (s) => document.querySelector(s);
  const LV = { green: '평소와 같아요', yellow: '조금 달라요', red: '확인이 필요해요', gray: '링 확인 필요' };
  const ORDER = { red: 0, gray: 1, yellow: 2, green: 3 };
  const FACE = ['😊', '😐', '😟'];
  const NFC = {
    e1: [
      { ago: 2, time: '14:20', who: '일반 발견자', what: '휴대폰으로 링을 태그했어요. "가족에게 연락하기" 버튼만 보였어요.' },
      { ago: 9, time: '10:05', who: '구급대원 (인증됨)', what: '응급 정보를 확인했어요. 가족에게 알림이 갔어요.' },
    ],
    e2: [{ ago: 5, time: '17:40', who: '일반 발견자', what: '휴대폰으로 링을 태그했어요. "가족에게 연락하기" 버튼만 보였어요.' }],
  };
  const st = {
    mode: 'elder', eTab: 'home', gTab: 'status', persona: 'e1', gElder: 'e1',
    chartM: 'sleep', chartDays: 28, edId: null, draft: { icon: '✏️' }, locMode: 'dummy', locTok: 0, events: [], sosT: null, fs: { elder: 2, guardian: 1 }, hc: false,
  };
  const TABS = {
    elder: [['home', '🏠', '홈'], ['record', '📊', '내 기록'], ['tasks', '✅', '할 일'], ['help', '🤝', '도움']],
    guardian: [['status', '👪', '가족 현황'], ['trend', '📈', '변화 추이'], ['alerts', '🔔', '알림'], ['settings', '⚙️', '설정']],
  };
  const eById = (id) => ELDERS.find((e) => e.id === id);
  const pe = () => eById(st.persona);
  const ge = () => eById(st.gElder);
  const today = new Date();
  function dayOf(i) { const d = new Date(today); d.setDate(d.getDate() - (N - 1 - i)); return d; }
  function md(ago) { const d = new Date(today); d.setDate(d.getDate() - ago); return (d.getMonth() + 1) + '월 ' + d.getDate() + '일'; }
  function fmt(v, m) { return v == null ? '-' : (METRICS[m].dec ? v.toFixed(METRICS[m].dec) : Math.round(v).toLocaleString('ko-KR')); }
  function addEvent(lvl, who, title, reason, link) { st.events.unshift({ lvl, who, title, reason, when: '방금', link }); }
  function medCount(e) { const on = e.meds.filter((m) => m.on); return [on.filter((m) => m.done).length, on.length]; }
  try { const h = localStorage.getItem('ml_hc'); if (h === '1') st.hc = true; } catch (x) {}

  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function allTasks(e) {
    const m = e.meds.map((x, i) => ({ k: 'med', i, icon: '💊', text: x.n + ' 드시기', time: x.t, done: x.done, tag: '가족이 정한 약', canDel: false })).filter((_, i) => e.meds[i].on);
    const t = e.tasks.map((x, i) => ({ k: 'task', i, icon: x.icon, text: x.text, time: x.time || '', done: x.done, tag: x.by === 'guardian' ? '가족이 넣었어요' : x.by === 'ai' ? '검진표 기반 추천' : '', canDel: x.by === 'elder' || x.by === 'ai' }));
    return m.concat(t).sort((p, q) => (p.time || '99:99').localeCompare(q.time || '99:99'));
  }
  const taskStat = (e) => { const l = allTasks(e); return l.filter((x) => x.done).length + '/' + l.length; };
  const DUMMY_LOC = {
    e1: { lat: 37.2636, lng: 127.0286, label: '수원 ○○동 경로당 근처' },
    e2: { lat: 37.2750, lng: 127.0095, label: '수원 ○○시장 근처' },
    e3: { lat: 37.2411, lng: 127.0176, label: '수원 집 근처' },
    e4: { lat: 37.2870, lng: 127.0560, label: '수원 ○○공원 근처' },
  };
  const LOC_AGO_H = { e1: 26, e2: 3, e3: null, e4: 5 }; // 처음 보이는 "마지막 위치"가 몇 시간 전인지
  ELDERS.forEach((e) => {
    e.shared.loc = true; e.dummy = DUMMY_LOC[e.id];
    e.loc = LOC_AGO_H[e.id] == null ? null : Object.assign({}, e.dummy, { ts: Date.now() - LOC_AGO_H[e.id] * 3600000 });
  });
  function ago(ts) {
    const m = Math.round((Date.now() - ts) / 60000); if (m < 1) return '방금'; if (m < 60) return m + '분 전';
    const h = Math.floor(m / 60); if (h < 24) return h + '시간 전'; const d = Math.floor(h / 24); return d === 1 ? '어제' : d + '일 전';
  }
  const kakao = (l, name) => 'https://map.kakao.com/link/map/' + encodeURIComponent(name + '님 위치') + ',' + (+l.lat).toFixed(5) + ',' + (+l.lng).toFixed(5);
  function locLine(e) {
    if (!e.shared.loc) return '<p class="sub" style="margin-top:6px">📍 위치 공유가 꺼져 있어요 (어르신이 정해요)</p>';
    if (!e.loc) return '<p class="sub" style="margin-top:6px">📍 아직 위치를 알려 오지 않았어요</p>';
    return `<p style="margin-top:6px">📍 <b>${esc(e.loc.label)}</b> · ${ago(e.loc.ts)}</p><p class="sub">${(+e.loc.lat).toFixed(5)}, ${(+e.loc.lng).toFixed(5)}</p><a class="del" data-act="link" href="${kakao(e.loc, e.name)}" target="_blank" rel="noopener">🗺 카카오맵에서 열기</a>`;
  }
  /* ---------- 이모지 -> Solar 아이콘 (CC BY 4.0, icons.js에 내장) ---------- */
  const E2I = { '😊': 'smile-circle', '🙂': 'smile-circle', '😐': 'expressionless-circle', '😟': 'sad-circle', '🏠': 'home-2', '📊': 'chart-2', '✅': 'checklist-minimalistic',
    '🤝': 'hand-heart', '🆘': 'siren', '🔔': 'bell', '🔍': 'magnifer', '📍': 'map-point', '💊': 'pills', '📞': 'phone-calling', '☎': 'phone-calling', '🔋': 'battery-charge',
    '💌': 'letter', '🗺': 'map', '🪪': 'user-id', '📝': 'notes', '✏': 'pen', '🗑': 'trash-bin-minimalistic', '👪': 'users-group-two-rounded', '📈': 'graph-up',
    '⚙': 'settings', '🔊': 'volume-loud', '👏': 'like', '➖': 'minus-circle', '🚌': 'bus', '🕒': 'clock-circle', '🚶': 'walking-round', '💧': 'waterdrop',
    '🍚': 'plate', '🧘': 'meditation-round', '🌙': 'moon-sleep', '❤': 'heart-pulse', '💓': 'pulse', '🫁': 'test-tube', '🌬': 'wind', '🌡': 'thermometer', '●': 'heart-pulse',
    '🩺': 'stethoscope', '🛡': 'shield-check', '⚠': 'danger-triangle', '📷': 'camera', '📄': 'file-text', '💡': 'lightbulb', '✨': 'stars-minimalistic', '🧍': 'accessibility', '📋': 'clipboard-check' };
  const DOTS = { '🔴': '#c62828', '🟡': '#c28a00', '⚪': '#a8a29e', '🟢': '#2e8b57' };
  const EMO = /[\u{1F300}-\u{1FAFF}\u{1F100}-\u{1F2FF}☀-➿⭐⭕●]️?/gu;
  const EMO1 = /[\u{1F300}-\u{1FAFF}\u{1F100}-\u{1F2FF}☀-➿⭐⭕●]/u;
  function iconize(root) {
    if (typeof SOLAR === 'undefined') return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), hit = [];
    while (w.nextNode()) { const n = w.currentNode; if (!/^(OPTION|TEXTAREA|SCRIPT|STYLE|TITLE)$/.test(n.parentNode.nodeName) && EMO1.test(n.nodeValue)) hit.push(n); }
    hit.forEach((n) => {
      const s = n.nodeValue, fr = document.createDocumentFragment(); let last = 0, m, changed = false;
      EMO.lastIndex = 0;
      while ((m = EMO.exec(s))) {
        const k = m[0].replace(/️/g, ''), name = E2I[k];
        if ((!name || !SOLAR[name]) && !DOTS[k]) continue; // 아이콘이 없으면 원래 글자를 그대로 둔다
        if (m.index > last) fr.appendChild(document.createTextNode(s.slice(last, m.index)));
        if (DOTS[k]) { const d = document.createElement('span'); d.className = 'dotc'; d.setAttribute('aria-hidden', 'true'); d.style.background = DOTS[k]; fr.appendChild(d); }
        else { const t = document.createElement('template'); t.innerHTML = `<svg class="ic ic-${name}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${SOLAR[name]}</svg>`; fr.appendChild(t.content); }
        last = m.index + m[0].length; changed = true;
      }
      if (!changed) return;
      if (last < s.length) fr.appendChild(document.createTextNode(s.slice(last)));
      n.parentNode.replaceChild(fr, n);
    });
  }
  function modal(html) { const ov = $('#overlay'); ov.hidden = false; ov.innerHTML = html; iconize(ov); }

  /* ---------- 시연 바 / 탭 ---------- */
  function renderChrome() {
    document.documentElement.className = 'fs' + st.fs[st.mode];
    document.body.classList.toggle('hc', st.hc);
    $('#d-mode').innerHTML = [['elder', '어르신 화면'], ['guardian', '보호자 화면']]
      .map(([k, l]) => `<button data-act="mode" data-v="${k}" aria-pressed="${st.mode === k}">${l}</button>`).join('');
    $('#d-persona').innerHTML = st.mode === 'elder'
      ? `<select data-act="persona" aria-label="어르신 선택">${ELDERS.map((e) => `<option value="${e.id}" ${e.id === st.persona ? 'selected' : ''}>${e.name} · ${LV[ML.status(e).level]}</option>`).join('')}</select>` : '';
    $('#d-font').innerHTML = '글씨 ' + [[1, '보통'], [2, '크게'], [3, '아주 크게']]
      .map(([k, l]) => `<button data-act="fs" data-v="${k}" aria-pressed="${st.fs[st.mode] === k}">${l}</button>`).join('');
    $('#d-loc').innerHTML = st.mode === 'elder' ? '위치 ' + [['dummy', '더미'], ['real', '진짜']].map(([k, l]) => `<button data-act="locMode" data-v="${k}" aria-pressed="${st.locMode === k}">${l}</button>`).join('') : '';
    $('#d-hc').setAttribute('aria-pressed', st.hc);
    const cur = st.mode === 'elder' ? st.eTab : st.gTab;
    const tb = (k, ic, l) => `<button class="tab" data-act="tab" data-v="${k}" ${cur === k ? 'aria-current="page"' : ''}><span class="tic" aria-hidden="true">${ic}</span>${l}</button>`;
    $('#tabs').innerHTML = st.mode === 'elder'
      ? tb('home', '🏠', '홈') + tb('record', '📊', '내 기록') + '<div class="fabwrap"><button class="fab" data-act="sos" aria-label="SOS 도움 요청"><span aria-hidden="true">🆘</span></button><span class="fablabel">SOS</span></div>' + tb('tasks', '✅', '할 일') + tb('help', '🤝', '도움')
      : TABS.guardian.map(([k, ic, l]) => tb(k, ic, l)).join('');
    $('#q').placeholder = st.mode === 'elder' ? '찾아보기' : '이름, 알림 찾기';
    const nAlert = ELDERS.filter((e) => ML.status(e).level !== 'green').length;
    $('#top-r').innerHTML = st.mode === 'guardian' ? `<button class="bell" data-act="tab" data-v="alerts" aria-label="알림 ${nAlert}건"><span aria-hidden="true">🔔</span>${nAlert ? `<b>${nAlert}</b>` : ''}</button>` : '';
  }

  /* ---------- 어르신 ---------- */
  function hero(e) {
    const s = ML.status(e);
    const sl = e.data.sleep[N - 1];
    const map = {
      green: ['✓', '오늘도 평소와 같아요', (sl != null ? `어젯밤 ${sl.toFixed(1)}시간 주무셨어요. ` : '') + '평소와 비슷해요.'],
      yellow: ['!', '조금 달라요', s.phrases && s.phrases.slice(0, 2).join(' ') + ' 무리하지 말고 쉬어 주세요.'],
      red: ['☎', '확인이 필요해요', '가족에게 알려드렸어요. 걱정 마세요. 곧 연락이 갈 거예요.'],
      gray: ['🔋', '링을 충전해 주세요', '링이 꺼진 것 같아요. 충전기에 올려 주세요.'],
    }[s.level];
    return { s, ic: map[0], title: map[1], line: map[2] };
  }
  function elderHome() {
    const e = pe(), h = hero(e), list = allTasks(e), nd = list.filter((x) => x.done).length, nxt = list.find((x) => !x.done);
    return `<section class="panel" aria-live="polite"><div class="core">
      <p class="ptitle">${e.name}님, 지금 나의 <b>건강상태</b>를 확인하세요!</p>
      <article class="bigcard"><div class="bh"><h2>오늘 상태</h2><span class="hot">오늘</span></div>
        <div class="stat ${h.s.level}"><div class="light" aria-hidden="true">${h.ic}</div><div><h2>${h.title}</h2><p>${h.line}</p></div></div>
        <button class="btn sm ghost" data-act="speak">🔊 읽어 주기</button>
        ${h.s.level === 'red' ? '<button class="btn sm" data-act="imok">저는 괜찮아요</button>' : ''}
        ${h.s.level === 'gray' ? '<button class="btn sm" data-act="charged">충전기에 올렸어요</button>' : ''}
      </article>
      <div class="grid">
        <button class="tile" data-act="tab" data-v="record"><b>내 기록</b><span>몸 상태 일주일 보기</span><i aria-hidden="true">📊</i></button>
        <button class="tile" data-act="tab" data-v="tasks"><b>오늘 할 일 ${nd}/${list.length}</b><span>${nxt ? '다음: ' + (nxt.time ? nxt.time + ' ' : '') + esc(nxt.text) : '모두 했어요 👏'}</span><i aria-hidden="true">✅</i></button>
      </div>
      <button class="tile wide" data-act="hello" ${e.hello ? 'disabled' : ''}><b>${e.hello ? '✓ 안부를 보냈어요' : '오늘도 잘 지내요'}</b><span>${e.hello ? '가족이 기뻐할 거예요' : '눌러서 가족에게 안부 보내기'}</span><i aria-hidden="true">💌</i></button></div>
    </section>
    <p class="ptitle2">몸이 안 좋을 땐 잊지 말고 <b>가족에게 연락</b>하세요!</p>
    <div class="grid">
      <button class="tile" data-act="tab" data-v="help"><b>가족 전화</b><span>가족에게 전화하기</span><i aria-hidden="true">📞</i></button>
      <button class="tile" data-act="locAsk"><b>내 위치 알리기</b><span>${e.shared.loc && e.loc ? '마지막: ' + ago(e.loc.ts) : '가족에게 지금 있는 곳 보내기'}</span><i aria-hidden="true">📍</i></button>
    </div>
    <p class="ptitle2">내 몸에 맞게 <b>지켜 드려요</b></p>
    <div class="grid">
      <button class="tile" data-act="ckView" data-id="${e.id}"><b>건강검진표</b><span>${e.checkup ? '확인할 것 ' + e.checkup.analysis.flagged.length + '가지' : '넣으면 맞춤 안내'}</span><i aria-hidden="true">🩺</i></button>
      <button class="tile" data-act="fallOpen"><b>낙상 감지</b><span>${e.fall.on ? '켜져 있어요' : '꺼져 있어요'}</span><i aria-hidden="true">🛡</i></button>
    </div>`;
  }
  function elderTasks() {
    const e = pe(), list = allTasks(e), done = list.filter((x) => x.done).length;
    return `<h1>오늘 할 일</h1><p class="sub">${list.length}개 중 ${done}개 했어요</p>
    <div class="bar" role="progressbar" aria-valuenow="${done}" aria-valuemin="0" aria-valuemax="${list.length}"><i style="width:${list.length ? done / list.length * 100 : 0}%"></i></div>
    ${list.length ? list.map((t) => `<div class="trow"><button class="task ${t.done ? 'done' : ''}" data-act="${t.k}" data-i="${t.i}" aria-pressed="${t.done}">
      <span class="ck" aria-hidden="true">${t.done ? '✓' : ''}</span><span style="font-size:1.4rem" aria-hidden="true">${t.icon}</span><span class="tx">${t.time ? t.time + ' ' : ''}${esc(t.text)}${t.tag ? `<span class="tag">${t.tag}</span>` : ''}</span></button>
      ${t.canDel ? `<button class="del" data-act="delAsk" data-i="${t.i}" aria-label="${esc(t.text)} 지우기">지우기</button>` : ''}</div>`).join('') : '<div class="card">할 일이 없어요. 아래 버튼으로 추가해 보세요.</div>'}
    <button class="btn" data-act="addTask">＋ 할 일 추가하기</button>`;
  }
  function elderRecord() {
    const e = pe(), dn = ['일', '월', '화', '수', '목', '금', '토'], keys = Object.keys(METRICS);
    const idx = [...Array(7).keys()].map((k) => N - 7 + k);
    const sc = ML.score(e, N - 1, false), scw = ML.scoreWord(sc);
    const gcls = (g) => (g == null ? 'gray' : g === 0 ? 'green' : 'yellow');
    const cards = keys.map((m) => {
      const M = METRICS[m], v = e.data[m][N - 1], g = ML.dayGrade(e, m, N - 1);
      return `<section class="card"><div class="rowh"><span aria-hidden="true">${M.icon}</span>${M.label}${(e.watch || []).includes(m) ? '<span class="badge pri">검진표 참고</span>' : ''}<span class="badge ${gcls(g)}" style="margin-left:auto">${g == null ? '기록 없음' : M.labels[g]}</span></div>
        <p class="mval">${v == null ? '-' : fmt(v, m)}<span class="mu">${v == null ? '' : ' ' + M.unit}</span></p><p class="sub">${M.desc}</p>
        <div class="week">${idx.map((i) => { const gg = ML.dayGrade(e, m, i); const last = i === N - 1;
          return `<div><div class="d">${last ? '오늘' : dn[dayOf(i).getDay()]}</div><div class="f" aria-hidden="true">${gg == null ? '➖' : FACE[gg]}</div><div class="w">${gg == null ? '없음' : M.labels[gg]}</div></div>`; }).join('')}</div></section>`;
    }).join('');
    const head = '<th>항목</th>' + idx.map((i) => `<th>${dayOf(i).getMonth() + 1}/${dayOf(i).getDate()}</th>`).join('');
    const body = keys.map((m) => `<tr><td>${METRICS[m].label}</td>${idx.map((i) => `<td>${fmt(e.data[m][i], m)}</td>`).join('')}</tr>`).join('');
    return `<h1>내 기록</h1><p class="sub">😊 좋음 · 😐 보통 · 😟 살펴보세요 — 내 평소와 비교한 거예요.</p>
    <section class="card"><div class="rowh"><span aria-hidden="true">🙂</span>오늘 컨디션 점수</div>
      <p class="mval">${sc == null ? '-' : sc}<span class="mu">${sc == null ? '' : '점'} · ${scw}</span></p>
      <div class="bar" role="progressbar" aria-valuenow="${sc || 0}" aria-valuemin="0" aria-valuemax="100"><i style="width:${sc || 0}%;${sc != null && sc < 80 ? 'background:var(--y-bd)' : ''}"></i></div>
      <p class="sub">진단이 아니라, 내 평소와 비교한 점수예요. 아래 ${keys.length}가지 기록을 모아서 계산해요.</p></section>
    ${ckCard(e)}
    <h2>오늘 내 몸 기록</h2>${cards}
    <details class="card"><summary style="font-weight:700;cursor:pointer;min-height:2.5rem">숫자로 한눈에 보기 (일주일)</summary>
    <div class="scroll"><table class="t"><tr>${head}</tr>${body}</table></div></details>`;
  }
  function elderHelp() {
    const e = pe(), log = NFC[e.id] || [];
    return `<h1>가족·도움</h1>
    <h2>가족에게 전화하기</h2>
    ${CONTACTS.map((c) => `<a class="btn call" href="tel:${c.phone}" aria-label="${c.name}에게 전화하기">📞<span class="cl"><b>${c.name}</b><small>${c.phone}</small></span></a>`).join('')}
    <h2>가족에게 보여주는 정보</h2>
    <section class="card set"><p class="sub">끄고 싶은 정보는 끌 수 있어요. 위치는 내가 "위치 알리기"를 누를 때만 가족에게 가요.</p>
    ${Object.keys(METRICS).map((m) => `<label><span class="sw"><span aria-hidden="true">${METRICS[m].icon}</span> ${METRICS[m].label}</span><input type="checkbox" data-share="${m}" ${e.shared[m] ? 'checked' : ''} aria-label="${METRICS[m].label} 공유"></label>`).join('')}<label><span class="sw"><span aria-hidden="true">📍</span> 위치 (알리기 버튼을 누를 때만)</span><input type="checkbox" data-share="loc" ${e.shared.loc ? 'checked' : ''} aria-label="위치 공유"></label></section>
    <h2>낙상 감지</h2>${fallCard(e)}
    <h2>내 링</h2>
    <section class="card"><p>🔋 배터리 <b>${e.battery}%</b> ${e.battery === 0 ? '(꺼져 있어요)' : ''}</p>
    <p>🪪 링에는 <b>이름이 아닌 번호만</b> 들어 있어요. 이름·병력은 링에 저장되지 않아요.</p>
    <p>🚌 교통카드: <b>사용 안 함</b> <span class="sub">(가족이 켤 수 있어요)</span></p></section>
    <h2>내 링을 읽은 기록</h2>
    ${log.length ? log.map((l) => `<section class="card"><b>${md(l.ago)} ${l.time}</b> · ${l.who}<p>${l.what}</p></section>`).join('') : '<section class="card"><p>아직 읽은 기록이 없어요.</p></section>'}`;
  }

  /* ---------- 보호자 ---------- */
  function guardianLine(e, s) {
    if (s.level === 'green') return '평소와 같아요. 변화가 없어요.';
    if (s.level === 'gray') return s.reasons[0] + ' — ' + s.cause;
    if (s.level === 'red') return s.reasons[0] + '. ' + s.cause;
    return s.reasons.join(' / ');
  }
  function gStatus() {
    const list = ELDERS.map((e) => ({ e, s: ML.status(e) })).sort((a, b) => ORDER[a.s.level] - ORDER[b.s.level]);
    const need = list.filter((x) => x.s.level !== 'green').length;
    const worst = list.some((x) => x.s.level === 'red') ? 'red' : need ? 'yellow' : 'green';
    return `<section class="panel"><div class="core"><p class="ptitle">김지은님, 오늘 <b>가족 상태</b>를 확인하세요!</p>
      <article class="bigcard"><div class="bh"><h2>오늘 요약</h2><span class="hot">오늘</span></div>
      <div class="stat ${worst}"><div class="light" aria-hidden="true">${need ? '!' : '✓'}</div><div><h2>${need ? `오늘 확인할 분 ${need}명` : '오늘은 모두 평소와 같아요'}</h2><p>${need ? `나머지 ${list.length - need}명은 평소와 같아요` : '변화가 없어요'}</p></div></div></article></div></section>
    <p class="ptitle2">카드를 누르면 <b>변화 추이</b>를 볼 수 있어요</p>
    ${list.map(({ e, s }) => { const [d, t] = medCount(e); return `<article class="card ecard ${s.level}" data-act="openElder" data-id="${e.id}" tabindex="0" role="button">
      <div class="top"><span class="nm">${e.name} <span class="sub">${e.rel} · ${e.age}세</span></span><span class="badge ${s.level}">${LV[s.level]}</span></div>
      <p style="margin-top:6px">${guardianLine(e, s)}</p>
      <div class="meta"><span>🕒 마지막 활동 ${e.lastActive}</span><span>🔋 ${e.battery}%</span><span>🙂 컨디션 ${ML.score(e, N - 1, true) == null ? '-' : ML.score(e, N - 1, true) + '점'}</span><span>💊 오늘 약 ${d}/${t}</span><span>📝 할 일 ${taskStat(e)}</span><span>${e.hello ? '💌 오늘 안부 도착' : '💌 안부 아직'}</span></div>${fallLine(e)}${locLine(e)}<button class="del" data-act="edit" data-id="${e.id}">✏️ 할 일 편집</button><button class="del" data-act="ckView" data-id="${e.id}">🩺 검진표${e.checkup ? '' : ' 넣기'}</button></article>`; }).join('')}
    <p class="note">카드를 누르면 변화 추이를 볼 수 있어요.</p>`;
  }
  function chartSvg(e, m, days) {
    const arr = e.data[m].slice(-days), b = ML.baseline(e, m);
    const W = 360, H = 210, L = 44, R = 10, T = 14, B = 30;
    const vals = ML.nums(arr).concat([b.mean - 2 * b.sd, b.mean + 2 * b.sd]);
    let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    const x = (i) => L + (W - L - R) * i / (days - 1), y = (v) => T + (H - T - B) * (1 - (v - lo) / (hi - lo));
    let path = '', pen = false, dots = '', gaps = '';
    arr.forEach((v, i) => {
      if (v == null) { pen = false; gaps += `<rect x="${x(i) - 4}" y="${T}" width="8" height="${H - T - B}" fill="#ddd"/>`; return; }
      path += (pen ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); pen = true;
      if (i >= days - 3) dots += `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="4.5" fill="#1c1917" stroke="#fff" stroke-width="1.5"/>`;
    });
    const ticks = [lo + pad, (lo + hi) / 2, hi - pad].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#eee"/><text x="${L - 4}" y="${y(v) + 4}" text-anchor="end" font-size="13" fill="#444">${fmt(v, m)}</text>`).join('');
    const dl = (i) => { const d = dayOf(N - days + i); return (d.getMonth() + 1) + '/' + d.getDate(); };
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${METRICS[m].label} 변화 그래프">
      ${ticks}<rect x="${L}" y="${y(b.mean + b.sd)}" width="${W - L - R}" height="${y(b.mean - b.sd) - y(b.mean + b.sd)}" fill="#f4c5d1" opacity=".8"/>
      <line x1="${L}" x2="${W - R}" y1="${y(b.mean)}" y2="${y(b.mean)}" stroke="#b3254b" stroke-dasharray="4 3"/>${gaps}
      <path d="${path}" fill="none" stroke="#b3254b" stroke-width="2.4" stroke-linejoin="round"/>${dots}
      <text x="${L}" y="${H - 8}" font-size="13" fill="#444">${dl(0)}</text><text x="${(L + W - R) / 2}" y="${H - 8}" font-size="13" fill="#444" text-anchor="middle">${dl(Math.floor((days - 1) / 2))}</text><text x="${W - R}" y="${H - 8}" font-size="13" fill="#444" text-anchor="end">오늘</text></svg>`;
  }
  function gTrend() {
    const e = ge(), m = st.chartM, s = ML.status(e);
    const body = e.shared[m] ? (() => { const r = ML.recentZ(e, m), b = r && r.base;
      return chartSvg(e, m, st.chartDays) + `<p class="sub"><i class="key kb"></i>분홍 음영 = ${e.name}님의 평소 범위 (처음 2주 기준 ${fmt(b.mean - b.sd, m)}~${fmt(b.mean + b.sd, m)}${METRICS[m].unit}) · <i class="key kd"></i>검은 점 = 최근 3일</p>
      <div class="card"><b>최근 3일 평균 ${fmt(r.recent, m)}${METRICS[m].unit}</b><p class="sub">평소(${fmt(b.mean, m)}${METRICS[m].unit}) 대비 ${r.z >= 0 ? '+' : ''}${r.z.toFixed(1)} 표준편차</p></div>`; })()
      : '<div class="card">어르신이 이 항목은 공유하지 않기로 했어요. (어르신 동의 범위 안에서만 보여요)</div>';
    return `<h1>변화 추이</h1>
    <div class="chips" role="group" aria-label="어르신 선택">${ELDERS.map((x) => `<button class="chip" data-act="gElder" data-id="${x.id}" aria-pressed="${x.id === st.gElder}">${x.name}</button>`).join('')}</div>
    <div class="chips sx" role="group" aria-label="항목">${Object.keys(METRICS).map((k) => `<button class="chip" data-act="chartM" data-v="${k}" aria-pressed="${k === m}">${METRICS[k].icon} ${METRICS[k].label}</button>`).join('')}
</div>
    <div class="chips" role="group" aria-label="기간">${[14, 28].map((d) => `<button class="chip" data-act="chartDays" data-v="${d}" aria-pressed="${st.chartDays === d}">${d}일</button>`).join('')}</div>
    <p><span class="badge ${s.level}">${e.name} · ${LV[s.level]}</span></p>
    <p class="sub">${METRICS[m].icon} <b>${METRICS[m].tech}</b> — ${METRICS[m].desc}</p>${body}
    ${s.reasons.length ? `<h2>왜 이렇게 판단했나요?</h2><div class="card">${s.reasons.map((r) => '• ' + r).join('<br>')}${s.cause ? `<p class="sub">${s.cause}</p>` : ''}</div>` : ''}`;
  }
  function gAlerts() {
    const items = st.events.slice();
    ELDERS.forEach((e) => { const s = ML.status(e); if (s.level !== 'green') items.push({ lvl: s.level, who: e.name, title: LV[s.level], reason: s.reasons.join(' / ') + (s.cause ? ' · ' + s.cause : ''), when: '오늘' }); });
    items.push({ lvl: 'yellow', who: '박영철', title: '평소와 조금 달라요', reason: '수면이 평소보다 짧은 날이 이어졌어요', when: '어제' });
    items.push({ lvl: 'green', who: '김순자', title: '안부가 도착했어요', reason: '"오늘도 잘 지내요"를 보냈어요 (오후 6:10)', when: '어제' });
    items.push({ lvl: 'info', who: '김순자', title: '링 태그를 읽었어요', reason: NFC.e1[0].who + ' · ' + NFC.e1[0].what, when: md(NFC.e1[0].ago) });
    items.push({ lvl: 'info', who: '김순자', title: '링 태그를 읽었어요', reason: NFC.e1[1].who + ' · ' + NFC.e1[1].what, when: md(NFC.e1[1].ago) });
    items.push({ lvl: 'info', who: '박영철', title: '링 태그를 읽었어요', reason: NFC.e2[0].who + ' · ' + NFC.e2[0].what, when: md(NFC.e2[0].ago) });
    const ic = { red: '🔴', yellow: '🟡', gray: '⚪', green: '🟢', info: '🪪' };
    return `<h1>알림 내역</h1><p class="sub">${S.notifyFrom}~${S.notifyTo} 밖의 일반 알림은 아침에 모아서 보내요. 긴급(SOS·무동작)은 언제든 바로 가요.</p>
    ${items.map((a) => `<article class="card alert ${a.lvl}"><div class="t">${ic[a.lvl]} ${a.who} · ${a.title}</div><p>${a.reason}</p>${a.link ? `<p><a class="del" data-act="link" href="${kakao(a.link, a.who)}" target="_blank" rel="noopener">🗺 카카오맵에서 열기</a></p>` : ''}<p class="sub">${a.when}</p></article>`).join('')}`;
  }
  function gSettings() {
    const e = ge();
    return `<h1>설정</h1>
    <h2>알림 기준</h2>
    <section class="card set">
      <label><span>낮 무동작 알림<br><span class="sub">몇 시간 움직임이 없으면 알릴까요</span></span><span class="sw"><input type="range" min="2" max="8" step="0.5" value="${S.inactH}" data-set="inactH" aria-label="무동작 시간"><b id="v-inactH">${S.inactH}시간</b></span></label>
      <label><span>알림 민감도<br><span class="sub">평소와 얼마나 달라지면 알릴까요</span></span><select data-set="sens"><option value="1" ${S.sens === 1 ? 'selected' : ''}>민감</option><option value="1.5" ${S.sens === 1.5 ? 'selected' : ''}>보통</option><option value="2" ${S.sens === 2 ? 'selected' : ''}>둔감</option></select></label>
      <label class="stack"><span>알림 받을 시간</span><span class="sw"><input type="time" value="${S.notifyFrom}" data-set="notifyFrom"> ~ <input type="time" value="${S.notifyTo}" data-set="notifyTo"></span></label>
    </section>
    <h2>오늘 할 일·복약</h2>
    <div class="chips">${ELDERS.map((x) => `<button class="chip" data-act="gElder" data-id="${x.id}" aria-pressed="${x.id === st.gElder}">${x.name}</button>`).join('')}</div>
    <section class="card"><p class="sub">${e.name}님 화면에 보이는 항목이에요.</p>
      ${allTasks(e).map((t) => `<p>${t.icon} ${t.time || '시간 없음'} · ${esc(t.text)} ${t.tag ? `<span class="sub">(${t.tag})</span>` : '<span class="sub">(어르신이 넣음)</span>'}</p>`).join('') || '<p>없어요</p>'}
      <button class="btn" data-act="edit" data-id="${e.id}">✏️ 편집하기</button></section>
    <h2>낙상 감지</h2>
    <div class="chips">${ELDERS.map((x) => `<button class="chip" data-act="gElder" data-id="${x.id}" aria-pressed="${x.id === st.gElder}">${x.name}</button>`).join('')}</div>
    <section class="card set">
      <label><span>낙상 감지 켜기</span><input type="checkbox" data-falltoggle="${e.id}" ${e.fall.on ? 'checked' : ''} aria-label="낙상 감지 켜기"></label>
      <label><span>감지 민감도<br><span class="sub">자동 = 건강검진표 낙상 위험도에 맞춰요</span></span><select data-fallmode="${e.id}" aria-label="감지 민감도">${[['auto', '자동'], ['low', '둔감'], ['mid', '보통'], ['high', '민감']].map(([k, l]) => `<option value="${k}" ${e.fall.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label><span>확인 질문 대기 시간<br><span class="sub">대답이 없으면 가족에게 알려요</span></span><select data-fallwait="${e.id}" aria-label="대기 시간">${[[0, '자동'], [15, '15초'], [30, '30초'], [45, '45초']].map(([k, l]) => `<option value="${k}" ${e.fall.wait === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <p class="sub">지금 적용: 낙상 위험 ${FL[effLevel(e)].label} · 민감도 ${FL[effLevel(e)].sens} · 확인 질문 ${waitOf(e)}초 대기${e.checkup && e.checkup.applied ? ' (건강검진표 기준)' : ''}</p>
      <p class="sub">링·폰 센서 기반 낙상 감지는 아직 정확도 검증 전이에요. 놓치거나 잘못 울릴 수 있어서 보조 수단으로 써 주세요.</p>
    </section>
    <h2>연락 순서와 역할</h2>
    <section class="card set">${CONTACTS.map((c, i) => `<label><span>${i + 1}. ${c.name}</span><span class="sw"><select data-role="${i}"><option ${c.role === '주 연락' ? 'selected' : ''}>주 연락</option><option ${c.role === '참고용' ? 'selected' : ''}>참고용</option></select>
      <button class="chip" data-act="move" data-i="${i}" data-d="-1" aria-label="위로">↑</button><button class="chip" data-act="move" data-i="${i}" data-d="1" aria-label="아래로">↓</button></span></label>`).join('')}
      <p class="sub">SOS는 이 순서대로 연락해요. 보호자 한 명이 여러 어르신을, 어르신 한 명을 여러 보호자가 함께 볼 수 있어요.</p></section>
    <h2>링 태그(NFC)에 저장되는 정보</h2>
    <section class="card"><p>링에는 고유 번호 <b>ML-7F3A-91C2</b>만 저장돼요.</p><p class="sub">이름·연락처·지병·복약은 서버에서 경찰·구급·의료진 등 인증된 사람에게만 보여요. 읽을 때마다 기록이 남고 보호자에게 알림이 가요.</p></section>`;
  }

  /* ---------- 렌더 ---------- */
  let lastView = '';
  function render() {
    renderChrome();
    const v = st.mode === 'elder' ? { home: elderHome, record: elderRecord, tasks: elderTasks, help: elderHelp }[st.eTab]() : { status: gStatus, trend: gTrend, alerts: gAlerts, settings: gSettings }[st.gTab]();
    const app = $('#app');
    app.innerHTML = v + '<p class="note">시연용 더미 데이터예요. 의료기기가 아니며, 진단이 아니라 "평소와 달라졌음"만 알려 줘요.<br>아이콘: Solar Icon Set (480 Design) · CC BY 4.0</p>';
    const vk = st.mode + ':' + (st.mode === 'elder' ? st.eTab : st.gTab);
    app.classList.toggle('enter', vk !== lastView); lastView = vk; // 토글·입력할 때는 다시 움직이지 않게
    [...app.children].forEach((c, i) => c.style.setProperty('--i', i));
    iconize(document.body);
  }

  /* ---------- 할 일 추가(어르신) / 편집창(보호자) / 검색 ---------- */
  const PRESETS = [['🚶', '산책'], ['💧', '물 마시기'], ['🍚', '식사하기'], ['📞', '가족에게 전화'], ['🧘', '스트레칭'], ['💊', '약 챙기기']];
  function openAdd() {
    st.draft = { icon: '✏️' };
    modal(`<div class="modal form"><h2 style="margin-top:0">할 일 추가</h2><p class="sub">자주 하는 것을 누르거나 직접 써 주세요.</p>
      <div class="presets">${PRESETS.map(([ic, tx]) => `<button class="chip" data-act="preset" data-icon="${ic}" data-text="${tx}">${ic} ${tx}</button>`).join('')}</div>
      <input type="text" id="newText" placeholder="직접 쓰기 (예: 화분에 물 주기)" maxlength="30" aria-label="할 일 내용">
      <h3>시간 (없어도 돼요)</h3><input type="time" id="newTime" aria-label="시간">
      <p class="err" id="newErr" role="alert"></p>
      <button class="btn" data-act="addSave">추가하기</button><button class="btn ghost" data-act="modalClose">닫기</button></div>`);
  }
  function openEditor(id) {
    st.edId = id; const e = eById(id), old = $('#overlay .modal'), top = old ? old.scrollTop : 0;
    const meds = e.meds.map((m, i) => `<div class="erow"><input type="checkbox" data-ed="med" data-i="${i}" data-f="on" ${m.on ? 'checked' : ''} aria-label="켜기"><input type="time" data-ed="med" data-i="${i}" data-f="t" value="${m.t}" aria-label="시간"><input type="text" data-ed="med" data-i="${i}" data-f="n" value="${esc(m.n)}" maxlength="20" aria-label="약 이름"><button class="del" data-act="edDel" data-k="med" data-i="${i}" aria-label="지우기">🗑</button></div>`).join('');
    const tasks = e.tasks.map((t, i) => `<div class="erow"><span aria-hidden="true">${t.icon}</span><input type="time" data-ed="task" data-i="${i}" data-f="time" value="${t.time || ''}" aria-label="시간"><input type="text" data-ed="task" data-i="${i}" data-f="text" value="${esc(t.text)}" maxlength="30" aria-label="할 일 내용"><button class="del" data-act="edDel" data-k="task" data-i="${i}" aria-label="지우기">🗑</button></div>`).join('');
    modal(`<div class="modal form"><h2 style="margin-top:0">${e.name}님 오늘 할 일 편집</h2><p class="sub">고치면 어르신 화면에 바로 보여요. 어르신이 넣은 할 일도 여기서 고치거나 지울 수 있어요.</p>
      <h3>💊 복약 (왼쪽 체크 = 사용)</h3>${meds || '<p class="sub">없어요</p>'}<button class="btn sm ghost" data-act="edAdd" data-k="med">＋ 약 추가</button>
      <h3>📝 할 일</h3>${tasks || '<p class="sub">없어요</p>'}<button class="btn sm ghost" data-act="edAdd" data-k="task">＋ 할 일 추가</button>
      <button class="btn" data-act="edDone">완료</button></div>`);
    const nu = $('#overlay .modal'); if (nu) nu.scrollTop = top;
  }
  function applyEd(t) {
    const d = t.dataset, e = eById(st.edId); if (!e) return;
    const it = (d.ed === 'med' ? e.meds : e.tasks)[+d.i]; if (!it) return;
    it[d.f] = d.f === 'on' ? t.checked : t.value;
  }
  function notFound() {
    modal(`<div class="modal"><h2 style="margin-top:0">찾는 내용이 없어요</h2><p>${st.mode === 'elder' ? '"약", "가족 전화", "내 기록"처럼 써 보세요.' : '어르신 이름, "알림", "설정", "할 일"로 찾아보세요.'}</p><button class="btn" data-act="modalClose">닫기</button></div>`);
  }
  function searchGo(q) {
    q = q.trim(); if (!q) return;
    if (st.mode === 'elder') {
      if (/약|할 ?일|복약|물|산책/.test(q)) st.eTab = 'tasks';
      else if (/전화|가족|도움|연락/.test(q)) st.eTab = 'help';
      else if (/기록|수면|잠|걸음|심박|몸/.test(q)) st.eTab = 'record';
      else if (/안부|홈|오늘/.test(q)) st.eTab = 'home';
      else return notFound();
    } else {
      const el = ELDERS.find((x) => q.includes(x.name) || q.includes(x.rel));
      if (el) { st.gElder = el.id; st.gTab = 'trend'; }
      else if (/알림/.test(q)) st.gTab = 'alerts';
      else if (/설정|기준/.test(q)) st.gTab = 'settings';
      else if (/할 ?일|약|편집/.test(q)) return openEditor(st.gElder);
      else if (/현황|가족|홈/.test(q)) st.gTab = 'status';
      else return notFound();
    }
    $('#q').value = ''; $('#q').blur(); render(); window.scrollTo(0, 0);
  }

  /* ---------- 내 위치 알리기 ---------- */
  function locAsk() {
    const e = pe();
    if (!e.shared.loc) return modal(`<div class="modal"><h2 style="margin-top:0">위치 공유가 꺼져 있어요</h2><p>켜면 "위치 알리기"를 누를 때만 가족에게 위치가 가요.</p><button class="btn" data-act="locOn">켜기</button><button class="btn ghost" data-act="modalClose">그대로 둘래요</button></div>`);
    modal(`<div class="modal"><h2 style="margin-top:0">가족에게 위치를 보낼까요?</h2><p>지금 있는 곳을 가족에게 <b>한 번</b> 보내요. 계속 따라다니지 않아요.</p>
      ${st.locMode === 'real' ? '<p class="sub">이 화면은 공개 주소예요. 위치는 이 브라우저 안에서만 쓰고 서버에는 저장하지 않아요.</p>' : '<p class="sub">시연용 더미 위치로 보내요.</p>'}
      <button class="btn" data-act="locSend">보낼래요</button><button class="btn ghost" data-act="modalClose">안 보낼래요</button></div>`);
  }
  function locFail(msg) {
    modal(`<div class="modal"><h2 style="margin-top:0">위치를 보내지 못했어요</h2><p>${msg}</p><button class="btn" data-act="locSend">다시 해 볼게요</button><button class="btn ghost" data-act="modalClose">닫기</button></div>`);
  }
  function locDone(e, l) {
    e.loc = { lat: l.lat, lng: l.lng, label: l.label, ts: Date.now() };
    addEvent('info', e.name, '위치를 알려 왔어요', esc(l.label) + ' · 어르신이 직접 "위치 알리기"를 눌렀어요', { lat: l.lat, lng: l.lng });
    modal(`<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>가족에게 위치를 보냈어요</h2><p>${esc(l.label)}</p><button class="btn" data-act="sosClose">닫기</button></div>`);
  }
  function locSend() {
    const e = pe();
    if (st.locMode === 'dummy') return locDone(e, e.dummy);
    if (!navigator.geolocation) return locFail('이 기기에서는 위치를 찾을 수 없어요.');
    const tok = ++st.locTok;
    modal(`<div class="modal"><h2 style="margin-top:0">위치를 찾는 중이에요…</h2><p>"위치 허용" 창이 뜨면 <b>허용</b>을 눌러 주세요.</p><button class="btn ghost" data-act="modalClose">그만둘래요</button></div>`);
    navigator.geolocation.getCurrentPosition(
      (p) => { if (tok === st.locTok) locDone(e, { lat: p.coords.latitude, lng: p.coords.longitude, label: '현재 위치 (정확도 약 ' + Math.round(p.coords.accuracy) + 'm)' }); },
      (er) => { if (tok === st.locTok) locFail(er && er.code === 1 ? '위치 허용을 눌러 주지 않았어요. 폰 설정에서 이 사이트의 위치를 허용해 주세요.' : '지금은 위치를 찾지 못했어요. 잠시 뒤에 다시 해 보세요.'); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
  }

  /* ---------- 건강검진표 분석 / 낙상 감지 ---------- */
  const FL = ML.FALL_LEVELS;
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  ELDERS.forEach((e) => { e.fall = { on: true, mode: 'auto', wait: 0 }; e.checkup = null; e.watch = []; e.fallAlert = null; });
  const effLevel = (e) => (e.fall.mode === 'auto' ? (e.checkup && e.checkup.applied ? e.checkup.analysis.fall.level : 'mid') : e.fall.mode);
  const waitOf = (e) => e.fall.wait || FL[effLevel(e)].wait;
  function ckBuild(e, values, src, fileName) {
    return { date: src === 'manual' ? ymd(new Date()) : values.date, source: src, fileName: fileName || '', values, analysis: ML.analyzeCheckup(values, e.age), applied: false };
  }
  ELDERS[1].checkup = ckBuild(ELDERS[1], ML.SAMPLE_CK.e2, 'sample'); // 시연: 박영철은 분석된 검진표가 이미 있음(적용 전)

  function ckCard(e) {
    const c = e.checkup;
    if (!c) return `<section class="card"><div class="rowh"><span aria-hidden="true">🩺</span>건강검진표 <span class="badge pri">AI 맞춤</span></div><p>검진표를 넣으면 내 몸에 맞는 할 일과 낙상 감지 기준을 정해 드려요.</p><button class="btn" data-act="ckOpen" data-id="${e.id}">검진표 넣기</button></section>`;
    return `<section class="card"><div class="rowh"><span aria-hidden="true">🩺</span>건강검진표<span class="badge ${c.applied ? 'green' : 'gray'}" style="margin-left:auto">${c.applied ? '적용됨' : '적용 전'}</span></div><p class="mval">확인할 것 ${c.analysis.flagged.length}<span class="mu"> 가지</span></p><p class="sub">${esc(c.date)} 검진 · 낙상 위험 ${FL[c.analysis.fall.level].label}</p><button class="btn ghost" data-act="ckView" data-id="${e.id}">결과 보기</button></section>`;
  }
  function fallCard(e) {
    const lv = effLevel(e);
    return `<section class="card"><div class="rowh"><span aria-hidden="true">🛡</span>낙상 감지<label class="swt" style="margin-left:auto"><input type="checkbox" data-falltoggle="${e.id}" ${e.fall.on ? 'checked' : ''} aria-label="낙상 감지 켜기"></label></div>
      <p>넘어진 것 같으면 먼저 "괜찮으세요?" 하고 물어봐요. 대답이 없으면 가족에게 알려요.</p>
      <p><span class="badge ${lv === 'high' ? 'yellow' : 'green'}">낙상 위험 ${FL[lv].label}</span> <span class="sub">${e.checkup && e.checkup.applied ? '건강검진표 기준' : '기본 설정'}</span></p>
      <button class="btn ghost" data-act="fallOpen">시연해 보기</button></section>`;
  }
  function fallLine(e) {
    if (e.fallAlert) return `<p style="margin-top:6px;color:var(--r-ink);font-weight:700">🛡 낙상 의심 · ${esc(e.fallAlert.when)}</p><button class="del" data-act="fallResolve" data-id="${e.id}">✓ 확인했어요 (처리 완료)</button>`;
    return `<p class="sub" style="margin-top:6px">🛡 낙상 감지 ${e.fall.on ? '켜짐 · 위험도 ' + FL[effLevel(e)].label : '꺼짐'}</p>`;
  }

  /* --- 건강검진표 넣기 --- */
  const CK_STEPS = ['사진 속 글자를 읽는 중이에요…', '수치를 찾는 중이에요…', '내 몸에 맞게 정리하는 중이에요…'];
  function ckOpen(id, keep) {
    st.ckId = id; if (!keep || !st.ck) st.ck = { consent: false, vals: {}, recSel: [] };
    const e = eById(id);
    modal(`<div class="modal form"><h2 style="margin-top:0">건강검진표 넣기</h2>
      <p>${esc(e.name)}님의 건강검진표를 넣으면 <b>내 몸에 맞게</b> 할 일과 낙상 감지 기준을 정해 드려요.</p>
      <p class="sub">건강검진표는 아주 민감한 정보예요. 이 시연 화면은 올린 파일을 <b>읽지 않고 서버로도 보내지 않아요.</b> 대신 예시 결과를 보여 드려요.</p>
      <label class="chk"><input type="checkbox" data-ckconsent ${st.ck.consent ? 'checked' : ''}><span>내 건강정보를 분석하는 데 동의해요</span></label>
      <p class="err" id="ckErr" role="alert"></p>
      <label class="btn" for="ckFile" data-act="ckPick">📷 사진·파일 올리기</label><input class="vhi" type="file" id="ckFile" accept="image/*,application/pdf" aria-label="건강검진표 사진 또는 PDF 선택">
      <button class="btn ghost" data-act="ckManual">숫자로 직접 넣기</button>
      <button class="btn ghost" data-act="ckSample">예시 검진표로 해 보기</button>
      <button class="btn ghost" data-act="modalClose">닫기</button></div>`);
  }
  function ckNeedConsent() { if (st.ck.consent) return false; const x = $('#ckErr'); if (x) x.textContent = '먼저 동의에 체크해 주세요.'; return true; }
  function ckManual() {
    modal(`<div class="modal form"><h2 style="margin-top:0">숫자로 직접 넣기</h2><p class="sub">검진표에 있는 것만 넣으셔도 돼요. 비워 두면 건너뛰어요.</p>
      ${ML.CK_FIELDS.map((f) => `<label class="fld"><span>${f.label}${f.unit ? ` <small>(${f.unit})</small>` : ''}</span><input type="text" inputmode="decimal" data-ckv="${f.k}" placeholder="예: ${f.ph}" value="${esc(st.ck.vals[f.k] == null ? '' : st.ck.vals[f.k])}" aria-label="${f.label}"></label>`).join('')}
      <p class="err" id="ckErr" role="alert"></p>
      <button class="btn" data-act="ckSubmit">분석하기</button><button class="btn ghost" data-act="ckBack">뒤로</button></div>`);
  }
  function ckSubmit() {
    const vals = {}, err = (m) => { $('#ckErr').textContent = m; };
    for (const f of ML.CK_FIELDS) {
      const raw = String(st.ck.vals[f.k] == null ? '' : st.ck.vals[f.k]).trim().replace(',', '.'); if (raw === '') continue;
      const n = Number(raw); if (!isFinite(n)) return err(`"${f.label}"에는 숫자만 넣어 주세요.`);
      if (n < f.min || n > f.max) return err(`"${f.label}" 값을 다시 확인해 주세요. (${f.min}~${f.max})`);
      vals[f.k] = n;
    }
    if (!Object.keys(vals).length) return err('하나 이상 넣어 주세요.');
    if ((vals.sbp != null) !== (vals.dbp != null)) return err('혈압은 높은 쪽과 낮은 쪽 두 칸을 모두 넣어 주세요.');
    st.ck.manual = vals; ckRun('manual', '');
  }
  function ckRun(src, fileName) {
    const e = eById(st.ckId); let i = 0; clearInterval(st.ckT);
    const draw = () => modal(`<div class="modal"><h2 style="margin-top:0">✨ AI가 분석하고 있어요</h2><p class="sub">(시연) ${esc(fileName || (src === 'manual' ? '직접 넣은 숫자' : '예시 검진표'))}</p><div class="bar"><i style="width:${Math.round((i + 1) / CK_STEPS.length * 100)}%"></i></div><p aria-live="polite">${CK_STEPS[src === 'manual' && i === 0 ? 1 : i]}</p><button class="btn ghost" data-act="modalClose">그만둘래요</button></div>`);
    draw();
    st.ckT = setInterval(() => {
      i++; if (i < CK_STEPS.length) return draw();
      clearInterval(st.ckT); st.ckT = null;
      e.checkup = ckBuild(e, src === 'manual' ? st.ck.manual : ML.SAMPLE_CK[e.id], src, fileName);
      st.ck.recSel = e.checkup.analysis.recs.map(() => true);
      addEvent('info', e.name, '건강검진표를 분석했어요', '확인할 것 ' + e.checkup.analysis.flagged.length + '가지 · 낙상 위험 ' + FL[e.checkup.analysis.fall.level].label + ' (아직 적용 전이에요)');
      ckResult(e.id);
    }, 800);
  }
  function ckResult(id) {
    const e = eById(id), c = e.checkup; st.ckId = id; if (!c) return ckOpen(id);
    if (!st.ck) st.ck = { consent: true, vals: {}, recSel: [] }; if (st.ck.recSel.length !== c.analysis.recs.length) st.ck.recSel = c.analysis.recs.map(() => true);
    const A = c.analysis, lv = A.fall.level, ok = A.items.filter((i) => i.status === 'ok');
    const srcLabel = c.source === 'manual' ? '직접 넣은 숫자' : c.source === 'upload' ? '올린 파일 (시연: 예시 결과)' : '예시 검진표 (시연)';
    const row = (i) => `<div class="ckrow"><div class="t"><span>${i.label} ${esc(i.value)}${i.unit ? ' ' + i.unit : ''}</span><span class="badge ${i.status === 'ok' ? 'green' : i.status === 'high' ? 'red' : 'yellow'}">${i.word}</span></div><p>${i.text}</p></div>`;
    modal(`<div class="modal form"><h2 style="margin-top:0">🩺 ${esc(e.name)}님 건강검진표</h2>
      <p class="sub">${esc(c.date)} · ${srcLabel}</p>
      <div class="stat ${A.flagged.length ? 'yellow' : 'green'}"><div><h2>✨ AI 요약</h2><p>${esc(A.summary)}</p></div></div>
      ${A.flagged.length ? `<h3>확인할 것 ${A.flagged.length}가지</h3>${A.flagged.map(row).join('')}` : ''}
      ${ok.length ? `<details><summary style="font-weight:700;cursor:pointer;min-height:2.6rem;display:flex;align-items:center">정상 범위 ${ok.length}가지 보기</summary>${ok.map(row).join('')}</details>` : ''}
      <h3>🛡 낙상 위험 ${FL[lv].label}</h3>
      <p class="sub">${A.fall.reasons.length ? A.fall.reasons.join(' · ') : '낙상 위험 요인이 크지 않아요.'}</p>
      <p>적용하면 낙상 감지 민감도는 <b>${FL[lv].sens}</b>, 확인 질문 대기는 <b>${FL[lv].wait}초</b>로 맞춰져요.</p>
      ${A.tips.length ? `<h3>💡 넘어지지 않게</h3>${A.tips.map((t) => `<p>• ${t}</p>`).join('')}` : ''}
      ${A.recs.length ? `<h3>내 몸에 맞는 할 일 ${c.applied ? '' : '(원하는 것만 고르세요)'}</h3>${A.recs.map((r, i) => `<label class="rec"><input type="checkbox" data-rec="${i}" ${c.applied || st.ck.recSel[i] ? 'checked' : ''} ${c.applied ? 'disabled' : ''} aria-label="${esc(r.text)}"><span>${r.icon} ${esc(r.text)}${r.time ? ' · ' + r.time : ''}<small>${r.why}</small></span></label>`).join('')}` : ''}
      ${c.applied ? '<p class="err" style="color:var(--g-ink)">✓ 이미 내 앱에 적용했어요.</p>' : '<button class="btn" data-act="ckApply">내 앱에 적용하기</button>'}
      <button class="btn ghost" data-act="ckOpen" data-id="${e.id}">다시 넣기</button>
      <button class="btn ghost" data-act="ckDelAsk">검진표 지우기</button>
      <button class="btn ghost" data-act="modalClose">닫기</button>
      <p class="sub">의사의 진단이 아니에요. 검진표에 적힌 판정이 우선이에요. 시연 화면은 일반 기준 범위와 비교해서 계산해요.</p></div>`);
  }
  function ckApply() {
    const e = eById(st.ckId), c = e.checkup, A = c.analysis; let n = 0;
    A.recs.forEach((r, i) => { if (st.ck.recSel[i] && !e.tasks.some((t) => t.ckId === r.id)) { e.tasks.push({ icon: r.icon, text: r.text, time: r.time, done: false, by: 'ai', ckId: r.id }); n++; } });
    e.watch = A.watch.slice(); c.applied = true;
    addEvent('info', e.name, '건강검진표 분석을 적용했어요', '확인할 것 ' + A.flagged.length + '가지 · 낙상 위험 ' + FL[A.fall.level].label + ' → 감지 민감도 ' + FL[A.fall.level].sens + '. 할 일 ' + n + '개를 추가했어요.');
    modal(`<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>내 앱에 적용했어요</h2><p>할 일 ${n}개를 넣었어요.<br>낙상 감지는 <b>${FL[A.fall.level].sens}</b>으로 맞췄어요.</p>${A.watch.length ? `<p class="sub">내 기록에서 ${A.watch.map((m) => METRICS[m].label).join(', ')} 칸에 "검진표 참고"가 표시돼요.</p>` : ''}<button class="btn" data-act="sosClose">닫기</button></div>`);
  }

  /* --- 낙상 감지 --- */
  const motion = { on: false, buf: [], lastFall: -1e15, t: null, drawn: 0 };
  const nowMs = () => (window.__now ? window.__now() : Date.now());
  const WHY = { moved: '충격은 있었지만 바로 움직여서 낙상으로 보지 않았어요.', 'no-impact': '떨어지는 움직임은 있었지만 큰 충격이 없었어요.', 'no-freefall': '떨어지는 움직임이 없었어요. (걷기·앉기 같은 일상 움직임)', pending: '충격 뒤 상태를 더 지켜보는 중이에요.' };
  const KINDS = [['fall', '넘어지고 못 일어남'], ['recover', '넘어졌다 바로 일어남'], ['walk', '걷다가 앉기'], ['shake', '폰 흔들기']];
  function fallOpen() {
    const e = pe(), lv = effLevel(e);
    modal(`<div class="modal form"><h2 style="margin-top:0">🛡 낙상 감지</h2>
      <p>넘어진 것 같으면 먼저 <b>"괜찮으세요?"</b> 하고 물어요. 대답이 없으면 가족에게 알려요.</p>
      <p><span class="badge ${lv === 'high' ? 'yellow' : 'green'}">낙상 위험 ${FL[lv].label}</span> <span class="sub">민감도 ${FL[lv].sens} · 대기 ${waitOf(e)}초</span></p>
      ${e.fall.on ? '' : '<p class="err">지금은 꺼져 있어요. 도움 탭에서 켤 수 있어요.</p>'}
      <h3>시연해 보기</h3>
      <div class="chips" role="group" aria-label="상황 고르기">${KINDS.map(([k, l]) => `<button class="chip" data-act="fallKind" data-v="${k}" aria-pressed="${(st.fallKind || 'fall') === k}">${l}</button>`).join('')}</div>
      <button class="btn" data-act="fallRun">센서 기록 분석하기</button>
      <div id="fallOut">${st.fallOut || ''}</div>
      <button class="btn ghost" data-act="fallSensor">이 폰 센서로 직접 보기</button>
      <p class="sub">링·폰 센서 기반 낙상 감지는 아직 정확도 검증 전이에요. 놓치거나 잘못 울릴 수 있어서 보조 수단이에요.</p>
      <button class="btn ghost" data-act="modalClose">닫기</button></div>`);
  }
  function fallChart(S, det, lv) {
    const W = 360, H = 170, L = 34, R = 8, T = 10, B = 26, tmax = S[S.length - 1].t, ymax = 4;
    const x = (t) => L + (W - L - R) * t / tmax, y = (a) => T + (H - T - B) * (1 - Math.min(a, ymax) / ymax);
    let d = ''; S.forEach((s, i) => { d += (i ? 'L' : 'M') + x(s.t).toFixed(1) + ' ' + y(s.a).toFixed(1); });
    const band = (t0, t1, col) => `<rect x="${x(t0).toFixed(1)}" y="${T}" width="${Math.max(2, x(t1) - x(t0)).toFixed(1)}" height="${H - T - B}" fill="${col}" opacity=".35"/>`;
    const th = FL[lv].impact;
    return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="센서 기록 그래프">
      ${[0, 1, 2, 3, 4].map((g) => `<line x1="${L}" x2="${W - R}" y1="${y(g)}" y2="${y(g)}" stroke="#eee"/><text x="${L - 4}" y="${y(g) + 4}" text-anchor="end" font-size="13" fill="#444">${g}g</text>`).join('')}
      ${det.tFF0 != null ? band(det.tFF0, det.tFF1, '#60a5fa') : ''}${det.stillFrom != null ? band(det.stillFrom, det.stillTo, det.fall ? '#2e8b57' : '#c28a00') : ''}
      <line x1="${L}" x2="${W - R}" y1="${y(th)}" y2="${y(th)}" stroke="#b3254b" stroke-dasharray="4 3"/>
      <path d="${d}" fill="none" stroke="#1c1917" stroke-width="1.6" stroke-linejoin="round"/>
      ${det.tImpact != null ? `<circle cx="${x(det.tImpact).toFixed(1)}" cy="${y(det.peak).toFixed(1)}" r="5" fill="#b3254b" stroke="#fff" stroke-width="1.5"/>` : ''}
      <text x="${L}" y="${H - 6}" font-size="13" fill="#444">0초</text><text x="${W - R}" y="${H - 6}" font-size="13" fill="#444" text-anchor="end">${(tmax / 1000).toFixed(0)}초</text></svg>
      <p class="sub"><i class="key" style="background:#60a5fa"></i>떨어지는 구간 <i class="key" style="background:${det.fall ? '#2e8b57' : '#c28a00'};margin-left:.5rem"></i>충격 뒤 지켜본 구간 <i class="key kd" style="background:#b3254b;margin-left:.5rem"></i>충격 (점선 = 이 민감도의 기준 ${th}g)</p>`;
  }
  function fallRun() {
    const e = pe(), lv = effLevel(e), k = st.fallKind || 'fall', S = ML.traceFor(k, 11), det = ML.detectFall(S, lv);
    st.fallDet = det;
    const msg = det.fall
      ? `<div class="stat red"><div class="light" aria-hidden="true">!</div><div><h2>낙상으로 봤어요</h2><p>떨어짐 ${((det.tFF1 - det.tFF0) / 1000).toFixed(1)}초 → 충격 ${det.peak.toFixed(1)}g → 움직임 없음 ${(FL[lv].still / 1000).toFixed(0)}초</p></div></div><button class="btn" data-act="fallAskDemo">이어서: 어르신에게 묻는 화면 보기</button>`
      : `<div class="stat green"><div class="light" aria-hidden="true">✓</div><div><h2>낙상이 아니에요</h2><p>${WHY[det.why] || ''}</p></div></div>`;
    st.fallOut = fallChart(S, det, lv) + msg; fallOpen();
    const o = $('#fallOut'); if (o) o.scrollIntoView({ block: 'nearest' });
  }
  function fallLinkInfo(e) { const ok = e.shared.loc && e.loc; return { txt: ok ? ' 마지막으로 알린 위치: ' + esc(e.loc.label) + ' (' + ago(e.loc.ts) + ').' : '', link: ok ? { lat: e.loc.lat, lng: e.loc.lng } : undefined }; }
  function fallAsk(e, det) {
    clearInterval(st.fallT); let n = waitOf(e); st.fallCtx = { e, det };
    const draw = () => modal(`<div class="modal"><div class="big" aria-live="assertive">${n}</div><h2>넘어지신 것 같아요</h2><p>괜찮으세요? <b>${n}초</b> 안에 대답이 없으면 가족에게 알려요.</p><button class="btn" data-act="fallOk" style="min-height:4rem;font-size:1.2rem">저는 괜찮아요</button><button class="btn danger" data-act="fallHelp" style="min-height:4rem;font-size:1.2rem">도와주세요</button></div>`);
    draw(); try { if (navigator.vibrate) navigator.vibrate([300, 150, 300]); } catch (x) { /* iOS는 진동 미지원 */ }
    st.fallT = setInterval(() => { n--; if (n > 0) return draw(); clearInterval(st.fallT); st.fallT = null; fallNoReply(); }, 1000);
  }
  const peakTxt = () => (st.fallCtx && st.fallCtx.det && st.fallCtx.det.peak ? st.fallCtx.det.peak.toFixed(1) + 'g ' : '');
  function fallNoReply() {
    const e = st.fallCtx.e, li = fallLinkInfo(e); e.fallAlert = { when: '방금' };
    addEvent('red', e.name, '낙상 의심 · 응답이 없어요', '충격 ' + peakTxt() + '감지 뒤 움직임이 없고, ' + waitOf(e) + '초 동안 대답이 없었어요.' + li.txt, li.link);
    modal(`<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>가족에게 알렸어요</h2><p>곧 연락이 갈 거예요.<br>${CONTACTS[0].name}님부터 전화해요.</p><button class="btn" data-act="sosClose">닫기</button></div>`);
  }
  function fallOk() {
    const e = st.fallCtx.e; clearInterval(st.fallT); st.fallT = null; e.fallAlert = null;
    addEvent('yellow', e.name, '낙상이 의심됐지만 괜찮다고 했어요', '충격 ' + peakTxt() + '감지 뒤 본인이 "괜찮아요"를 눌렀어요.');
    modal(`<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>다행이에요</h2><p>가족에게도 "괜찮다고 하셨어요"라고 알렸어요.<br>몸이 아프시면 꼭 말씀해 주세요.</p><button class="btn" data-act="sosClose">닫기</button></div>`);
  }
  function fallHelp() {
    const e = st.fallCtx.e, li = fallLinkInfo(e); clearInterval(st.fallT); st.fallT = null; e.fallAlert = { when: '방금' };
    addEvent('red', e.name, '넘어진 뒤 도움을 요청했어요', '충격 ' + peakTxt() + '감지 뒤 "도와주세요"를 눌렀어요.' + li.txt, li.link);
    modal(`<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>가족에게 알렸어요</h2><p>곧 연락이 갈 거예요.</p><button class="btn" data-act="sosClose">닫기</button></div>`);
  }
  function fallMsg(msg) { modal(`<div class="modal"><h2 style="margin-top:0">센서를 켜지 못했어요</h2><p>${msg}</p><button class="btn" data-act="fallOpen">뒤로</button></div>`); }
  function onMotion(ev) {
    const g3 = ev.accelerationIncludingGravity; if (!g3 || g3.x == null) return;
    const a = Math.hypot(g3.x, g3.y, g3.z) / 9.80665, t = nowMs(); motion.buf.push({ t, a });
    while (motion.buf.length && t - motion.buf[0].t > 12000) motion.buf.shift();
    const el = $('#liveG'); if (el && t - motion.drawn > 150) { el.textContent = a.toFixed(2); motion.drawn = t; }
  }
  function motionCheck() {
    if (motion.buf.length < 20) return;
    const t0 = motion.buf[0].t, S = motion.buf.map((s) => ({ t: s.t - t0, a: s.a })), e = pe(), det = ML.detectFall(S, effLevel(e));
    const s = $('#liveS'); if (s) s.textContent = det.fall ? '낙상 의심!' : det.why === 'pending' ? '충격 뒤 상태를 지켜보는 중…' : '움직임을 보는 중이에요';
    if (det.fall && det.tImpact + t0 > motion.lastFall + 15000) { motion.lastFall = det.tImpact + t0; stopSensor(); fallAsk(e, det); }
  }
  function stopSensor() { window.removeEventListener('devicemotion', onMotion); clearInterval(motion.t); motion.t = null; motion.on = false; }
  function fallSensor() {
    const D = window.DeviceMotionEvent;
    const start = () => {
      motion.buf = []; motion.on = true; window.addEventListener('devicemotion', onMotion); clearInterval(motion.t); motion.t = setInterval(motionCheck, 250);
      modal(`<div class="modal"><h2 style="margin-top:0">이 폰의 움직임 센서</h2><div class="big" style="color:var(--ink)" id="liveG">1.00</div><p>지금 받는 힘 (g, 가만히 있으면 약 1)</p><p id="liveS" class="sub" aria-live="polite">움직임을 보는 중이에요</p><p class="sub">폰을 던지거나 떨어뜨리지 마세요. 값을 보는 용도예요. 낙상 시연은 시뮬레이션을 권해요.</p><button class="btn ghost" data-act="fallSensorStop">그만 보기</button></div>`);
    };
    if (!D) return fallMsg('이 기기에서는 움직임 센서를 쓸 수 없어요. 시뮬레이션으로 확인해 주세요.');
    if (typeof D.requestPermission === 'function') D.requestPermission().then((r) => (r === 'granted' ? start() : fallMsg('센서 사용을 허용하지 않았어요. 폰 설정에서 허용해 주세요.'))).catch(() => fallMsg('센서를 켜지 못했어요.'));
    else start();
  }

  /* ---------- SOS ---------- */
  function sosOpen() {
    let n = 5; const ov = $('#overlay'); ov.hidden = false;
    const draw = () => { ov.innerHTML = `<div class="modal"><h2 style="margin-top:0">가족에게 도움을 요청해요</h2><div class="big" aria-live="assertive">${n}</div><p>잠시 후 가족에게 알려요.<br>잘못 눌렀다면 아래 버튼을 눌러 주세요.</p><button class="btn" data-act="sosCancel" style="min-height:4rem;font-size:1.3rem">취소할래요</button></div>`; };
    draw();
    st.sosT = setInterval(() => {
      n--; if (n > 0) return draw();
      clearInterval(st.sosT); st.sosT = null; addEvent('red', pe().name, 'SOS 호출', '어르신이 SOS 버튼을 눌렀어요. 연락 순서대로 전화를 걸어요.');
      ov.innerHTML = `<div class="modal"><div class="big" style="color:var(--g-ink)">✓</div><h2>가족에게 알렸어요</h2><p>곧 연락이 갈 거예요.<br>${CONTACTS[0].name}님부터 전화해요.</p><button class="btn" data-act="sosClose">닫기</button></div>`;
    }, 1000);
  }
  function sosEnd() { st.locTok++; clearInterval(st.fallT); st.fallT = null; clearInterval(st.ckT); st.ckT = null; stopSensor(); if (st.sosT) clearInterval(st.sosT); st.sosT = null; $('#overlay').hidden = true; render(); }

  /* ---------- 이벤트 ---------- */
  document.addEventListener('click', (ev) => {
    const t = ev.target.closest('[data-act]'); if (!t) { if (ev.target.closest('#d-more')) { const x = $('#d-extra'); x.hidden = !x.hidden; $('#d-more').setAttribute('aria-expanded', String(!x.hidden)); $('#d-more').textContent = x.hidden ? '설정 ▾' : '설정 ▴'; return; } if (ev.target.id === 'd-hc') { st.hc = !st.hc; try { localStorage.setItem('ml_hc', st.hc ? '1' : '0'); } catch (x) {} render(); } return; }
    const a = t.dataset.act, v = t.dataset.v, e = pe();
    if (a === 'mode') st.mode = v;
    else if (a === 'tab') { if (st.mode === 'elder') st.eTab = v; else st.gTab = v; }
    else if (a === 'fs') st.fs[st.mode] = +v;
    else if (a === 'speak') { const h = hero(e); if ('speechSynthesis' in window) { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(h.title + '. ' + h.line); u.lang = 'ko-KR'; u.rate = 0.85; speechSynthesis.speak(u); } return; }
    else if (a === 'imok') { e.fallAlert = null; e.inactivity = 0.5; e.lastActive = '방금'; addEvent('green', e.name, '"괜찮아요"를 눌렀어요', '무동작 알림 후 어르신이 직접 괜찮다고 알려 왔어요.'); }
    else if (a === 'charged') { e.battery = 20; e.chargedAgo = 0; e.lastActive = '방금'; addEvent('info', e.name, '링을 충전했어요', '링이 다시 켜져서 데이터가 들어오고 있어요.'); }
    else if (a === 'med') e.meds[+t.dataset.i].done = !e.meds[+t.dataset.i].done;
    else if (a === 'task') e.tasks[+t.dataset.i].done = !e.tasks[+t.dataset.i].done;
    else if (a === 'hello') { e.hello = true; addEvent('green', e.name, '안부가 도착했어요', '"오늘도 잘 지내요"를 보냈어요.'); }
    else if (a === 'openElder') { st.gElder = t.dataset.id; st.gTab = 'trend'; }
    else if (a === 'gElder') st.gElder = t.dataset.id;
    else if (a === 'chartM') st.chartM = v;
    else if (a === 'chartDays') st.chartDays = +v;
    else if (a === 'move') { const i = +t.dataset.i, j = i + +t.dataset.d; if (j >= 0 && j < CONTACTS.length) [CONTACTS[i], CONTACTS[j]] = [CONTACTS[j], CONTACTS[i]]; }
    else if (a === 'link') return;
    else if (a === 'locMode') st.locMode = v;
    else if (a === 'locAsk') return locAsk();
    else if (a === 'locOn') { e.shared.loc = true; return locAsk(); }
    else if (a === 'locSend') return locSend();
    else if (a === 'ckOpen') return ckOpen(t.dataset.id || st.ckId);
    else if (a === 'ckView') return ckResult(t.dataset.id);
    else if (a === 'ckPick') { if (ckNeedConsent()) ev.preventDefault(); return; }
    else if (a === 'ckManual') { if (ckNeedConsent()) return; return ckManual(); }
    else if (a === 'ckSample') { if (ckNeedConsent()) return; return ckRun('sample', ''); }
    else if (a === 'ckBack') return ckOpen(st.ckId, true);
    else if (a === 'ckSubmit') return ckSubmit();
    else if (a === 'ckApply') return ckApply();
    else if (a === 'ckDelAsk') return modal(`<div class="modal"><h2 style="margin-top:0">검진표를 지울까요?</h2><p>분석 결과와 검진표로 추가한 할 일이 함께 사라져요.</p><button class="btn" data-act="ckDelOk">지울래요</button><button class="btn ghost" data-act="modalClose">안 지울래요</button></div>`);
    else if (a === 'ckDelOk') { const ee = eById(st.ckId); ee.checkup = null; ee.watch = []; ee.tasks = ee.tasks.filter((x) => x.by !== 'ai'); addEvent('info', ee.name, '건강검진표를 지웠어요', '분석 결과와 추천 할 일을 모두 삭제했어요.'); return sosEnd(); }
    else if (a === 'fallOpen') return fallOpen();
    else if (a === 'fallKind') { st.fallKind = v; st.fallOut = ''; return fallOpen(); }
    else if (a === 'fallRun') return fallRun();
    else if (a === 'fallAskDemo') return fallAsk(e, st.fallDet);
    else if (a === 'fallOk') return fallOk();
    else if (a === 'fallHelp') return fallHelp();
    else if (a === 'fallSensor') return fallSensor();
    else if (a === 'fallSensorStop') { stopSensor(); return fallOpen(); }
    else if (a === 'fallResolve') { const ee = eById(t.dataset.id); ee.fallAlert = null; addEvent('green', ee.name, '낙상 의심 건을 확인했어요', '보호자가 처리 완료로 표시했어요.'); }
    else if (a === 'sos') return sosOpen();
    else if (a === 'addTask') return openAdd();
    else if (a === 'preset') { st.draft.icon = t.dataset.icon; $('#newText').value = t.dataset.text; $('#newText').focus(); return; }
    else if (a === 'addSave') {
      const text = $('#newText').value.trim();
      if (!text) { $('#newErr').textContent = '할 일 내용을 써 주세요.'; $('#newText').focus(); return; }
      e.tasks.push({ icon: st.draft.icon, text, time: $('#newTime').value, done: false, by: 'elder' });
      addEvent('info', e.name, '할 일을 추가했어요', '"' + esc(text) + '"'); return sosEnd();
    }
    else if (a === 'delAsk') { const it = e.tasks[+t.dataset.i]; return modal(`<div class="modal"><h2 style="margin-top:0">지울까요?</h2><p>"${esc(it.text)}"</p><button class="btn" data-act="delOk" data-i="${t.dataset.i}">지울래요</button><button class="btn ghost" data-act="modalClose">안 지울래요</button></div>`); }
    else if (a === 'delOk') { e.tasks.splice(+t.dataset.i, 1); return sosEnd(); }
    else if (a === 'edit') return openEditor(t.dataset.id);
    else if (a === 'edAdd') { const g = ge(), ed = eById(st.edId); if (t.dataset.k === 'med') ed.meds.push({ t: '12:00', n: '새 약', done: false, on: true }); else ed.tasks.push({ icon: '✏️', text: '새 할 일', time: '', done: false, by: 'guardian' }); return openEditor(st.edId); }
    else if (a === 'edDel') { const ed = eById(st.edId); (t.dataset.k === 'med' ? ed.meds : ed.tasks).splice(+t.dataset.i, 1); return openEditor(st.edId); }
    else if (a === 'edDone') { const ed = eById(st.edId); ed.meds = ed.meds.filter((m) => m.n.trim()); ed.tasks = ed.tasks.filter((x) => x.text.trim()); return sosEnd(); }
    else if (a === 'sosCancel' || a === 'sosClose' || a === 'modalClose') return sosEnd();
    render();
    window.scrollTo(0, a === 'tab' || a === 'mode' || a === 'openElder' ? 0 : window.scrollY);
  });
  document.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('.ecard')) { ev.preventDefault(); ev.target.click(); } });
  document.addEventListener('input', (ev) => { if (ev.target.dataset.ckv) { st.ck.vals[ev.target.dataset.ckv] = ev.target.value; return; } if (ev.target.dataset.ed) return applyEd(ev.target); const k = ev.target.dataset.set; if (k === 'inactH') { S.inactH = +ev.target.value; $('#v-inactH').textContent = S.inactH + '시간'; } });
  document.addEventListener('change', (ev) => {
    const t = ev.target, d = t.dataset;
    if (d.ed) return applyEd(t);
    if (t.id === 'ckFile') { const f = t.files && t.files[0]; if (!f) return; if (!st.ck || !st.ck.consent) { t.value = ''; const x = $('#ckErr'); if (x) x.textContent = '먼저 동의에 체크해 주세요.'; return; } return ckRun('upload', f.name); }
    if (d.ckconsent !== undefined) { st.ck.consent = t.checked; const x = $('#ckErr'); if (x && t.checked) x.textContent = ''; return; }
    if (d.ckv) { st.ck.vals[d.ckv] = t.value; return; }
    if (d.rec !== undefined) { st.ck.recSel[+d.rec] = t.checked; return; }
    if (d.falltoggle) { const ee = eById(d.falltoggle); ee.fall.on = t.checked; if (!t.checked) addEvent('yellow', ee.name, '낙상 감지를 껐어요', '낙상 감지가 꺼져 있는 동안은 넘어져도 알림이 가지 않아요.'); else addEvent('green', ee.name, '낙상 감지를 켰어요', ''); return render(); }
    if (d.fallmode) { eById(d.fallmode).fall.mode = t.value; return render(); }
    if (d.fallwait) { eById(d.fallwait).fall.wait = +t.value; return render(); }
    if (t.matches('[data-act=persona]')) st.persona = t.value;
    else if (d.set) S[d.set] = (d.set === 'sens' || d.set === 'inactH') ? +t.value : t.value;
    else if (d.share) pe().shared[d.share] = t.checked;
    else if (d.med) ge().meds[+d.med].on = t.checked;
    else if (d.role) CONTACTS[+d.role].role = t.value;
    else return;
    render();
  });
  $('#search').addEventListener('submit', (ev) => { ev.preventDefault(); searchGo($('#q').value); });
  render();
})();
