import { state, saveToLocal } from './store.js';

/**
 * 🧠 Analysis Module (Phase 2, 3, 4)
 * handles test rendering, persona calculation, and history.
 */

const analysisQuestions = [
    {
        id: 'q1',
        category: 'environment',
        text: '공부하는 동안 음악이나 백색소음을 항상 듣고 있나요?',
        options: [
            { text: '네, 조용하면 집중이 안 돼요.', score: 0, trait: 'distraction' },
            { text: '아니오, 최대한 정적을 유지해요.', score: 1, trait: 'focus' }
        ]
    },
    {
        id: 'q2',
        category: 'execution',
        text: '공부를 시작할 때 고민 없이 즉시 행동(3초/5초 법칙)으로 옮기나요?',
        options: [
            { text: '매번 망설이다가 늦게 시작해요.', score: 0, trait: 'procrastination' },
            { text: '기계적으로 즉시 시작합니다.', score: 1, trait: 'action' }
        ]
    },
    {
        id: 'q3',
        category: 'method',
        text: '에빙하우스의 망각곡선을 고려하여 주기적인 복습을 실천하나요?',
        options: [
            { text: '복습보다는 진도 나가는 게 급해요.', score: 0, trait: 'forgetting' },
            { text: '정해진 주기에 맞춰 복습을 수행해요.', score: 1, trait: 'retention' }
        ]
    },
    {
        id: 'q4',
        category: 'method',
        text: '단순히 읽는 공부보다 스스로 퀴즈를 내는 아웃풋(Output) 공부 비중이 높나요?',
        options: [
            { text: '아직은 개념서를 읽고 필기하는 게 편해요.', score: 0, trait: 'passive' },
            { text: '백지에 써보거나 문제를 풀며 확인해요.', score: 1, trait: 'active' }
        ]
    },
    {
        id: 'q5',
        category: 'routine',
        text: '주말과 평일의 기상/취침 시간이 일정하게 유지되나요?',
        options: [
            { text: '주말에는 늦잠을 자거나 불규칙해요.', score: 0, trait: 'unstable' },
            { text: '매일 거의 동일한 시간에 일어나요.', score: 1, trait: 'stable' }
        ]
    },
    {
        id: 'q6',
        category: 'nutrition',
        text: '공부 중이나 쉬는 시간에 당분이 많은 간식을 자주 섭취하나요?',
        options: [
            { text: '네, 단 게 없으면 기운이 안 나요.', score: 0, trait: 'sugar_spike' },
            { text: '뇌 건강을 위해 절제하고 있어요.', score: 1, trait: 'clean_mind' }
        ]
    },
    {
        id: 'q7',
        category: 'metacognition',
        text: '반복해서 틀리는 단원이나 약점 키워드를 별도로 관리하고 있나요?',
        options: [
            { text: '딱히 관리하기보다 계속 풀어봐요.', score: 0, trait: 'blind' },
            { text: '약점 데이터를 기반으로 집중 공략해요.', score: 1, trait: 'meta' }
        ]
    }
];

const personas = {
    'HIGH_POTENTIAL': {
        name: '완벽한 전략가',
        description: '공부 루틴과 방법론이 매우 정밀하게 설계되어 있습니다. 현재의 흐름을 유지하되 고난도 문항에 집중하세요.',
        tip: '망각 곡선 3차 주기(7일 뒤) 복습을 더 강화해보세요.'
    },
    'MULTITASKING_TRAP': {
        name: '멀티태스킹 함정형',
        description: '음악 청취나 비효율적인 공부 환경으로 인해 뇌의 몰입도가 분산되고 있습니다.',
        tip: '공부 1시간 전에는 도파민을 자극하는 음악과 스마트폰을 완전히 차단하세요.'
    },
    'PASSIVE_STUDENT': {
        name: '가짜 공부 중독형',
        description: '개념 정리에만 시간을 쏟으며 실제로는 뇌가 편한 공부만 하고 있을 가능성이 높습니다.',
        tip: '개념 이해 후 바로 백지에 핵심 내용을 적어보는 아웃풋 연습을 도입하세요.'
    },
    'PROCRASTINATOR': {
        name: '완벽주의 미루기형',
        description: '계획은 거창하지만 실행의 문턱이 너무 높습니다. 3초 법칙이 절실합니다.',
        tip: '실행력을 높이기 위해 계획을 더 잘게 쪼개고, 3초 안에 책을 펴는 습관을 들이세요.'
    },
    'INCONSISTENT_ROUTINE': {
        name: '불규칙 엔진형',
        description: '공부 방법은 좋지만 생활 루틴이 무너져 있어 두뇌의 최적 효율을 내지 못하고 있습니다.',
        tip: '주말 기상 시간을 평일과 30분 이내로 맞추는 연습부터 시작하세요.'
    },
    'UNKNOWN': {
        name: '성장하는 비기너',
        description: '아직 자신만의 공부 패턴이 확립되지 않은 상태입니다.',
        tip: '스윗미의 기본 가이드를 따라 하나씩 습관을 만들어보세요.'
    }
};

window.currentTestState = {
    answers: {},
    step: 0
};

window.renderAnalysisTest = () => {
    const container = document.getElementById('analysis-content');
    if (!container) return;

    const step = window.currentTestState.step;

    if (step >= analysisQuestions.length) {
        window.finishAnalysisTest();
        return;
    }

    const q = analysisQuestions[step];
    const progress = ((step / analysisQuestions.length) * 100).toFixed(0);

    container.innerHTML = `
        <div class="test-container">
            <div class="test-progress-bar">
                <div class="progress-inner" style="width: ${progress}%"></div>
            </div>
            <div class="test-header">
                <span class="q-badge">${q.category.toUpperCase()}</span>
                <p class="q-count">Question ${step + 1} / ${analysisQuestions.length}</p>
            </div>
            <h2 class="q-text">${q.text}</h2>
            <div class="q-options">
                ${q.options.map((opt, idx) => `
                    <button class="opt-btn" onclick="submitAnswer('${q.id}', ${idx})">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
};

window.submitAnswer = (qId, optionIdx) => {
    const q = analysisQuestions.find(x => x.id === qId);
    window.currentTestState.answers[qId] = q.options[optionIdx];
    window.currentTestState.step++;
    window.renderAnalysisTest();
};

