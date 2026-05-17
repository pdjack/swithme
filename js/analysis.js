import { state, saveToLocal } from './store.js';
import { icon } from './icons.js';

/**
 * Analysis Module — v2.0
 * 단일 대시보드: 종합 점수 / 카테고리별 활동 시간 트렌드 / 인사이트 / 처방전
 * 데이터 소스:
 *   - state.reflections[YYYY-MM-DD].total  → 종합 점수
 *   - state.timetables[].history (모든 타임테이블 통합) → 카테고리별 일별 활동 시간
 */

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
// activePeriod: { mode: 'preset', days } | { mode: 'custom', startKey, endKey }
let activePeriod = { mode: 'preset', days: 7 };
let trendChart = null;
let mobileTrendChart = null;
// 트렌드 차트 보기 모드: 'minutes' | 'percent'
let trendViewMode = 'minutes';
// 차트에서 숨길 카테고리 id 집합 (PC/모바일 공통)
const hiddenCategories = new Set();
// 활성 스냅샷 (null이면 라이브 모드). 동결된 분석 결과를 보여줄 때 사용.
let activeSnapshot = null;

function isSnapshotMode() {
    return activeSnapshot !== null;
}

function getActiveSubjects() {
    return isSnapshotMode() ? activeSnapshot.subjects : state.subjects;
}

function getChartData() {
    if (isSnapshotMode()) {
        return {
            dateKeys: activeSnapshot.dateKeys,
            buckets: activeSnapshot.buckets,
            subjects: activeSnapshot.subjects
        };
    }
    const dateKeys = currentDateKeys();
    return {
        dateKeys,
        buckets: aggregateActivityByDayAndCategory(dateKeys),
        subjects: state.subjects
    };
}

// ── 날짜 유틸 ──────────────────────────────────────────
function toDateKey(d) {
    return d.toISOString().split('T')[0];
}

function buildDateRange(days, endDate = new Date()) {
    const keys = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate);
        d.setDate(d.getDate() - i);
        keys.push(toDateKey(d));
    }
    return keys;
}

function buildDateRangeBetween(startKey, endKey) {
    const start = new Date(startKey);
    const end = new Date(endKey);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) return [];
    const keys = [];
    const cur = new Date(start);
    while (cur <= end) {
        keys.push(toDateKey(cur));
        cur.setDate(cur.getDate() + 1);
    }
    return keys;
}

function currentDateKeys() {
    if (activePeriod.mode === 'custom') {
        return buildDateRangeBetween(activePeriod.startKey, activePeriod.endKey);
    }
    return buildDateRange(activePeriod.days);
}

function previousDateKeys() {
    const cur = currentDateKeys();
    if (cur.length === 0) return [];
    const days = cur.length;
    const firstDate = new Date(cur[0]);
    const prevEnd = new Date(firstDate);
    prevEnd.setDate(prevEnd.getDate() - 1);
    return buildDateRange(days, prevEnd);
}

// ── 데이터 집계 ────────────────────────────────────────
/**
 * 전체 타임테이블 history를 통합하여 일별·카테고리별 활동 시간(초)을 집계.
 * 반환: { 'YYYY-MM-DD': { subjectId: seconds, ... } }
 */
function aggregateActivityByDayAndCategory(dateKeys) {
    const buckets = {};
    dateKeys.forEach(k => { buckets[k] = {}; });

    const dateKeySet = new Set(dateKeys);
    state.timetables.forEach(tt => {
        (tt.history || []).forEach(session => {
            if (!session.startTime || !session.duration) return;
            const sessionDate = new Date(session.startTime);
            if (Number.isNaN(sessionDate.getTime())) return;
            const key = toDateKey(sessionDate);
            if (!dateKeySet.has(key)) return;
            const subId = session.subject || 'OTH';
            buckets[key][subId] = (buckets[key][subId] || 0) + (Number(session.duration) || 0);
        });
    });
    return buckets;
}

// 회고가 없는 날은 0점으로 계산. 분모는 기간 전체 일수.
// recordedCount = 실제 회고 기록이 있던 날 수 (표시·인사이트용)
function averageReflectionTotal(dateKeys) {
    if (dateKeys.length === 0) return { avg: null, count: 0, recordedCount: 0 };
    let sum = 0;
    let recordedCount = 0;
    dateKeys.forEach(k => {
        const r = state.reflections[k];
        if (r && typeof r.total === 'number') {
            sum += r.total;
            recordedCount++;
        }
    });
    return { avg: sum / dateKeys.length, count: dateKeys.length, recordedCount };
}

