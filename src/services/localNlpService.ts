const CHINESE_NUMBERS: Record<string, number> = {
  '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
  '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
  '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
  '廿': 20, '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24,
};

function parseChineseNumber(str: string): number | undefined {
  // Try direct lookup first (for multi-char numbers like "十二")
  if (CHINESE_NUMBERS[str] !== undefined) return CHINESE_NUMBERS[str];
  // Try single char
  if (str.length === 1 && CHINESE_NUMBERS[str] !== undefined) return CHINESE_NUMBERS[str];
  // Try "十+X" pattern (十三 = 10+3)
  if (str.startsWith('十') && str.length > 1) {
    const unit = CHINESE_NUMBERS[str.slice(1)];
    if (unit !== undefined) return 10 + unit;
  }
  return undefined;
}

/**
 * 本地规则解析器 - 不依赖外部 API
 * 支持中文和英文时间表达解析
 */

// ===== Chinese Weekday Map =====
const WEEKDAY_MAP_CN: Record<string, number> = {
  '周日': 0, '星期天': 0, '星期日': 0,
  '周一': 1, '星期一': 1, '礼拜一': 1,
  '周二': 2, '星期二': 2, '礼拜二': 2,
  '周三': 3, '星期三': 3, '礼拜三': 3,
  '周四': 4, '星期四': 4, '礼拜四': 4,
  '周五': 5, '星期五': 5, '礼拜五': 5,
  '周六': 6, '星期六': 6, '礼拜六': 6,
};

// ===== English Weekday Map =====
const WEEKDAY_MAP_EN: Record<string, number> = {
  'sunday': 0, 'sun': 0,
  'monday': 1, 'mon': 1,
  'tuesday': 2, 'tue': 2, 'tues': 2,
  'wednesday': 3, 'wed': 3, 'weds': 3,
  'thursday': 4, 'thu': 4, 'thur': 4, 'thurs': 4,
  'friday': 5, 'fri': 5,
  'saturday': 6, 'sat': 6,
};

function resolveWeekdayCN(weekdayName: string, now: Date): Date {
  const targetDay = WEEKDAY_MAP_CN[weekdayName];
  if (targetDay === undefined) return now;
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result;
}

function resolveWeekdayEN(weekdayName: string, now: Date): Date {
  const targetDay = WEEKDAY_MAP_EN[weekdayName.toLowerCase()];
  if (targetDay === undefined) return now;
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) daysUntil += 7;
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result;
}