window.finishAnalysisTest = () => {
    const answers = Object.values(window.currentTestState.answers);
    const totalScore = answers.reduce((sum, a) => sum + a.score, 0);
    
    // Simple Persona Logic
    let personaId = 'UNKNOWN';
    const traitCounts = {};
    answers.forEach(a => {
        traitCounts[a.trait] = (traitCounts[a.trait] || 0) + 1;
    });

    if (totalScore >= 6) personaId = 'HIGH_POTENTIAL';
    else if (traitCounts['distraction'] > 0) personaId = 'MULTITASKING_TRAP';
    else if (traitCounts['passive'] > 0) personaId = 'PASSIVE_STUDENT';
    else if (traitCounts['procrastination'] > 0) personaId = 'PROCRASTINATOR';
    else if (traitCounts['unstable'] > 0) personaId = 'INCONSISTENT_ROUTINE';

    const persona = personas[personaId];

    // Build Result Result Object
    const resultObj = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: 'Test',
        score: totalScore,
        personaName: persona.name,
        personaDesc: persona.description,
        personaTip: persona.tip
    };

    // Save to global state
    state.analysisResults.push(resultObj);
    saveToLocal();

    window.renderAnalysisResult(resultObj);
};

window.renderAnalysisResult = (res) => {
    const container = document.getElementById('analysis-content');
    const tipEl = document.getElementById('analysis-quick-tip');
    
    if (tipEl) tipEl.textContent = res.personaTip;

    container.innerHTML = `
        <div class="result-container scale-in">
            <div class="result-badge">Diagnosis Result</div>
            <h1 class="persona-title">${res.personaName}</h1>
            <div class="persona-score-circle">
                <span>${res.score}</span>
                <small>/ ${analysisQuestions.length}</small>
            </div>
            <p class="persona-desc">${res.personaDesc}</p>
            <div class="persona-solution-card">
                <div class="sol-header">
                    <i data-lucide="zap"></i>
                    <span>핵심 처방전</span>
                </div>
                <p>${res.personaTip}</p>
            </div>
            <button class="btn-start" style="margin-top: 30px;" onclick="switchTab('analyze')">분석 메뉴로 돌아가기</button>
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.startAnalysis = (type) => {
    if (type === 'test') {
        window.currentTestState = { answers: {}, step: 0 };
        window.renderAnalysisTest();
    } else if (type === 'data') {
        window.renderDataAnalysisFilter();
    } else if (type === 'history') {
        window.renderAnalysisHistory();
    } else if (type === 'ai_integrated') {
        window.performIntegratedAnalysis();
    } else if (type === 'pattern') {
        window.renderPatternAnalysisFilter();
    }
};

window.renderDataAnalysisFilter = () => {
    const container = document.getElementById('analysis-content');
    container.innerHTML = `
        <div class="data-analysis-landing scale-in">
            <div class="landing-header">
                <i data-lucide="line-chart"></i>
                <h2>학습 데이터 정밀 리포트</h2>
                <p>기록된 Reflection 데이터를 기반으로 학습 성실도를 분석합니다.</p>
            </div>
            <div class="filter-options">
                <button class="filter-btn" onclick="performDataAnalysis(7)">최근 1주일 분석</button>
                <button class="filter-btn primary" onclick="performDataAnalysis(30)">최근 1개월 분석</button>
            </div>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.performDataAnalysis = (days) => {
    const today = new Date();
    const reflections = [];
    
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        if (state.reflections[dateKey]) {
            reflections.push(state.reflections[dateKey]);
        }
    }

    if (reflections.length === 0) {
        alert('분석할 데이터가 부족합니다. 매일 Reflection을 기록해주세요!');
        return;
    }

    // Calculate Averages based on the full period (days) to reflect consistency
    const avgAchievement = (reflections.reduce((sum, r) => sum + (Number(r.achievement) || 0), 0) / days).toFixed(1);
    const avgTime = (reflections.reduce((sum, r) => sum + (Number(r.time) || 0), 0) / days).toFixed(1);
    const avgWrong = (reflections.reduce((sum, r) => sum + (Number(r.wrong) || 0), 0) / days).toFixed(1);
    const avgReview = (reflections.reduce((sum, r) => sum + (Number(r.review) || 0), 0) / days).toFixed(1);
    const avgHomework = (reflections.reduce((sum, r) => sum + (Number(r.homework) || 0), 0) / days).toFixed(1);
    
    // Total average is the average of these averages
    const avgTotal = ((Number(avgAchievement) + Number(avgTime) + Number(avgWrong) + Number(avgReview) + Number(avgHomework)) / 5).toFixed(1);

    const resultObj = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: `Data (${days}d)`,
        score: avgTotal,
        metrics: {
            achievement: avgAchievement,
            time: avgTime,
            wrong: avgWrong,
            review: avgReview,
            homework: avgHomework
        }
    };

    // Save to global state (Data Analysis is also history)
    state.analysisResults.push({
        ...resultObj,
        personaName: `${days}일간의 성실도 리포트`,
        personaDesc: `${days}일간 축적된 데이터를 바탕으로 산출된 평균 지표입니다.`,
        personaTip: avgAchievement < 15 ? '목표 달성률이 낮습니다. 계획을 좀 더 세분화해보세요.' : '훌륭한 성실도를 보여주고 계십니다!'
    });
    saveToLocal();

    window.renderDataAnalysisResult(resultObj, days);
};