/**
 * 회고 항목별 평균을 계산.
 * 반환: [{ id, name, emoji, max, avg, count }, ...]
 *   - 첫 항목은 '목표 달성률'(achievement, 20점 만점) 고정
 *   - 이후 state.reflectionItems 순서대로, 각 항목 만점은 getReflectionItemMax(i)로 산출
 *     (window 미정의 환경 대비 fallback 포함)
 */
function averageReflectionByItem(dateKeys) {
    const items = state.reflectionItems || [];
    const itemCount = items.length;
    const getMax = typeof window !== 'undefined' && typeof window.getReflectionItemMax === 'function'
        ? window.getReflectionItemMax
        : (i) => {
            if (itemCount === 0) return 0;
            const baseMax = Math.floor(80 / itemCount);
            const remainder = 80 - baseMax * itemCount;
            return i < remainder ? baseMax + 1 : baseMax;
        };

    const rows = [
        { id: 'achievement', name: '목표 달성률', emoji: '🎯', max: 20, sum: 0, count: 0 },
        ...items.map((it, i) => ({
            id: it.id,
            name: it.name,
            emoji: it.emoji || '•',
            max: getMax(i),
            sum: 0,
            count: 0
        }))
    ];

    // 회고 없는 날 = 각 항목 0점으로 처리. 분모는 기간 전체 일수.
    const totalDays = dateKeys.length;
    dateKeys.forEach(k => {
        const r = state.reflections[k] || {};
        rows.forEach(row => {
            const v = r[row.id];
            row.sum += typeof v === 'number' ? v : 0;
        });
    });

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        emoji: row.emoji,
        max: row.max,
        avg: totalDays > 0 ? row.sum / totalDays : null,
        count: totalDays
    }));
}

// ── 종합 점수 렌더 ─────────────────────────────────────
function renderItemBreakdown(itemRows, scope) {
    const breakdownEl = document.getElementById(scope === 'mobile' ? 'm-score-item-breakdown' : 'score-item-breakdown');
    if (!breakdownEl) return;
    if (!itemRows || itemRows.length === 0) {
        breakdownEl.innerHTML = '';
        return;
    }
    breakdownEl.innerHTML = itemRows.map(row => {
        const avgText = row.avg === null ? '—' : row.avg.toFixed(1);
        return `
            <div class="score-item-row">
                <span class="score-item-label">${row.emoji} ${row.name}</span>
                <span class="score-item-value">${avgText}<small>/${row.max}</small></span>
            </div>
        `;
    }).join('');
}

function renderScoreCard(scope = 'pc') {
    const valueEl = document.getElementById(scope === 'mobile' ? 'm-score-value' : 'score-value');
    const deltaEl = document.getElementById(scope === 'mobile' ? 'm-score-delta' : 'score-delta');
    const subEl = document.getElementById(scope === 'mobile' ? 'm-score-sub' : 'score-sub');
    if (!valueEl) return;

    let current, prev, itemRows, days;
    if (isSnapshotMode()) {
        const s = activeSnapshot.score;
        current = { avg: s.avg, count: s.days, recordedCount: s.recordedCount };
        prev = { avg: s.prevAvg, count: s.days, recordedCount: 0 };
        itemRows = s.itemRows;
        days = s.days;
    } else {
        const currentKeys = currentDateKeys();
        const prevKeys = previousDateKeys();
        days = currentKeys.length;
        current = averageReflectionTotal(currentKeys);
        prev = averageReflectionTotal(prevKeys);
        itemRows = averageReflectionByItem(currentKeys);
    }

    if (current.avg === null) {
        valueEl.textContent = '—';
        deltaEl.innerHTML = '';
        subEl.textContent = '기간이 비어 있습니다.';
        renderItemBreakdown([], scope);
        return;
    }

    valueEl.textContent = current.avg.toFixed(1);
    subEl.textContent = `${days}일 중 ${current.recordedCount}일 회고 기록 (미기록 0점 처리)`;
    renderItemBreakdown(itemRows, scope);

    if (prev.avg === null) {
        deltaEl.innerHTML = '<span class="delta-neutral">이전 기간 비교 불가</span>';
        return;
    }
    const diff = current.avg - prev.avg;
    const rounded = Math.abs(diff).toFixed(1);
    if (diff > 0.1) {
        deltaEl.innerHTML = `<span class="delta-up">▲ +${rounded}</span><small>이전 기간 대비</small>`;
    } else if (diff < -0.1) {
        deltaEl.innerHTML = `<span class="delta-down">▼ -${rounded}</span><small>이전 기간 대비</small>`;
    } else {
        deltaEl.innerHTML = `<span class="delta-neutral">– 변화 없음</span><small>이전 기간 대비</small>`;
    }
}

