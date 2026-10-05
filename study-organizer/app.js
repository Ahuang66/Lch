import {
  MIN_INPUT_LENGTH,
  formatStudyPackAsText,
  organizeLearningMaterial
} from './organizer.js';

const EXAMPLE_MATERIAL = `鸦片战争后中国经济结构的变动

鸦片战争后，中国被迫卷入资本主义世界市场，外国商品大量进入通商口岸，传统手工业受到冲击。自然经济开始逐步解体，但这一过程并不均衡，沿海和通商口岸附近变化较快，内陆地区仍然保留大量传统生产方式。

自然经济逐步解体的主要原因包括外国资本主义的经济冲击、商品市场扩大、交通运输条件变化以及农民和手工业者负担加重。它一方面为中国近代工业提供了劳动力和市场，另一方面也使大量传统手工业者失去生计。

外国资本主义企业最早在通商口岸出现，随后洋务运动创办了一批近代军用和民用工业。十九世纪六七十年代，中国民族资本主义工业开始产生，主要集中在轻工业部门。民族资本主义受到外国资本主义和本国封建势力的双重压迫，同时又依赖外国技术、资金和市场。

从经济学角度看，这一变化不只是产业更替，还涉及供给结构、需求结构、资本积累和技术传播。外国商品扩大供给会压低传统手工业产品的价格，机器生产提高效率，也会改变劳动力和资本在不同部门之间的配置。

这种经济结构变化促进了中国近代工业和新阶级的产生，但没有使中国真正走上独立发展的道路。理解这一问题时，需要区分自然经济解体的原因与影响，也要区分外国资本主义和民族资本主义的性质、地位及作用。`;

const outputContent = document.querySelector('#output-content');
const sourceText = document.querySelector('#source-text');
const organizeButton = document.querySelector('#organize-button');
const exampleButton = document.querySelector('#example-button');
const clearButton = document.querySelector('#clear-button');
const copyButton = document.querySelector('#copy-button');
const charCount = document.querySelector('#char-count');
const inputStatus = document.querySelector('#input-status');
const formError = document.querySelector('#form-error');

let latestPack = null;
let isWorking = false;