window.renderDataAnalysisResult = (res, days) => {
    const container = document.getElementById('analysis-content');
    
    const getStatusClass = (val) => val >= 15 ? 'status-good' : (val >= 10 ? 'status-normal' : 'status-bad');

    container.innerHTML = `
        <div class="data-result-view scale-in">
            <div class="result-header">
                <span class="period-badge">TOTAL ${days} DAYS</span>
                <h1>종합 학습 성과 인덱스</h1>
            </div>

            <div class="data-table">
                <div class="table-row header">
                    <div class="t-col">분석 항목</div>
                    <div class="t-col">평균 점수</div>
                    <div class="t-col">상태</div>
                </div>
                <div class="table-row">
                    <div class="t-col">🎯 목표 달성률</div>
                    <div class="t-col">${res.metrics.achievement} / 20</div>
                    <div class="t-col active"><span class="dot ${getStatusClass(res.metrics.achievement)}"></span></div>
                </div>
                <div class="table-row">
                    <div class="t-col">⏰ 시간 관리</div>
                    <div class="t-col">${res.metrics.time} / 20</div>
                    <div class="t-col active"><span class="dot ${getStatusClass(res.metrics.time)}"></span></div>
                </div>
                <div class="table-row">
                    <div class="t-col">📝 오답 정리</div>
                    <div class="t-col">${res.metrics.wrong} / 20</div>
                    <div class="t-col active"><span class="dot ${getStatusClass(res.metrics.wrong)}"></span></div>
                </div>
                <div class="table-row">
                    <div class="t-col">🔄 복습 진행</div>
                    <div class="t-col">${res.metrics.review} / 20</div>
                    <div class="t-col active"><span class="dot ${getStatusClass(res.metrics.review)}"></span></div>
                </div>
                <div class="table-row">
                    <div class="t-col">📚 숙제 완수</div>
                    <div class="t-col">${res.metrics.homework} / 20</div>
                    <div class="t-col active"><span class="dot ${getStatusClass(res.metrics.homework)}"></span></div>
                </div>
            </div>

            <div class="data-footer">
                <div class="total-avg-card">
                    <small>종합 평균</small>
                    <div class="v">${res.score}</div>
                </div>
                <button class="btn-start" onclick="switchTab('analyze')">확인 완료</button>
            </div>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.deleteAnalysisResult = (id, event) => {
    if (event) event.stopPropagation(); // 카드 클릭 이벤트 전파 방지
    if (!confirm('이 분석 결과를 삭제하시겠습니까?')) return;
    
    state.analysisResults = state.analysisResults.filter(res => res.id !== id);
    saveToLocal();
    window.renderAnalysisHistory();
};

window.renderAnalysisHistory = () => {
    const container = document.getElementById('analysis-content');
    if (state.analysisResults.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i data-lucide="database"></i>
                <p>과거 분석 기록이 없습니다.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="history-list-view">
            <div class="history-header">
                <h3>지난 분석 히스토리</h3>
                <small>최근 분석된 결과부터 표시됩니다.</small>
            </div>
            <div class="history-grid">
                ${state.analysisResults.slice().reverse().map(res => `
                    <div class="history-item glass-card" onclick="window.renderAnalysisResult(${JSON.stringify(res).replace(/"/g, '&quot;')})">
                        <div class="h-top-row">
                            <div class="h-meta">
                                <span class="h-date">${res.date}</span>
                                <span class="h-type">${res.type}</span>
                            </div>
                            <button class="h-delete-btn" onclick="window.deleteAnalysisResult(${res.id}, event)" title="삭제">
                                <i data-lucide="trash-2"></i>
                            </button>
                        </div>
                        <div class="h-name">${res.personaName}</div>
                        <div class="h-score-wrap">
                            <span class="h-score-val">${res.score}</span>
                            <span class="h-score-unit">점</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.performIntegratedAnalysis = () => {
    const container = document.getElementById('analysis-content');
    
    // 1. Find latest Test and Data results
    const latestTest = state.analysisResults.slice().reverse().find(r => r.type === 'Test');
    const latestData = state.analysisResults.slice().reverse().find(r => r.type.startsWith('Data'));

    if (!latestTest || !latestData) {
        container.innerHTML = `
            <div class="empty-state scale-in">
                <i data-lucide="alert-circle" style="color: #FF2D55;"></i>
                <h2>분석 데이터가 부족합니다</h2>
                <p>AI가 정확하게 예측하려면 먼저 '성향 테스트'와 '데이터 분석'이 모두 필요합니다.</p>
                <div style="margin-top: 30px; display: flex; gap: 10px; justify-content: center;">
                    ${!latestTest ? '<button class="btn-start" style="padding: 10px 20px; font-size: 13px;" onclick="startAnalysis(\'test\')">테스트 시작</button>' : ''}
                    ${!latestData ? '<button class="btn-start" style="padding: 10px 20px; font-size: 13px;" onclick="startAnalysis(\'data\')">데이터 분석</button>' : ''}
                </div>
            </div>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
    }

    // 2. Calculation Logic
    const scaledData = (latestData.score / 20) * 100; // 0-20 to 0-100
    const scaledTest = (latestTest.score / 7) * 100; // 0-7 to 0-100
    const predictedScore = Math.round((scaledData * 0.7) + (scaledTest * 0.3));

    // 3. Insight Generation
    const lowestMetric = Object.entries(latestData.metrics).reduce((low, [key, val]) => {
        return Number(val) < Number(low.val) ? { key, val } : low;
    }, { key: 'achievement', val: 20 });

    const metricNames = {
        achievement: '목표 달성률',
        time: '시간 관리',
        wrong: '오답 정리',
        review: '복습 진행',
        homework: '숙제 완수'
    };

    const AI_PRESC_TEMPLATES = {
        'HIGH_POTENTIAL': '완벽한 기반을 갖추고 있습니다. 최고점을 위해 취약한 [METRIC]을 15%만 더 강화하세요.',
        'MULTITASKING_TRAP': '환경 관리가 시급합니다. [METRIC] 점수가 낮은 이유는 도파민 분산 때문일 확률이 높습니다.',
        'PASSIVE_STUDENT': '가짜 공부의 늪에 빠져있네요. [METRIC]을 높이기 위해 개념서보다는 인출(Output) 공부에 집중하세요.',
        'PROCRASTINATOR': '미루는 습관이 발목을 잡고 있습니다. [METRIC]을 오전에 우선적으로 처리하여 관성을 깨세요.',
        'INCONSISTENT_ROUTINE': '엔진은 좋으나 연료 공급이 불규칙합니다. 루틴을 일정하게 유지하면 점수가 급상승할 것입니다.'
    };

    // Find persona key for template
    const personaKey = Object.keys(personas).find(k => personas[k].name === latestTest.personaName) || 'UNKNOWN';
    const prescription = (AI_PRESC_TEMPLATES[personaKey] || '현재 패턴을 유지하며 개선해보세요.').replace('[METRIC]', metricNames[lowestMetric.key]);

    const resultObj = {
        predictedScore,
        latestTest,
        latestData,
        prescription,
        personaKey
    };

    window.renderIntegratedResult(resultObj);
};

window.renderIntegratedResult = (res) => {
    const container = document.getElementById('analysis-content');
    const tipEl = document.getElementById('analysis-quick-tip');
    
    if (tipEl) tipEl.textContent = `AI 예측 결과: 다음 시험에서 ${res.predictedScore}점이 예상됩니다.`;

    container.innerHTML = `
        <div class="integrated-report-view scale-in" style="width: 100%;">
            <div class="report-header" style="text-align: center;">
                <div class="ai-badge" style="display: inline-flex; align-items: center; gap: 8px; background: rgba(0, 86, 179, 0.15); color: var(--primary); padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 800; border: 1px solid var(--primary); margin-bottom: 20px;">
                    <i data-lucide="sparkles" style="width: 14px; height: 14px;"></i> AI INTEGRATED REPORT
                </div>
                <h1 style="font-size: 84px; font-weight: 800; color: white; margin: 0;">${res.predictedScore}<small style="font-size: 24px; color: var(--text-dim); margin-left: 8px;">점</small></h1>
                <p style="color: var(--text-dim); font-size: 15px; margin-top: 10px;">현재 습관을 유지할 시 도달 가능한 미래 성적 예측치</p>
            </div>

            <div class="report-main-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 40px;">
                <!-- Growth Trend Chart (New Phase 4) -->
                <div class="glass-card chart-report" style="grid-column: span 2; padding: 24px;">
                    <div class="s-header" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; margin-bottom: 20px;">
                        <i data-lucide="trending-up" style="width: 14px;"></i> 성취도 추세 및 미래 예측
                    </div>
                    <div style="height: 200px; width: 100%;">
                        <canvas id="predictionChart"></canvas>
                    </div>
                </div>

                <div class="glass-card sub-report" style="padding: 24px; background: rgba(255, 255, 255, 0.03);">
                    <div class="s-header" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">
                        <i data-lucide="user" style="width: 14px;"></i> 나의 공부 성향
                    </div>
                    <h3 style="color: var(--primary); font-size: 20px; margin: 15px 0 10px 0;">${res.latestTest.personaName}</h3>
                    <p style="font-size: 13px; color: var(--text-dim); line-height: 1.6; height: 65px; overflow-y: auto;">${res.latestTest.personaDesc}</p>
                </div>

                <!-- Learning Heatmap (New Phase 4) -->
                <div class="glass-card sub-report" style="padding: 24px; background: rgba(255, 255, 255, 0.03);">
                    <div class="s-header" style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">
                        <i data-lucide="layout-grid" style="width: 14px;"></i> 학습 몰입도 히트맵
                    </div>
                    <div id="immersion-heatmap" class="heatmap-container" style="margin-top: 20px; display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                        <!-- Heatmap dots injected here -->
                    </div>
                    <p style="font-size: 11px; color: var(--text-dim); margin-top: 15px;">색이 진할수록 해당 일의 학습 완성도가 높습니다.</p>
                </div>
            </div>

            <div class="prescription-card glass-card" style="margin-top: 30px; border: 1px dashed var(--primary); background: rgba(0, 86, 179, 0.08); padding: 30px;">
                <div class="p-header" style="display: flex; align-items: center; gap: 12px; margin-bottom: 18px;">
                    <div style="background: #FFD700; color: #000; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                        <i data-lucide="zap" style="width: 14px; height: 14px; fill: currentColor;"></i>
                    </div>
                    <span style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: white; letter-spacing: 1px;">AI 어시스턴트의 실전 처방전</span>
                </div>
                <p style="font-size: 17px; line-height: 1.7; color: #FFFFFF; font-weight: 500;">
                    "${res.prescription}"
                </p>
            </div>

            <div style="text-align: center; margin-top: 40px; display: flex; gap: 10px; justify-content: center;">
                <button class="btn-start" onclick="switchTab('dashboard')" style="background: var(--glass); border: 1px solid var(--border); color: var(--text-dim); padding: 14px 28px; border-radius: 30px; font-size: 14px;">대시보드</button>
                <button class="btn-start" onclick="window.generateTomorrowPlan()" style="padding: 14px 48px; border-radius: 30px; font-size: 14px; box-shadow: 0 0 20px rgba(0, 122, 255, 0.4);">내일의 AI 추천 계획 생성</button>
            </div>
        </div>
    `;
    
    if (typeof lucide !== 'undefined') lucide.createIcons();

    // Init Phase 4 Visuals
    setTimeout(() => {
        window.initIntegratedCharts(res);
        window.renderImmersionHeatmap();
    }, 100);
};

window.initIntegratedCharts = (res) => {
    const ctx = document.getElementById('predictionChart');
    if (!ctx) return;

    // Get last 7 days of reflections
    const dates = [];
    const scores = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dates.push(key.slice(5)); // MM-DD
        const score = state.reflections[key] ? (state.reflections[key].total || 50) : 50;
        scores.push(score);
    }

    // Add prediction point
    dates.push('예측');
    scores.push(res.predictedScore);

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: '학습 성취도 추세',
                data: scores,
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: (context) => context.dataIndex === scores.length - 1 ? '#FFD700' : '#007AFF',
                pointRadius: (context) => context.dataIndex === scores.length - 1 ? 6 : 4,
                tension: 0.4,
                fill: true,
                segment: {
                    borderDash: (ctx) => ctx.p0DataIndex === scores.length - 2 ? [5, 5] : undefined
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 0, max: 100, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8E8E93' } },
                x: { grid: { display: false }, ticks: { color: '#8E8E93' } }
            }
        }
    });
};

window.renderImmersionHeatmap = () => {
    const container = document.getElementById('immersion-heatmap');
    if (!container) return;

    // Last 28 days
    const today = new Date();
    let html = '';
    for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        const reflection = state.reflections[key];
        const immersion = reflection ? (reflection.total / 100) : 0;
        
        const opacity = Math.max(0.1, immersion);
        const color = immersion > 0.8 ? '#007AFF' : (immersion > 0.4 ? 'rgba(0, 122, 255, 0.6)' : 'rgba(0, 122, 255, 0.2)');
        
        html += `<div title="${key}: ${Math.round(immersion*100)}%" style="height: 15px; border-radius: 3px; background: ${color}; opacity: ${opacity};"></div>`;
    }
    container.innerHTML = html;
};

window.generateTomorrowPlan = () => {
    // 1. Data Analysis for Planning
    const latestTest = state.analysisResults.slice().reverse().find(r => r.type === 'Test');
    const latestData = state.analysisResults.slice().reverse().find(r => r.type.startsWith('Data'));
    
    // Find subject with least study time in history (recent 3 days)
    const recentHistory = state.history.slice(-20);
    const subjectTimes = {};
    state.subjects.forEach(s => subjectTimes[s.id] = 0);
    recentHistory.forEach(h => {
        if (subjectTimes[h.subject] !== undefined) subjectTimes[h.subject] += h.duration;
    });

    const leastStudiedSubjectId = Object.entries(subjectTimes).reduce((min, [id, time]) => {
        return time < min.time ? { id, time } : min;
    }, { id: state.subjects[0].id, time: Infinity }).id;

    const leastSubjectName = state.subjects.find(s => s.id === leastStudiedSubjectId).name;

    // 2. Build AI Optimized Tasks
    const recommendations = [
        { 
            subject: leastStudiedSubjectId, 
            name: `[AI 추천] ${leastSubjectName} 밀린 개념 보충`, 
            reason: "최근 학습 비중이 가장 낮은 과목입니다. 밸런스를 맞춰주세요." 
        },
        { 
            subject: 'OTH', 
            name: `[AI 추천] 3일 전 학습 내용 인출(Output)`, 
            reason: "망각 곡선 2차 주기에 해당합니다. 백지에 핵심 내용을 적어보세요." 
        }
    ];

    // Persona-based Task
    if (latestTest && latestTest.personaName === '가짜 공부 중독형') {
        recommendations.push({
            subject: 'OTH',
            name: "[AI 추천] 고난도 문제 5개 집중 풀이",
            reason: "개념 정리보다는 실제 문제 해결을 통한 '진짜 공부'가 필요합니다."
        });
    } else {
        recommendations.push({
            subject: leastStudiedSubjectId,
            name: `[AI 추천] ${leastSubjectName} 오답 노트 1회독`,
            reason: "반복되는 실수를 줄이기 위한 핵심 루틴입니다."
        });
    }

    window.renderAIPlanModal(recommendations);
};

window.renderAIPlanModal = (plans) => {
    const modal = document.createElement('div');
    modal.className = 'modal active scale-in';
    modal.id = 'ai-plan-modal';
    
    modal.innerHTML = `
        <div class="modal-content glass-card" style="width: 500px; border: 1px solid var(--primary);">
            <div style="text-align:center; margin-bottom:20px;">
                <div style="background: var(--primary); width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px;">
                    <i data-lucide="sparkles" style="color: white;"></i>
                </div>
                <h2 style="margin:0;">AI 내일 학습 추천</h2>
                <p style="font-size:14px; color:var(--text-dim);">데이터 분석 기반으로 설계된 최적의 플랜입니다.</p>
            </div>

            <div class="ai-recommendation-list" style="display: flex; flex-direction: column; gap: 12px; margin-bottom:30px;">
                ${plans.map(p => `
                    <div class="glass-card" style="padding: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                            <span class="q-badge" style="background: var(--primary);">${state.subjects.find(s => s.id === p.subject).name}</span>
                        </div>
                        <div style="font-weight: 700; color: white; margin-bottom: 4px;">${p.name}</div>
                        <div style="font-size: 12px; color: var(--text-dim);">${p.reason}</div>
                    </div>
                `).join('')}
            </div>

            <div class="modal-btns">
                <button class="btn-reset" style="flex:1;" onclick="document.getElementById('ai-plan-modal').remove()">취소</button>
                <button class="btn-start" style="flex:2;" onclick="window.applyAIPlan(${JSON.stringify(plans).replace(/"/g, '&quot;')})">이 계획으로 내일 시작하기</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.applyAIPlan = (plans) => {
    // Set to tomorrow's date
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    plans.forEach(p => {
        state.tasks.push({
            id: Date.now() + Math.random(),
            subject: p.subject,
            name: p.name,
            duration: '0s',
            completed: false,
            date: tomorrowStr
        });
    });

    saveToLocal();
    alert('내일 계획에 추가되었습니다! 대시보드에서 날짜를 내일로 변경하여 확인하세요.');
    document.getElementById('ai-plan-modal').remove();
    switchTab('dashboard');
};