// ── 트렌드 그래프 렌더 ──────────────────────────────────
function renderCategoryToggleList(scope) {
    const listEl = document.getElementById(scope === 'mobile' ? 'm-category-toggle-list' : 'category-toggle-list');
    if (!listEl) return;
    const subjects = getActiveSubjects();
    if (!subjects || subjects.length === 0) {
        listEl.innerHTML = '';
        return;
    }
    listEl.innerHTML = subjects.map(sub => {
        const isHidden = hiddenCategories.has(sub.id);
        return `
            <button type="button"
                    class="category-toggle-chip${isHidden ? ' hidden' : ''}"
                    data-cat-id="${sub.id}"
                    style="--swatch: ${sub.color};"
                    aria-pressed="${!isHidden}">
                <span class="chip-swatch"></span>
                <span class="chip-name">${sub.name}</span>
            </button>
        `;
    }).join('');
    listEl.querySelectorAll('.category-toggle-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const id = chip.dataset.catId;
            if (hiddenCategories.has(id)) hiddenCategories.delete(id);
            else hiddenCategories.add(id);
            // 양쪽 scope 차트·칩 모두 다시 그림
            renderTrendChart('pc');
            renderTrendChart('mobile');
            renderCategoryToggleList('pc');
            renderCategoryToggleList('mobile');
        });
    });
}

function renderTrendChart(scope = 'pc') {
    const canvasId = scope === 'mobile' ? 'm-category-trend-chart' : 'category-trend-chart';
    const emptyId = scope === 'mobile' ? 'm-trend-empty' : 'trend-empty';
    const canvas = document.getElementById(canvasId);
    const emptyEl = document.getElementById(emptyId);
    if (!canvas) return;

    const { dateKeys, buckets, subjects } = getChartData();
    const days = dateKeys.length;

    const totalSeconds = Object.values(buckets).reduce((acc, day) => {
        return acc + Object.values(day).reduce((a, b) => a + b, 0);
    }, 0);

    if (totalSeconds === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        canvas.style.display = 'none';
        if (scope === 'mobile' && mobileTrendChart) { mobileTrendChart.destroy(); mobileTrendChart = null; }
        if (scope !== 'mobile' && trendChart) { trendChart.destroy(); trendChart = null; }
        return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    canvas.style.display = '';

    const labels = dateKeys.map(k => k.slice(5));
    const isPercent = trendViewMode === 'percent';

    // 비율 모드용: 날짜별 총합(초)
    const dayTotals = dateKeys.map(k => {
        return Object.values(buckets[k] || {}).reduce((a, b) => a + b, 0);
    });

    const visibleSubjects = subjects.filter(s => !hiddenCategories.has(s.id));
    const datasets = visibleSubjects.map(sub => {
        const data = dateKeys.map((k, i) => {
            const sec = buckets[k][sub.id] || 0;
            if (isPercent) {
                const total = dayTotals[i];
                return total > 0 ? +((sec / total) * 100).toFixed(1) : 0;
            }
            return +(sec / 60).toFixed(1);
        });
        return {
            label: sub.name,
            data,
            borderColor: sub.color,
            backgroundColor: sub.color + '22',
            borderWidth: 2,
            pointRadius: 3,
            tension: 0.3,
            fill: false
        };
    });

    const existing = scope === 'mobile' ? mobileTrendChart : trendChart;
    if (existing) existing.destroy();

    const yTitle = isPercent ? '%' : '분';
    const unitSuffix = isPercent ? '%' : '분';

    const chart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#E5E5EA', boxWidth: 10, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}${unitSuffix}`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: isPercent ? 100 : undefined,
                    title: { display: true, text: yTitle, color: '#8E8E93' },
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#8E8E93' }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#8E8E93', maxRotation: 0, autoSkip: true, maxTicksLimit: days > 14 ? 8 : 7 }
                }
            }
        }
    });

    if (scope === 'mobile') mobileTrendChart = chart;
    else trendChart = chart;
}

// ── 인사이트 생성 ──────────────────────────────────────
function linearTrendSlope(values) {
    const n = values.length;
    if (n < 2) return 0;
    const xs = values.map((_, i) => i);
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = values.reduce((a, b) => a + b, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
        num += (xs[i] - meanX) * (values[i] - meanY);
        den += (xs[i] - meanX) ** 2;
    }
    return den === 0 ? 0 : num / den;
}

