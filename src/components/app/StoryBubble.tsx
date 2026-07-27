import { motion } from 'framer-motion'

import { cn } from '@/lib/utils'
import type { StoryRole } from '@/db/schema'

interface StoryBubbleProps {
  role: StoryRole
  content: string
  /** Skips the entrance animation for history that was already on screen. */
  animate?: boolean
}

export function StoryBubble({ role, content, animate = true }: StoryBubbleProps) {
  const isPlayer = role === 'player'

  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={cn('flex w-full', isPlayer ? 'justify-end' : 'justify-start')}
    >
      <div
        className={cn(
          'max-w-[86%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed',
          isPlayer
            ? 'rounded-br-sm bg-primary/15 text-foreground'
            : 'rounded-bl-sm border border-border bg-card text-card-foreground',
        )}
      >
        {renderContent(content)}
      </div>
    </motion.div>
  )
}

/**
 * Models reliably emit **bold** and blank-line paragraphs and very little else,
 * so this handles exactly those two rather than pulling in a markdown parser.
 */
function renderContent(content: string) {
  return content
    .split(/\n{2,}/)
    .filter((paragraph) => paragraph.trim())
    .map((paragraph, index) => (
      <p key={index} className={index > 0 ? 'mt-3' : undefined}>
        {paragraph
          .split(/(\*\*[^*]+\*\*)/g)
          .filter(Boolean)
          .map((segment, segmentIndex) =>
            segment.startsWith('**') && segment.endsWith('**') ? (
              <strong key={segmentIndex} className="font-semibold text-primary">
                {segment.slice(2, -2)}
              </strong>
            ) : (
              <span key={segmentIndex} className="whitespace-pre-wrap">
                {segment}
              </span>
            ),
          )}
      </p>
    ))
}

export function TypingBubble() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex justify-start"
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-4">
        {[0, 1, 2].map((index) => (
          <motion.span
            key={index}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -3, 0] }}
            transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.16 }}
          />
        ))}
      </div>
    </motion.div>
  )
}
