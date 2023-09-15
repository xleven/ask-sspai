'use client'

import { useChat, type Message } from 'ai/react'

import { cn } from '@/lib/utils'
import { ChatList } from '@/components/chat-list'
import { ChatPanel } from '@/components/chat-panel'
import { EmptyScreen } from '@/components/empty-screen'
import { ChatScrollAnchor } from '@/components/chat-scroll-anchor'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog'
import { useEffect, useState } from 'react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { ExternalLink } from './external-link'

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export function Chat({ id, initialMessages, className }: ChatProps) {
  const [previewToken, setPreviewToken] = useLocalStorage<string | null>(
    'ai-token',
    null
  )
  const [previewTokenDialog, setPreviewTokenDialog] = useState(false)
  const [previewTokenInput, setPreviewTokenInput] = useState(previewToken ?? '')
  useEffect(() => {
    setPreviewTokenDialog(
      !(document.cookie.includes('auth-token=')) && !(previewToken !== null)
    )
    return () => {
      setPreviewTokenDialog(false)
      setPreviewToken(null)
      setPreviewTokenInput('')
    }
  }, [])
  const { messages, append, reload, stop, isLoading, input, setInput } =
    useChat({
      initialMessages,
      id,
      body: {
        id,
        previewToken
      },
      onResponse(response) {
        if (response.status !== 200) {
          toast.error(response.statusText)
        }
      }
    })
  return (
    <>
      <div className={cn('pb-[200px] pt-4 md:pt-10', className)}>
        {messages.length ? (
          <>
            <ChatList messages={messages} />
            <ChatScrollAnchor trackVisibility={isLoading} />
          </>
        ) : (
          <EmptyScreen setInput={setInput} />
        )}
      </div>
      <ChatPanel
        id={id}
        isLoading={isLoading}
        stop={stop}
        append={append}
        reload={reload}
        messages={messages}
        input={input}
        setInput={setInput}
      />

      <Dialog open={previewTokenDialog} onOpenChange={setPreviewTokenDialog}>
        <DialogContent>
          <DialogTitle>选择一个选项以继续：</DialogTitle>
          <DialogDescription>
            <div className='mt-4 flex justify-between'>1. 登录/注册帐号
              <Button className='w-20'><Link href='/sign-in' className='my-4'>登录</Link></Button>
            </div>
            <div className='mt-4'>2. 提供 OpenAI API key
              <Tooltip>
                <TooltipTrigger><sup className='underline'>{'?'}</sup></TooltipTrigger>
                <TooltipContent>
                  可在
                  <ExternalLink href="http://platform.openai.com/account/api-keys" >此处</ExternalLink>
                  获取；你的 API key 仅会保留在本地浏览器中
                </TooltipContent>
              </Tooltip>
            </div>
            <div className='mt-4 flex justify-between'>
              <Input className='w-80'
                value={previewTokenInput}
                placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                onChange={e => setPreviewTokenInput(e.target.value)}
              />
              <Button className='w-20'
                onClick={() => {
                  setPreviewToken(previewTokenInput)
                  setPreviewTokenDialog(false)
                }}
                disabled={previewTokenInput === ''}
              >
                保存
              </Button>
            </div>
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  )
}