function buildInsights() {
    const insights = [];
    const dateKeys = currentDateKeys();
    const days = dateKeys.length;
    const buckets = aggregateActivityByDayAndCategory(dateKeys);

    // 1. 카테고리별 총 활동 시간 & 추세
    const categoryTotals = {};
    const categorySeries = {};
    state.subjects.forEach(sub => {
        categoryTotals[sub.id] = 0;
        categorySeries[sub.id] = [];
    });
    dateKeys.forEach(k => {
        state.subjects.forEach(sub => {
            const sec = buckets[k][sub.id] || 0;
            categoryTotals[sub.id] += sec;
            categorySeries[sub.id].push(sec / 60);
        });
    });

    const activeCategories = state.subjects.filter(s => categoryTotals[s.id] > 0);

    // Insight: 추세 상승/하락 (기울기 기반, 활동이 있는 카테고리만)
    if (activeCategories.length > 0) {
        const slopes = activeCategories.map(s => ({
            sub: s,
            slope: linearTrendSlope(categorySeries[s.id])
        }));
        const topUp = slopes.filter(x => x.slope > 0.5).sort((a, b) => b.slope - a.slope)[0];
        const topDown = slopes.filter(x => x.slope < -0.5).sort((a, b) => a.slope - b.slope)[0];
        if (topUp) {
            insights.push({
                icon: 'trending-up',
                tone: 'up',
                title: `${topUp.sub.name} 상승세`,
                body: `최근 ${days}일간 ${topUp.sub.name} 활동 시간이 꾸준히 늘고 있습니다.`
            });
        }
        if (topDown) {
            insights.push({
                icon: 'trending-down',
                tone: 'down',
                title: `${topDown.sub.name} 하락세`,
                body: `${topDown.sub.name} 활동 시간이 점차 줄고 있어요. 계획을 점검해 보세요.`
            });
        }
    }

    // 2. 요일별 평균 종합 점수 (회고 없는 날 = 0점 처리)
    const dowSums = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    dateKeys.forEach(k => {
        const dow = new Date(k).getDay();
        const r = state.reflections[k];
        const val = (r && typeof r.total === 'number') ? r.total : 0;
        dowSums[dow] += val;
        dowCounts[dow]++;
    });
    const dowAvgs = dowSums.map((s, i) => dowCounts[i] > 0 ? s / dowCounts[i] : null);
    const validDows = dowAvgs
        .map((v, i) => ({ v, i }))
        .filter(x => x.v !== null);
    if (validDows.length >= 3) {
        const best = validDows.reduce((a, b) => (b.v > a.v ? b : a));
        const worst = validDows.reduce((a, b) => (b.v < a.v ? b : a));
        if (best.v - worst.v >= 10) {
            insights.push({
                icon: 'calendar-days',
                tone: 'info',
                title: `${DAY_LABELS[worst.i]}요일 하락 패턴`,
                body: `${DAY_LABELS[best.i]}요일 평균 ${best.v.toFixed(0)}점 대비 ${DAY_LABELS[worst.i]}요일은 ${worst.v.toFixed(0)}점으로 낮습니다.`
            });
        }
    }

    // 3. 최약 카테고리 (활동 시간 0이거나 가장 낮음)
    const zeroCats = state.subjects.filter(s => categoryTotals[s.id] === 0);
    if (zeroCats.length > 0 && zeroCats.length < state.subjects.length) {
        insights.push({
            icon: 'alert-circle',
            tone: 'warn',
            title: `미활동 카테고리 ${zeroCats.length}개`,
            body: `${zeroCats.map(c => c.name).join(', ')} 카테고리는 최근 ${days}일간 활동 기록이 없습니다.`
        });
    }

    // 4. 회고 기록률
    const reflectionCount = dateKeys.filter(k => state.reflections[k]).length;
    const rate = reflectionCount / days;
    if (rate < 0.5 && days >= 7) {
        insights.push({
            icon: 'book-open',
            tone: 'warn',
            title: '회고 기록률 낮음',
            body: `${days}일 중 ${reflectionCount}일만 회고를 남기셨어요. 꾸준한 회고가 정확한 분석의 기반입니다.`
        });
    }

    return { insights, categoryTotals, dowAvgs, categorySeries };
}

