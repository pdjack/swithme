import { state } from './store.js';
import { icon } from './icons.js';

/**
 * Analysis Module — v2.0
 * 단일 대시보드: 종합 점수 / 카테고리별 활동 시간 트렌드 / 인사이트 / 처방전
 * 데이터 소스:
 *   - state.reflections[YYYY-MM-DD].total  → 종합 점수
 *   - state.timetables[].history (모든 타임테이블 통합) → 카테고리별 일별 활동 시간
 */

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];
let activePeriodDays = 7;
let trendChart = null;
let mobileTrendChart = null;

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

function averageReflectionTotal(dateKeys) {
    let sum = 0;
    let count = 0;
    dateKeys.forEach(k => {
        const r = state.reflections[k];
        if (r && typeof r.total === 'number') {
            sum += r.total;
            count++;
        }
    });
    return { avg: count > 0 ? sum / count : null, count };
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

    dateKeys.forEach(k => {
        const r = state.reflections[k];
        if (!r) return;
        rows.forEach(row => {
            const v = r[row.id];
            if (typeof v === 'number') {
                row.sum += v;
                row.count++;
            }
        });
    });

    return rows.map(row => ({
        id: row.id,
        name: row.name,
        emoji: row.emoji,
        max: row.max,
        avg: row.count > 0 ? row.sum / row.count : null,
        count: row.count
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

function renderScoreCard(days, scope = 'pc') {
    const valueEl = document.getElementById(scope === 'mobile' ? 'm-score-value' : 'score-value');
    const deltaEl = document.getElementById(scope === 'mobile' ? 'm-score-delta' : 'score-delta');
    const subEl = document.getElementById(scope === 'mobile' ? 'm-score-sub' : 'score-sub');
    if (!valueEl) return;

    const today = new Date();
    const currentKeys = buildDateRange(days, today);
    const prevEnd = new Date(today);
    prevEnd.setDate(prevEnd.getDate() - days);
    const prevKeys = buildDateRange(days, prevEnd);

    const current = averageReflectionTotal(currentKeys);
    const prev = averageReflectionTotal(prevKeys);
    const itemRows = averageReflectionByItem(currentKeys);

    if (current.avg === null) {
        valueEl.textContent = '—';
        deltaEl.innerHTML = '';
        subEl.textContent = '회고 기록이 아직 없습니다.';
        renderItemBreakdown([], scope);
        return;
    }

    valueEl.textContent = current.avg.toFixed(1);
    subEl.textContent = `최근 ${days}일 중 ${current.count}일 회고 기록`;
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
function renderTrendChart(days, scope = 'pc') {
    const canvasId = scope === 'mobile' ? 'm-category-trend-chart' : 'category-trend-chart';
    const emptyId = scope === 'mobile' ? 'm-trend-empty' : 'trend-empty';
    const canvas = document.getElementById(canvasId);
    const emptyEl = document.getElementById(emptyId);
    if (!canvas) return;

    const dateKeys = buildDateRange(days);
    const buckets = aggregateActivityByDayAndCategory(dateKeys);

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
    const datasets = state.subjects.map(sub => {
        const data = dateKeys.map(k => {
            const sec = buckets[k][sub.id] || 0;
            return +(sec / 60).toFixed(1); // minutes
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
                        label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}분`
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: '분', color: '#8E8E93' },
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

function buildInsights(days) {
    const insights = [];
    const dateKeys = buildDateRange(days);
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

    // 2. 요일별 평균 종합 점수
    const dowSums = [0, 0, 0, 0, 0, 0, 0];
    const dowCounts = [0, 0, 0, 0, 0, 0, 0];
    dateKeys.forEach(k => {
        const r = state.reflections[k];
        if (r && typeof r.total === 'number') {
            const dow = new Date(k).getDay();
            dowSums[dow] += r.total;
            dowCounts[dow]++;
        }
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
function buildPrescription(days, insightData) {
    const { categoryTotals, dowAvgs } = insightData;
    const dateKeys = buildDateRange(days);
    const { avg } = averageReflectionTotal(dateKeys);

    // 데이터 부족
    if (avg === null) {
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
export function renderAnalysisDashboard(days) {
    if (typeof days === 'number') activePeriodDays = days;
    const insightData = buildInsights(activePeriodDays);
    const prescription = buildPrescription(activePeriodDays, insightData);

    renderScoreCard(activePeriodDays, 'pc');
    renderTrendChart(activePeriodDays, 'pc');
    renderInsights(insightData, 'pc');
    renderPrescription(prescription, 'pc');

    renderScoreCard(activePeriodDays, 'mobile');
    renderTrendChart(activePeriodDays, 'mobile');
    renderInsights(insightData, 'mobile');
    renderPrescription(prescription, 'mobile');
}

export function setupAnalysisPeriodButtons() {
    document.querySelectorAll('.period-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const days = Number(btn.dataset.period);
            const scope = btn.dataset.scope === 'mobile' ? 'mobile' : 'pc';
            document.querySelectorAll(`.period-btn${scope === 'mobile' ? '[data-scope="mobile"]' : ':not([data-scope="mobile"])'}`).forEach(b => {
                b.classList.toggle('active', b === btn);
            });
            // 반대 scope 버튼도 동기화
            document.querySelectorAll(`.period-btn${scope === 'mobile' ? ':not([data-scope="mobile"])' : '[data-scope="mobile"]'}`).forEach(b => {
                b.classList.toggle('active', Number(b.dataset.period) === days);
            });
            renderAnalysisDashboard(days);
        });
    });
}

window.renderAnalysisDashboard = renderAnalysisDashboard;
window.setupAnalysisPeriodButtons = setupAnalysisPeriodButtons;
