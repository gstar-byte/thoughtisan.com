/**
 * 本地规则解析器 - 不依赖外部 API
 * 支持中文时间表达解析
 */

const WEEKDAY_MAP: Record<string, number> = {
  '周日': 0, '星期天': 0, '星期日': 0,
  '周一': 1, '星期一': 1, '礼拜一': 1,
  '周二': 2, '星期二': 2, '礼拜二': 2,
  '周三': 3, '星期三': 3, '礼拜三': 3,
  '周四': 4, '星期四': 4, '礼拜四': 4,
  '周五': 5, '星期五': 5, '礼拜五': 5,
  '周六': 6, '星期六': 6, '礼拜六': 6, '周六日': 6,
};

const TIME_PATTERNS = [
  { regex: /(\d{1,2})[点:：](\d{1,2})分?/, parse: (m: RegExpMatchArray) => ({ hour: parseInt(m[1]), minute: parseInt(m[2]) }) },
  { regex: /(\d{1,2})[点:：]半/, parse: (m: RegExpMatchArray) => ({ hour: parseInt(m[1]), minute: 30 }) },
  { regex: /(\d{1,2})[点:：]/, parse: (m: RegExpMatchArray) => ({ hour: parseInt(m[1]), minute: 0 }) },
];

const AMPM_PATTERNS = [
  { regex: /早上|早晨|上午|早/, offset: 0 },
  { regex: /中午|午间/, offset: 0 },
  { regex: /下午|傍晚|晚上|晚/, offset: 12 },
  { regex: /半夜|凌晨/, offset: 0 },
];

function resolveWeekday(weekdayName: string, now: Date): Date {
  const targetDay = WEEKDAY_MAP[weekdayName];
  if (targetDay === undefined) return now;
  
  const currentDay = now.getDay();
  let daysUntil = targetDay - currentDay;
  if (daysUntil < 0) daysUntil += 7;
  if (daysUntil === 0) daysUntil = 7; // 如果就是今天，默认指下周
  
  const result = new Date(now);
  result.setDate(now.getDate() + daysUntil);
  return result;
}

function parseTimeFromText(text: string, baseDate: Date): { date: Date; hasTime: boolean } {
  let hour = 9; // default
  let minute = 0;
  let hasTime = false;
  
  // Try to extract specific time
  for (const pattern of TIME_PATTERNS) {
    const match = text.match(pattern.regex);
    if (match) {
      const parsed = pattern.parse(match);
      hour = parsed.hour;
      minute = parsed.minute;
      hasTime = true;
      break;
    }
  }
  
  // Adjust for AM/PM context
  if (hasTime && hour <= 12) {
    for (const ampm of AMPM_PATTERNS) {
      if (ampm.regex.test(text)) {
        if (hour !== 12) hour += ampm.offset;
        break;
      }
    }
  }
  
  const result = new Date(baseDate);
  result.setHours(hour, minute, 0, 0);
  return { date: result, hasTime };
}

function extractContent(text: string): string {
  // Remove time-related phrases and reminder words
  let content = text
    .replace(/提醒我?/, '')
    .replace(/记得/, '')
    .replace(/别忘了/, '')
    .replace(/注意/, '')
    .replace(/本周[一二三四五六日天]/, '')
    .replace(/下[一二三四五六日天]/, '')
    .replace(/这[一二三四五六日天]/, '')
    .replace(/[周一二三四五六日天][一二三四五六日天]?/, '')
    .replace(/早上|早晨|上午|中午|下午|傍晚|晚上|半夜|凌晨/, '')
    .replace(/明天|后天|大后天/, '')
    .replace(/\d{1,2}[点:：]\d{1,2}分?/, '')
    .replace(/\d{1,2}[点:：]半/, '')
    .replace(/\d{1,2}[点:：]/, '')
    .replace(/去|要|把|将/, '')
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
  let hasExplicitTime = false;
  let isRecurring = false;
  let recurrenceType: 'daily' | 'weekly' | 'monthly' | undefined;
  
  // Check for recurring patterns
  if (/每天|每日|天天|每晚|每早|每个早上|每个晚上/.test(text)) {
    isRecurring = true;
    recurrenceType = 'daily';
  } else if (/每周|每星期|每个周/.test(text)) {
    isRecurring = true;
    recurrenceType = 'weekly';
  } else if (/每月|每个月/.test(text)) {
    isRecurring = true;
    recurrenceType = 'monthly';
  }
  
  // Check for weekday references
  for (const [name, _] of Object.entries(WEEKDAY_MAP)) {
    if (text.includes(name)) {
      targetDate = resolveWeekday(name, now);
      hasExplicitTime = true;
      break;
    }
  }
  
  // Check for relative day references
  if (/明天/.test(text)) {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 1);
    hasExplicitTime = true;
  } else if (/后天/.test(text)) {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 2);
    hasExplicitTime = true;
  } else if (/大后天/.test(text)) {
    targetDate = new Date(now);
    targetDate.setDate(now.getDate() + 3);
    hasExplicitTime = true;
  }
  
  // Parse time
  const timeResult = parseTimeFromText(text, targetDate);
  if (timeResult.hasTime) {
    hasExplicitTime = true;
    targetDate = timeResult.date;
  }
  
  // Extract content
  let refinedContent = extractContent(text);
  
  // Determine if it's a todo/reminder intent
  const hasReminderIntent = /提醒|记得|别忘了|注意|todo|待办|任务/.test(text);
  const isTodo = hasReminderIntent || hasExplicitTime || isRecurring;
  
  // Determine ambiguity
  let isAmbiguous = false;
  let clarificationPrompt: string | null = null;
  
  if (isTodo && !hasExplicitTime && !isRecurring) {
    // It's a todo but time is unclear
    isAmbiguous = true;
    clarificationPrompt = `要为"${refinedContent}"设置提醒时间吗？`;
  }
  
  // Build reminder if applicable
  let reminder: { type: 'once' | 'daily' | 'weekly' | 'monthly'; date: number } | undefined;
  
  if (hasExplicitTime || isRecurring) {
    reminder = {
      type: recurrenceType || 'once',
      date: targetDate.getTime(),
    };
  }
  
  // If it's just a todo without time, still mark as todo but no reminder
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
  
  // Simple category detection
  const categories: Record<string, string> = {
    '工作': 'Work', '会议': 'Work', '项目': 'Work', '报告': 'Work',
    '购物': 'Errands', '买': 'Errands', '快递': 'Errands', '取': 'Errands',
    '健康': 'Health', '体检': 'Health', '药': 'Health', '医院': 'Health', '运动': 'Health', '健身': 'Health',
    '学习': 'Learning', '读书': 'Learning', '课程': 'Learning',
    '个人': 'Personal', '家庭': 'Personal',
    '财务': 'Finance', '钱': 'Finance', '账单': 'Finance',
    '社交': 'Social', '聚会': 'Social', '朋友': 'Social',
  };
  
  let category = 'Personal';
  for (const [keyword, cat] of Object.entries(categories)) {
    if (text.includes(keyword)) {
      category = cat;
      break;
    }
  }
  
  // Simple tag extraction
  const tags: string[] = [];
  if (/提醒|待办|todo/i.test(text)) tags.push('提醒');
  if (/紧急|尽快|马上/.test(text)) tags.push('紧急');
  if (/重要/.test(text)) tags.push('重要');
  
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