function renderInsights(insightData, scope = 'pc') {
    const listEl = document.getElementById(scope === 'mobile' ? 'm-insight-list' : 'insight-list');
    if (!listEl) return;
    const { insights } = insightData;
    if (insights.length === 0) {
        listEl.innerHTML = `<div class="empty-state small"><p>데이터가 더 쌓이면 인사이트가 표시됩니다.</p></div>`;
        return;
    }
    listEl.innerHTML = insights.map(ins => `
        <div class="insight-card glass-card tone-${ins.tone}">
            <div class="insight-icon">${icon(ins.icon, 18)}</div>
            <div class="insight-body">
                <div class="insight-title">${ins.title}</div>
                <p>${ins.body}</p>
            </div>
        </div>
    `).join('');
}

// ── 처방전 생성 ────────────────────────────────────────
function buildPrescription(insightData) {
    const { categoryTotals, dowAvgs } = insightData;
    const dateKeys = currentDateKeys();
    const { avg, recordedCount } = averageReflectionTotal(dateKeys);

    // 데이터 부족
    if (avg === null) {
        return '기간이 비어 있습니다. 기간을 선택해 보세요.';
    }
    if (recordedCount === 0) {
        return '회고를 먼저 기록해보세요. 며칠 치 데이터가 쌓이면 맞춤 처방을 제시합니다.';
    }

    const activeCategories = state.subjects.filter(s => categoryTotals[s.id] > 0);
    const minCat = activeCategories.length > 0
        ? activeCategories.reduce((a, b) => categoryTotals[a.id] < categoryTotals[b.id] ? a : b)
        : null;

    const validDows = dowAvgs
        .map((v, i) => ({ v, i }))
        .filter(x => x.v !== null);
    const worstDow = validDows.length > 0
        ? validDows.reduce((a, b) => (b.v < a.v ? b : a))
        : null;

    const parts = [];
    if (avg >= 80) {
        parts.push(`훌륭한 페이스입니다. 평균 ${avg.toFixed(0)}점을 유지하고 있어요.`);
    } else if (avg >= 60) {
        parts.push(`평균 ${avg.toFixed(0)}점, 상위 수준의 꾸준함입니다. 한 단계 더 올려볼 여지가 있어요.`);
    } else {
        parts.push(`평균 ${avg.toFixed(0)}점. 작은 개선이 큰 차이를 만듭니다.`);
    }

    if (minCat) {
        const minMinutes = Math.round(categoryTotals[minCat.id] / 60);
        parts.push(`그중 '${minCat.name}'이(가) 가장 적은 활동 시간(${minMinutes}분)을 기록했습니다. 이번 주는 이 카테고리에 하루 15~20분을 선(先) 배치해 보세요.`);
    }
    if (worstDow) {
        parts.push(`특히 ${DAY_LABELS[worstDow.i]}요일(평균 ${worstDow.v.toFixed(0)}점)에 집중도가 떨어집니다. 그날만큼은 가벼운 계획으로 시작해 관성을 이어가세요.`);
    }
    return parts.join(' ');
}

function renderPrescription(text, scope = 'pc') {
    const card = document.getElementById(scope === 'mobile' ? 'm-prescription-card' : 'prescription-card');
    if (!card) return;
    card.innerHTML = `<p class="prescription-text">${text}</p>`;
}

// ── 엔트리 ─────────────────────────────────────────────
export function renderAnalysisDashboard(arg) {
    // 하위 호환: 숫자(일수) 인자 또는 {mode, days|startKey, endKey} 객체 허용
    if (typeof arg === 'number') {
        activePeriod = { mode: 'preset', days: arg };
    } else if (arg && typeof arg === 'object') {
        if (arg.mode === 'custom' && arg.startKey && arg.endKey) {
            activePeriod = { mode: 'custom', startKey: arg.startKey, endKey: arg.endKey };
        } else if (arg.mode === 'preset' && typeof arg.days === 'number') {
            activePeriod = { mode: 'preset', days: arg.days };
        }
    }

    let insightData, prescription;
    if (isSnapshotMode()) {
        insightData = { insights: activeSnapshot.insights };
        prescription = activeSnapshot.prescription;
    } else {
        insightData = buildInsights();
        prescription = buildPrescription(insightData);
    }

    renderScoreCard('pc');
    renderTrendChart('pc');
    renderCategoryToggleList('pc');
    renderInsights(insightData, 'pc');
    renderPrescription(prescription, 'pc');

    renderScoreCard('mobile');
    renderTrendChart('mobile');
    renderCategoryToggleList('mobile');
    renderInsights(insightData, 'mobile');
    renderPrescription(prescription, 'mobile');

    refreshSnapshotUiState();
    updateTrendViewHint();
}

