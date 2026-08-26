// ============================================================
// 字镜阁 · 词汇游戏
// 闪卡 + 配对 + 填空 + 词源问答
// ============================================================

import { storage } from '@/engine/storage'
import type { WordEntry, WordGameRound, WordGameSession, WordGameType } from './types'
import { WORD_MIRROR_STORAGE_KEYS } from './types'

/**
 * 生成唯一 ID
 */
function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/**
 * 洗牌算法
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * 字镜阁词汇游戏引擎
 */
export function useWordGames() {
  const sessions = ref<WordGameSession[]>([])

  async function load(): Promise<void> {
    const saved = await storage.getKV<WordGameSession[]>(WORD_MIRROR_STORAGE_KEYS.GAMES, [])
    sessions.value = saved
  }

  /**
   * 生成闪卡回合
   */
  function generateFlashcardRounds(words: WordEntry[], roundCount = 10): WordGameRound[] {
    const pool = shuffle(words).slice(0, roundCount)
    return pool.map((word) => {
      // 从其他词汇中选 3 个作为干扰项
      const distractors = shuffle(
        words.filter((w) => w.id !== word.id)
      ).slice(0, 3)
      const options = shuffle([
        word.definition,
        ...distractors.map((d) => d.definition),
      ])
      return {
        type: 'flashcard',
        question: `"${word.word}" 的释义是？`,
        options,
        correctIndex: options.indexOf(word.definition),
        targetWord: word.word,
        hint: word.tags.length > 0 ? `标签：${word.tags.join('、')}` : undefined,
      }
    })
  }

  /**
   * 生成配对回合
   */
  function generateMatchRounds(words: WordEntry[], pairCount = 5): WordGameRound[] {
    const pool = shuffle(words).slice(0, pairCount)
    const allDefs = pool.map((w) => w.definition)
    const shuffledDefs = shuffle(allDefs)

    return pool.map((word) => ({
      type: 'match' as WordGameType,
      question: `请将 "${word.word}" 与正确的释义配对`,
      options: [word.definition, ...shuffledDefs.filter((d) => d !== word.definition).slice(0, 3)],
      correctIndex: 0, // 第一个选项总是正确答案
      targetWord: word.word,
      hint: `词性提示：共 ${word.definition.length} 个字`,
    }))
  }

  /**
   * 生成填空回合
   */
  function generateFillBlankRounds(words: WordEntry[], roundCount = 8): WordGameRound[] {
    const pool = shuffle(words).slice(0, roundCount)
    return pool.map((word) => {
      const distractors = shuffle(
        words.filter((w) => w.id !== word.id)
      ).slice(0, 3)
      const options = shuffle([word.word, ...distractors.map((d) => d.word)])
      return {
        type: 'fill-blank',
        question: `"${word.definition}" —— 填入正确的词汇`,
        options,
        correctIndex: options.indexOf(word.word),
        targetWord: word.word,
        hint: word.word.length > 1 ? `共 ${word.word.length} 个字` : undefined,
      }
    })
  }

  /**
   * 生成词源问答回合
   */
  function generateEtymologyQuizRounds(words: WordEntry[], roundCount = 6): WordGameRound[] {
    // 此函数需要与 etymology 模块配合使用
    // 简化版：基于词汇结构生成问题
    const pool = shuffle(words).slice(0, roundCount)
    return pool.map((word) => {
      const chars = word.word.split('')
      const questionTypes = [
        `"${word.word}" 由几个字组成？`,
        `"${word.word}" 的首字是什么？`,
        `"${word.word}" 的尾字是什么？`,
      ]
      const qIndex = Math.floor(Math.random() * questionTypes.length)
      const question = questionTypes[qIndex]

      let correctAnswer: string
      let distractorPool: string[]

      if (qIndex === 0) {
        correctAnswer = `${chars.length}`
        distractorPool = ['1', '2', '3', '4', '5'].filter((n) => n !== correctAnswer)
      } else if (qIndex === 1) {
        correctAnswer = chars[0]
        distractorPool = shuffle(
          words.filter((w) => w.word !== word.word).map((w) => w.word.charAt(0))
        ).slice(0, 3)
      } else {
        correctAnswer = chars[chars.length - 1]
        distractorPool = shuffle(
          words.filter((w) => w.word !== word.word).map((w) => w.word.slice(-1))
        ).slice(0, 3)
      }

      const options = shuffle([correctAnswer, ...distractorPool.slice(0, 3)])
      return {
        type: 'etymology-quiz',
        question,
        options,
        correctIndex: options.indexOf(correctAnswer),
        targetWord: word.word,
        hint: word.definition,
      }
    })
  }

  /**
   * 创建新游戏会话
   */
  function createSession(gameType: WordGameType, words: WordEntry[], roundCount?: number): WordGameSession {
    let rounds: WordGameRound[]

    switch (gameType) {
      case 'flashcard':
        rounds = generateFlashcardRounds(words, roundCount || 10)
        break
      case 'match':
        rounds = generateMatchRounds(words, roundCount || 5)
        break
      case 'fill-blank':
        rounds = generateFillBlankRounds(words, roundCount || 8)
        break
      case 'etymology-quiz':
        rounds = generateEtymologyQuizRounds(words, roundCount || 6)
        break
      default:
        rounds = generateFlashcardRounds(words, roundCount || 10)
    }

    const session: WordGameSession = {
      id: uid(),
      gameType,
      rounds,
      currentRound: 0,
      correctCount: 0,
      totalCount: rounds.length,
      startedAt: new Date().toISOString(),
      wordIds: words.map((w) => w.id),
    }

    sessions.value.push(session)
    return session
  }

  /**
   * 提交答案
   */
  function submitAnswer(sessionId: string, selectedIndex: number): boolean {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session || session.currentRound >= session.totalCount) return false

    const round = session.rounds[session.currentRound]
    const isCorrect = selectedIndex === round.correctIndex

    if (isCorrect) {
      session.correctCount++
    }

    session.currentRound++

    if (session.currentRound >= session.totalCount) {
      session.completedAt = new Date().toISOString()
    }

    return isCorrect
  }

  /**
   * 获取当前回合
   */
  function getCurrentRound(sessionId: string): WordGameRound | null {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session || session.currentRound >= session.totalCount) return null
    return session.rounds[session.currentRound]
  }

  /**
   * 获取会话进度
   */
  function getProgress(sessionId: string): { current: number; total: number; correct: number; percentage: number } | null {
    const session = sessions.value.find((s) => s.id === sessionId)
    if (!session) return null
    return {
      current: session.currentRound,
      total: session.totalCount,
      correct: session.correctCount,
      percentage: session.totalCount > 0
        ? Math.round((session.correctCount / session.totalCount) * 100)
        : 0,
    }
  }

  /**
   * 获取游戏统计
   */
  function getGameStats(): { totalGames: number; totalCorrect: number; totalRounds: number; accuracy: number } {
    const completed = sessions.value.filter((s) => s.completedAt)
    const totalRounds = completed.reduce((sum, s) => sum + s.totalCount, 0)
    const totalCorrect = completed.reduce((sum, s) => sum + s.correctCount, 0)

    return {
      totalGames: completed.length,
      totalCorrect,
      totalRounds,
      accuracy: totalRounds > 0 ? Math.round((totalCorrect / totalRounds) * 100) : 0,
    }
  }

  /**
   * 清除会话
   */
  async function removeSession(sessionId: string): Promise<void> {
    sessions.value = sessions.value.filter((s) => s.id !== sessionId)
    await persist()
  }

  async function persist(): Promise<void> {
    await storage.setKV(WORD_MIRROR_STORAGE_KEYS.GAMES, sessions.value)
  }

  load()

  return {
    sessions,
    createSession,
    submitAnswer,
    getCurrentRound,
    getProgress,
    getGameStats,
    removeSession,
    load,
  }
}

import { ref } from 'vue'