const progressStages = ['clean', 'keywords', 'structure', 'review'];

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateInputState() {
  const length = sourceText.value.trim().length;
  charCount.textContent = String(length);

  if (length === 0) {
    inputStatus.textContent = '建议输入 100 字以上，整理结果会更稳定。';
  } else if (length < MIN_INPUT_LENGTH) {
    inputStatus.textContent = `还需要至少 ${MIN_INPUT_LENGTH - length} 个字才能开始整理。`;
  } else if (length < 100) {
    inputStatus.textContent = '已经可以整理；补充更多背景会得到更完整的结果。';
  } else {
    inputStatus.textContent = '资料长度合适，可以开始整理。';
  }

  if (!formError.hidden) {
    formError.hidden = true;
  }
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

function renderLoading() {
  outputContent.innerHTML = `
    <div class="loading-state">
      <div class="loading-heading">
        <span class="loading-mark" aria-hidden="true"></span>
        <div>
          <h3>正在整理资料</h3>
          <p>本地规则会依次识别主题、概念和复习重点。</p>
        </div>
      </div>
      <div class="step-list">
        <div class="step-item" data-stage="clean">清理段落并识别句子</div>
        <div class="step-item" data-stage="keywords">提取主题词与核心句</div>
        <div class="step-item" data-stage="structure">生成知识点和概念解释</div>
        <div class="step-item" data-stage="review">组织考试重点与复习题</div>
      </div>
      <div class="skeleton-stack" aria-hidden="true">
        <span class="skeleton"></span>
        <span class="skeleton"></span>
        <span class="skeleton"></span>
      </div>
    </div>
  `;
}

function updateLoadingProgress(stage) {
  const activeIndex = progressStages.indexOf(stage);

  outputContent.querySelectorAll('.step-item').forEach((element) => {
    const index = progressStages.indexOf(element.dataset.stage);
    element.classList.toggle('is-active', index === activeIndex);
    element.classList.toggle('is-complete', index < activeIndex);
  });
}

function renderPointList(points) {
  return points.map((point, index) => `
    <article class="point-item">
      <span class="point-number">${String(index + 1).padStart(2, '0')}</span>
      <div>
        <h5>${escapeHTML(point.title)}</h5>
        <p>${escapeHTML(point.detail)}</p>
      </div>
    </article>
  `).join('');
}

function renderConcepts(concepts) {
  return concepts.map((concept) => `
    <article class="concept-item">
      <span class="concept-term">${escapeHTML(concept.term)}</span>
      <h5>概念解释</h5>
      <p>${escapeHTML(concept.explanation)}</p>
    </article>
  `).join('');
}

function renderExamFocus(items) {
  return items.map((item) => `
    <article class="exam-item${item.core ? ' core' : ''}">
      <span class="priority-tag">${escapeHTML(item.priority)}</span>
      <div>
        <h5>${escapeHTML(item.label)}</h5>
        <p>${escapeHTML(item.text)}</p>
      </div>
    </article>
  `).join('');
}

function renderQuestions(questions) {
  return questions.map((item, index) => `
    <article class="question-item">
      <div class="question-head">
        <span class="question-number">${String(index + 1).padStart(2, '0')}</span>
        <div>
          <h5>${escapeHTML(item.question)}</h5>
          <p class="question-hint">提示：${escapeHTML(item.hint)}</p>
        </div>
      </div>
    </article>
  `).join('');
}

function renderConfusions(confusions) {
  return confusions.map((item) => `
    <article class="confusion-item">
      <span class="confusion-pair">${escapeHTML(item.pair)}</span>
      <p>${escapeHTML(item.explanation)}</p>
    </article>
  `).join('');
}

function renderResult(pack) {
  latestPack = pack;
  copyButton.hidden = false;

  outputContent.innerHTML = `
    <div class="result-header">
      <div>
        <span class="panel-index">ONE-SENTENCE SUMMARY</span>
        <h3>${escapeHTML(pack.summary)}</h3>
        <p>识别主题：<strong>${escapeHTML(pack.sourceTitle)}</strong></p>
      </div>
      <div class="result-stats" aria-label="整理统计">
        <span>字数 <strong>${pack.stats.characters}</strong></span>
        <span>句数 <strong>${pack.stats.sentences}</strong></span>
        <span>概念 <strong>${pack.stats.concepts}</strong></span>
      </div>
    </div>

    <div class="keyword-strip" aria-label="主题关键词">
      ${pack.keywords.slice(0, 8).map((keyword) => `<span># ${escapeHTML(keyword)}</span>`).join('')}
    </div>

    <section class="result-section">
      <div class="section-title-row">
        <div>
          <span>KNOWLEDGE POINTS</span>
          <h4>核心知识点</h4>
        </div>
        <span class="section-count">${pack.keyPoints.length} 条</span>
      </div>
      <div class="point-list">${renderPointList(pack.keyPoints)}</div>
    </section>

    <section class="result-section">
      <div class="section-title-row">
        <div>
          <span>CONCEPT EXPLANATIONS</span>
          <h4>重要概念解释</h4>
        </div>
        <span class="section-count">${pack.concepts.length} 个</span>
      </div>
      <div class="concept-list">${renderConcepts(pack.concepts)}</div>
    </section>

    <section class="result-section">
      <div class="section-title-row">
        <div>
          <span>EXAM FOCUS</span>
          <h4>考试重点</h4>
        </div>
        <span class="section-count">${pack.examFocus.length} 项</span>
      </div>
      <div class="exam-list">${renderExamFocus(pack.examFocus)}</div>
    </section>

    <section class="result-section">
      <div class="section-title-row">
        <div>
          <span>REVIEW QUESTIONS</span>
          <h4>5 道复习题</h4>
        </div>
        <span class="section-count">基础 + 综合</span>
      </div>
      <div class="question-list">${renderQuestions(pack.questions)}</div>
    </section>

    <section class="result-section">
      <div class="section-title-row">
        <div>
          <span>COMMON MISTAKES</span>
          <h4>3 个容易混淆的地方</h4>
        </div>
        <span class="section-count">答题提醒</span>
      </div>
      <div class="confusion-list">${renderConfusions(pack.confusions)}</div>
    </section>

    <div class="result-footer">
      <span>由本地规则生成，适合作为第一次结构梳理。</span>
      <span><strong>下一步：</strong>对照原文检查概念和数字。</span>
    </div>
  `;
}

function setWorking(working) {
  isWorking = working;
  organizeButton.disabled = working;
  organizeButton.toggleAttribute('aria-busy', working);
  organizeButton.querySelector('span').textContent = working ? '正在整理…' : '开始整理';
}

async function handleOrganize() {
  if (isWorking) {
    return;
  }

  const text = sourceText.value.trim();

  if (text.length < MIN_INPUT_LENGTH) {
    showError(`资料太短。请至少输入 ${MIN_INPUT_LENGTH} 个字。`);
    sourceText.focus();
    return;
  }

  formError.hidden = true;
  latestPack = null;
  copyButton.hidden = true;
  setWorking(true);
  renderLoading();

  try {
    const pack = await organizeLearningMaterial(text, {
      onProgress: ({ stage }) => updateLoadingProgress(stage)
    });

    renderResult(pack);

    if (window.matchMedia('(max-width: 860px)').matches) {
      document.querySelector('.output-panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    outputContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-visual" aria-hidden="true">
          <div class="paper-sheet paper-back"></div>
          <div class="paper-sheet paper-front">
            <span class="paper-dot"></span>
            <span class="paper-line wide"></span>
            <span class="paper-line"></span>
            <span class="paper-line short"></span>
          </div>
        </div>
        <h3>整理没有完成</h3>
        <p>${escapeHTML(error.message || '出现未知错误，请检查输入后重试。')}</p>
      </div>
    `;
  } finally {
    setWorking(false);
  }
}