function updateTrendViewHint() {
    const text = trendViewMode === 'percent'
        ? '비율 모드: 그날 활동한 시간 중 각 카테고리가 차지한 비중(%)을 보여줍니다. 한 카테고리에 시간이 몰려도 다른 카테고리 추세를 비교하기 좋습니다.'
        : '시간 모드: 카테고리별 실제 활동 시간(분)을 그대로 보여줍니다.';
    ['trend-view-hint', 'm-trend-view-hint'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    });
}

function setupTrendViewToggles() {
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.view === 'percent' ? 'percent' : 'minutes';
            trendViewMode = mode;
            document.querySelectorAll('.view-mode-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.view === mode);
            });
            renderTrendChart('pc');
            renderTrendChart('mobile');
            updateTrendViewHint();
        });
    });
    updateTrendViewHint();
}

function setActiveButtons(scope, matcher) {
    const sel = scope === 'mobile' ? '.period-btn[data-scope="mobile"]' : '.period-btn:not([data-scope="mobile"])';
    document.querySelectorAll(sel).forEach(b => {
        b.classList.toggle('active', matcher(b));
    });
}

function syncCustomRangeVisibility(activeIsCustom) {
    const pc = document.getElementById('period-custom-range');
    const mo = document.getElementById('m-period-custom-range');
    if (pc) pc.style.display = activeIsCustom ? '' : 'none';
    if (mo) mo.style.display = activeIsCustom ? '' : 'none';
}

function defaultCustomRange() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { startKey: toDateKey(start), endKey: toDateKey(end) };
}

export function setupAnalysisPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const raw = btn.dataset.period;

            if (raw === 'custom') {
                // 양쪽 scope 모두 '직접 선택' 활성화
                setActiveButtons('pc', b => b.dataset.period === 'custom');
                setActiveButtons('mobile', b => b.dataset.period === 'custom');
                syncCustomRangeVisibility(true);

                // 기존 값 유지 or 기본값 채움
                const startPc = document.getElementById('period-custom-start');
                const endPc = document.getElementById('period-custom-end');
                const startMo = document.getElementById('m-period-custom-start');
                const endMo = document.getElementById('m-period-custom-end');
                let range;
                if (activePeriod.mode === 'custom') {
                    range = { startKey: activePeriod.startKey, endKey: activePeriod.endKey };
                } else {
                    range = defaultCustomRange();
                }
                [startPc, startMo].forEach(el => { if (el && !el.value) el.value = range.startKey; });
                [endPc, endMo].forEach(el => { if (el && !el.value) el.value = range.endKey; });
                return;
            }

            const days = Number(raw);
            setActiveButtons('pc', b => Number(b.dataset.period) === days);
            setActiveButtons('mobile', b => Number(b.dataset.period) === days);
            syncCustomRangeVisibility(false);
            renderAnalysisDashboard(days);
        });
    });

    const applyCustom = (startId, endId, mirrorStartId, mirrorEndId) => {
        const startEl = document.getElementById(startId);
        const endEl = document.getElementById(endId);
        if (!startEl || !endEl) return;
        const startKey = startEl.value;
        const endKey = endEl.value;
        if (!startKey || !endKey) return;
        if (new Date(startKey) > new Date(endKey)) return;
        // 반대 scope 입력값도 동기화
        const ms = document.getElementById(mirrorStartId);
        const me = document.getElementById(mirrorEndId);
        if (ms) ms.value = startKey;
        if (me) me.value = endKey;
        renderAnalysisDashboard({ mode: 'custom', startKey, endKey });
    };

    const pcApply = document.getElementById('period-custom-apply');
    if (pcApply) {
        pcApply.addEventListener('click', () =>
            applyCustom('period-custom-start', 'period-custom-end', 'm-period-custom-start', 'm-period-custom-end')
        );
    }
    const moApply = document.getElementById('m-period-custom-apply');
    if (moApply) {
        moApply.addEventListener('click', () =>
            applyCustom('m-period-custom-start', 'm-period-custom-end', 'period-custom-start', 'period-custom-end')
        );
    }

    setupTrendViewToggles();
}

// ── 스냅샷 ─────────────────────────────────────────────
function formatPeriodLabel(period, dateKeys) {
    if (dateKeys.length === 0) return '';
    const start = dateKeys[0];
    const end = dateKeys[dateKeys.length - 1];
    const compact = (k) => k.slice(5).replace('-', '/');
    if (period.mode === 'preset') {
        return `최근 ${period.days}일 (${compact(start)} ~ ${compact(end)})`;
    }
    return `${compact(start)} ~ ${compact(end)} (${dateKeys.length}일)`;
}

