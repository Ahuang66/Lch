'use strict';

const projects = [
  {
    id: 'study-organizer',
    title: 'AI学习资料整理器',
    status: '已完成',
    progress: 100,
    summary: '把粘贴的学习资料整理成一句话总结、核心知识点、概念解释、考试重点、复习题和易混点。',
    description: [
      '这是 AI实验室第一版实际完成并可运行的作品。用户粘贴教材、课堂笔记或文章后，页面会生成可以直接复习的知识结构。',
      '当前版本使用浏览器本地规则完成段落清洗、关键词提取和内容组织，不上传资料，不需要账号，也不依赖外部 AI API。',
      '第一版已经支持示例资料、摘要、知识点、概念解释、考试重点、5道复习题、3个容易混淆的地方和结果复制，并适配手机与电脑。'
    ],
    tags: ['学习工具', '本地规则', '第一版'],
    duration: '第一版',
    nextStep: '根据真实使用反馈继续优化整理质量，并在后续版本评估接入真实 AI API。',
    visual: 'assets/project-study-organizer.png',
    visualAlt: 'AI学习资料整理器实际界面截图',
    appUrl: 'study-organizer/'
  }
];

const logs = [];
const projectGrid = document.querySelector('#project-grid');
const completedGrid = document.querySelector('#completed-grid');
const logList = document.querySelector('#log-list');
const dialog = document.querySelector('#detail-dialog');
const dialogContent = document.querySelector('#dialog-content');
const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderTags(tags) {
  return tags.map((tag) => `<span class="tag">${escapeHTML(tag)}</span>`).join('');
}

