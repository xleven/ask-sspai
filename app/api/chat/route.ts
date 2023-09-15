import 'server-only'
import {
  LangChainStream,
  StreamingTextResponse,
} from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

import { ChatOpenAI } from 'langchain/chat_models/openai'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { SupabaseVectorStore } from 'langchain/vectorstores/supabase'
import { Document } from 'langchain/document'
import { StringOutputParser } from 'langchain/schema/output_parser'
import { RunnableSequence, RunnablePassthrough } from 'langchain/schema/runnable'
import * as hub from "langchain/hub"

import { auth } from '@/auth'
import { nanoid } from '@/lib/utils'
import { Database } from '@/lib/db_types'


export const runtime = 'edge'


const redis = Redis.fromEnv()

const ratelimit = {
  user: new Ratelimit({
    redis,
    analytics: true,
    prefix: '@upstash/ratelimit:user',
    limiter: Ratelimit.slidingWindow(10, "300 m")
  }),
  anno: new Ratelimit({
    redis,
    analytics: true,
    prefix: '@upstash/ratelimit:anno',
    limiter: Ratelimit.slidingWindow(10, "60 m")
  })
}

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient<Database>({
    cookies: () => cookieStore
  })
  const userId = (await auth({ cookieStore }))?.user.id
  const json = await req.json()
  const { messages, previewToken } = json
  const currentMessageContent = messages[messages.length - 1].content

  let limit
  if (previewToken) {
    limit = await ratelimit.anno.limit(req.ip ?? "annoymous")
  }
  else if (userId) {
    limit = await ratelimit.user.limit(userId)
  }
  else {
    return new NextResponse('Unauthorized', {
      status: 401
    })
  }
  if (!limit.success) 
    return new NextResponse('Too many requests', {
      status: 429
    }
  )

  try {
    const { stream, handlers } = LangChainStream({
      async onCompletion(completion) {
        if (userId) {
          const title = json.messages[0].content.substring(0, 100)
          const id = json.id ?? nanoid()
          const createdAt = Date.now()
          const path = `/chat/${id}`
          const payload = {
            id,
            title,
            userId,
            createdAt,
            path,
            messages: [
              ...messages,
              {
                content: completion,
                role: 'assistant'
              }
            ]
          }
          // Insert chat into database for logged user.
          await supabase.from('chats').upsert({ id, payload }).throwOnError()
        }
      }
    })
    
    const apiKey = previewToken || process.env.OPENAI_API_KEY
    const prompt = await hub.pull("xleven/ask-sspai")

    const embeddings = new OpenAIEmbeddings({ openAIApiKey: apiKey })
    const vectorStore = new SupabaseVectorStore(embeddings, { client: supabase })
    const retriever = vectorStore.asRetriever()

    const llm = new ChatOpenAI({
      openAIApiKey: apiKey,
      streaming: true,
      temperature: 0.1,
    })
    const outputParser = new StringOutputParser()

    const bot = RunnableSequence.from([
      {
        context: retriever.pipe(serializeDocs),
        question: new RunnablePassthrough(),
      },
      prompt,
      llm,
      outputParser,
    ])
    bot.invoke(
      currentMessageContent,
      {callbacks: [handlers]},
    )
    return new StreamingTextResponse(stream)

  } catch (e: any) {

    return NextResponse.json({ error: e.message, status: 500 })
    
  }
}

const serializeDocs = (docs: Document[]) =>
  docs.map((doc) => doc.pageContent).join("\n");