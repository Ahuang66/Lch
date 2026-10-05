/**
 * AI学习资料整理器 - 数据整理层
 *
 * 当前版本使用浏览器本地规则，不发送任何内容。
 * 以后接入真实 AI API 时，只需要替换 organizeLearningMaterial() 的内部实现，
 * 并保持返回的数据结构不变，app.js 不需要重写。
 */

export const ORGANIZER_MODE = 'local';
export const MIN_INPUT_LENGTH = 30;

const STOP_WORDS = new Set([
  '的', '了', '和', '与', '及', '或', '在', '是', '有', '为', '对', '从', '到', '由', '把', '被',
  '而', '也', '都', '就', '这', '那', '其', '中', '上', '下', '一种', '一个', '一些', '我们', '他们',
  '可以', '能够', '需要', '应该', '主要', '重要', '进行', '具有', '通过', '以及', '因此', '所以',
  '其中', '但是', '并且', '因为', '如果', '那么', '由于', '这种', '这些', '那些', '已经', '没有',
  '成为', '产生', '出现', '得到', '形成', '发展', '变化', '问题', '情况', '方面', '过程', '内容',
  '影响', '作用', '意义', '原因', '结果', '特点', '本质', '表明', '说明', '指出', '认为', '包括',
  '不是', '就是', '对于', '关于', '根据', '同时', '后来', '首先', '其次', '最后', '例如', '比如'
]);

const GENERIC_TERMS = new Set([
  '资料', '文章', '内容', '问题', '方面', '过程', '情况', '现象', '时期', '中国', '社会', '国家',
  '发展', '变化', '影响', '作用', '意义', '原因', '结果', '特点', '本质', '表现', '关系', '基础'
]);

const CAUSE_PATTERN = /原因|背景|条件|由于|因为|推动|促使|导致/;
const EFFECT_PATTERN = /影响|意义|作用|结果|后果|促进|推动|改变|奠定/;
const COMPARE_PATTERN = /区别|不同|联系|相比|对比|一方面|另一方面/;
const FEATURE_PATTERN = /特点|特征|实质|本质|性质|标志/;
const DEFINITION_PATTERN = /是指|指的是|称为|叫做|意味着|定义为/;