function parseTimeFromText(text: string, baseDate: Date): { date: Date; hasTime: boolean; hasPeriod: boolean } {
  let hour = 9;
  let minute = 0;
  let hasTime = false;
  let hasPeriod = false;

  const now = new Date();

  // ===== Arabic numeral Chinese patterns: 3点15分, 3:15, 3点半, 3点 =====
  const cnArabicMatch = text.match(/(\d{1,2})[点:：](\d{1,2})分?/);
  if (cnArabicMatch) {
    hour = parseInt(cnArabicMatch[1]);
    minute = parseInt(cnArabicMatch[2]);
    hasTime = true;
  } else if (/\d{1,2}[点:：]半/.test(text)) {
    const m = text.match(/(\d{1,2})/);
    if (m) { hour = parseInt(m[1]); minute = 30; hasTime = true; }
  } else if (/\d{1,2}[点:：]/.test(text)) {
    const m = text.match(/(\d{1,2})/);
    if (m) { hour = parseInt(m[1]); minute = 0; hasTime = true; }
  }

  // ===== Chinese numeral patterns: 四点, 四点半, 四点十五分 =====
  if (!hasTime) {
    // Try "[中文数字]点[阿拉伯数字]分" e.g., 四点十五分
    const cnNumMatch1 = text.match(/([一二两三四五六七八九十廿]+)[点:：](\d{1,2})分?/);
    if (cnNumMatch1) {
      const h = parseChineseNumber(cnNumMatch1[1]);
      if (h !== undefined) { hour = h; minute = parseInt(cnNumMatch1[2]); hasTime = true; }
    }
    // Try "[中文数字]点半"
    if (!hasTime) {
      const cnNumMatch2 = text.match(/([一二两三四五六七八九十廿]+)[点:：]半/);
      if (cnNumMatch2) {
        const h = parseChineseNumber(cnNumMatch2[1]);
        if (h !== undefined) { hour = h; minute = 30; hasTime = true; }
      }
    }
    // Try "[中文数字]点"
    if (!hasTime) {
      const cnNumMatch3 = text.match(/([一二两三四五六七八九十廿]+)[点:：]/);
      if (cnNumMatch3) {
        const h = parseChineseNumber(cnNumMatch3[1]);
        if (h !== undefined) { hour = h; minute = 0; hasTime = true; }
      }
    }
  }

  // ===== English patterns: 3:15 PM, 3 PM, 3pm, 15:30 =====
  if (!hasTime) {
    const enMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (enMatch) {
      hour = parseInt(enMatch[1]);
      minute = parseInt(enMatch[2]);
      const ampm = enMatch[3]?.toLowerCase();
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      hasTime = true;
    } else {
      const enSimple = text.match(/(\d{1,2})\s*(am|pm)/i);
      if (enSimple) {
        hour = parseInt(enSimple[1]);
        const ampm = enSimple[2].toLowerCase();
        if (ampm === 'pm' && hour !== 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;
        minute = 0;
        hasTime = true;
      }
    }
  }

  // ===== Period-based default time (no specific hour given) =====
  if (!hasTime) {
    if (/早上|早晨|上午|早/.test(text)) {
      hour = 9; hasPeriod = true;
    } else if (/中午|午间/.test(text)) {
      hour = 12; hasPeriod = true;
    } else if (/下午/.test(text)) {
      hour = 15; hasPeriod = true;
    } else if (/傍晚|晚上|晚/.test(text)) {
      hour = 20; hasPeriod = true;
    } else if (/半夜|凌晨/.test(text)) {
      hour = 0; hasPeriod = true;
    }
  }

  // AM/PM context adjustment for Chinese when specific hour is given
  if (hasTime && hour <= 12 && !text.match(/\d{1,2}:\d{2}\s*(am|pm)/i)) {
    if (/下午|傍晚|晚上|晚/.test(text)) {
      if (hour !== 12) hour += 12;
    } else if (/中午|午间/.test(text)) {
      if (hour < 12) hour += 12;
    }
  }

  const result = new Date(baseDate);
  result.setHours(hour, minute, 0, 0);

  // If time already passed today, push to tomorrow (unless explicit date given)
  if ((hasTime || hasPeriod) && result.getTime() <= now.getTime() && !baseDate.getTime()) {
    result.setDate(result.getDate() + 1);
  }

  return { date: result, hasTime, hasPeriod };
}

function extractContent(text: string): string {
  let content = text
    // Reminder verbs
    .replace(/提醒我?/g, '')
    .replace(/记得/g, '')
    .replace(/别忘了/g, '')
    .replace(/注意/g, '')
    .replace(/remind me( to)?/gi, '')
    .replace(/remember to/gi, '')
    .replace(/don't forget( to)?/gi, '')
    // Day references (with prefixes)
    .replace(/本周[一二三四五六日天]/g, '')
    .replace(/下[一二三四五六日天]/g, '')
    .replace(/这[一二三四五六日天]/g, '')
    .replace(/上[一二三四五六日天]/g, '')
    .replace(/[一二三四五六日天][一二三四五六日天]?/g, '')  // e.g., 周四, 星期天
    .replace(/星期[一二三四五六日天]/g, '')
    .replace(/礼拜[一二三四五六日天]/g, '')
    // Periods
    .replace(/早上|早晨|上午|中午|下午|傍晚|晚上|半夜|凌晨/g, '')
    .replace(/morning|afternoon|evening|night|noon|midnight/gi, '')
    // Relative days
    .replace(/明天|后天|大后天|今天/g, '')
    .replace(/tomorrow|today/gi, '')
    .replace(/the day after tomorrow/gi, '')
    // Recurring
    .replace(/每天|每日|天天|每晚|每早|每周|每月/g, '')
    .replace(/every day|daily|everyday|every week|weekly|every month|monthly/gi, '')
    // Arabic numeral time: 3点15分, 3:15, 3点半, 3点
    .replace(/\d{1,2}[点:：]\d{1,2}分?/g, '')
    .replace(/\d{1,2}[点:：]半/g, '')
    .replace(/\d{1,2}[点:：]/g, '')
    // Chinese numeral time: 四点, 四点半, 四点十五分
    .replace(/[一二两三四五六七八九十廿]+[点:：]\d{1,2}分?/g, '')
    .replace(/[一二两三四五六七八九十廿]+[点:：]半/g, '')
    .replace(/[一二两三四五六七八九十廿]+[点:：]/g, '')
    // English time
    .replace(/\d{1,2}:\d{2}\s*(am|pm)?/gi, '')
    .replace(/\d{1,2}\s*(am|pm)/gi, '')
    // Weekday English
    .replace(/next (monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)/gi, '')
    .replace(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|weds|thu|thur|thurs|fri|sat|sun)\b/gi, '')
    // Pronouns and fillers
    .replace(/^我/g, '')          // remove leading "我"
    .replace(/去|要|把|将/g, '')
    .replace(/\bto\b/gi, '')
    .trim();

  return content || text;
}

function parseReminder(text: string): {
  refinedContent: string;
  reminder?: { type: 'once' | 'daily' | 'weekly' | 'monthly'; date: number };
  isTodo: boolean;
  isAmbiguous: boolean;
  clarificationPrompt?: string | null;
} {
  const now = new Date();
  let targetDate = new Date(now);
  let hasExplicitDate = false;
  let hasExplicitTime = false;
  let isRecurring = false;
  let recurrenceType: 'daily' | 'weekly' | 'monthly' | undefined;

  // ===== Recurring patterns =====
  if (/每天|每日|天天|每晚|每早|每个早上|每个晚上/.test(text)) {
    isRecurring = true;
    recurrenceType = 'daily';
  } else if (/every day|daily|everyday|every night|every morning/i.test(text)) {
    isRecurring = true;
    recurrenceType = 'daily';
  } else if (/每周|每星期|每个周/.test(text)) {
    isRecurring = true;
    recurrenceType = 'weekly';
  } else if (/every week|weekly/i.test(text)) {
    isRecurring = true;
    recurrenceType = 'weekly';
  } else if (/每月|每个月/.test(text)) {
    isRecurring = true;
    recurrenceType = 'monthly';
  } else if (/every month|monthly/i.test(text)) {
    isRecurring = true;
    recurrenceType = 'monthly';
  }

  // ===== Chinese weekday =====
  for (const [name, _] of Object.entries(WEEKDAY_MAP_CN)) {
    if (text.includes(name)) {
      targetDate = resolveWeekdayCN(name, now);
      hasExplicitDate = true;
      break;
    }
  }

  // ===== English weekday =====
  if (!hasExplicitDate) {
    for (const [name, _] of Object.entries(WEEKDAY_MAP_EN)) {
      const regex = new RegExp(`\\b${name}\\b`, 'i');
      if (regex.test(text)) {
        targetDate = resolveWeekdayEN(name, now);
        hasExplicitDate = true;
        break;
      }
    }
  }

  // ===== Relative day references (Chinese) =====
  if (!hasExplicitDate) {
    if (/明天/.test(text)) {
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + 1);
      hasExplicitDate = true;
    } else if (/后天/.test(text)) {
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + 2);
      hasExplicitDate = true;
    } else if (/大后天/.test(text)) {
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + 3);
      hasExplicitDate = true;
    }
  }

  // ===== Relative day references (English) =====
  if (!hasExplicitDate) {
    if (/\btomorrow\b/i.test(text)) {
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + 1);
      hasExplicitDate = true;
    } else if (/\bthe day after tomorrow\b/i.test(text)) {
      targetDate = new Date(now);
      targetDate.setDate(now.getDate() + 2);
      hasExplicitDate = true;
    }
  }

  // ===== Parse time =====
  const timeResult = parseTimeFromText(text, targetDate);
  if (timeResult.hasTime || timeResult.hasPeriod) {
    hasExplicitTime = true;
    targetDate = timeResult.date;
  }

  // Extract content
  let refinedContent = extractContent(text);
  // Clean up leading punctuation/spaces
  refinedContent = refinedContent.replace(/^[\s，,、]+/, '').trim();

  // Determine intent
  const hasReminderIntent = /提醒|记得|别忘了|注意|待办|任务|remind|remember|don't forget|todo/i.test(text);
  const isTodo = hasReminderIntent || hasExplicitDate || hasExplicitTime || isRecurring;

  // Ambiguity check
  let isAmbiguous = false;
  let clarificationPrompt: string | null = null;

  // Build reminder
  let reminder: { type: 'once' | 'daily' | 'weekly' | 'monthly'; date: number } | undefined;

  if (hasExplicitDate || hasExplicitTime || isRecurring) {
    reminder = {
      type: recurrenceType || 'once',
      date: targetDate.getTime(),
    };
  }

  // If todo intent but no date/time/recurring → ambiguous
  if (isTodo && !reminder) {
    isAmbiguous = true;
    clarificationPrompt = `要为"${refinedContent}"设置提醒时间，还是仅作为待办事项？`;
  }

  return {
    refinedContent,
    reminder,
    isTodo,
    isAmbiguous,
    clarificationPrompt,
  };
}