window.updateAIAdaptiveFeedback = () => {
    const messageText = document.getElementById('ai-message-text');
    if (!messageText) return;

    const reflections = Object.values(state.reflections);
    if (reflections.length < 3) {
        messageText.textContent = "반갑습니다! 데이터가 조금 더 쌓이면 AI가 당신의 공부 패턴을 정교하게 분석해 드릴게요.";
        return;
    }

    // Sort by date to get recent trends
    const sortedDates = Object.keys(state.reflections).sort().reverse();
    const recent = state.reflections[sortedDates[0]];
    const past = state.reflections[sortedDates[2]] || recent;

    let alertMsg = "";

    // 1. Weakness Detection (오답 정리 점수가 낮을 때)
    if (recent.wrong < 10) {
        alertMsg = "⚠️ 오답 정리 지수가 낮아지고 있어요. 틀린 문제를 다시 보는 습관이 성적 상승의 핵심입니다!";
    } 
    // 2. Forgetting Detection (복습 점수 하락 감지)
    else if (recent.review < past.review - 5) {
        alertMsg = "🧠 망각 주의보! 최근 복습 주기가 길어지고 있습니다. 3일 전 배운 내용을 오늘 15분만 훑어보세요.";
    }
    // 3. Achievement Consistency
    else if (recent.achievement >= 18) {
        alertMsg = "✨ 환상적인 페이스입니다! 현재의 높은 달성률을 주말까지 유지하면 목표 점수 도달 가능성이 매우 높습니다.";
    }
    // 4. Time Management Alert
    else if (recent.time < 10) {
        alertMsg = "⏰ 시간 관리 경고: 계획 대비 실질 공부 시간이 부족합니다. 몰입 모드를 활용해 밀도를 높여보세요.";
    }
    else {
        alertMsg = "반가워요! 오늘은 어제보다 10% 더 몰입하는 하루를 만들어볼까요? 스윗미가 응원합니다.";
    }

    messageText.textContent = alertMsg;
};