function normalizeInput(text) {
  return String(text || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanSentence(sentence) {
  return String(sentence || '')
    .replace(/^[\s\d一二三四五六七八九十]+[、.．)）:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitSentences(text) {
  const result = [];

  normalizeInput(text).split('\n').forEach((line) => {
    const cleanedLine = line.trim();

    if (!cleanedLine) {
      return;
    }

    const parts = cleanedLine.match(/[^。！？!?；;]+[。！？!?；;]?/g) || [cleanedLine];

    parts.forEach((part) => {
      const sentence = cleanSentence(part);

      if (sentence.length >= 3) {
        result.push(sentence);
      }
    });
  });

  return result.slice(0, 260);
}

function uniqueBy(items, getKey) {
  const seen = new Set();

  return items.filter((item) => {
    const key = getKey(item);

    if (!key || seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function trimText(text, maxLength = 120) {
  const cleaned = cleanSentence(text).replace(/\s+/g, ' ');

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const cut = cleaned.slice(0, maxLength);
  const lastPunctuation = Math.max(cut.lastIndexOf('，'), cut.lastIndexOf('；'), cut.lastIndexOf('。'));

  if (lastPunctuation >= maxLength * 0.55) {
    return `${cut.slice(0, lastPunctuation + 1)}……`;
  }

  return `${cut}……`;
}

function extractKeywords(text, limit = 12) {
  const counts = new Map();
  const normalized = normalizeInput(text);
  const tokenBlocks = [];

  const addCount = (rawWord, weight = 1) => {
    const word = rawWord.trim().toLowerCase();

    if (
      word.length < 2 ||
      word.length > 14 ||
      STOP_WORDS.has(word) ||
      GENERIC_TERMS.has(word) ||
      /^[\d.%]+$/.test(word) ||
      /^[a-z]$/.test(word)
    ) {
      return;
    }

    counts.set(word, (counts.get(word) || 0) + weight);
  };

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' });
    let currentBlock = [];

    for (const part of segmenter.segment(normalized)) {
      if (part.isWordLike) {
        const word = part.segment.trim().toLowerCase();
        addCount(word, 1);

        if (/^[\u4e00-\u9fa5]+$/.test(word)) {
          currentBlock.push(word);
        } else if (currentBlock.length) {
          tokenBlocks.push(currentBlock);
          currentBlock = [];
        }
      } else if (currentBlock.length) {
        tokenBlocks.push(currentBlock);
        currentBlock = [];
      }
    }

    if (currentBlock.length) {
      tokenBlocks.push(currentBlock);
    }
  } else {
    const chunks = normalized.match(/[\u4e00-\u9fa5]{2,10}|[A-Za-z]{2,18}/g) || [];
    chunks.forEach((chunk) => addCount(chunk, 1));
  }

  const compoundPattern = /(经济|主义|工业|运动|市场|制度|结构|政策|体系|积累|传播|解体|贸易|企业|阶级|关系|技术|文化|思想|科学|革命|变法)$/;

  tokenBlocks.forEach((block) => {
    for (let start = 0; start < block.length; start += 1) {
      for (let size = 2; size <= Math.min(4, block.length - start); size += 1) {
        const phrase = block.slice(start, start + size).join('');

        if (
          phrase.length < 3 ||
          phrase.length > 12 ||
          !compoundPattern.test(phrase) ||
          /^(主义|市场|经济|工业|制度|结构|阶级|资本主)/.test(phrase)
        ) {
          continue;
        }

        addCount(phrase, 6.5 + phrase.length * 0.35);
      }
    }
  });

  const chineseRuns = normalized.match(/[\u4e00-\u9fa5]{3,12}/g) || [];

  chineseRuns.forEach((run) => {
    for (let size = 2; size <= Math.min(4, run.length - 1); size += 1) {
      for (let index = 0; index <= run.length - size; index += 1) {
        addCount(run.slice(index, index + size), 0.12);
      }
    }
  });

  const ranked = [...counts.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }

      return b[0].length - a[0].length;
    })
    .map(([word]) => word);

  return uniqueBy(ranked, (word) => word).slice(0, limit);
}
function scoreSentence(sentence, index, keywords) {
  let score = 0;

  keywords.forEach((keyword, keywordIndex) => {
    if (sentence.includes(keyword)) {
      score += Math.max(1.1, 5.5 - keywordIndex * 0.42);
    }
  });

  if (CAUSE_PATTERN.test(sentence)) score += 3.2;
  if (EFFECT_PATTERN.test(sentence)) score += 3.1;
  if (COMPARE_PATTERN.test(sentence)) score += 2.7;
  if (FEATURE_PATTERN.test(sentence)) score += 2.6;
  if (DEFINITION_PATTERN.test(sentence)) score += 3.4;

  if (sentence.length >= 28 && sentence.length <= 92) score += 2.3;
  else if (sentence.length >= 16 && sentence.length <= 125) score += 1.2;
  else if (sentence.length > 150) score -= 2;

  if (index < 3) score += 1.8;
  else if (index < 8) score += 0.8;

  if (/例如|比如|如下|可以看到/.test(sentence)) score -= 1;
  if (/如图|如表|第\d+页/.test(sentence)) score -= 2;

  return score;
}

function extractSourceTitle(text) {
  const lines = normalizeInput(text).split('\n').map((line) => line.trim()).filter(Boolean);
  const firstLine = lines[0] ? cleanSentence(lines[0]) : '';

  if (!firstLine) {
    return '未命名资料';
  }

  if (firstLine.length >= 4 && firstLine.length <= 30 && !/[。！？!?；;]/.test(firstLine)) {
    return firstLine.replace(/^[#\s]+/, '');
  }

  return `${trimText(firstLine, 12).replace(/[，。；;、\s]+$/, '')}……`;
}

function buildSummary(text, sentences, keywords, sourceTitle) {
  const titleKey = sourceTitle.replace(/……$/, '');
  const candidates = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, index, keywords)
    }))
    .filter((item) => item.sentence.length >= 14 && !item.sentence.includes(titleKey))
    .sort((a, b) => b.score - a.score);

  const selected = [];

  for (const candidate of candidates) {
    const tooSimilar = selected.some((item) => {
      const a = item.sentence.slice(0, 18);
      const b = candidate.sentence.slice(0, 18);
      return a === b || item.sentence.includes(candidate.sentence) || candidate.sentence.includes(item.sentence);
    });

    if (!tooSimilar) {
      selected.push(candidate);
    }

    if (selected.length === 2) {
      break;
    }
  }

  if (selected.length === 0) {
    return `${sourceTitle}围绕${keywords.slice(0, 3).join('、') || '核心内容'}展开，需要结合原文继续梳理。`;
  }

  selected.sort((a, b) => a.index - b.index);
  let summary = selected[0].sentence;

  if (selected[1] && summary.length < 100) {
    summary += ` 同时，${selected[1].sentence.replace(/^[，,；;]/, '')}`;
  }

  summary = trimText(summary, 165);

  if (!/[。！？!?]$/.test(summary)) {
    summary += '。';
  }

  if (!summary.includes(titleKey) && titleKey.length >= 4) {
    summary = `${titleKey}：${summary}`;
  }

  return summary;
}

function getParagraphs(text) {
  const normalized = normalizeInput(text);

  return normalized
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length >= 18);
}

function createPointTitle(paragraph, keywords) {
  const lines = paragraph.split('\n').map((line) => cleanSentence(line)).filter(Boolean);
  const firstLine = lines[0] || paragraph;

  if (lines.length > 1 && lines[0].length <= 28 && !/[。！？!?；;]$/.test(lines[0])) {
    return trimText(lines[0], 24);
  }

  const firstSentence = splitSentences(paragraph)[0] || paragraph;
  let title = firstSentence
    .replace(/\s+/g, '')
    .replace(/[。！？!?；;]$/, '')
    .split(/[，,：:（(]/)[0]
    .replace(/^(所谓|其中|因此|所以|但是|同时)/, '');

  if (title.length > 20) {
    title = firstSentence
      .replace(/\s+/g, '')
      .replace(/[。！？!?；;]$/, '')
      .split(/(?:包括|主要|由于|因此|从而|使得|促进|推动)/)[0]
      .replace(/(?:的)?(?:主要)?(?:原因|背景|影响|意义|作用|特点|结果)$/, '')
      .replace(/[，,；;]$/, '');
  }

  if (title.length > 20) {
    const focusTerm = keywords.find((keyword) => firstSentence.includes(keyword));

    if (focusTerm && EFFECT_PATTERN.test(firstSentence)) {
      title = `${focusTerm}的影响`;
    } else if (focusTerm && CAUSE_PATTERN.test(firstSentence)) {
      title = `${focusTerm}的原因`;
    } else {
      title = title.slice(0, 20).replace(/[，,；;]$/, '');
    }
  }

  title = title.replace(/的$/, '');

  if (/^从.+角度看$/.test(title)) {
    title = '经济学视角下的变化';
  }

  if (/^(这种|这一|该).*(?:变化|发展|现象)$/.test(title)) {
    title = `${title.replace(/^(这种|这一|该)/, '')}的影响`;
  }

  if (title.length < 4) {
    title = keywords.slice(0, 2).join('与') || '核心内容';
  }
  return title;
}

function buildKeyPoints(text, keywords) {
  const sentences = splitSentences(text);
  const paragraphs = getParagraphs(text);

  const candidates = paragraphs.map((paragraph, index) => {
    const paragraphSentences = splitSentences(paragraph);
    const sentenceScore = paragraphSentences
      .map((sentence, sentenceIndex) => scoreSentence(sentence, index + sentenceIndex, keywords))
      .reduce((sum, score) => sum + score, 0);

    return {
      paragraph,
      index,
      score: sentenceScore + (index < 3 ? 3 : 0)
    };
  });

  if (candidates.length < 4) {
    for (let index = 0; index < sentences.length; index += 2) {
      const paragraph = sentences.slice(index, index + 2).join(' ');
      candidates.push({
        paragraph,
        index,
        score: scoreSentence(paragraph, index, keywords) + 1
      });
    }
  }

  return uniqueBy(
    candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .sort((a, b) => a.index - b.index),
    (item) => item.paragraph.slice(0, 24)
  ).map((item, index) => {
    const paragraphWithoutTitle = item.paragraph
      .split('\n')
      .filter((line, lineIndex) => !(lineIndex === 0 && line.trim().length <= 28 && !/[。！？!?；;]$/.test(line.trim())))
      .join(' ')
      .trim();

    return {
      id: `point-${index + 1}`,
      title: createPointTitle(item.paragraph, keywords),
      detail: trimText(paragraphWithoutTitle || item.paragraph, 112)
    };
  });
}

function normalizeTerm(rawTerm) {
  return cleanSentence(rawTerm)
    .replace(/^(所谓|其中|这种|该|这一|这个|一种|一个)/, '')
    .replace(/[，,。；;：:\s]+$/, '')
    .trim();
}

function buildConcepts(text, sentences, keywords) {
  const conceptCandidates = [];

  sentences.forEach((sentence) => {
    const match = sentence.match(/^([^，,。；;：:]{2,18}?)(?:是指|指的是|是|称为|叫做|意味着|定义为)(.{5,})$/);

    if (!match) {
      return;
    }

    const term = normalizeTerm(match[1]);

    if (
      term.length < 2 ||
      term.length > 14 ||
      STOP_WORDS.has(term) ||
      GENERIC_TERMS.has(term) ||
      /^(它|他|她|这|那|因此|所以|但是|同时)/.test(term)
    ) {
      return;
    }

    conceptCandidates.push({
      term,
      explanation: trimText(sentence, 145),
      score: 8 + Math.min(term.length, 6) / 2 + (DEFINITION_PATTERN.test(sentence) ? 3 : 0)
    });
  });

  let concepts = uniqueBy(
    conceptCandidates.sort((a, b) => b.score - a.score),
    (item) => item.term
  ).slice(0, 5);

  if (concepts.length < 3) {
    const fallbackTerms = keywords.filter((keyword) => !GENERIC_TERMS.has(keyword)).slice(0, 4);
    const fallback = fallbackTerms.map((term, index) => {
      const context = sentences
        .filter((sentence) => sentence.includes(term))
        .map((sentence, sentenceIndex) => ({
          sentence,
          score: scoreSentence(sentence, sentenceIndex, keywords)
        }))
        .sort((a, b) => b.score - a.score)[0]?.sentence;

      return {
        term,
        explanation: context
          ? `资料中与“${term}”最相关的内容是：${trimText(context, 118)}`
          : `原文没有给出“${term}”的完整定义，建议结合背景、表现和影响继续补充。`,
        score: 3 - index * 0.1
      };
    });

    concepts = uniqueBy([...concepts, ...fallback], (item) => item.term).slice(0, 5);
  }

  return concepts.map((concept, index) => ({
    id: `concept-${index + 1}`,
    term: concept.term,
    explanation: concept.explanation
  }));
}

function classifyExamSentence(sentence) {
  if (CAUSE_PATTERN.test(sentence)) {
    return { label: '原因条件', priority: '高频', core: true };
  }

  if (EFFECT_PATTERN.test(sentence)) {
    return { label: '影响意义', priority: '高频', core: true };
  }

  if (COMPARE_PATTERN.test(sentence)) {
    return { label: '区别联系', priority: '重点', core: false };
  }

  if (FEATURE_PATTERN.test(sentence)) {
    return { label: '特点本质', priority: '重点', core: false };
  }

  if (DEFINITION_PATTERN.test(sentence)) {
    return { label: '概念定义', priority: '基础', core: false };
  }

  return { label: '核心内容', priority: '重点', core: false };
}

function buildExamFocus(sentences, keywords) {
  const scored = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, index, keywords)
    }))
    .filter((item) => item.sentence.length >= 16)
    .sort((a, b) => b.score - a.score);

  const selected = uniqueBy(scored, (item) => item.sentence.slice(0, 18)).slice(0, 5);

  return selected.map((item, index) => {
    const category = classifyExamSentence(item.sentence);
    return {
      id: `focus-${index + 1}`,
      label: category.label,
      priority: category.priority,
      core: category.core,
      text: trimText(item.sentence, 118)
    };
  });
}

