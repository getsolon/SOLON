// Serve install.sh when accessed via getsolon.dev
export const onRequest: PagesFunction = async (context) => {
  const host = context.request.headers.get('host') || ''

  if (host.startsWith('getsolon.dev')) {
    const url = new URL('/install.sh', context.request.url)
    const res = await context.env.ASSETS.fetch(url)
    return new Response(res.body, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return context.next()
}
