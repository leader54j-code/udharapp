const allowedProtocols = new Set(['http:', 'https:'])

export default async function backendProxy(request) {
  const configuredUrl = process.env.BACKEND_URL?.trim()

  if (!configuredUrl) {
    return Response.json(
      { error: 'The Netlify BACKEND_URL environment variable is not configured' },
      { status: 503 },
    )
  }

  let backend
  try {
    backend = new URL(configuredUrl)
  } catch {
    return Response.json({ error: 'BACKEND_URL is not a valid URL' }, { status: 500 })
  }

  if (!allowedProtocols.has(backend.protocol)) {
    return Response.json({ error: 'BACKEND_URL must use HTTP or HTTPS' }, { status: 500 })
  }

  const incoming = new URL(request.url)
  const target = new URL(`${incoming.pathname}${incoming.search}`, backend)

  // The upstream host must come from BACKEND_URL, not from the browser request.
  const headers = new Headers(request.headers)
  headers.delete('host')
  headers.set('x-forwarded-host', incoming.host)
  headers.set('x-forwarded-proto', incoming.protocol.slice(0, -1))

  const upstreamRequest = new Request(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
    duplex: 'half',
    redirect: 'manual',
  })

  try {
    return await fetch(upstreamRequest)
  } catch (error) {
    console.error('Backend proxy request failed', error)
    return Response.json({ error: 'The backend service is unavailable' }, { status: 502 })
  }
}

export const config = {
  path: ['/api/*', '/uploads/*'],
}