function renderProjectCard(project, index) {
  const completed = project.status === '已完成';
  const label = completed ? '已通过' : '当前完成度';

  return `
    <article class="project-card${completed ? ' completed-card' : ''}">
      <div class="project-visual">
        <img src="${escapeHTML(project.visual)}" alt="${escapeHTML(project.visualAlt)}" loading="lazy" width="1440" height="900" onerror="this.onerror=null;this.src='assets/project-study-organizer.svg'">
      </div>
      <div class="project-body">
        <div class="project-meta">
          <span class="status-pill${completed ? ' completed' : ''}">${escapeHTML(project.status)}</span>
          <span class="duration">${escapeHTML(project.duration)}</span>
        </div>
        <div class="project-title-row">
          <h3>${escapeHTML(project.title)}</h3>
          <span class="project-arrow" aria-hidden="true">0${index + 1}</span>
        </div>
        <p class="project-summary">${escapeHTML(project.summary)}</p>
        <div class="progress-block">
          <div class="progress-label">
            <span>${label}</span>
            <span>${project.progress}%</span>
          </div>
          <div class="progress-track" aria-label="${label} ${project.progress}%">
            <i style="--progress: ${project.progress}%"></i>
          </div>
        </div>
        <div class="tag-list">${renderTags(project.tags)}</div>
        <div class="card-footer">
          <div class="card-actions">
            ${project.appUrl ? `
              <a class="card-open card-open-primary" href="${escapeHTML(project.appUrl)}" aria-label="打开${escapeHTML(project.title)}">
                打开工具
              </a>
            ` : ''}
            <button class="card-open card-detail" type="button" data-detail="project" data-id="${escapeHTML(project.id)}">
              查看项目说明
            </button>
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderLog(log, index) {
  return `
    <button class="log-item" type="button" data-detail="log" data-id="${escapeHTML(log.id)}" aria-label="阅读日志：${escapeHTML(log.title)}">
      <span class="log-date">${escapeHTML(log.date)} · ${escapeHTML(log.readTime)}</span>
      <span class="log-main">
        <strong>${escapeHTML(log.title)}</strong>
        <span>${escapeHTML(log.summary)}</span>
      </span>
      <span class="log-arrow" aria-hidden="true">${String(index + 1).padStart(2, '0')} ↗</span>
    </button>
  `;
}

function renderEmptyState(title, description) {
  return `
    <div class="section-empty">
      <span class="section-empty-index">TRUE CONTENT / 00</span>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(description)}</p>
    </div>
  `;
}

function renderContent() {
  const currentProjects = projects.filter((project) => project.status !== '已完成');
  const completedProjects = projects.filter((project) => project.status === '已完成');

  projectGrid.innerHTML = currentProjects.length
    ? currentProjects.map(renderProjectCard).join('')
    : renderEmptyState('暂无真实内容', '这里暂时没有正在进行的真实项目，后续有实际进展时会在这里更新。');

  completedGrid.innerHTML = completedProjects.length
    ? completedProjects.map(renderProjectCard).join('')
    : renderEmptyState('暂无真实内容', '这里暂时没有已经完成的真实作品。');

  logList.innerHTML = logs.length
    ? logs.map(renderLog).join('')
    : renderEmptyState('暂无真实内容', '这里暂时没有已经完成的实验日志，后续会记录真实过程与结果。');
}

function updateMetrics(currentCount, completedCount) {
  const metrics = {
    current: currentCount,
    completed: completedCount,
    logs: logs.length
  };

  Object.entries(metrics).forEach(([name, value]) => {
    const element = document.querySelector(`[data-metric="${name}"]`);

    if (element) {
      element.textContent = String(value).padStart(2, '0');
    }
  });
}

function getProjectDetails(project) {
  return `
    <div class="detail-list">
      <div>
        <dt>项目状态</dt>
        <dd>${escapeHTML(project.status)} · ${project.progress}%</dd>
      </div>
      <div>
        <dt>记录周期</dt>
        <dd>${escapeHTML(project.duration)}</dd>
      </div>
      <div>
        <dt>使用标签</dt>
        <dd>${project.tags.map(escapeHTML).join('、')}</dd>
      </div>
      <div>
        <dt>下一步</dt>
        <dd>${escapeHTML(project.nextStep)}</dd>
      </div>
    </div>
    <div class="progress-block detail-progress">
      <div class="progress-label">
        <span>${project.status === '已完成' ? '已完成' : '当前完成度'}</span>
        <span>${project.progress}%</span>
      </div>
      <div class="progress-track" aria-label="项目完成度 ${project.progress}%">
        <i style="--progress: ${project.progress}%"></i>
      </div>
    </div>
  `;
}

function openProjectDialog(project) {
  dialogContent.innerHTML = `
    <div class="dialog-hero">
      <img src="${escapeHTML(project.visual)}" alt="${escapeHTML(project.visualAlt)}" onerror="this.onerror=null;this.src='assets/project-study-organizer.svg'">
      <div class="dialog-hero-copy">
        <span class="dialog-eyebrow">PROJECT RECORD / ${escapeHTML(project.status)}</span>
        <h2 id="dialog-title">${escapeHTML(project.title)}</h2>
        <p>${escapeHTML(project.summary)}</p>
        <div class="tag-list">${renderTags(project.tags)}</div>
      </div>
    </div>
    <div class="dialog-body">
      <div>
        <h3>实验记录</h3>
        ${project.description.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}
      </div>
      <aside class="dialog-sidebar" aria-label="项目信息">
        ${getProjectDetails(project)}
      </aside>
    </div>
  `;
}

function openLogDialog(log) {
  dialogContent.innerHTML = `
    <div class="dialog-hero">
      <div class="dialog-log-mark" aria-hidden="true"><span>NOTE</span></div>
      <div class="dialog-hero-copy">
        <span class="dialog-eyebrow">EXPERIMENT NOTE / ${escapeHTML(log.date)}</span>
        <h2 id="dialog-title">${escapeHTML(log.title)}</h2>
        <p>${escapeHTML(log.summary)}</p>
        <div class="tag-list">${renderTags(log.tags)}</div>
      </div>
    </div>
    <div class="dialog-body">
      <div>
        <h3>过程记录</h3>
        ${log.body.map((paragraph) => `<p>${escapeHTML(paragraph)}</p>`).join('')}
      </div>
      <aside class="dialog-sidebar" aria-label="日志信息">
        <div class="detail-list">
          <div>
            <dt>记录日期</dt>
            <dd>${escapeHTML(log.date)}</dd>
          </div>
          <div>
            <dt>预计阅读</dt>
            <dd>${escapeHTML(log.readTime)}</dd>
          </div>
          <div>
            <dt>记录原则</dt>
            <dd>保留失败、修正和可验证结果。</dd>
          </div>
        </div>
      </aside>
    </div>
  `;
}

function showDialog(trigger, type, id) {
  const item = type === 'project'
    ? projects.find((project) => project.id === id)
    : logs.find((log) => log.id === id);

  if (!item) {
    return;
  }

  if (type === 'project') {
    openProjectDialog(item);
  } else {
    openLogDialog(item);
  }

  if (typeof dialog.showModal === 'function') {
    dialog.showModal();
  } else {
    dialog.setAttribute('open', '');
  }

  const closeButton = dialog.querySelector('.dialog-close');
  window.requestAnimationFrame(() => closeButton.focus());
}

function closeDialog() {
  if (dialog.open && typeof dialog.close === 'function') {
    dialog.close();
  } else {
    dialog.removeAttribute('open');
  }
}

function closeMobileMenu() {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.setAttribute('aria-expanded', 'false');
  siteNav.classList.remove('is-open');
  document.body.classList.remove('nav-open');
}

function initMobileMenu() {
  if (!menuToggle || !siteNav) {
    return;
  }

  menuToggle.addEventListener('click', () => {
    const willOpen = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(willOpen));
    siteNav.classList.toggle('is-open', willOpen);
    document.body.classList.toggle('nav-open', willOpen);
  });

  siteNav.addEventListener('click', (event) => {
    if (event.target.closest('a')) {
      closeMobileMenu();
    }
  });

  document.addEventListener('click', (event) => {
    if (
      siteNav.classList.contains('is-open') &&
      !siteNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMobileMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) {
      closeMobileMenu();
    }
  });
}

function initDialog() {
  if (!dialog) {
    return;
  }

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-detail]');
    if (trigger) {
      showDialog(trigger, trigger.dataset.detail, trigger.dataset.id);
    }
  });

  dialog.querySelector('.dialog-close').addEventListener('click', closeDialog);

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  dialog.addEventListener('close', () => {
    dialogContent.innerHTML = '';
  });
}

function initReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.12,
    rootMargin: '0px 0px -40px'
  });

  revealElements.forEach((element) => observer.observe(element));
}

function init() {
  if (!projectGrid || !completedGrid || !logList || !dialog || !dialogContent) {
    return;
  }

  renderContent();
  updateMetrics(
    projects.filter((project) => project.status !== '已完成').length,
    projects.filter((project) => project.status === '已完成').length
  );
  initMobileMenu();
  initDialog();
  initReveal();

  const year = document.querySelector('#current-year');
  if (year) {
    year.textContent = String(new Date().getFullYear());
  }
}

init();