/* ─────────────────────────────────────────────────
   📊 학습 패턴 진단 (Pattern Analysis)
   ───────────────────────────────────────────────── */

// ── Utilities ──

function stdDeviation(arr) {
    if (arr.length < 2) return 0;
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    const sqDiffs = arr.map(v => (v - mean) ** 2);
    return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / arr.length);
}

function getHistoryForDays(days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    cutoff.setHours(0, 0, 0, 0);
    return state.history.filter(h => new Date(h.startTime) >= cutoff);
}

function getReflectionsForDays(days) {
    const result = {};
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (state.reflections[key]) result[key] = state.reflections[key];
    }
    return result;
}

function groupHistoryByDate(history) {
    const groups = {};
    history.forEach(h => {
        const date = h.startTime.split('T')[0];
        if (!groups[date]) groups[date] = [];
        groups[date].push(h);
    });
    return groups;
}

// ── 진단 1: 메타인지 패턴 (Recognition Pattern) ──

function calculateMetacognitionPattern(days) {
    const reflections = getReflectionsForDays(days);
    const dates = Object.keys(reflections);

    if (dates.length < 3) {
        return { available: false, needed: 3 - dates.length };
    }

    let sumAchievement = 0, sumWrong = 0, sumTime = 0, sumReview = 0;
    dates.forEach(d => {
        const r = reflections[d];
        sumAchievement += Number(r.achievement) || 0;
        sumWrong += Number(r.wrong) || 0;
        sumTime += Number(r.time) || 0;
        sumReview += Number(r.review) || 0;
    });

    const count = dates.length;
    const avgAchievement = sumAchievement / count / 20;
    const avgWrong = sumWrong / count / 20;
    const avgTime = sumTime / count / 20;
    const avgReview = sumReview / count / 20;

    let diagnosis, level, prescription;

    if (avgTime > 0.75 && avgAchievement < 0.5) {
        diagnosis = '가짜 공부 의심';
        level = 'danger';
        prescription = '시간은 투자하지만 성과가 낮습니다. 타이머 중단 후 30분간 인출 연습(백지 복습)을 시도하세요.';
    } else if (avgWrong < 0.5 && avgAchievement < 0.5) {
        diagnosis = '약점 보완 필요';
        level = 'warning';
        prescription = '오답 정리와 달성률이 모두 낮습니다. 틀린 문제를 별도로 모아 반복 학습하세요.';
    } else if (avgReview < 0.4) {
        diagnosis = '복습 부족';
        level = 'warning';
        prescription = '복습 점수가 낮아 망각이 가속화될 수 있습니다. 3일 전 학습 내용을 15분만 훑어보세요.';
    } else {
        diagnosis = '안정 궤도';
        level = 'good';
        prescription = '메타인지 지표가 균형 잡혀 있습니다. 현재 루틴을 유지하세요.';
    }

    return {
        available: true, diagnosis, level, prescription,
        metrics: {
            achievement: (avgAchievement * 100).toFixed(0),
            wrongFocus: (avgWrong * 100).toFixed(0),
            timeInvest: (avgTime * 100).toFixed(0),
            reviewRate: (avgReview * 100).toFixed(0)
        }
    };
}