function buildSnapshotPayload(name, memo) {
    if (isSnapshotMode()) return null; // 스냅샷 보는 중엔 새 스냅샷 못 만듦
    const dateKeys = currentDateKeys();
    if (dateKeys.length === 0) return null;
    const buckets = aggregateActivityByDayAndCategory(dateKeys);
    const prevKeys = previousDateKeys();
    const current = averageReflectionTotal(dateKeys);
    const prev = averageReflectionTotal(prevKeys);
    const itemRows = averageReflectionByItem(dateKeys);
    const insightData = buildInsights();
    const prescription = buildPrescription(insightData);

    return {
        id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: name.trim() || `분석 ${new Date().toLocaleDateString('ko-KR')}`,
        memo: (memo || '').trim(),
        createdAt: new Date().toISOString(),
        period: { ...activePeriod },
        periodLabel: formatPeriodLabel(activePeriod, dateKeys),
        startKey: dateKeys[0],
        endKey: dateKeys[dateKeys.length - 1],
        dateKeys,
        subjects: state.subjects.map(s => ({ id: s.id, name: s.name, color: s.color })),
        buckets,
        score: {
            avg: current.avg,
            prevAvg: prev.avg,
            recordedCount: current.recordedCount,
            days: dateKeys.length,
            itemRows
        },
        insights: insightData.insights,
        prescription
    };
}

function saveSnapshot(payload) {
    if (!Array.isArray(state.analysisResults)) state.analysisResults = [];
    state.analysisResults.unshift(payload);
    saveToLocal();
    updateSnapshotCountBadge();
}

function deleteSnapshot(id) {
    if (!Array.isArray(state.analysisResults)) return;
    state.analysisResults = state.analysisResults.filter(s => s.id !== id);
    saveToLocal();
    updateSnapshotCountBadge();
    if (activeSnapshot && activeSnapshot.id === id) {
        exitSnapshotMode();
    }
    renderSnapshotList();
}

function loadSnapshot(id) {
    const snap = (state.analysisResults || []).find(s => s.id === id);
    if (!snap) return;
    activeSnapshot = snap;
    hiddenCategories.clear();
    renderAnalysisDashboard();
}

function exitSnapshotMode() {
    activeSnapshot = null;
    hiddenCategories.clear();
    renderAnalysisDashboard();
}

function refreshSnapshotUiState() {
    const inSnapshot = isSnapshotMode();
    // 배너
    ['', 'm-'].forEach(prefix => {
        const banner = document.getElementById(`${prefix}snapshot-mode-banner`);
        const nameEl = document.getElementById(`${prefix}snapshot-mode-name`);
        const metaEl = document.getElementById(`${prefix}snapshot-mode-meta`);
        if (banner) banner.style.display = inSnapshot ? '' : 'none';
        if (inSnapshot) {
            if (nameEl) nameEl.textContent = activeSnapshot.name;
            if (metaEl) {
                const memoTxt = activeSnapshot.memo ? ` · ${activeSnapshot.memo}` : '';
                metaEl.textContent = `${activeSnapshot.periodLabel}${memoTxt}`;
            }
        }
    });
    // 기간/저장 버튼 비활성화
    const disableTargets = [
        '.period-btn',
        '.period-date-input',
        '#period-custom-apply',
        '#m-period-custom-apply',
        '#save-snapshot-btn',
        '#m-save-snapshot-btn'
    ];
    disableTargets.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
            el.disabled = inSnapshot;
            el.classList.toggle('snapshot-locked', inSnapshot);
        });
    });
}

function updateSnapshotCountBadge() {
    const n = (state.analysisResults || []).length;
    ['snapshot-count-badge', 'm-snapshot-count-badge'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (n > 0) {
            el.textContent = n;
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    });
}