function buildQuestions(sentences, concepts, keywords, sourceTitle) {
  const primary = concepts[0]?.term || keywords[0] || '核心概念';
  const secondary = concepts[1]?.term || keywords[1] || keywords[0] || '相关资料';
  const tertiary = concepts[2]?.term || keywords[2] || keywords[1] || '后续发展';

  return [
    {
      id: 'question-1',
      question: `“${sourceTitle}”的核心观点是什么？请用一句话概括。`,
      hint: '回答时同时交代主题、关键变化和主要结论。'
    },
    {
      id: 'question-2',
      question: `请解释“${primary}”的含义，并说明它在资料中承担什么作用。`,
      hint: '先给定义，再结合原文说明它与其他内容的关系。'
    },
    {
      id: 'question-3',
      question: `资料认为“${secondary}”形成或发生变化的原因和条件有哪些？`,
      hint: '尝试从背景、推动因素和限制条件三个方向组织答案。'
    },
    {
      id: 'question-4',
      question: `“${secondary}”与“${tertiary}”之间有什么联系或区别？`,
      hint: '使用“不是……而是……”或“前者……后者……”来区分层次。'
    },
    {
      id: 'question-5',
      question: `结合资料，说明“${primary}”带来了哪些影响，并给出一个具体例子。`,
      hint: '先写总体影响，再分别说明积极、局限或后续变化。'
    }
  ];
}