// ── 진단 2: 몰입 에너지 (Focus Density) ──

function calculateFocusDensity(days) {
    const history = getHistoryForDays(days);
    const grouped = groupHistoryByDate(history);
    const dates = Object.keys(grouped);

    if (dates.length < 3) {
        return { available: false, needed: 3 - dates.length };
    }

    let totalFocusRatios = 0;
    let totalPureMinutes = 0;
    let fatigueDays = 0;

    dates.forEach(date => {
        const sessions = grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const studySeconds = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        let gapSeconds = 0;

        for (let i = 1; i < sessions.length; i++) {
            const prevEnd = new Date(sessions[i - 1].startTime).getTime() + (sessions[i - 1].duration || 0) * 1000;
            const nextStart = new Date(sessions[i].startTime).getTime();
            const gap = (nextStart - prevEnd) / 1000;
            if (gap > 0 && gap < 7200) gapSeconds += gap;
        }

        const totalActive = studySeconds + gapSeconds;
        if (totalActive > 0) {
            totalFocusRatios += studySeconds / totalActive;
        }
        totalPureMinutes += studySeconds / 60;

        // 피로도: 전반부 vs 후반부
        if (sessions.length >= 4) {
            const mid = Math.floor(sessions.length / 2);
            const firstHalfAvg = sessions.slice(0, mid).reduce((s, e) => s + (e.duration || 0), 0) / mid;
            const secondHalfAvg = sessions.slice(mid).reduce((s, e) => s + (e.duration || 0), 0) / (sessions.length - mid);
            if (secondHalfAvg < firstHalfAvg * 0.5) fatigueDays++;
        }
    });

    const avgFocusRatio = totalFocusRatios / dates.length;
    const avgPureMinutes = (totalPureMinutes / dates.length).toFixed(0);
    const fatigueDetected = fatigueDays >= Math.ceil(dates.length * 0.4);

    let diagnosis, level, prescription;

    if (avgFocusRatio < 0.4) {
        diagnosis = '에너지 고갈';
        level = 'danger';
        prescription = '학습 밀도가 낮습니다. 25분 집중 + 5분 휴식의 포모도로 기법을 활용하세요.';
    } else if (avgFocusRatio < 0.7) {
        diagnosis = '보통 몰입';
        level = 'warning';
        prescription = '집중 밀도에 개선 여지가 있습니다. 몰입 모드(Zen)를 적극 활용해보세요.';
    } else {
        diagnosis = '높은 몰입도';
        level = 'good';
        prescription = '훌륭한 집중력입니다. 현재 패턴을 유지하세요.';
    }

    if (fatigueDetected) {
        prescription += ' 후반부 집중력 저하가 감지되었습니다. 중간 휴식을 늘려보세요.';
    }

    return {
        available: true, diagnosis, level, prescription,
        metrics: {
            focusRatio: (avgFocusRatio * 100).toFixed(0),
            pureMinutes: avgPureMinutes,
            fatigueDetected
        }
    };
}

// ── 진단 3: 루틴 일관성 (Routine Consistency) ──

function calculateRoutineConsistency(days) {
    const history = getHistoryForDays(days);
    const grouped = groupHistoryByDate(history);
    const dates = Object.keys(grouped);

    if (dates.length < 5) {
        return { available: false, needed: 5 - dates.length };
    }

    // 일별 최초 학습 시작 시각(시간 단위)
    const startHours = dates.map(date => {
        const sessions = grouped[date].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
        const first = new Date(sessions[0].startTime);
        return first.getHours() + first.getMinutes() / 60;
    });

    const startTimeStdDev = stdDeviation(startHours);
    const avgStartHour = startHours.reduce((a, b) => a + b, 0) / startHours.length;

    // 주간 학습 일수 편차
    const weeks = Math.ceil(days / 7);
    const weeklyDays = [];
    for (let w = 0; w < weeks; w++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - w * 7);
        const count = dates.filter(d => {
            const dt = new Date(d);
            return dt >= weekStart && dt < weekEnd;
        }).length;
        weeklyDays.push(count);
    }
    const weeklyVariance = stdDeviation(weeklyDays);

    // 요일별 하락 감지
    const reflections = getReflectionsForDays(days);
    const dayOfWeekTotals = {};
    const dayOfWeekCounts = {};
    Object.keys(reflections).forEach(dateStr => {
        const dow = new Date(dateStr).getDay();
        dayOfWeekTotals[dow] = (dayOfWeekTotals[dow] || 0) + (reflections[dateStr].total || 0);
        dayOfWeekCounts[dow] = (dayOfWeekCounts[dow] || 0) + 1;
    });

    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    let weakDay = null;
    const dayAvgs = {};
    let overallDayAvg = 0;
    let dayCount = 0;
    Object.keys(dayOfWeekTotals).forEach(dow => {
        dayAvgs[dow] = dayOfWeekTotals[dow] / dayOfWeekCounts[dow];
        overallDayAvg += dayAvgs[dow];
        dayCount++;
    });
    overallDayAvg = dayCount > 0 ? overallDayAvg / dayCount : 0;

    Object.keys(dayAvgs).forEach(dow => {
        if (dayAvgs[dow] < overallDayAvg * 0.7) {
            weakDay = dayNames[dow];
        }
    });

    let diagnosis, level, prescription;

    if (startTimeStdDev > 3) {
        diagnosis = '불규칙한 루틴';
        level = 'danger';
        prescription = `학습 시작 시각의 편차가 ${startTimeStdDev.toFixed(1)}시간입니다. 매일 같은 시각에 시작하는 습관을 만들어보세요.`;
    } else if (startTimeStdDev > 1.5) {
        diagnosis = '약간 불규칙';
        level = 'warning';
        prescription = '시작 시각이 다소 흔들리고 있습니다. 일정한 기상 시각을 설정하면 학습 루틴도 안정됩니다.';
    } else {
        diagnosis = '안정적인 루틴';
        level = 'good';
        prescription = '일관된 학습 루틴을 유지하고 있습니다. 이 패턴을 지속하세요.';
    }

    if (weakDay) {
        prescription += ` ${weakDay}요일에 성과가 유독 낮습니다. 해당 요일의 학습 환경을 점검하세요.`;
    }

    if (weeklyVariance > 2) {
        prescription += ` 주간 학습 일수 편차가 큽니다. 매주 최소 ${Math.max(3, Math.round(weeklyDays.reduce((a, b) => a + b, 0) / weeklyDays.length))}일은 학습하세요.`;
    }

    return {
        available: true, diagnosis, level, prescription,
        metrics: {
            avgStartHour: `${Math.floor(avgStartHour)}:${String(Math.round((avgStartHour % 1) * 60)).padStart(2, '0')}`,
            startTimeStdDev: startTimeStdDev.toFixed(1),
            weeklyVariance: weeklyVariance.toFixed(1),
            weakDay,
            activeDays: dates.length,
            totalDays: days
        }
    };
}