export async function categorizeThoughtLocal(text: string): Promise<{
  category?: string;
  tags?: string[];
  refinedContent: string;
  isTodo?: boolean;
  reminder?: any;
  isAmbiguous?: boolean;
  clarificationPrompt?: string | null;
}> {
  const result = parseReminder(text);

  // Category detection (Chinese + English)
  const categories: Record<string, string> = {
    '工作': 'Work', '会议': 'Work', '项目': 'Work', '报告': 'Work', 'work': 'Work', 'meeting': 'Work', 'project': 'Work',
    '购物': 'Errands', '买': 'Errands', '快递': 'Errands', '取': 'Errands', 'shopping': 'Errands', 'buy': 'Errands',
    '健康': 'Health', '体检': 'Health', '药': 'Health', '医院': 'Health', '运动': 'Health', '健身': 'Health', 'health': 'Health', 'gym': 'Health', 'exercise': 'Health', 'workout': 'Health',
    '学习': 'Learning', '读书': 'Learning', '课程': 'Learning', 'study': 'Learning', 'read': 'Learning', 'course': 'Learning', 'book': 'Learning',
    '个人': 'Personal', '家庭': 'Personal', 'personal': 'Personal', 'family': 'Personal',
    '财务': 'Finance', '钱': 'Finance', '账单': 'Finance', 'finance': 'Finance', 'money': 'Finance', 'bill': 'Finance',
    '社交': 'Social', '聚会': 'Social', '朋友': 'Social', 'social': 'Social', 'party': 'Social', 'friend': 'Social',
  };

  let category = 'Personal';
  for (const [keyword, cat] of Object.entries(categories)) {
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(text) || text.includes(keyword)) {
      category = cat;
      break;
    }
  }

  // Tag extraction
  const tags: string[] = [];
  if (/提醒|待办|todo|remind/i.test(text)) tags.push('reminder');
  if (/紧急|尽快|马上|urgent|asap/i.test(text)) tags.push('urgent');
  if (/重要|important/i.test(text)) tags.push('important');

  return {
    category,
    tags: tags.length > 0 ? tags : undefined,
    refinedContent: result.refinedContent,
    isTodo: result.isTodo,
    reminder: result.reminder,
    isAmbiguous: result.isAmbiguous,
    clarificationPrompt: result.clarificationPrompt,
  };
}