function renderSnapshotList() {
    const body = document.getElementById('snapshot-list-body');
    if (!body) return;
    const snaps = state.analysisResults || [];
    // 전체 삭제 버튼 표시/숨김
    const clearBtn = document.getElementById('snapshot-clear-all');
    if (clearBtn) clearBtn.style.display = snaps.length > 0 ? '' : 'none';
    if (snaps.length === 0) {
        body.innerHTML = `<div class="snapshot-list-empty">저장된 분석이 없습니다. 분석 화면에서 "이 분석 저장"을 눌러 보관하세요.</div>`;
        return;
    }
    body.innerHTML = snaps.map(s => {
        const created = new Date(s.createdAt);
        const createdTxt = created.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' });
        const memoHtml = s.memo ? `<div class="snap-memo">${escapeHtml(s.memo)}</div>` : '';
        return `
            <div class="snapshot-card" data-snap-id="${s.id}">
                <button class="snap-delete" type="button" data-snap-del="${s.id}">삭제</button>
                <div class="snap-name">${escapeHtml(s.name)}</div>
                <div class="snap-period">${escapeHtml(s.periodLabel)}</div>
                ${memoHtml}
                <div class="snap-meta">저장: ${createdTxt}</div>
            </div>
        `;
    }).join('');

    body.querySelectorAll('.snapshot-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.snap-delete')) return;
            const id = card.dataset.snapId;
            closeSnapshotListModal();
            loadSnapshot(id);
        });
    });
    body.querySelectorAll('.snap-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.snapDel;
            const snap = (state.analysisResults || []).find(s => s.id === id);
            if (!snap) return;
            if (window.confirm(`"${snap.name}" 스냅샷을 삭제할까요?`)) {
                deleteSnapshot(id);
            }
        });
    });
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function openSnapshotSaveModal() {
    if (isSnapshotMode()) return;
    const dateKeys = currentDateKeys();
    if (dateKeys.length === 0) return;
    const modal = document.getElementById('snapshot-save-modal');
    const nameEl = document.getElementById('snapshot-save-name');
    const memoEl = document.getElementById('snapshot-save-memo');
    const periodEl = document.getElementById('snapshot-save-period');
    if (nameEl) nameEl.value = '';
    if (memoEl) memoEl.value = '';
    if (periodEl) periodEl.textContent = `기간: ${formatPeriodLabel(activePeriod, dateKeys)}`;
    if (modal) modal.classList.add('active');
    setTimeout(() => nameEl && nameEl.focus(), 50);
}

function closeSnapshotSaveModal() {
    const modal = document.getElementById('snapshot-save-modal');
    if (modal) modal.classList.remove('active');
}

function openSnapshotListModal() {
    renderSnapshotList();
    const modal = document.getElementById('snapshot-list-modal');
    if (modal) modal.classList.add('active');
}

function closeSnapshotListModal() {
    const modal = document.getElementById('snapshot-list-modal');
    if (modal) modal.classList.remove('active');
}

export function setupSnapshotControls() {
    // 저장 버튼
    ['save-snapshot-btn', 'm-save-snapshot-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', openSnapshotSaveModal);
    });
    // 목록 버튼
    ['open-snapshots-btn', 'm-open-snapshots-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', openSnapshotListModal);
    });
    // 저장 모달
    const saveCancel = document.getElementById('snapshot-save-cancel');
    if (saveCancel) saveCancel.addEventListener('click', closeSnapshotSaveModal);
    const saveConfirm = document.getElementById('snapshot-save-confirm');
    if (saveConfirm) {
        saveConfirm.addEventListener('click', () => {
            const nameEl = document.getElementById('snapshot-save-name');
            const memoEl = document.getElementById('snapshot-save-memo');
            const payload = buildSnapshotPayload(nameEl ? nameEl.value : '', memoEl ? memoEl.value : '');
            if (!payload) {
                closeSnapshotSaveModal();
                return;
            }
            saveSnapshot(payload);
            closeSnapshotSaveModal();
        });
    }
    // 목록 모달 닫기
    const listClose = document.getElementById('snapshot-list-close');
    if (listClose) listClose.addEventListener('click', closeSnapshotListModal);
    // 전체 삭제 — 잔재 항목을 한 번에 비울 수 있는 escape hatch
    const clearAll = document.getElementById('snapshot-clear-all');
    if (clearAll) {
        clearAll.addEventListener('click', () => {
            if (!window.confirm('저장된 분석을 모두 삭제할까요? 되돌릴 수 없습니다.')) return;
            state.analysisResults = [];
            try { localStorage.setItem('switme_analysis', JSON.stringify([])); } catch { /* noop */ }
            saveToLocal();
            updateSnapshotCountBadge();
            if (isSnapshotMode()) exitSnapshotMode();
            renderSnapshotList();
        });
    }
    // 배경 클릭 시 닫기
    ['snapshot-save-modal', 'snapshot-list-modal'].forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.remove('active');
            });
        }
    });
    // 스냅샷 모드 종료 버튼
    ['exit-snapshot-btn', 'm-exit-snapshot-btn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', exitSnapshotMode);
    });

    updateSnapshotCountBadge();
}

window.renderAnalysisDashboard = renderAnalysisDashboard;
window.setupAnalysisPeriodButtons = setupAnalysisPeriodButtons;
window.setupSnapshotControls = setupSnapshotControls;