// ── 리포트 시나리오 감지 ──

function detectReportScenarios(metacog, focus, routine) {
    const scenarios = [];

    if (metacog.available && metacog.level === 'danger' && metacog.diagnosis === '가짜 공부 의심') {
        scenarios.push({
            key: 'FAKE_STUDY',
            title: '가짜 공부 패턴 감지',
            desc: '시간 투자는 많지만 성과가 따라오지 않고 있습니다.',
            action: '타이머 중단 후 30분간 인출 연습(백지에 써보기) 세션을 도입하세요.'
        });
    }

    if (routine.available && routine.metrics.weakDay) {
        scenarios.push({
            key: 'ENVIRONMENTAL_DISTRACTION',
            title: `${routine.metrics.weakDay}요일 성과 하락 감지`,
            desc: '특정 요일에 학습 효율이 크게 떨어지고 있습니다.',
            action: '해당 요일의 학습 환경(장소, 소음, 일정)을 점검하고 교차 학습으로 주의를 환기하세요.'
        });
    }

    if (metacog.available && Number(metacog.metrics.achievement) < 50) {
        const history = getHistoryForDays(7);
        const grouped = groupHistoryByDate(history);
        const recentDates = Object.keys(grouped).sort().reverse().slice(0, 5);
        let lowDays = 0;
        recentDates.forEach(d => {
            const dayTasks = state.tasks.filter(t => t.date === d);
            if (dayTasks.length > 0) {
                const rate = dayTasks.filter(t => t.completed).length / dayTasks.length;
                if (rate < 0.6) lowDays++;
            }
        });
        if (lowDays >= 3) {
            scenarios.push({
                key: 'OVERAMBITIOUS',
                title: '과도한 계획 감지',
                desc: '최근 5일 중 3일 이상 계획 달성률이 60% 미만입니다.',
                action: '주간 계획을 15% 줄이고, Buffer Day(여유일)를 확보하세요.'
            });
        }
    }

    if (metacog.available && Number(metacog.metrics.reviewRate) < 30) {
        scenarios.push({
            key: 'NO_REVIEW',
            title: '복습 부재 경고',
            desc: '복습 활동이 거의 기록되지 않아 망각이 가속화되고 있습니다.',
            action: '최근 학습한 과목에 대해 복습 타이머를 즉시 가동하세요.'
        });
    }

    return scenarios;
}

// ── 필터 UI ──