function buildConfusions(concepts, keywords) {
  const first = concepts[0]?.term || keywords[0] || '核心概念';
  const second = concepts[1]?.term || keywords[1] || '相关背景';
  const third = concepts[2]?.term || keywords[2] || '结果';

  return [
    {
      id: 'confusion-1',
      pair: `${first} ≠ 它的外在表现`,
      explanation: `“${first}”本身是什么，与它通过哪些现象表现出来，是两个层次。答题时先写内涵，再补充表现。`
    },
    {
      id: 'confusion-2',
      pair: `${second}的原因 ≠ ${third}的结果`,
      explanation: `不要把“为什么发生”和“发生后造成了什么”混在一起。原因回答背景与条件，结果回答变化与影响。`
    },
    {
      id: 'confusion-3',
      pair: '资料事实 ≠ 规律解释',
      explanation: '时间、人物和事件属于事实层；供需变化、制度影响或经济规律属于解释层。两者都要写，但不能互相替代。'
    }
  ];
}

function buildStats(text, sentences, concepts) {
  return {
    characters: normalizeInput(text).replace(/\s/g, '').length,
    sentences: sentences.length,
    concepts: concepts.length
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, milliseconds);
  });
}

/**
 * 本地模拟整理流程。
 *
 * 接入真实 AI 时建议保持以下约定：
 * 1. 输入：sourceText: string
 * 2. 输出：与当前返回对象相同的结构
 * 3. progress 仍通过 onProgress(stage) 上报
 */