async function copyResult() {
  if (!latestPack) {
    return;
  }

  const text = formatStudyPackAsText(latestPack);

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      const helper = document.createElement('textarea');
      helper.value = text;
      helper.style.position = 'fixed';
      helper.style.opacity = '0';
      document.body.appendChild(helper);
      helper.select();
      document.execCommand('copy');
      helper.remove();
    }

    copyButton.textContent = '已复制';
    window.setTimeout(() => {
      copyButton.textContent = '复制整理结果';
    }, 1500);
  } catch {
    copyButton.textContent = '复制失败';
    window.setTimeout(() => {
      copyButton.textContent = '复制整理结果';
    }, 1500);
  }
}

function fillExample() {
  sourceText.value = EXAMPLE_MATERIAL;
  updateInputState();
  formError.hidden = true;
  sourceText.focus();
  sourceText.setSelectionRange(0, 0);
  sourceText.scrollTop = 0;
}

function clearInput() {
  sourceText.value = '';
  latestPack = null;
  copyButton.hidden = true;
  updateInputState();
  sourceText.focus();
  outputContent.innerHTML = `
    <div class="empty-state">
      <div class="empty-visual" aria-hidden="true">
        <div class="paper-sheet paper-back"></div>
        <div class="paper-sheet paper-front">
          <span class="paper-dot"></span>
          <span class="paper-line wide"></span>
          <span class="paper-line"></span>
          <span class="paper-line short"></span>
          <span class="paper-block"></span>
          <span class="paper-line wide"></span>
          <span class="paper-line short"></span>
        </div>
        <span class="visual-node node-one"></span>
        <span class="visual-node node-two"></span>
        <span class="visual-node node-three"></span>
      </div>
      <h3>让知识清晰起来。</h3>
      <p>粘贴资料，或点击“示例资料”开始。</p>
      <div class="empty-features">
        <span>摘要</span>
        <span>知识点</span>
        <span>概念</span>
        <span>复习题</span>
      </div>
    </div>
  `;
}

sourceText.addEventListener('input', updateInputState);
sourceText.addEventListener('keydown', (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault();
    handleOrganize();
  }
});
organizeButton.addEventListener('click', handleOrganize);
exampleButton.addEventListener('click', fillExample);
clearButton.addEventListener('click', clearInput);
copyButton.addEventListener('click', copyResult);

updateInputState();
