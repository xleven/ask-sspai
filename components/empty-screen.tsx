import { UseChatHelpers } from 'ai/react'

import { Button } from '@/components/ui/button'
import { ExternalLink } from '@/components/external-link'
import { IconArrowRight } from '@/components/ui/icons'

const exampleMessages = [
  {
    heading: '选择一个创作话题',
    message: `在少数派创作可以选哪些话题？`
  },
  {
    heading: '风格指南细节',
    message: '添加超链接时，如何正确选择链接文本？'
  },
  {
    heading: '计算创作内容收益',
    message: `投稿内容被收录后，如何计算收录奖励？`
  }
]

export function EmptyScreen({ setInput }: Pick<UseChatHelpers, 'setInput'>) {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div className="rounded-lg border bg-background p-8">
        {/* <h1 className="mb-2 text-lg font-semibold">
          Ask-SspAI
        </h1> */}
        <p className="mb-2 leading-normal text-muted-foreground">
          Ask-SspAI 是一个针对
          《<ExternalLink href="https://manual.sspai.com">少数派创作手册</ExternalLink>》
          的非官方问答 AI，基于{' '}
          <ExternalLink href="https://nextjs.org">Next.js</ExternalLink> 和 
          <ExternalLink href="https://supabase.com">Supabase</ExternalLink> 构建。
        </p>
        <p className="mt-4 leading-normal text-muted-foreground">
          可在对话框输入你的问题，或试试下面的灵感:
        </p>
        <div className="mt-4 flex flex-col items-start space-y-2">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              onClick={() => setInput(message.message)}
            >
              <IconArrowRight className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