export async function organizeLearningMaterial(sourceText, options = {}) {
  const text = normalizeInput(sourceText);
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};

  if (text.length < MIN_INPUT_LENGTH) {
    throw new Error(`请至少输入 ${MIN_INPUT_LENGTH} 个字，资料过短时无法形成稳定结构。`);
  }

  const progressSteps = [
    ['clean', '清理段落并识别句子'],
    ['keywords', '提取主题词与核心句'],
    ['structure', '生成知识点和概念解释'],
    ['review', '组织考试重点与复习题']
  ];

  for (const [stage, message] of progressSteps) {
    onProgress({ stage, message });
    await wait(170);
  }

  const sentences = splitSentences(text);
  const keywords = extractKeywords(text, 12);
  const sourceTitle = extractSourceTitle(text);
  const summary = buildSummary(text, sentences, keywords, sourceTitle);
  const keyPoints = buildKeyPoints(text, keywords);
  const concepts = buildConcepts(text, sentences, keywords);
  const examFocus = buildExamFocus(sentences, keywords);
  const questions = buildQuestions(sentences, concepts, keywords, sourceTitle);
  const confusions = buildConfusions(concepts, keywords);

  return {
    mode: ORGANIZER_MODE,
    sourceTitle,
    summary,
    keyPoints,
    concepts,
    examFocus,
    questions,
    confusions,
    keywords,
    stats: buildStats(text, sentences, concepts)
  };
}

export function formatStudyPackAsText(pack) {
  if (!pack) {
    return '';
  }

  const sections = [
    'AI学习资料整理器',
    '',
    `主题：${pack.sourceTitle}`,
    '',
    '【一句话总结】',
    pack.summary,
    '',
    '【核心知识点】',
    ...pack.keyPoints.map((item, index) => `${index + 1}. ${item.title}\n   ${item.detail}`),
    '',
    '【重要概念解释】',
    ...pack.concepts.map((item) => `- ${item.term}：${item.explanation}`),
    '',
    '【考试重点】',
    ...pack.examFocus.map((item) => `- [${item.priority}/${item.label}] ${item.text}`),
    '',
    '【5道复习题】',
    ...pack.questions.map((item, index) => `${index + 1}. ${item.question}\n   提示：${item.hint}`),
    '',
    '【容易混淆的地方】',
    ...pack.confusions.map((item, index) => `${index + 1}. ${item.pair}\n   ${item.explanation}`)
  ];

  return sections.join('\n');
}