window.renderPatternAnalysisFilter = () => {
    const container = document.getElementById('analysis-content');
    container.innerHTML = `
        <div class="data-analysis-landing scale-in">
            <div class="landing-header">
                <i data-lucide="scan-search"></i>
                <h2>학습 패턴 진단</h2>
                <p>세션 기록과 회고 데이터를 교차 분석하여 메타인지, 몰입도, 루틴을 진단합니다.</p>
            </div>
            <div class="filter-options">
                <button class="filter-btn" onclick="executePatternAnalysis(7)">최근 1주일</button>
                <button class="filter-btn" onclick="executePatternAnalysis(14)">최근 2주일</button>
                <button class="filter-btn primary" onclick="executePatternAnalysis(30)">최근 1개월</button>
            </div>
            <p style="margin-top:12px; font-size:12px; color:var(--text-dim); text-align:center;">
                최소 5일 이상의 학습 기록이 필요합니다.
            </p>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

// ── 실행 함수 ──

window.executePatternAnalysis = (days) => {
    const history = getHistoryForDays(days);
    const grouped = groupHistoryByDate(history);
    const activeDays = Object.keys(grouped).length;

    if (activeDays < 3) {
        alert(`분석에 필요한 데이터가 부족합니다. 현재 ${activeDays}일의 기록이 있으며, 최소 3일 이상 필요합니다.`);
        return;
    }

    const metacog = calculateMetacognitionPattern(days);
    const focus = calculateFocusDensity(days);
    const routine = calculateRoutineConsistency(days);
    const scenarios = detectReportScenarios(metacog, focus, routine);

    // 종합 점수 (가용한 진단만으로 산출)
    const levelScores = { good: 100, warning: 60, danger: 30 };
    const diagnostics = [metacog, focus, routine].filter(d => d.available);
    const compositeScore = diagnostics.length > 0
        ? Math.round(diagnostics.reduce((sum, d) => sum + levelScores[d.level], 0) / diagnostics.length)
        : 0;

    const resultObj = {
        id: Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: 'Pattern',
        score: compositeScore,
        days,
        metacog, focus, routine, scenarios,
        personaName: '학습 패턴 진단 리포트',
        personaDesc: `${days}일간 데이터 기반 메타인지/몰입/루틴 진단`,
        personaTip: scenarios.length > 0 ? scenarios[0].action : (diagnostics.find(d => d.level !== 'good')?.prescription || '전반적으로 양호합니다.')
    };

    state.analysisResults.push(resultObj);
    saveToLocal();
    window.renderPatternAnalysisResult(resultObj);
};

// ── 결과 렌더러 ──

window.renderPatternAnalysisResult = (result) => {
    const container = document.getElementById('analysis-content');

    const levelBadge = (level, text) => {
        const colors = { good: '#28A745', warning: '#FFB800', danger: '#FF2D55' };
        return `<span style="display:inline-block; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700; color:#000; background:${colors[level]};">${text}</span>`;
    };

    const metricBar = (label, value, max = 100) => {
        const pct = Math.min(Number(value), max);
        const color = pct >= 70 ? '#28A745' : (pct >= 40 ? '#FFB800' : '#FF2D55');
        return `
            <div style="margin:8px 0;">
                <div style="display:flex; justify-content:space-between; font-size:12px; color:var(--text-dim); margin-bottom:4px;">
                    <span>${label}</span><span>${value}%</span>
                </div>
                <div style="height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                    <div style="width:${pct}%; height:100%; background:${color}; border-radius:3px; transition:width 0.6s;"></div>
                </div>
            </div>
        `;
    };

    const unavailableCard = (title, icon, needed) => `
        <div class="glass-card" style="padding:20px; margin-bottom:16px; text-align:center; opacity:0.5;">
            <i data-lucide="${icon}" style="width:24px; height:24px; color:var(--text-dim); margin-bottom:8px;"></i>
            <h3 style="font-size:15px; color:var(--text-dim);">${title}</h3>
            <p style="font-size:13px; color:var(--text-dim); margin-top:8px;">${needed}일 더 기록하면 분석 가능합니다.</p>
        </div>
    `;

    // 메타인지 카드
    let metacogHTML;
    if (result.metacog.available) {
        const m = result.metacog;
        metacogHTML = `
            <div class="glass-card scale-in" style="padding:20px; margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="font-size:16px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="brain" style="width:20px; height:20px; color:var(--primary);"></i>
                        메타인지 패턴
                    </h3>
                    ${levelBadge(m.level, m.diagnosis)}
                </div>
                ${metricBar('달성률', m.metrics.achievement)}
                ${metricBar('오답 정리 집중도', m.metrics.wrongFocus)}
                ${metricBar('시간 투자', m.metrics.timeInvest)}
                ${metricBar('복습률', m.metrics.reviewRate)}
                <p style="margin-top:14px; font-size:13px; color:var(--text-sub); line-height:1.6;">
                    ${m.prescription}
                </p>
            </div>
        `;
    } else {
        metacogHTML = unavailableCard('메타인지 패턴', 'brain', result.metacog.needed);
    }

    // 몰입 에너지 카드
    let focusHTML;
    if (result.focus.available) {
        const f = result.focus;
        focusHTML = `
            <div class="glass-card scale-in" style="padding:20px; margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="font-size:16px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="zap" style="width:20px; height:20px; color:#FFB800;"></i>
                        몰입 에너지
                    </h3>
                    ${levelBadge(f.level, f.diagnosis)}
                </div>
                <div style="display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:100px; text-align:center; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px;">
                        <div style="font-size:28px; font-weight:800; color:var(--text-main);">${f.metrics.focusRatio}%</div>
                        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">집중 비율</div>
                    </div>
                    <div style="flex:1; min-width:100px; text-align:center; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px;">
                        <div style="font-size:28px; font-weight:800; color:var(--text-main);">${f.metrics.pureMinutes}</div>
                        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">일평균 순공부(분)</div>
                    </div>
                </div>
                ${f.metrics.fatigueDetected ? '<div style="padding:8px 12px; background:rgba(255,45,85,0.1); border:1px solid rgba(255,45,85,0.3); border-radius:8px; font-size:12px; color:#FF2D55; margin-bottom:12px;">후반부 집중력 저하 감지됨</div>' : ''}
                <p style="font-size:13px; color:var(--text-sub); line-height:1.6;">
                    ${f.prescription}
                </p>
            </div>
        `;
    } else {
        focusHTML = unavailableCard('몰입 에너지', 'zap', result.focus.needed);
    }

    // 루틴 일관성 카드
    let routineHTML;
    if (result.routine.available) {
        const r = result.routine;
        routineHTML = `
            <div class="glass-card scale-in" style="padding:20px; margin-bottom:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <h3 style="font-size:16px; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="clock" style="width:20px; height:20px; color:#8B5CF6;"></i>
                        루틴 일관성
                    </h3>
                    ${levelBadge(r.level, r.diagnosis)}
                </div>
                <div style="display:flex; gap:16px; margin-bottom:14px; flex-wrap:wrap;">
                    <div style="flex:1; min-width:100px; text-align:center; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px;">
                        <div style="font-size:22px; font-weight:800; color:var(--text-main);">${r.metrics.avgStartHour}</div>
                        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">평균 시작 시각</div>
                    </div>
                    <div style="flex:1; min-width:100px; text-align:center; padding:12px; background:rgba(255,255,255,0.04); border-radius:12px;">
                        <div style="font-size:22px; font-weight:800; color:var(--text-main);">&plusmn;${r.metrics.startTimeStdDev}h</div>
                        <div style="font-size:11px; color:var(--text-dim); margin-top:4px;">시작 시각 편차</div>
                    </div>
                </div>
                <div style="font-size:12px; color:var(--text-dim); margin-bottom:12px;">
                    분석 기간 중 <strong style="color:var(--text-main);">${r.metrics.activeDays}</strong>/${r.metrics.totalDays}일 학습
                    ${r.metrics.weakDay ? ` · <span style="color:#FF2D55;">${r.metrics.weakDay}요일 성과 하락</span>` : ''}
                </div>
                <p style="font-size:13px; color:var(--text-sub); line-height:1.6;">
                    ${r.prescription}
                </p>
            </div>
        `;
    } else {
        routineHTML = unavailableCard('루틴 일관성', 'clock', result.routine.needed);
    }

    // 시나리오 경고 카드
    let scenarioHTML = '';
    if (result.scenarios.length > 0) {
        scenarioHTML = result.scenarios.map(s => `
            <div class="glass-card scale-in" style="padding:16px; margin-bottom:12px; border:1px solid rgba(255,215,0,0.4); background:rgba(255,215,0,0.06);">
                <h4 style="font-size:14px; color:#FFD700; margin-bottom:6px;">${s.title}</h4>
                <p style="font-size:12px; color:var(--text-sub); margin-bottom:8px;">${s.desc}</p>
                <p style="font-size:13px; color:var(--text-main); font-weight:600;">${s.action}</p>
            </div>
        `).join('');
    }

    // 종합 점수 색상
    const scoreColor = result.score >= 80 ? '#28A745' : (result.score >= 50 ? '#FFB800' : '#FF2D55');

    container.innerHTML = `
        <div class="pattern-result-view scale-in" style="max-width:480px; margin:0 auto;">
            <div style="text-align:center; margin-bottom:24px;">
                <span class="period-badge">PATTERN ${result.days} DAYS</span>
                <h1 style="font-size:20px; font-weight:800; margin-top:12px;">학습 패턴 진단 리포트</h1>
                <div style="font-size:48px; font-weight:900; color:${scoreColor}; margin-top:12px;">${result.score}</div>
                <div style="font-size:12px; color:var(--text-dim);">종합 패턴 점수</div>
            </div>

            ${metacogHTML}
            ${focusHTML}
            ${routineHTML}

            ${scenarioHTML ? `<div style="margin-top:8px;"><h3 style="font-size:14px; color:#FFD700; margin-bottom:12px; display:flex; align-items:center; gap:6px;"><i data-lucide="alert-triangle" style="width:16px; height:16px;"></i> 주의 패턴</h3>${scenarioHTML}</div>` : ''}

            <button class="filter-btn primary" onclick="startAnalysis('pattern')" style="width:100%; margin-top:20px;">
                다시 분석하기
            </button>
        </div>
    `;
    if (typeof lucide !== 'undefined') lucide.createIcons();
};
