export default {
  async fetch(): Promise<Response> {
    const res = await fetch('https://solon.dev/install.sh')
    return new Response(res.body, {
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  },
}
